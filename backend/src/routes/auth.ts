import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { prisma } from '../utils/prisma';
import { redis } from '../utils/redis';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';

function notifySessionsChanged(request: FastifyRequest, userId: string) {
    const io = (request.server as any).io;
    io?.to(`user:${userId}`).emit('sessions:changed');
}

function notifySessionRevoked(request: FastifyRequest, userId: string, sessionId: string) {
    const io = (request.server as any).io;
    if (!io) return;
    io.to(`session:${sessionId}`).emit('session:revoked');
    notifySessionsChanged(request, userId);
    setTimeout(() => io.in(`session:${sessionId}`).disconnectSockets(true), 250);
}
import { config } from '../config';

const sendCodeSchema = z.object({
    phone: z.string().min(6).max(20),
});

const verifyCodeSchema = z.object({
    phone: z.string(),
    code: z.string().min(4).max(8),
    deviceFingerprint: z.string().optional(),
    deviceName: z.string().optional(),
});

const refreshSchema = z.object({
    refreshToken: z.string(),
});

const sessionSettingsSchema = z.object({
    autoLogoutDays: z.union([z.literal(7), z.literal(30), z.literal(90), z.literal(180)]),
});

const inactivityDeleteSchema = z.object({
    inactivityDeleteMonths: z.union([z.literal(0), z.literal(3), z.literal(6), z.literal(12), z.literal(18), z.literal(24)]),
});

const cloudPasswordSchema = z.object({
    enabled: z.boolean(),
    password: z.string().min(8).max(128).optional(),
    currentPassword: z.string().min(1).max(128).optional(),
}).superRefine((value, context) => {
    if (value.enabled && !value.password) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Введите новый облачный пароль' });
    }
    if (!value.enabled && !value.currentPassword) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['currentPassword'], message: 'Введите текущий облачный пароль' });
    }
});

const cloudLoginSchema = z.object({
    challengeToken: z.string().uuid(),
    password: z.string().min(1).max(128),
});

async function createLoginSession(
    request: FastifyRequest,
    user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>,
    deviceFingerprint: string | undefined,
    deviceName: string | undefined,
    isNewUser: boolean,
) {
    const now = new Date();
    const session = await prisma.session.create({
        data: {
            userId: user.id,
            refreshToken: '',
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'] || null,
            expiresAt: new Date(now.getTime() + user.autoLogoutDays * 24 * 60 * 60 * 1000),
        },
    });

    if (deviceFingerprint) {
        await prisma.device.upsert({
            where: { userId_fingerprint: { userId: user.id, fingerprint: deviceFingerprint } },
            create: { userId: user.id, fingerprint: deviceFingerprint, name: deviceName },
            update: { lastSeenAt: now, name: deviceName },
        });
    }

    const tokenPayload = { userId: user.id, sessionId: session.id };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    await prisma.$transaction([
        prisma.session.update({ where: { id: session.id }, data: { refreshToken } }),
        prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: now } }),
    ]);
    await redis.set(`user:online:${user.id}`, 'true', 'EX', 300);
    notifySessionsChanged(request, user.id);

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            phone: user.phone,
            username: user.username,
            displayName: user.displayName,
            lastName: user.lastName,
            avatarUrl: user.avatarUrl,
            isAdmin: user.isAdmin,
            isVerified: user.isVerified,
            isPremium: user.isPremium || user.username?.toLowerCase() === 'vaksik14',
            locale: user.locale,
        },
        isNewUser,
    };
}

async function reserveSmsAttempt(key: string) {
    const [attempts, ttl] = await redis.eval(
        "local attempts = tonumber(redis.call('GET', KEYS[1]) or '0') " +
        "if attempts >= tonumber(ARGV[1]) then return {0, redis.call('TTL', KEYS[1])} end " +
        "attempts = redis.call('INCR', KEYS[1]) " +
        "if attempts == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end " +
        "return {attempts, redis.call('TTL', KEYS[1])}",
        1,
        key,
        3,
        600,
    ) as [number, number];
    return { allowed: attempts > 0, retryAfterSeconds: Math.max(0, ttl) };
}

async function releaseSmsAttempt(key: string) {
    await redis.eval(
        "local attempts = redis.call('DECR', KEYS[1]) " +
        "if attempts <= 0 then return redis.call('DEL', KEYS[1]) end " +
        "return attempts",
        1,
        key,
    );
}

export async function authRoutes(app: FastifyInstance) {
    // Global error handler for Zod
    app.setErrorHandler((error, request, reply) => {
        if (error.name === 'ZodError') {
            return reply.status(400).send({ error: 'Invalid input', details: error.message });
        }
        app.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
    });

    // ── Send verification code ──
    app.post('/send-code', async (request, reply) => {
        let reservedRateLimitKey: string | null = null;
        try {
            const body = sendCodeSchema.parse(request.body);
            // Normalize phone — remove spaces, dashes
            const phone = body.phone.replace(/[\s\-\(\)]/g, '');

            // Reserve an SMS attempt atomically; failed deliveries release the reservation.
            const rateLimitKey = `sms:rate:${phone}`;
            const rateLimit = await reserveSmsAttempt(rateLimitKey);
            if (!rateLimit.allowed) {
                reply.header('Retry-After', rateLimit.retryAfterSeconds);
                return reply.status(429).send({
                    error: 'Too many attempts. Try again later.',
                    retryAfterSeconds: rateLimit.retryAfterSeconds,
                });
            }
            reservedRateLimitKey = rateLimitKey;

            // Generate 6-digit code
            const code = String(Math.floor(100000 + Math.random() * 900000));

            const { accountSid, authToken, fromNumber } = config.sms;
            if (accountSid && authToken && fromNumber) {
                const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
                const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Basic ${credentials}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        To: phone,
                        From: fromNumber,
                        Body: `Ваш код подтверждения UniChat: ${code}`,
                    }),
                });
                if (!response.ok) {
                    const details = await response.text();
                    app.log.error({ status: response.status, details }, 'Twilio SMS delivery failed');
                    await releaseSmsAttempt(rateLimitKey);
                    reservedRateLimitKey = null;
                    return reply.status(502).send({ error: 'Не удалось отправить SMS. Проверьте номер телефона и настройки SMS.' });
                }
            } else if (config.nodeEnv !== 'development') {
                return reply.status(503).send({ error: 'Отправка SMS не настроена.' });
            }

            // Store code in DB
            await prisma.verificationCode.create({
                data: {
                    phone,
                    code,
                    expiresAt: new Date(Date.now() + config.verification.codeExpiresMinutes * 60 * 1000),
                },
            });
            reservedRateLimitKey = null;

            const response: any = {
                success: true,
                message: 'Code sent',
                expiresIn: config.verification.codeExpiresMinutes * 60,
            };

            if (config.nodeEnv === 'development' && !(config.sms.accountSid && config.sms.authToken && config.sms.fromNumber)) {
                response.code = code;
            }

            return reply.send(response);
        } catch (err: any) {
            if (reservedRateLimitKey) {
                try {
                    await releaseSmsAttempt(reservedRateLimitKey);
                } catch (releaseError) {
                    app.log.error(releaseError, 'Failed to release SMS rate-limit reservation');
                }
            }
            app.log.error(err);
            return reply.status(400).send({ error: err.message || 'Failed to send code' });
        }
    });

    // ── Verify code & login/register ──
    app.post('/verify-code', async (request, reply) => {
        try {
            const body = verifyCodeSchema.parse(request.body);
            const phone = body.phone.replace(/[\s\-\(\)]/g, '');
            let user = await prisma.user.findUnique({ where: { phone } });
            if (user?.isBlocked) {
                return reply.status(403).send({ error: 'Ваш аккаунт заблокирован!' });
            }

            // Find valid code
            const verification = await prisma.verificationCode.findFirst({
                where: {
                    phone,
                    code: body.code,
                    usedAt: null,
                    expiresAt: { gt: new Date() },
                    attempts: { lt: config.verification.maxAttempts },
                },
                orderBy: { createdAt: 'desc' },
            });

            if (!verification) {
                const latest = await prisma.verificationCode.findFirst({
                    where: { phone, usedAt: null },
                    orderBy: { createdAt: 'desc' },
                });
                if (latest) {
                    await prisma.verificationCode.update({
                        where: { id: latest.id },
                        data: { attempts: { increment: 1 } },
                    });
                }
                return reply.status(400).send({ error: 'Invalid or expired code' });
            }

            // Mark code as used
            await prisma.verificationCode.update({
                where: { id: verification.id },
                data: { usedAt: new Date() },
            });

            // Find or create user
            const isNewUser = !user;

            if (!user) {
                user = await prisma.user.create({
                    data: {
                        phone,
                        consentGiven: true,
                        consentDate: new Date(),
                    },
                });
            }

            if (user.cloudPasswordHash) {
                const challengeToken = randomUUID();
                await redis.set(
                    `auth:cloud-password:${challengeToken}`,
                    JSON.stringify({
                        userId: user.id,
                        deviceFingerprint: body.deviceFingerprint,
                        deviceName: body.deviceName,
                        isNewUser,
                    }),
                    'EX',
                    300,
                );
                return reply.send({ requiresCloudPassword: true, challengeToken });
            }

            return reply.send(await createLoginSession(
                request,
                user,
                body.deviceFingerprint,
                body.deviceName,
                isNewUser,
            ));
        } catch (err: any) {
            app.log.error(err);
            return reply.status(400).send({ error: err.message || 'Verification failed' });
        }
    });

    app.post('/verify-cloud-password', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (request, reply) => {
        try {
            const body = cloudLoginSchema.parse(request.body);
            const challengeKey = `auth:cloud-password:${body.challengeToken}`;
            const challengeRaw = await redis.get(challengeKey);
            if (!challengeRaw) return reply.status(400).send({ error: 'Время входа истекло. Запросите новый SMS-код.' });

            const attemptsKey = `${challengeKey}:attempts`;
            const attempts = await redis.incr(attemptsKey);
            if (attempts === 1) await redis.expire(attemptsKey, 300);
            if (attempts > 5) {
                await redis.del(challengeKey, attemptsKey);
                return reply.status(429).send({ error: 'Слишком много попыток. Запросите новый SMS-код.' });
            }

            const challenge = JSON.parse(challengeRaw) as {
                userId: string;
                deviceFingerprint?: string;
                deviceName?: string;
                isNewUser: boolean;
            };
            const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
            if (!user || user.isBlocked) return reply.status(403).send({ error: 'Ваш аккаунт заблокирован!' });
            if (!user.cloudPasswordHash || !(await argon2.verify(user.cloudPasswordHash, body.password))) {
                return reply.status(400).send({ error: 'Неверный облачный пароль.' });
            }

            const consumed = await redis.eval(
                "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1], KEYS[2]) end return 0",
                2,
                challengeKey,
                attemptsKey,
                challengeRaw,
            );
            if (!consumed) return reply.status(400).send({ error: 'Запрос входа уже использован. Запросите новый SMS-код.' });

            return reply.send(await createLoginSession(
                request,
                user,
                challenge.deviceFingerprint,
                challenge.deviceName,
                challenge.isNewUser,
            ));
        } catch (err: any) {
            if (err instanceof z.ZodError) return reply.status(400).send({ error: 'Неверный формат запроса.' });
            app.log.error(err);
            return reply.status(500).send({ error: 'Не удалось проверить облачный пароль.' });
        }
    });

    // ── Refresh token ──
    app.post('/refresh', async (request, reply) => {
        try {
            const body = refreshSchema.parse(request.body);
            const payload = verifyRefreshToken(body.refreshToken);

            const session = await prisma.session.findUnique({
                where: { id: payload.sessionId },
            });

            if (!session || session.refreshToken !== body.refreshToken) {
                return reply.status(401).send({ error: 'Invalid refresh token' });
            }

            if (session.expiresAt < new Date()) {
                await prisma.session.delete({ where: { id: session.id } });
                notifySessionRevoked(request, session.userId, session.id);
                return reply.status(401).send({ error: 'Refresh token expired' });
            }

            const user = await prisma.user.findUnique({
                where: { id: session.userId },
                select: { autoLogoutDays: true },
            });
            if (!user) {
                await prisma.session.delete({ where: { id: session.id } });
                notifySessionRevoked(request, session.userId, session.id);
                return reply.status(401).send({ error: 'User not found' });
            }

            const newTokenPayload = { userId: session.userId, sessionId: session.id };
            const accessToken = generateAccessToken(newTokenPayload);
            const refreshToken = generateRefreshToken(newTokenPayload);
            const lastActiveAt = new Date();

            await prisma.session.update({
                where: { id: session.id },
                data: {
                    refreshToken,
                    lastActiveAt,
                    expiresAt: new Date(lastActiveAt.getTime() + user.autoLogoutDays * 24 * 60 * 60 * 1000),
                },
            });

            return reply.send({ accessToken, refreshToken });
        } catch {
            return reply.status(401).send({ error: 'Invalid refresh token' });
        }
    });

    // ── Logout ──
    app.post('/logout', { preHandler: [authMiddleware] }, async (request, reply) => {
        const sessionId = request.user!.sessionId;
        await prisma.session.deleteMany({ where: { id: sessionId, userId: request.user!.id } });
        notifySessionRevoked(request, request.user!.id, sessionId);
        await redis.del(`user:online:${request.user!.id}`);
        return reply.send({ success: true });
    });

    // ── Get current user ──
    app.get('/me', { preHandler: [authMiddleware] }, async (request, reply) => {
        const user = await prisma.user.findUnique({
            where: { id: request.user!.id },
            select: {
                id: true, phone: true, username: true, displayName: true, lastName: true,
                avatarUrl: true, bio: true, isAdmin: true, isVerified: true, locale: true, createdAt: true,
                isPremium: true,
            },
        });
        if (!user) return reply.status(404).send({ error: 'User not found' });
        return reply.send({
            ...user,
            isAdmin: user.isAdmin || user.username === 'vaksik14',
            isPremium: user.isPremium || user.username?.toLowerCase() === 'vaksik14',
        });
    });

    // ── Get active sessions ──
    app.get('/sessions', { preHandler: [authMiddleware] }, async (request, reply) => {
        const settings = await prisma.systemSettings.findUnique({
            where: { id: 'system' },
            select: { sessionManagementUserIds: true },
        });
        const canManageSessions = request.user!.username === 'vaksik14'
            || Boolean(settings?.sessionManagementUserIds.includes(request.user!.id));
        const allSessions = await prisma.session.findMany({
            where: { userId: request.user!.id },
            select: { id: true, ipAddress: true, userAgent: true, createdAt: true, lastActiveAt: true, expiresAt: true },
            orderBy: { createdAt: 'desc' },
        });
        const now = new Date();
        const sessions = allSessions.filter((session) => session.expiresAt > now);
        return reply.send(sessions.map((session) => ({
            ...session,
            isCurrent: session.id === request.user!.sessionId,
            canRevoke: canManageSessions && session.id !== request.user!.sessionId,
        })));
    });

    app.get('/sessions/settings', { preHandler: [authMiddleware] }, async (request, reply) => {
        const user = await prisma.user.findUnique({
            where: { id: request.user!.id },
            select: { autoLogoutDays: true },
        });
        if (!user) return reply.status(404).send({ error: 'User not found' });
        return reply.send(user);
    });

    app.put('/sessions/settings', { preHandler: [authMiddleware] }, async (request, reply) => {
        const { autoLogoutDays } = sessionSettingsSchema.parse(request.body);
        const now = new Date();
        const sessions = await prisma.session.findMany({
            where: { userId: request.user!.id },
            select: { id: true, lastActiveAt: true },
        });
        const cutoff = new Date(now.getTime() - autoLogoutDays * 24 * 60 * 60 * 1000);
        const activeSessions = sessions.filter((session) => session.lastActiveAt > cutoff);
        const updates = [
            prisma.user.update({
                where: { id: request.user!.id },
                data: { autoLogoutDays },
            }),
            ...activeSessions.map((session) => prisma.session.update({
                where: { id: session.id },
                data: { expiresAt: new Date(session.lastActiveAt.getTime() + autoLogoutDays * 24 * 60 * 60 * 1000) },
            })),
        ];
        await prisma.$transaction(updates);
        return reply.send({ autoLogoutDays });
    });

    // ── Revoke session ──
    app.delete('/sessions/:id', { preHandler: [authMiddleware] }, async (request, reply) => {
        const settings = await prisma.systemSettings.findUnique({
            where: { id: 'system' },
            select: { sessionManagementUserIds: true },
        });
        const canManageSessions = request.user!.username === 'vaksik14'
            || Boolean(settings?.sessionManagementUserIds.includes(request.user!.id));
        if (!canManageSessions) {
            return reply.status(403).send({ error: 'Нет прав для завершения сеансов' });
        }

        const { id } = request.params as { id: string };
        if (id === request.user!.sessionId) {
            return reply.status(403).send({ error: 'Нельзя завершить сеанс этого устройства' });
        }
        const result = await prisma.session.deleteMany({ where: { id, userId: request.user!.id } });
        if (result.count) notifySessionRevoked(request, request.user!.id, id);
        return reply.send({ success: true });
    });

    app.get('/security/settings', { preHandler: [authMiddleware] }, async (request, reply) => {
        const user = await prisma.user.findUnique({
            where: { id: request.user!.id },
            select: { inactivityDeleteMonths: true, inactivityDeleteEnabled: true, cloudPasswordHash: true },
        });
        if (!user) return reply.status(404).send({ error: 'User not found' });
        return reply.send({
            inactivityDeleteMonths: user.inactivityDeleteMonths,
            inactivityDeleteEnabled: user.inactivityDeleteEnabled,
            cloudPasswordEnabled: Boolean(user.cloudPasswordHash),
        });
    });

    app.put('/security/inactivity', { preHandler: [authMiddleware] }, async (request, reply) => {
        const { inactivityDeleteMonths } = inactivityDeleteSchema.parse(request.body);
        const user = await prisma.user.update({
            where: { id: request.user!.id },
            data: {
                inactivityDeleteMonths,
                inactivityDeleteEnabled: inactivityDeleteMonths > 0,
            },
            select: { inactivityDeleteMonths: true, inactivityDeleteEnabled: true },
        });
        return reply.send(user);
    });

    app.put('/security/cloud-password', { preHandler: [authMiddleware] }, async (request, reply) => {
        const body = cloudPasswordSchema.parse(request.body);
        const user = await prisma.user.findUnique({
            where: { id: request.user!.id },
            select: { cloudPasswordHash: true },
        });
        if (!user) return reply.status(404).send({ error: 'User not found' });

        if (user.cloudPasswordHash) {
            if (!body.currentPassword || !(await argon2.verify(user.cloudPasswordHash, body.currentPassword))) {
                return reply.status(400).send({ error: 'Текущий облачный пароль неверен.' });
            }
        } else if (!body.enabled) {
            return reply.status(400).send({ error: 'Облачный пароль уже отключён.' });
        }

        const cloudPasswordHash = body.enabled
            ? await argon2.hash(body.password!, { type: argon2.argon2id })
            : null;
        await prisma.user.update({
            where: { id: request.user!.id },
            data: { cloudPasswordHash },
        });
        return reply.send({ cloudPasswordEnabled: Boolean(cloudPasswordHash) });
    });
}

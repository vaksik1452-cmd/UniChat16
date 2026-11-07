import { prisma } from './prisma';
import { redis } from './redis';

function addMonths(date: Date, months: number) {
    const next = new Date(date);
    const day = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + months);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDay));
    return next;
}

export async function deleteInactiveAccounts(logger: { info: (data: object, message: string) => void; error: (data: object, message: string) => void }) {
    const users = await prisma.user.findMany({
        where: {
            inactivityDeleteEnabled: true,
            inactivityDeleteMonths: { gt: 0 },
            dataDeletedAt: null,
            isBlocked: false,
            isAdmin: false,
        },
        select: {
            id: true,
            lastSeenAt: true,
            createdAt: true,
            inactivityDeleteMonths: true,
        },
    });

    let deletedCount = 0;
    const now = new Date();

    for (const user of users) {
        const lastActivity = user.lastSeenAt ?? user.createdAt;
        if (addMonths(lastActivity, user.inactivityDeleteMonths) > now) continue;
        if (await redis.exists(`user:online:${user.id}`)) continue;

        try {
            const deleted = await prisma.$transaction(async (transaction) => {
                const result = await transaction.user.updateMany({
                    where: {
                        id: user.id,
                        inactivityDeleteEnabled: true,
                        inactivityDeleteMonths: user.inactivityDeleteMonths,
                        lastSeenAt: user.lastSeenAt,
                        dataDeletedAt: null,
                        isBlocked: false,
                        isAdmin: false,
                    },
                    data: {
                        displayName: 'Deleted User',
                        username: null,
                        bio: null,
                        avatarUrl: null,
                        phone: `deleted_${user.id}`,
                        cloudPasswordHash: null,
                        dataDeletedAt: now,
                        isBlocked: true,
                        isAdmin: false,
                        isPremium: false,
                        inactivityDeleteEnabled: false,
                    },
                });
                if (!result.count) return false;
                await transaction.session.deleteMany({ where: { userId: user.id } });
                await transaction.device.deleteMany({ where: { userId: user.id } });
                return true;
            });
            if (!deleted) continue;
            await redis.del(`user:online:${user.id}`);
            deletedCount++;
            logger.info({ userId: user.id }, 'Deleted inactive account');
        } catch (error) {
            logger.error({ error, userId: user.id }, 'Failed to delete inactive account');
        }
    }

    if (deletedCount) logger.info({ deletedCount }, 'Inactive account cleanup completed');
}

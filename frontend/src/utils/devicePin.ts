const PIN_SALT_KEY = 'unichat-device-pin-salt';
const PIN_HASH_KEY = 'unichat-device-pin-hash';
const PIN_ITERATIONS = 310_000;

function toHex(bytes: Uint8Array) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function derivePinHash(pin: string, salt: Uint8Array) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
    const saltBuffer = new ArrayBuffer(salt.byteLength);
    new Uint8Array(saltBuffer).set(salt);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: saltBuffer, iterations: PIN_ITERATIONS, hash: 'SHA-256' },
        key,
        256,
    );
    return toHex(new Uint8Array(bits));
}

export function hasDevicePin() {
    return Boolean(localStorage.getItem(PIN_SALT_KEY) && localStorage.getItem(PIN_HASH_KEY));
}

export async function saveDevicePin(pin: string) {
    if (!/^\d{4}$/.test(pin)) throw new Error('Введите PIN-код из 4 цифр.');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derivePinHash(pin, salt);
    localStorage.setItem(PIN_SALT_KEY, toHex(salt));
    localStorage.setItem(PIN_HASH_KEY, hash);
}

export async function verifyDevicePin(pin: string) {
    const saltHex = localStorage.getItem(PIN_SALT_KEY);
    const expectedHash = localStorage.getItem(PIN_HASH_KEY);
    if (!saltHex || !expectedHash || !/^\d{4}$/.test(pin)) return false;
    if (!/^[a-f\d]{32}$/i.test(saltHex) || !/^[a-f\d]{64}$/i.test(expectedHash)) return false;
    const saltBytes = saltHex.match(/.{2}/g);
    if (!saltBytes) return false;
    const salt = new Uint8Array(saltBytes.map((byte) => Number.parseInt(byte, 16)));
    if (salt.length !== 16) return false;
    return (await derivePinHash(pin, salt)) === expectedHash;
}

export function removeDevicePin() {
    localStorage.removeItem(PIN_SALT_KEY);
    localStorage.removeItem(PIN_HASH_KEY);
}

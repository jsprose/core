/**
 * String to base62 hash.
 */
export function hash(input: string, length: number): string {
    if (!Number.isInteger(length) || length <= 0) {
        throw new TypeError('length must be a positive integer');
    }

    // 62-char alphabet: digits, uppercase, lowercase
    const ALPHABET =
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const ALPHABET_LEN = 62;

    // FNV-1a 32-bit hash (returns unsigned 32-bit integer)
    const fnv1a32 = (str: string): number => {
        let h = 0x811c9dc5 >>> 0; // FNV offset basis
        for (let i = 0; i < str.length; ++i) {
            h ^= str.charCodeAt(i);
            // multiply by FNV prime 16777619 (mod 2^32)
            h =
                (h +
                    ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>>
                0;
        }
        return h >>> 0;
    };

    // xorshift32 PRNG (returns unsigned 32-bit)
    const makeXorShift32 = (seed: number) => {
        let x = seed >>> 0 || 1; // avoid zero seed
        return (): number => {
            // xorshift32 steps
            x ^= (x << 13) >>> 0;
            x ^= x >>> 17;
            x ^= (x << 5) >>> 0;
            return x >>> 0;
        };
    };

    const seed = fnv1a32(input);
    const nextUint32 = makeXorShift32(seed);

    // Rejection sampling to avoid modulo bias:
    // find largest uint32 multiple of ALPHABET_LEN we accept
    const MAX_UINT32 = 0xffffffff >>> 0;
    const acceptBound =
        Math.floor((MAX_UINT32 + 1) / ALPHABET_LEN) * ALPHABET_LEN;

    let out = '';
    while (out.length < length) {
        let r = nextUint32();
        // if r >= acceptBound, redraw (rejection sampling)
        while (r >= acceptBound) {
            r = nextUint32();
        }
        const idx = r % ALPHABET_LEN;
        out += ALPHABET.charAt(idx);
    }

    return out;
}

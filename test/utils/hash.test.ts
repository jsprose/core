import { describe, expect, it } from 'vitest';

import { hash } from '@jsprose/core';

describe('hash', () => {
    it('should produce consistent hashes with desired length', () => {
        const hash1 = hash('example input', 10);
        const hash2 = hash('example input', 10);
        expect(hash1).toBe(hash2);
        expect(hash1.length).toBe(10);
    });
});

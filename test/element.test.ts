import { describe, it, expect } from 'vitest';

import {
    defineSchema,
    isRawProseElement,
    ensureRawProseElement,
    isProseElement,
    ensureProseElement,
    draftElement,
    type RawElement,
    type ProseElement,
} from '@jsprose/core';

// Schemas
const textSchema = defineSchema({
    type: 'inliner',
    name: 'text',
    linkable: false,
})<{
    Data: { text: string };
    Storage: string;
    Children: undefined;
}>();

const paragraphSchema = defineSchema({
    type: 'block',
    name: 'paragraph',
    linkable: false,
})<{
    Data: undefined;
    Storage: undefined;
    Children: (typeof textSchema)[];
}>();

// Updated minimal mock elements to satisfy current RawProseElement / ProseElement shapes
const rawTextElement: RawElement<typeof textSchema> = {
    ...draftElement('raw-prose', textSchema),
    hash: 'hash1',
    tagName: 'Text',
    data: { text: 'Hello' },
    storageKey: 'store1',
    children: undefined,
};

const proseTextElement: ProseElement<typeof textSchema> = {
    ...draftElement('prose', textSchema),
    id: 'id1',
    data: { text: 'Hello' },
    storageKey: 'store2',
    children: undefined,
};

describe('isRawProseElement', () => {
    it('returns true for matching RawProseElement', () => {
        expect(isRawProseElement(rawTextElement, textSchema)).toBe(true);
    });

    it('returns true without schema argument', () => {
        expect(isRawProseElement(rawTextElement)).toBe(true);
    });

    it('returns false for mismatching schema', () => {
        expect(isRawProseElement(rawTextElement, paragraphSchema)).toBe(false);
    });

    it('returns false for non-elements', () => {
        expect(isRawProseElement(null as any, textSchema)).toBe(false);
        expect(isRawProseElement({} as any, textSchema)).toBe(false);
        expect(isRawProseElement(42 as any, textSchema)).toBe(false);
        expect(isRawProseElement(undefined as any, textSchema)).toBe(false);
    });
});

describe('ensureRawProseElement', () => {
    it('passes for matching RawProseElement', () => {
        expect(() =>
            ensureRawProseElement(rawTextElement, textSchema),
        ).not.toThrow();
    });

    it('throws for mismatching schema', () => {
        expect(() =>
            ensureRawProseElement(rawTextElement, paragraphSchema),
        ).toThrow();
    });

    it('throws for non-elements', () => {
        expect(() => ensureRawProseElement({} as any, textSchema)).toThrow();
        expect(() => ensureRawProseElement(null as any, textSchema)).toThrow();
        expect(() => ensureRawProseElement(5 as any, textSchema)).toThrow();
        expect(() =>
            ensureRawProseElement(undefined as any, textSchema),
        ).toThrow();
    });
});

describe('isProseElement', () => {
    it('returns true for matching ProseElement', () => {
        expect(isProseElement(proseTextElement, textSchema)).toBe(true);
    });

    it('returns true without schema argument', () => {
        expect(isProseElement(proseTextElement)).toBe(true);
    });

    it('returns false for mismatching schema', () => {
        expect(isProseElement(proseTextElement, paragraphSchema)).toBe(false);
    });

    it('returns false for non-elements', () => {
        expect(isProseElement(null as any, textSchema)).toBe(false);
        expect(isProseElement({} as any, textSchema)).toBe(false);
        expect(isProseElement(42 as any, textSchema)).toBe(false);
        expect(isProseElement(undefined as any, textSchema)).toBe(false);
    });
});

describe('ensureProseElement', () => {
    it('passes for matching ProseElement', () => {
        expect(() =>
            ensureProseElement(proseTextElement, textSchema),
        ).not.toThrow();
    });

    it('throws for mismatching schema', () => {
        expect(() =>
            ensureProseElement(proseTextElement, paragraphSchema),
        ).toThrow();
    });

    it('throws for non-elements', () => {
        expect(() => ensureProseElement({} as any, textSchema)).toThrow();
        expect(() => ensureProseElement(null as any, textSchema)).toThrow();
        expect(() => ensureProseElement(5 as any, textSchema)).toThrow();
        expect(() =>
            ensureProseElement(undefined as any, textSchema),
        ).toThrow();
    });
});

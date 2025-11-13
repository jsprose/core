import { describe, it, expect } from 'vitest';

import {
    defineSchema,
    type RawElement,
    normalizeChildren,
    textSchema,
    hash,
    type AnySchema,
    draftElement,
    defineUnique,
    type Unique,
    defineTag,
    isRawElement,
} from '@jsprose/core';

const boldSchema = defineSchema({
    type: 'inliner',
    name: 'bold',
    linkable: true,
})<{
    Data: undefined;
    Storage: undefined;
    Children: undefined;
}>();

function makeBold(): RawElement<typeof boldSchema> {
    return {
        ...draftElement('raw-prose', boldSchema),
        tagName: 'bold',
        data: undefined,
        storageKey: undefined,
        children: undefined,
        hash: 'bold-hash',
    };
}

describe('normalizeChildren', () => {
    it('returns undefined for undefined input', () => {
        expect(normalizeChildren(undefined)).toBeUndefined();
    });

    it('wraps single string into one text element', () => {
        const out = normalizeChildren('Hello');
        expect(out).toBeDefined();
        expect(out!.length).toBe(1);
        const el = out![0];
        expect(isRawElement(el, textSchema)).toBe(true);
        expect(el.data).toBe('Hello');
    });

    it('merges adjacent strings into one text element', () => {
        const out = normalizeChildren(['A', 'B', 'C']);
        expect(out).toBeDefined();
        expect(out!.length).toBe(1);
        const el = out![0];
        expect(el.data).toBe('ABC');
        expect(el.hash).toBe(hash('ABC', 12));
    });

    it('does not merge strings separated by an element', () => {
        const bold1 = makeBold();
        const out = normalizeChildren(['A', bold1, 'B']);
        expect(out).toBeDefined();
        expect(out!.length).toBe(3);
        expect(out![0].data).toBe('A');
        expect(out![1].tagName).toBe('bold');
        expect(out![2].data).toBe('B');
    });

    it('invokes step callback for each raw child (including merged strings)', () => {
        const seen: RawElement<AnySchema>[] = [];
        normalizeChildren(['X', 'Y', makeBold()], (c) => seen.push(c));
        // 3 raw children -> 3 step invocations
        expect(seen.length).toBe(3);
        // First two are text schema elements (before merge result kept only first in final array)
        expect(isRawElement(seen[0], textSchema)).toBe(true);
        expect(isRawElement(seen[1], textSchema)).toBe(true);
        expect(isRawElement(seen[2], boldSchema)).toBe(true);
    });

    it('clones non-string children (mutating original after call does not affect result)', () => {
        const original = makeBold();
        const out = normalizeChildren([original]);
        expect(out).toBeDefined();
        expect(out!.length).toBe(1);
        const cloned = out![0];
        expect(cloned).not.toBe(original);
        const originalTagBefore = cloned.tagName;
        // Mutate original
        (original as any).tag = 'changed';
        expect(cloned.tagName).toBe(originalTagBefore);
    });

    it('handles mixed array with multiple merge segments', () => {
        const out = normalizeChildren(['A', 'B', makeBold(), 'C', 'D', 'E']);
        expect(out).toBeDefined();
        // 'A'+'B' -> one text, bold element, 'C'+'D'+'E' -> one text
        expect(out!.length).toBe(3);
        expect(out![0].data).toBe('AB');
        expect(out![1].tagName).toBe('bold');
        expect(out![2].data).toBe('CDE');
    });

    it('anonymizes unique cloning', () => {
        const boldTag = defineTag({
            tagName: 'Bold',
            schema: boldSchema,
        })<{}>(() => {});

        const unique: Unique<typeof boldTag> = {
            ...defineUnique({
                documentId: 'doc-123',
                name: 'myUnique',
                tag: boldTag,
            }),
            rawElement: makeBold(),
        };

        const out = normalizeChildren([unique]);
        expect(out).toBeDefined();
        expect(out!.length).toBe(1);
        const el = out![0];
        expect(el.tagName).toBe('bold');
        expect(el.uniqueName).toBeUndefined();
    });

    it('clones unique rawElement (mutating original does not affect result)', () => {
        const boldTag = defineTag({
            tagName: 'Bold',
            schema: boldSchema,
        })<{}>(() => {});

        const originalRaw = makeBold();
        const unique: Unique<typeof boldTag> = {
            ...defineUnique({
                documentId: 'doc-456',
                name: 'testUnique',
                tag: boldTag,
            }),
            rawElement: originalRaw,
        };

        const out = normalizeChildren([unique]);
        expect(out).toBeDefined();
        const cloned = out![0];
        expect(cloned).not.toBe(originalRaw);

        // Mutate original
        (originalRaw as any).tagName = 'changed';
        expect(cloned.tagName).toBe('bold');
    });

    it('invokes step callback for unique children', () => {
        const boldTag = defineTag({
            tagName: 'Bold',
            schema: boldSchema,
        })<{}>(() => {});

        const unique: Unique<typeof boldTag> = {
            ...defineUnique({
                documentId: 'doc-789',
                name: 'uniqueStep',
                tag: boldTag,
            }),
            rawElement: makeBold(),
        };

        const seen: RawElement<AnySchema>[] = [];
        normalizeChildren([unique], (c) => seen.push(c));

        expect(seen.length).toBe(1);
        expect(isRawElement(seen[0], boldSchema)).toBe(true);
        expect(seen[0].uniqueName).toBeUndefined();
    });

    it('handles mixed children with uniques and strings', () => {
        const boldTag = defineTag({
            tagName: 'Bold',
            schema: boldSchema,
        })<{}>(() => {});

        const unique: Unique<typeof boldTag> = {
            ...defineUnique({
                documentId: 'doc-mix',
                name: 'mixedUnique',
                tag: boldTag,
            }),
            rawElement: makeBold(),
        };

        const out = normalizeChildren(['Start', unique, 'End']);
        expect(out).toBeDefined();
        expect(out!.length).toBe(3);
        expect(out![0].data).toBe('Start');
        expect(out![1].tagName).toBe('bold');
        expect(out![1].uniqueName).toBeUndefined();
        expect(out![2].data).toBe('End');
    });
});

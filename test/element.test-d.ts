import { describe, expectTypeOf, it } from 'vitest';

import {
    defineSchema,
    type RawElement,
    type ProseElement,
    type ResolveElementStorageKey,
    type BlockSchema,
    type InlinerSchema,
    type AnySchema,
} from '@jsprose/core';

describe('Element children schema wrap', () => {
    it('should correctly handle inter-schema assignments', () => {
        type AnyElement = RawElement<AnySchema>;
        type BlockElement = RawElement<BlockSchema>;
        type InlinerElement = RawElement<InlinerSchema>;

        const anyFromBlock: AnyElement = undefined as unknown as BlockElement;
        const anyFromInliner: AnyElement =
            undefined as unknown as InlinerElement;

        // But specific types cannot accept the union
        // @ts-expect-error
        const block: BlockElement = undefined as unknown as InlinerElement;
        // @ts-expect-error
        const inliner: InlinerElement = undefined as unknown as BlockElement;
        // @ts-expect-error
        const blockAny: BlockElement =
            undefined as unknown as RawElement<AnySchema>;
    });

    const textSchema = defineSchema({
        type: 'inliner',
        name: 'text',
        linkable: false,
    })<{
        Data: { text: string };
        Storage: number;
        Children: undefined;
    }>();

    type RawProseText = RawElement<typeof textSchema>;
    type ProseText = ProseElement<typeof textSchema>;

    it('should keep undefined children as undefined', () => {
        expectTypeOf<RawProseText['children']>().toBeUndefined();
        expectTypeOf<ProseText['children']>().toBeUndefined();
    });

    const paragraphSchema = defineSchema({
        type: 'block',
        name: 'paragraph',
        linkable: false,
    })<{
        Data: undefined;
        Storage: undefined;
        Children: (typeof textSchema)[];
    }>();

    type RawProseParagraph = RawElement<typeof paragraphSchema>;
    type ProseParagraph = ProseElement<typeof paragraphSchema>;

    it('should wrap simple children schema arrays into arrays of elements', () => {
        expectTypeOf<RawProseParagraph['children']>().toEqualTypeOf<
            RawProseText[]
        >();
        expectTypeOf<ProseParagraph['children']>().toEqualTypeOf<ProseText[]>();
    });

    const compexChildrenSchema = defineSchema({
        type: 'block',
        name: 'blockInsideInliner1',
        linkable: false,
    })<{
        Data: undefined;
        Storage: undefined;
        Children:
            | [
                  typeof paragraphSchema,
                  typeof textSchema | typeof paragraphSchema,
              ]
            | [typeof textSchema]
            | (typeof paragraphSchema)[];
    }>();

    type RawProseComplex = RawElement<typeof compexChildrenSchema>;
    type ProseComplex = ProseElement<typeof compexChildrenSchema>;

    it('should wrap complex children schemas', () => {
        type RawProseComplexChildren =
            | [
                  RawProseParagraph,
                  RawElement<typeof textSchema | typeof paragraphSchema>,
              ]
            | [RawProseText]
            | RawProseParagraph[];

        type ProseComplexChildren =
            | [
                  ProseParagraph,
                  ProseElement<typeof textSchema | typeof paragraphSchema>,
              ]
            | [ProseText]
            | ProseParagraph[];

        expectTypeOf<
            RawProseComplex['children']
        >().toEqualTypeOf<RawProseComplexChildren>();

        expectTypeOf<
            ProseComplex['children']
        >().toEqualTypeOf<ProseComplexChildren>();
    });
});

describe('Storage key resolution', () => {
    it('should resolve storage key types correctly', () => {
        expectTypeOf<ResolveElementStorageKey<any>>().toEqualTypeOf<
            string | undefined
        >();
        expectTypeOf<
            ResolveElementStorageKey<undefined>
        >().toEqualTypeOf<undefined>();
        expectTypeOf<
            ResolveElementStorageKey<{ someData: string }>
        >().toEqualTypeOf<string>();
        expectTypeOf<
            ResolveElementStorageKey<{ someData: string } | undefined>
        >().toEqualTypeOf<string | undefined>();
    });
});

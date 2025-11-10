import { describe, expectTypeOf, it } from 'vitest';

import {
    defineDocument,
    defineSchema,
    defineTag,
    type Document,
    type Unique,
    type RawElement,
    type AnySchema,
} from '@jsprose/core';

import { P, paragraphSchema, Bold } from './__reusable';

const mockElement = {} as RawElement<AnySchema>;

describe('defineDocument', () => {
    it('should infer exact unique types from definition', () => {
        const doc = defineDocument({
            uniques: {
                intro: P,
                conclusion: Bold,
            },
        })(({ uniques }) => mockElement);

        // Uniques should have exact keys, not widened to Record<string, ...>
        expectTypeOf<keyof typeof doc.uniques>().toEqualTypeOf<
            'intro' | 'conclusion'
        >();

        // Each unique should have the correct tag type
        expectTypeOf<typeof doc.uniques.intro>().toEqualTypeOf<
            Unique<typeof P>
        >();
        expectTypeOf<typeof doc.uniques.conclusion>().toEqualTypeOf<
            Unique<typeof Bold>
        >();

        // Should not allow accessing non-existent keys
        // @ts-expect-error
        doc.uniques.nonExistent;
    });

    it('should handle empty uniques', () => {
        const doc = defineDocument({})(({ uniques }) => mockElement);

        // Uniques should be an empty object, not a Record
        expectTypeOf<typeof doc.uniques>().toEqualTypeOf<{}>();

        // Should not allow accessing any keys
        // @ts-expect-error
        doc.uniques.anything;
    });

    it('should infer uniques type in content function', () => {
        defineDocument({
            uniques: {
                para1: P,
                para2: P,
            },
        })(({ uniques }) => {
            // Inside content function, uniques should be strictly typed
            expectTypeOf<typeof uniques>().toExtend<{
                para1: Unique<typeof P>;
                para2: Unique<typeof P>;
            }>();

            expectTypeOf<keyof typeof uniques>().toEqualTypeOf<
                'para1' | 'para2'
            >();

            // @ts-expect-error
            uniques.para3;

            return mockElement;
        });
    });

    it('should work with explicit document ID', () => {
        const doc = defineDocument('my-doc-id', {
            uniques: {
                target: P,
            },
        })(({ uniques }) => mockElement);

        expectTypeOf<typeof doc.uniques>().toExtend<{
            target: Unique<typeof P>;
        }>();

        expectTypeOf<typeof doc.documentId>().toEqualTypeOf<string>();
    });

    it('should preserve const assertion on uniques keys', () => {
        const definition = {
            uniques: {
                first: P,
                second: Bold,
            },
        } as const;

        const doc = defineDocument(definition)(({ uniques }) => mockElement);

        // Keys should be literal types, not widened strings
        expectTypeOf<keyof typeof doc.uniques>().toEqualTypeOf<
            'first' | 'second'
        >();
    });

    it('should handle complex unique names', () => {
        const doc = defineDocument({
            uniques: {
                'section-1': P,
                section_2: P,
                $special: Bold,
            },
        })(({ uniques }) => mockElement);

        expectTypeOf<keyof typeof doc.uniques>().toEqualTypeOf<
            'section-1' | 'section_2' | '$special'
        >();
    });

    it('should type Document interface correctly', () => {
        type MyDoc = Document<{
            intro: typeof P;
            outro: typeof Bold;
        }>;

        expectTypeOf<MyDoc['uniques']>().toEqualTypeOf<{
            intro: Unique<typeof P>;
            outro: Unique<typeof Bold>;
        }>();
    });

    it('should not allow non-linkable tags in uniques', () => {
        const nonLinkableSchema = defineSchema({
            name: 'nonLinkable',
            type: 'block',
            linkable: false,
        })<{
            Data: undefined;
            Storage: undefined;
            Children: undefined;
        }>();

        const NonLinkableTag = defineTag({
            tagName: 'NonLinkable',
            schema: nonLinkableSchema,
        })<{}>(({ element }) => {});

        defineDocument({
            uniques: {
                // @ts-expect-error - should not allow non-linkable tags
                invalid: NonLinkableTag,
            },
        })(({ uniques }) => mockElement);
    });

    it('should handle single unique', () => {
        const doc = defineDocument({
            uniques: {
                single: P,
            },
        })(({ uniques }) => mockElement);

        expectTypeOf<typeof doc.uniques>().toExtend<{
            single: Unique<typeof P>;
        }>();
    });

    it('should preserve tag schema information through Unique type', () => {
        const doc = defineDocument({
            uniques: {
                target: P,
            },
        })(({ uniques }) => mockElement);

        // The unique should preserve the tag's schema
        expectTypeOf<typeof doc.uniques.target.tag>().toEqualTypeOf<typeof P>();

        // And the tag should have the correct schema
        type TagSchema =
            (typeof doc.uniques.target.tag)[typeof import('@jsprose/core').schemaKind];
        expectTypeOf<TagSchema>().toEqualTypeOf<typeof paragraphSchema>();
    });

    it('should not widen definition type parameter', () => {
        // Using const assertion to ensure no widening
        const definition = {
            uniques: { a: P, b: Bold },
        } as const;

        const doc1 = defineDocument(definition)(({ uniques }) => mockElement);

        // Should preserve exact types, not widen to Record<string, LinkableTag>
        expectTypeOf<keyof typeof doc1.uniques>().toEqualTypeOf<'a' | 'b'>();

        expectTypeOf<typeof doc1.uniques>().toEqualTypeOf<{
            readonly a: Unique<typeof P>;
            readonly b: Unique<typeof Bold>;
        }>();
    });
});

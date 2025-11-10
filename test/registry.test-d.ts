import { describe, it, expectTypeOf } from 'vitest';

import {
    defineRegistryItem,
    textSchema,
    type ProseElement,
} from '@jsprose/core';

import { Bold, P, paragraphSchema, storagableSchema } from './__reusable';

describe('defineRegistryItem', () => {
    it('should allow item without tags', () => {
        defineRegistryItem({ schema: paragraphSchema });
    });

    it('should error on createStorage when schema has no Storage', () => {
        defineRegistryItem({
            schema: textSchema,
            // @ts-expect-error
            createStorage: (element) => {},
        });
    });

    it('should allow createStorage when schema has Storage', () => {
        defineRegistryItem({ schema: storagableSchema });

        defineRegistryItem({
            schema: storagableSchema,
            createStorage: (element) => {
                expectTypeOf(element).toEqualTypeOf<
                    ProseElement<typeof storagableSchema>
                >();
                return { info: 'some storage' };
            },
        });
    });

    it('should error when tag schema mismatches item schema', () => {
        defineRegistryItem({
            schema: paragraphSchema,
            // @ts-expect-error
            tags: [Bold],
        });
    });

    it('should keep types', () => {
        const itemWithNoTags = defineRegistryItem({
            schema: paragraphSchema,
        });

        expectTypeOf(itemWithNoTags.tags).toEqualTypeOf<
            Record<string, never>
        >();

        const itemWithTag = defineRegistryItem({
            schema: paragraphSchema,
            tags: [P],
        });

        expectTypeOf(itemWithTag.schema).toEqualTypeOf<
            typeof paragraphSchema
        >();
        expectTypeOf(itemWithTag.tags).toEqualTypeOf<{ P: typeof P }>();
        expectTypeOf(itemWithNoTags.createStorage).toEqualTypeOf<undefined>();

        const itemWithStorage = defineRegistryItem({
            schema: storagableSchema,
            createStorage: (_element) => {
                return { info: 'data' };
            },
        });

        expectTypeOf(itemWithStorage.createStorage).toEqualTypeOf<
            (element: ProseElement<typeof storagableSchema>) => { info: string }
        >();
    });
});

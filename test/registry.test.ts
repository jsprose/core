import { describe, it, expect } from 'vitest';

import {
    defineSchema,
    defineTag,
    defineRegistryItem,
    PROSE_REGISTRY,
    textSchema,
    type TagChildren,
    type NoTagChildren,
} from '@jsprose/core';

// Exported test fixtures so type-only d.ts tests can import them.
// Heading schema (block, linkable, with level data and text children)
export const headingSchema = defineSchema({
    name: 'heading',
    type: 'block',
    linkable: true,
})<{
    Data: { level: 1 | 2 | 3 };
    Storage: undefined;
    Children: [typeof textSchema];
}>();

// Tag bound to headingSchema
export const headingTag = defineTag({
    tagName: 'Heading',
    schema: headingSchema,
})<{ level: 1 | 2 | 3 } & TagChildren>(() => {
    /* no-op */
});

// Incorrect heading tag (intentionally bound to textSchema for type error tests)
export const wrongHeadingTag = defineTag({
    tagName: 'WrongHeading',
    schema: textSchema,
})<{ level: 1 | 2 | 3 } & TagChildren>(() => {
    /* no-op */
});

// Simple text tag (no children)
export const textTag = defineTag({
    tagName: 'Text',
    schema: textSchema,
})<NoTagChildren>(() => {
    /* no-op */
});

// Additional schema/tag to exercise multi-item operations
export const otherSchema = defineSchema({
    name: 'other',
    type: 'block',
    linkable: false,
})<{
    Data: undefined;
    Storage: undefined;
    Children: undefined;
}>();

export const otherTag = defineTag({
    tagName: 'Other',
    schema: otherSchema,
})<NoTagChildren>(() => {
    /* no-op */
});

describe('PROSE_REGISTRY', () => {
    describe('addItem', () => {
        it('should register schema and tag', () => {
            const headingItem = defineRegistryItem({
                schema: headingSchema,
                tags: [headingTag],
            });
            PROSE_REGISTRY.addItem(headingItem);

            expect(PROSE_REGISTRY.getSchema('heading')).toBe(headingSchema);
            expect(PROSE_REGISTRY.getTag('Heading')).toBe(headingTag);
        });

        it('should throw on duplicate schema', () => {
            const duplicate = defineRegistryItem({
                schema: headingSchema,
                tags: [headingTag],
            });
            expect(() => PROSE_REGISTRY.addItem(duplicate)).toThrow(
                /already defined/i,
            );
        });
    });

    describe('removeItem', () => {
        it('should unregister schema and tags', () => {
            const headingItem = PROSE_REGISTRY.getItem('heading');
            PROSE_REGISTRY.removeItem(headingItem);
            expect(() => PROSE_REGISTRY.getItem('heading')).toThrow(
                /Missing item/,
            );
            expect(() => PROSE_REGISTRY.getTag('Heading')).toThrow(
                /Missing tag/,
            );
        });

        it('should unregister schema and tags when called with schema argument', () => {
            const headingItem = defineRegistryItem({
                schema: headingSchema,
                tags: [headingTag],
            });
            PROSE_REGISTRY.addItem(headingItem);

            PROSE_REGISTRY.removeItem(headingSchema);

            expect(() => PROSE_REGISTRY.getSchema('heading')).toThrow(
                /Missing schema/,
            );
            expect(() => PROSE_REGISTRY.getTag('Heading')).toThrow(
                /Missing tag/,
            );
        });
    });

    describe('addItems', () => {
        it('should register multiple new schemas', () => {
            const headingItem = defineRegistryItem({
                schema: headingSchema,
                tags: [headingTag],
            });
            const otherItem = defineRegistryItem({
                schema: otherSchema,
                tags: [otherTag],
            });
            PROSE_REGISTRY.addItems(headingItem, otherItem);

            expect(PROSE_REGISTRY.getSchema('heading')).toBe(headingSchema);
            expect(PROSE_REGISTRY.getSchema('other')).toBe(otherSchema);
        });
    });

    describe('setItems', () => {
        it('should replace previous custom items keeping defaults', () => {
            // New distinct schemas
            const alphaSchema = defineSchema({
                name: 'alpha',
                type: 'block',
                linkable: false,
            })<{
                Data: undefined;
                Storage: undefined;
                Children: undefined;
            }>();
            const betaSchema = defineSchema({
                name: 'beta',
                type: 'block',
                linkable: false,
            })<{
                Data: undefined;
                Storage: undefined;
                Children: undefined;
            }>();

            const alphaTag = defineTag({
                tagName: 'Alpha',
                schema: alphaSchema,
            })<NoTagChildren>(() => {});
            const betaTag = defineTag({
                tagName: 'Beta',
                schema: betaSchema,
            })<NoTagChildren>(() => {});

            const alphaItem = defineRegistryItem({
                schema: alphaSchema,
                tags: [alphaTag],
            });
            const betaItem = defineRegistryItem({
                schema: betaSchema,
                tags: [betaTag],
            });

            PROSE_REGISTRY.setItems(alphaItem, betaItem);

            // New schemas available
            expect(PROSE_REGISTRY.getSchema('alpha')).toBe(alphaSchema);
            expect(PROSE_REGISTRY.getSchema('beta')).toBe(betaSchema);
            // Old custom schemas gone
            expect(() => PROSE_REGISTRY.getSchema('heading')).toThrow(
                /Missing schema/,
            );
            expect(() => PROSE_REGISTRY.getSchema('other')).toThrow(
                /Missing schema/,
            );
            // Default schema still present (text)
            expect(PROSE_REGISTRY.getSchema('text')).toBe(textSchema);
        });
    });

    describe('getTagSchema', () => {
        it('should return the schema bound to a registered tag', () => {
            const tagSchema = defineSchema({
                name: 'gts-alpha',
                type: 'block',
                linkable: false,
            })<{
                Data: undefined;
                Storage: undefined;
                Children: undefined;
            }>();

            const tag = defineTag({
                tagName: 'GtsAlpha',
                schema: tagSchema,
            })<NoTagChildren>(() => {
                /* no-op */
            });

            const item = defineRegistryItem({ schema: tagSchema, tags: [tag] });
            PROSE_REGISTRY.addItem(item);

            expect(PROSE_REGISTRY.getTagSchema(tag)).toBe(tagSchema);
        });

        it("should throw when the tag's schema is not registered", () => {
            const unregSchema = defineSchema({
                name: 'gts-unreg',
                type: 'block',
                linkable: false,
            })<{
                Data: undefined;
                Storage: undefined;
                Children: undefined;
            }>();

            const unregTag = defineTag({
                tagName: 'GtsUnreg',
                schema: unregSchema,
            })<NoTagChildren>(() => {
                /* no-op */
            });

            expect(() => PROSE_REGISTRY.getTagSchema(unregTag)).toThrow(
                /Missing schema/i,
            );
        });
    });
});

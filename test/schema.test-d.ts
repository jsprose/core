import { expectTypeOf, test } from 'vitest';

import { defineSchema } from '@jsprose/core';

test('Do not allow non-schema/undefined types as Children', () => {
    // prettier-ignore
    defineSchema({
        type: 'inliner',
        name: 'nonSchemaChildren',
        linkable: false,
    })// @ts-expect-error
    <{
        Data: undefined;
        Storage: undefined;
        Children: [string, number];
    }>();
});

test('Do not allow block elements inside inliner elements', () => {
    const textSchema = defineSchema({
        type: 'inliner',
        name: 'text',
        linkable: false,
    })<{
        Data: { text: string };
        Storage: undefined;
        Children: undefined;
    }>();

    expectTypeOf<typeof textSchema>().toEqualTypeOf<{
        name: 'text';
        type: 'inliner';
        linkable: false;
        Data: { text: string };
        Storage: undefined;
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

    expectTypeOf<typeof paragraphSchema>().toEqualTypeOf<{
        name: 'paragraph';
        type: 'block';
        linkable: false;
        Data: undefined;
        Storage: undefined;
        Children: (typeof textSchema)[];
    }>();

    // prettier-ignore
    defineSchema({
        type: 'inliner',
        name: 'blockInsideInliner1',
        linkable: false,
    })// @ts-expect-error
    <{
        Data: undefined;
        Storage: undefined;
        Children: (typeof paragraphSchema)[];
    }>();

    // prettier-ignore
    defineSchema({
        type: 'inliner',
        name: 'blockInsideInliner2',
        linkable: false,
    })// @ts-expect-error
    <{
        Data: undefined;
        Storage: undefined;
        Children: [typeof textSchema, typeof paragraphSchema];
    }>();
});

import { describe, expect, it } from 'vitest';

import {
    textSchema,
    inlinersSchema,
    PROSE_REGISTRY,
    schemaKind,
    isolateProse,
} from '@jsprose/core';

import {
    Bold,
    boldRegistryItem,
    boldSchema,
    P,
    paragraphRegistryItem,
    paragraphSchema,
} from './__reusable';

describe('<Mix> ', () => {
    it('should return <Inliners> if all children are inliners', () => {
        isolateProse(() => {
            PROSE_REGISTRY.setItems(boldRegistryItem);

            const rawProse = (
                <>
                    Hello, {2} {undefined} <Bold>Aboba</Bold> {{ foo: 'bar' }}
                </>
            );

            expect(rawProse[schemaKind]).toEqual(inlinersSchema);
            expect(rawProse.children!.length).toBe(3);
            expect(rawProse.children![0][schemaKind]).toEqual(textSchema);
            expect(rawProse.children![1][schemaKind]).toEqual(boldSchema);
            expect(rawProse.children![2][schemaKind]).toEqual(textSchema);
        });
    });

    it('should return <Mix> if at least one child is block', () => {
        isolateProse(() => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const rawProse = (
                <>
                    Hello, {2} {undefined} {{ foo: 'bar' }}
                    <P>This is a paragraph.</P>
                </>
            );

            expect(rawProse.schemaName).toBe('mix');
            expect(rawProse.children!.length).toBe(2);
            expect(rawProse.children![0][schemaKind]).toEqual(textSchema);
            expect(rawProse.children![1][schemaKind]).toEqual(paragraphSchema);
        });
    });
});

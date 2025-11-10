import { describe, it, expect } from 'vitest';

import {
    defineDocument,
    insertDocumentId,
    PROSE_REGISTRY,
    isolateProse,
} from '@jsprose/core';

import { P, paragraphRegistryItem } from './__reusable';

describe('defineDocument', () => {
    it('should generate auto ID when no ID is provided', () => {
        isolateProse(() => {
            const document = defineDocument({})(() => <>Foo</>);
            expect(document.documentId).toEqual('__JSPROSE_DOCUMENT_ID_1__');
        });
    });

    it('should return raw element from content function', () => {
        isolateProse(() => {
            const document = defineDocument({})(() => <>Foo</>);
            expect(document.content).toEqual(<>Foo</>);
        });
    });

    it('should return assigned uniques', () => {
        isolateProse(() => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);
            const document = defineDocument({
                uniques: {
                    myUnique: P,
                },
            })(({ uniques }) => (
                <>
                    <P $={uniques.myUnique}>This is paragraph</P>
                </>
            ));

            expect(document.uniques.myUnique.name).toBe('myUnique');
            expect(document.uniques.myUnique.tag).toBe(P);
        });
    });

    it('should throw if uniques are not assigned', () => {
        expect(() => {
            isolateProse(() => {
                defineDocument({
                    uniques: {
                        myUnique: P,
                    },
                })(() => <>Foo</>);
            });
        }).toThrow();
    });
});

describe('insertDocumentId', () => {
    it('should insert ID as first argument when defineDocument has no explicit ID', () => {
        const input = 'const doc = defineDocument({ uniques: {} });';
        const result = insertDocumentId({
            insertIn: input,
            insertId: 'my-custom-id',
        });
        expect(result).toBe(
            "const doc = defineDocument('my-custom-id', { uniques: {} });",
        );
    });

    it('should not insert ID when defineDocument already has a string ID (single quotes)', () => {
        const input =
            "const doc = defineDocument('existing-id', { uniques: {} });";
        const result = insertDocumentId({
            insertIn: input,
            insertId: 'my-custom-id',
        });
        expect(result).toBe(
            "const doc = defineDocument('existing-id', { uniques: {} });",
        );
    });

    it('should not insert ID when defineDocument already has a string ID (double quotes)', () => {
        const input =
            'const doc = defineDocument("existing-id", { uniques: {} });';
        const result = insertDocumentId({
            insertIn: input,
            insertId: 'my-custom-id',
        });
        expect(result).toBe(
            'const doc = defineDocument("existing-id", { uniques: {} });',
        );
    });

    it('should handle defineDocument with newline after opening parenthesis', () => {
        const input = `const doc = defineDocument(
    { uniques: {} }
);`;
        const result = insertDocumentId({
            insertIn: input,
            insertId: 'docs/example.tsx',
        });
        expect(result).toBe(`const doc = defineDocument(
    'docs/example.tsx', { uniques: {} }
);`);
    });

    it('should handle multiple defineDocument calls', () => {
        const input = `
            const doc1 = defineDocument({ uniques: {} });
            const doc2 = defineDocument("explicit-id", { uniques: {} });
            const doc3 = defineDocument({ uniques: {} });
        `;
        const result = insertDocumentId({
            insertIn: input,
            insertId: 'shared-id',
        });
        expect(result).toContain(
            "const doc1 = defineDocument('shared-id', { uniques: {} });",
        );
        expect(result).toContain(
            'const doc2 = defineDocument("explicit-id", { uniques: {} });',
        );
        expect(result).toContain(
            "const doc3 = defineDocument('shared-id', { uniques: {} });",
        );
    });

    it('should work with custom function name alias', () => {
        const input = 'const doc = createDoc({ uniques: {} });';
        const result = insertDocumentId({
            insertIn: input,
            insertId: 'my-id',
            aliasName: 'createDoc',
        });
        expect(result).toBe("const doc = createDoc('my-id', { uniques: {} });");
    });

    it('should handle variable as first argument', () => {
        const input = 'const doc = defineDocument(myId, { uniques: {} });';
        const result = insertDocumentId({
            insertIn: input,
            insertId: 'my-id',
        });
        expect(result).toBe(
            'const doc = defineDocument(myId, { uniques: {} });',
        );
    });

    it('should handle template literal as first argument', () => {
        const input = 'const doc = defineDocument(`${id}`, { uniques: {} });';
        const result = insertDocumentId({
            insertIn: input,
            insertId: 'my-id',
        });
        expect(result).toBe(
            'const doc = defineDocument(`${id}`, { uniques: {} });',
        );
    });

    it('should handle nested objects with commas in definition', () => {
        const input =
            'const doc = defineDocument({ uniques: {}, nested: { a: 1, b: 2 } });';
        const result = insertDocumentId({
            insertIn: input,
            insertId: 'my-id',
        });
        expect(result).toBe(
            "const doc = defineDocument('my-id', { uniques: {}, nested: { a: 1, b: 2 } });",
        );
    });
});

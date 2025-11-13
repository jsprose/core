import { describe, expect, it } from 'vitest';

import {
    defineDocument,
    defineRegistryItem,
    defineSchema,
    defineTag,
    defineUnique,
    defineUniqueWrapper,
    isUnique,
    PROSE_REGISTRY,
    isolateProse,
    type NoTagChildren,
} from '@jsprose/core';

import { Bold, boldRegistryItem, P, paragraphRegistryItem } from './__reusable';

describe('defineUnique', () => {
    it('should throw when trying to double-assign rawElement', () => {
        isolateProse(() => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const pUnique = defineUnique({
                documentId: 'foo',
                name: 'pUnique',
                tag: P,
            });

            expect(() => (
                <>
                    <P $={pUnique}>First paragraph</P>
                    <P $={pUnique}>Second paragraph</P>
                </>
            )).toThrow();
        });
    });

    it('should throw when trying assing rawElement with incorrect tag', () => {
        isolateProse(() => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem, boldRegistryItem);

            const pUnique = defineUnique({
                documentId: 'foo',
                name: 'pUnique',
                tag: P,
            });

            expect(() => (
                <>
                    <P>
                        {/* @ts-expect-error */}
                        First <Bold $={pUnique}>paragraph</Bold>
                    </P>
                </>
            )).toThrow();
        });
    });

    it('should throw when using invalid unique name', () => {
        expect(() => {
            defineUnique({
                documentId: 'foo',
                name: 'invalid-unique-name',
                tag: P,
            });
        }).toThrow();
    });
});

describe('isUnique', () => {
    const pUnique = defineUnique({
        documentId: 'foo',
        name: 'pUnique',
        tag: P,
    });

    it('should identify unique with and without tag correctly', () => {
        expect(isUnique(pUnique)).toBe(true);
        expect(isUnique(pUnique, P)).toBe(true);
        expect(isUnique(pUnique, Bold)).toBe(false);
    });

    it('should return false for non-unique values', () => {
        expect(isUnique({})).toBe(false);
        expect(isUnique(null)).toBe(false);
        expect(isUnique(undefined)).toBe(false);
        expect(isUnique(123)).toBe(false);
        expect(isUnique('unique')).toBe(false);
    });
});

it('should assing unique name to rawElement when used in JSX', () => {
    isolateProse(() => {
        PROSE_REGISTRY.setItems(paragraphRegistryItem);

        const pUnique = defineUnique({
            documentId: 'foo',
            name: 'pUnique',
            tag: P,
        });

        const rawProse = (
            <>
                <P $={pUnique}>First paragraph</P>
            </>
        );

        expect(rawProse.children!.length).toBe(1);
        expect(rawProse.children![0].uniqueName).toBe('pUnique');
    });
});

it("should be possible to reuse unique (with clone's name turned into slug)", () => {
    isolateProse(() => {
        PROSE_REGISTRY.setItems(paragraphRegistryItem);

        const pUnique = defineUnique({
            documentId: 'foo',
            name: 'pUnique',
            tag: P,
        });

        const rawProse = (
            <>
                <P $={pUnique}>First paragraph</P>
                {pUnique}
            </>
        );

        expect(rawProse.children!.length).toBe(2);

        const original = rawProse.children![0];
        const clone = rawProse.children![1];

        expect(original.uniqueName).toBe('pUnique');
        expect(original.slug).toBeUndefined();

        expect(clone.uniqueName).toBeUndefined();
        expect(clone.slug).toBe('pUnique');

        expect(original === clone).toBe(false); // Because 1 is a clone
        expect({
            ...original,
            slug: 'pUnique',
        }).toStrictEqual({
            ...clone,
            uniqueName: 'pUnique',
        });
    });
});

it('should not be possible to create and assign to unique to non-linkable element', () => {
    const nonLinkableSchema = defineSchema({
        name: 'nonLinkable',
        type: 'block',
        linkable: false,
    })<{
        Data: undefined;
        Storage: undefined;
        Children: undefined;
    }>();

    const NonLinkable = defineTag({
        tagName: 'NonLinkable',
        schema: nonLinkableSchema,
    })<NoTagChildren>(() => {});

    isolateProse(() => {
        PROSE_REGISTRY.setItems(
            defineRegistryItem({
                schema: nonLinkableSchema,
                tags: [NonLinkable],
            }),
        );

        const nonLinkableUnique = defineUnique({
            documentId: 'foo',
            name: 'nonLinkableUnique',
            // @ts-expect-error
            tag: NonLinkable,
        });

        expect(() => {
            <>
                {/* @ts-expect-error */}
                <NonLinkable $={nonLinkableUnique} />
            </>;
        }).toThrow();
    });
});

describe('defineUniqueWrapper', () => {
    it('should wrap unique and produce correct rawElement', () => {
        isolateProse(() => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const pUnique = defineUnique({
                documentId: 'foo',
                name: 'pUnique',
                tag: P,
            });

            const PWrapper = defineUniqueWrapper(P, (unique) => {
                return <P $={unique}>Wrapped content</P>;
            });

            const rawProse = (
                <>
                    <PWrapper $={pUnique} />
                </>
            );

            expect(rawProse.children!.length).toBe(1);
            expect(rawProse.children![0].tagName).toBe('P');
            expect(rawProse.children![0].uniqueName).toBe('pUnique');
            expect(rawProse.children![0].children![0].data).toBe(
                'Wrapped content',
            );
        });
    });

    it('should error when using unique with incorrect tag', () => {
        isolateProse(() => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem, boldRegistryItem);

            const boldUnique = defineUnique({
                documentId: 'foo',
                name: 'boldUnique',
                tag: Bold,
            });

            const PWrapper = defineUniqueWrapper(P, (unique) => {
                return <P $={unique}>Wrapped</P>;
            });

            // @ts-expect-error - passing Bold unique to P wrapper
            expect(() => <PWrapper $={boldUnique} />).toThrow();
        });
    });

    it('should error when using unique with incorrect tag inside wrapper', () => {
        isolateProse(() => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem, boldRegistryItem);

            const pUnique = defineUnique({
                documentId: 'foo',
                name: 'pUnique',
                tag: P,
            });

            // This wrapper tries to use P unique with Bold tag
            const InvalidWrapper = defineUniqueWrapper(P, (unique) => {
                // @ts-expect-error - using P unique with Bold tag
                return <Bold $={unique}>Invalid</Bold>;
            });

            // Even though this would be caught at wrapper definition time,
            // let's verify it doesn't execute correctly
            expect(() => <InvalidWrapper $={pUnique} />).toThrow();
        });
    });

    it('should not allow children in unique wrapper props', () => {
        isolateProse(() => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const unique = defineUnique({
                documentId: 'foo',
                name: 'pUnique',
                tag: P,
            });

            const PWrapper = defineUniqueWrapper(P, (unique) => {
                return <P $={unique}>My wrapped paragraph</P>;
            });

            // @ts-expect-error - children are not allowed in unique wrapper props
            <PWrapper $={unique}>Some children</PWrapper>;
        });
    });

    it('should correctly assing document-level uniques', () => {
        isolateProse(() => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const PWrapper = defineUniqueWrapper(P, (unique) => {
                return <P $={unique}>My wrapped paragraph</P>;
            });

            expect(() => {
                defineDocument({
                    uniques: {
                        pUnique: P,
                    },
                })(({ uniques }) => (
                    <>
                        <PWrapper $={uniques.pUnique} />
                    </>
                ));
            }).not.toThrow();
        });
    });
});

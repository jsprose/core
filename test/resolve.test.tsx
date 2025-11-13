import { describe, it, expect } from 'vitest';

import {
    resolveRawElement,
    PROSE_REGISTRY,
    defineSchema,
    defineTag,
    defineRegistryItem,
    type NoTagChildren,
    isolateProse,
    isProseElement,
    isRawElement,
} from '@jsprose/core';

import {
    P,
    paragraphRegistryItem,
    boldRegistryItem,
    paragraphSchema,
} from './__reusable';

describe('resolveRawElement', () => {
    it('should transform raw element and itds children into prose elements', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem, boldRegistryItem);

            const { proseElement } = await resolveRawElement({
                rawElement: (
                    <>
                        <P>Hello</P>
                        <P>world</P>
                    </>
                ),
            });

            expect(isProseElement(proseElement)).toBe(true);
            expect(proseElement.children).toHaveLength(2);
            expect(
                isProseElement(proseElement.children![0], paragraphSchema),
            ).toBe(true);
            expect(
                isProseElement(proseElement.children![1], paragraphSchema),
            ).toBe(true);
        });
    });

    it('should assign IDs to linkable elements when linkable is true', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const rawElement = <P>Test</P>;
            const { proseElement } = await resolveRawElement({
                rawElement,
                linkable: true,
            });

            expect(proseElement.id).toBeDefined();
            expect(typeof proseElement.id).toBe('string');
        });
    });

    it('should not assign IDs when linkable is false', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const rawElement = <P>Test</P>;
            const { proseElement } = await resolveRawElement({
                rawElement,
                linkable: false,
            });

            expect(proseElement.id).toBeUndefined();
        });
    });

    it('should use slug for ID generation if provided', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const rawElement = <P>Test</P>;
            rawElement.slug = 'myCustomSlug';

            const { proseElement } = await resolveRawElement({
                rawElement,
                linkable: true,
            });

            expect(proseElement.id).toBe('my-custom-slug');
        });
    });

    it('should track uniques and convert uniqueName to kebab-case ID', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const rawElement = <P>Test</P>;
            rawElement.uniqueName = 'myUniqueParagraph';

            const { proseElement, uniques } = await resolveRawElement({
                rawElement,
                linkable: true,
            });

            expect(proseElement.uniqueName).toBe('myUniqueParagraph');
            expect(proseElement.id).toBe('my-unique-paragraph');
            expect(uniques['myUniqueParagraph']).toBe(proseElement);
        });
    });

    it('should throw on duplicate unique IDs', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const raw1 = <P>First</P>;
            raw1.uniqueName = 'sameName';

            const raw2 = <P>Second</P>;
            raw2.uniqueName = 'sameName';

            await expect(
                resolveRawElement({
                    linkable: true,
                    rawElement: (
                        <>
                            {raw1}
                            {raw2}
                        </>
                    ),
                }),
            ).rejects.toThrow();

            await expect(
                resolveRawElement({
                    linkable: true,
                    ids: new Set<string>(['same-name']),
                    rawElement: <>{raw1}</>,
                }),
            ).rejects.toThrow();
        });
    });

    it('should call "pre" and "post" functions of hook when resolving each element', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const preElements: any[] = [];
            const postElements: any[] = [];

            await resolveRawElement({
                rawElement: (
                    <>
                        <P>First</P>
                        <P>Second</P>
                    </>
                ),
                hook: () => ({
                    pre: (element) => {
                        preElements.push(element);
                    },
                    post: (element) => {
                        postElements.push(element);
                    },
                }),
            });

            expect(preElements.length).toBe(5);
            expect(preElements.every((el) => isRawElement(el))).toBe(true);

            expect(postElements.length).toBe(5);
            expect(postElements.every((el) => isProseElement(el))).toBe(true);
        });
    });

    it('should not add ids to non-linkable schemas', async () => {
        await isolateProse(async () => {
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

            PROSE_REGISTRY.setItems(
                defineRegistryItem({
                    schema: nonLinkableSchema,
                    tags: [NonLinkable],
                }),
            );

            const { proseElement, ids } = await resolveRawElement({
                linkable: true,
                rawElement: (
                    <>
                        <NonLinkable />
                        <NonLinkable />
                        <NonLinkable />
                    </>
                ),
            });

            expect(ids).toEqual(new Set<string>());
            expect(proseElement.children).toHaveLength(3);
            for (const child of proseElement.children!) {
                expect(child.id).toBeUndefined();
            }
        });
    });

    it('should deduplicate IDs by appending counter', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const raw1 = <P>First</P>;
            raw1.slug = 'sameSlug';

            const raw2 = <P>Second</P>;
            raw2.slug = 'sameSlug';

            const raw3 = <P>Third</P>;
            raw3.slug = 'sameSlug';

            const { ids } = await resolveRawElement({
                rawElement: (
                    <>
                        {raw1}
                        {raw2}
                        {raw3}
                    </>
                ),
                linkable: true,
            });

            expect(ids).toEqual(
                new Set<string>(['same-slug', 'same-slug-1', 'same-slug-2']),
            );
        });
    });

    it('should never add dedupe suffixes to unique IDs', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const collisionElement = <P>Collision</P>;
            collisionElement.slug = 'my-unique';

            const uniqueElement = <P>Unique</P>;
            uniqueElement.uniqueName = 'myUnique';

            const { ids } = await resolveRawElement({
                linkable: true,
                rawElement: (
                    <>
                        {collisionElement}
                        {uniqueElement}
                    </>
                ),
            });

            expect(ids).toEqual(new Set<string>(['my-unique', 'my-unique-1']));
        });
    });

    it('should accept external IDs to avoid collisions with', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);
            const externalIds = new Set<string>(['external-id', 'my-unique']);

            const raw1 = <P>External</P>;
            raw1.slug = 'external-id';

            const raw2 = <P>Unique</P>;
            raw2.uniqueName = 'myUnique2';

            const { ids } = await resolveRawElement({
                linkable: true,
                ids: externalIds,
                rawElement: (
                    <>
                        {raw1}
                        {raw2}
                    </>
                ),
            });

            expect(ids).toEqual(
                new Set<string>([
                    'external-id',
                    'my-unique',
                    'external-id-1',
                    'my-unique2',
                ]),
            );
        });
    });
});

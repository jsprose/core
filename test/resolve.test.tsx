import { describe, it, expect } from 'vitest';

import {
    resolveRawElement,
    PROSE_REGISTRY,
    defineSchema,
    defineTag,
    defineRegistryItem,
    type NoTagChildren,
    isolateProse,
} from '@jsprose/core';

import { P, paragraphRegistryItem, boldRegistryItem } from './__reusable';

describe('resolveRawElement', () => {
    it('should transform RawElement to ProseElement', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const rawElement = <P>Hello world</P>;
            const result = await resolveRawElement({ rawElement });

            expect(result.proseElement.__JSPROSE_element).toBe(true);
            expect(result.proseElement.schemaName).toBe('paragraph');
            expect(result.uniques).toEqual({});
        });
    });

    it('should recursively resolve children', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem, boldRegistryItem);

            const rawElement = (
                <>
                    <P>Hello</P>
                    <P>world</P>
                </>
            );
            const { proseElement } = await resolveRawElement({ rawElement });

            expect(proseElement.children).toHaveLength(2);
            expect(proseElement.children![0].__JSPROSE_element).toBe(true);
            expect(proseElement.children![0].schemaName).toBe('paragraph');
            expect(proseElement.children![1].__JSPROSE_element).toBe(true);
            expect(proseElement.children![1].schemaName).toBe('paragraph');
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

    it('should generate unique IDs for multiple linkable elements', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const rawElement = (
                <>
                    <P>First</P>
                    <P>Second</P>
                    <P>Third</P>
                </>
            );

            const ids = new Set<string>();
            for (const child of rawElement.children!) {
                const { proseElement } = await resolveRawElement({
                    rawElement: child,
                    linkable: true,
                });
                expect(proseElement.id).toBeDefined();
                expect(ids.has(proseElement.id!)).toBe(false);
                ids.add(proseElement.id!);
            }
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

            const container = (
                <>
                    {raw1}
                    {raw2}
                </>
            );

            await expect(
                resolveRawElement({ rawElement: container, linkable: true }),
            ).rejects.toThrow(/Duplicate unique element ID/);
        });
    });

    it('should call pre hook before resolving each element', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const rawElement = (
                <>
                    <P>First</P>
                    <P>Second</P>
                </>
            );

            const preElements: any[] = [];
            await resolveRawElement({
                rawElement,
                pre: (element) => {
                    preElements.push(element);
                },
            });

            expect(preElements.length).toBeGreaterThan(0);
            expect(preElements.every((el) => el.__JSPROSE_rawElement)).toBe(
                true,
            );
        });
    });

    it('should call post hook after resolving each element', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const rawElement = (
                <>
                    <P>First</P>
                    <P>Second</P>
                </>
            );

            const postElements: any[] = [];
            await resolveRawElement({
                rawElement,
                post: (element) => {
                    postElements.push(element);
                },
            });

            expect(postElements.length).toBeGreaterThan(0);
            expect(postElements.every((el) => el.__JSPROSE_element)).toBe(true);
        });
    });

    it('should handle non-linkable schemas correctly', async () => {
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

            const rawElement = <NonLinkable />;
            const { proseElement } = await resolveRawElement({
                rawElement,
                linkable: true,
            });

            expect(proseElement.id).toBeUndefined();
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

            const container = (
                <>
                    {raw1}
                    {raw2}
                    {raw3}
                </>
            );

            const { proseElement } = await resolveRawElement({
                rawElement: container,
                linkable: true,
            });

            const ids = proseElement.children!.map((c) => c.id);
            expect(ids).toContain('same-slug');
            expect(ids).toContain('same-slug-1');
            expect(ids).toContain('same-slug-2');
        });
    });
});

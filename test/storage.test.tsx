import { describe, it, expect } from 'vitest';

import {
    fillStorage,
    PROSE_REGISTRY,
    defineSchema,
    defineTag,
    defineRegistryItem,
    type TagChildren,
    type NoTagChildren,
    ensureTagChildren,
    textSchema,
    resolveRawElement,
    type GenericStorage,
    type ProseElement,
    type AnySchema,
    isolateProse,
} from '@jsprose/core';

describe('fillStorage', () => {
    // Define a schema with storage
    const imageSchema = defineSchema({
        name: 'image',
        type: 'block',
        linkable: true,
    })<{
        Data: { src: string };
        Storage: { width: number; height: number };
        Children: undefined;
    }>();

    const Image = defineTag({
        tagName: 'Image',
        schema: imageSchema,
    })<NoTagChildren & { src: string }>(({ element, props }) => {
        element.data = { src: props.src };
        element.storageKey = props.src;
    });

    const imageRegistryItem = defineRegistryItem({
        schema: imageSchema,
        tags: [Image],
        createStorage: async (proseElement: ProseElement<AnySchema>) => {
            // Simulate fetching image dimensions
            const src = (proseElement.data as any).src;
            if (src === 'cat.jpg') {
                return { width: 800, height: 600 };
            } else if (src === 'dog.jpg') {
                return { width: 1024, height: 768 };
            }
            return { width: 100, height: 100 };
        },
    });

    // Define another schema with storage
    const videoSchema = defineSchema({
        name: 'video',
        type: 'block',
        linkable: true,
    })<{
        Data: { url: string };
        Storage: { duration: number };
        Children: undefined;
    }>();

    const Video = defineTag({
        tagName: 'Video',
        schema: videoSchema,
    })<NoTagChildren & { url: string }>(({ element, props }) => {
        element.data = { url: props.url };
        element.storageKey = props.url;
    });

    const videoRegistryItem = defineRegistryItem({
        schema: videoSchema,
        tags: [Video],
        createStorage: async (proseElement: ProseElement<AnySchema>) => {
            // Simulate fetching video metadata
            const url = (proseElement.data as any).url;
            if (url === 'intro.mp4') {
                return { duration: 120 };
            }
            return { duration: 60 };
        },
    });

    // Define a schema without storage
    const paragraphSchema = defineSchema({
        name: 'paragraph',
        type: 'block',
        linkable: true,
    })<{
        Data: undefined;
        Storage: undefined;
        Children: (typeof textSchema)[];
    }>();

    const P = defineTag({
        tagName: 'P',
        schema: paragraphSchema,
    })<TagChildren>(({ tagName, element, children }) => {
        ensureTagChildren(tagName, children, textSchema);
        element.children = children;
    });

    const paragraphRegistryItem = defineRegistryItem({
        schema: paragraphSchema,
        tags: [P],
    });

    it('should fill storage for elements with storage creators', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(imageRegistryItem);

            const rawElement = <Image src="cat.jpg" />;
            const { proseElement } = await resolveRawElement({ rawElement });

            const storage: GenericStorage = {};
            const storageCreators = PROSE_REGISTRY.getStorageCreators();

            await fillStorage({
                storage,
                proseElement,
                storageCreators,
            });

            expect(storage['cat.jpg']).toEqual({ width: 800, height: 600 });
        });
    });

    it('should fill storage for multiple elements', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(imageRegistryItem);

            const rawElement = (
                <>
                    <Image src="cat.jpg" />
                    <Image src="dog.jpg" />
                </>
            );
            const { proseElement } = await resolveRawElement({ rawElement });

            const storage: GenericStorage = {};
            const storageCreators = PROSE_REGISTRY.getStorageCreators();

            await fillStorage({
                storage,
                proseElement,
                storageCreators,
            });

            expect(storage['cat.jpg']).toEqual({ width: 800, height: 600 });
            expect(storage['dog.jpg']).toEqual({ width: 1024, height: 768 });
        });
    });

    it('should skip elements without storage', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const rawElement = <P>Hello world</P>;
            const { proseElement } = await resolveRawElement({ rawElement });

            const storage: GenericStorage = {};
            const storageCreators = PROSE_REGISTRY.getStorageCreators();

            await fillStorage({
                storage,
                proseElement,
                storageCreators,
            });

            expect(Object.keys(storage)).toHaveLength(0);
        });
    });

    it('should handle mixed elements with and without storage', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(
                paragraphRegistryItem,
                imageRegistryItem,
                videoRegistryItem,
            );

            const rawElement = (
                <>
                    <P>Introduction</P>
                    <Image src="cat.jpg" />
                    <P>Some text</P>
                    <Video url="intro.mp4" />
                </>
            );
            const { proseElement } = await resolveRawElement({ rawElement });

            const storage: GenericStorage = {};
            const storageCreators = PROSE_REGISTRY.getStorageCreators();

            await fillStorage({
                storage,
                proseElement,
                storageCreators,
            });

            expect(storage['cat.jpg']).toEqual({ width: 800, height: 600 });
            expect(storage['intro.mp4']).toEqual({ duration: 120 });
            expect(Object.keys(storage)).toHaveLength(2);
        });
    });

    it('should handle nested elements with storage', async () => {
        await isolateProse(async () => {
            // Create a container schema that can hold images
            const containerSchema = defineSchema({
                name: 'container',
                type: 'block',
                linkable: false,
            })<{
                Data: undefined;
                Storage: undefined;
                Children: (typeof imageSchema)[];
            }>();

            const Container = defineTag({
                tagName: 'Container',
                schema: containerSchema,
            })<TagChildren>(({ tagName, element, children }) => {
                ensureTagChildren(tagName, children, imageSchema);
                element.children = children;
            });

            const containerRegistryItem = defineRegistryItem({
                schema: containerSchema,
                tags: [Container],
            });

            PROSE_REGISTRY.setItems(containerRegistryItem, imageRegistryItem);

            const rawElement = (
                <Container>
                    <Image src="cat.jpg" />
                    <Image src="dog.jpg" />
                </Container>
            );
            const { proseElement } = await resolveRawElement({ rawElement });

            const storage: GenericStorage = {};
            const storageCreators = PROSE_REGISTRY.getStorageCreators();

            await fillStorage({
                storage,
                proseElement,
                storageCreators,
            });

            expect(storage['cat.jpg']).toEqual({ width: 800, height: 600 });
            expect(storage['dog.jpg']).toEqual({ width: 1024, height: 768 });
        });
    });

    it('should not overwrite existing storage values', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(imageRegistryItem);

            const rawElement = <Image src="cat.jpg" />;
            const { proseElement } = await resolveRawElement({ rawElement });

            const storage: GenericStorage = {
                'cat.jpg': { width: 999, height: 999 },
            };
            const storageCreators = PROSE_REGISTRY.getStorageCreators();

            await fillStorage({
                storage,
                proseElement,
                storageCreators,
            });

            // Should not overwrite existing value
            expect(storage['cat.jpg']).toEqual({ width: 999, height: 999 });
        });
    });

    it('should call step callback for each element', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem, imageRegistryItem);

            const rawElement = (
                <>
                    <P>Text</P>
                    <Image src="cat.jpg" />
                    <P>More text</P>
                </>
            );
            const { proseElement } = await resolveRawElement({ rawElement });

            const storage: GenericStorage = {};
            const storageCreators = PROSE_REGISTRY.getStorageCreators();
            const steppedElements: string[] = [];

            await fillStorage({
                storage,
                proseElement,
                storageCreators,
                step: (element) => {
                    steppedElements.push(element.schemaName);
                },
            });

            // Should include the root fragment and all children
            expect(steppedElements).toContain('paragraph');
            expect(steppedElements).toContain('image');
            expect(
                steppedElements.filter((s) => s === 'paragraph'),
            ).toHaveLength(2);
        });
    });

    it('should handle elements with same storage key', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(imageRegistryItem);

            const rawElement = (
                <>
                    <Image src="cat.jpg" />
                    <Image src="cat.jpg" />
                </>
            );
            const { proseElement } = await resolveRawElement({ rawElement });

            const storage: GenericStorage = {};
            const storageCreators = PROSE_REGISTRY.getStorageCreators();

            await fillStorage({
                storage,
                proseElement,
                storageCreators,
            });

            // Should only create storage once for the same key
            expect(storage['cat.jpg']).toEqual({ width: 800, height: 600 });
            expect(Object.keys(storage)).toHaveLength(1);
        });
    });

    it('should skip elements with undefined storage creator', async () => {
        await isolateProse(async () => {
            // Define a schema with storage type but no creator
            const customSchema = defineSchema({
                name: 'custom',
                type: 'block',
                linkable: false,
            })<{
                Data: undefined;
                Storage: { value: string };
                Children: undefined;
            }>();

            const Custom = defineTag({
                tagName: 'Custom',
                schema: customSchema,
            })<{}>(({ element }) => {
                element.storageKey = 'custom-key';
            });

            // No createStorage provided
            const customRegistryItem = defineRegistryItem({
                schema: customSchema,
                tags: [Custom],
            });

            PROSE_REGISTRY.setItems(customRegistryItem);

            const rawElement = <Custom />;
            const { proseElement } = await resolveRawElement({ rawElement });

            const storage: GenericStorage = {};
            const storageCreators = PROSE_REGISTRY.getStorageCreators();

            await fillStorage({
                storage,
                proseElement,
                storageCreators,
            });

            // Storage should be empty since no creator was provided
            expect(Object.keys(storage)).toHaveLength(0);
        });
    });
});

import { describe, it, expect } from 'vitest';

import {
    walkElements,
    WalkStop,
    WalkNoDeeper,
    resolveRawElement,
    PROSE_REGISTRY,
    isolateProse,
} from '@jsprose/core';

import { P, paragraphRegistryItem, boldRegistryItem, Bold } from './__reusable';

describe('walkElements', () => {
    it('should walk through raw elements all elements', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem, boldRegistryItem);

            const rawElement = (
                <>
                    <P>First paragraph</P>
                    <P>Second paragraph</P>
                </>
            );

            const visited: string[] = [];
            await walkElements(rawElement, (element) => {
                visited.push(element.schemaName);
            });

            expect(visited).toEqual([
                'mix',
                'paragraph',
                'text',
                'paragraph',
                'text',
            ]);
        });
    });

    it('should walk through prose elements nested elements', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem, boldRegistryItem);

            const rawElement = (
                <>
                    <P>First</P>
                    <P>Second</P>
                    <P>Third</P>
                </>
            );

            const { proseElement } = await resolveRawElement({ rawElement });

            const visited: string[] = [];
            await walkElements(proseElement, (element) => {
                visited.push(element.schemaName);
            });

            expect(visited).toEqual([
                'mix',
                'paragraph',
                'text',
                'paragraph',
                'text',
                'paragraph',
                'text',
            ]);
        });
    });

    it('should stop walking when WalkStop is returned', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem, boldRegistryItem);

            const rawElement = (
                <>
                    <P>First</P>
                    <P>Second</P>
                    <P>Third</P>
                </>
            );

            const { proseElement } = await resolveRawElement({ rawElement });

            const visited: string[] = [];
            const result = await walkElements(proseElement, (element) => {
                visited.push(element.schemaName);
                if (element.schemaName === 'paragraph') {
                    return WalkStop;
                }
            });

            expect(result).toBe(WalkStop);
            expect(visited).toEqual(['mix', 'paragraph']);
        });
    });

    it('should skip children when WalkNoDeeper is returned', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem, boldRegistryItem);

            const rawElement = (
                <>
                    <P>First paragraph</P>
                    <P>Second paragraph</P>
                </>
            );

            const { proseElement } = await resolveRawElement({ rawElement });

            let pEncountered = false;
            const visited: string[] = [];
            await walkElements(proseElement, (element) => {
                visited.push(element.schemaName);
                if (element.schemaName === 'paragraph' && !pEncountered) {
                    pEncountered = true;
                    return WalkNoDeeper;
                }
            });

            expect(visited).toEqual([
                'mix',
                'paragraph',
                /* skipped 'text' */
                'paragraph',
                'text',
            ]);
        });
    });

    it('should handle async step functions', async () => {
        await isolateProse(async () => {
            PROSE_REGISTRY.setItems(paragraphRegistryItem);

            const rawElement = (
                <>
                    <P>First</P>
                    <P>Second</P>
                </>
            );

            const { proseElement } = await resolveRawElement({ rawElement });

            const visited: string[] = [];
            await walkElements(proseElement, async (element) => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                visited.push(element.schemaName);
            });

            expect(visited).toEqual([
                'mix',
                'paragraph',
                'text',
                'paragraph',
                'text',
            ]);
        });
    });
});

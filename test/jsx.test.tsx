import { expect, it } from 'vitest';

import { PROSE_REGISTRY, isolateProse } from '@jsprose/core';

import { P, paragraphRegistryItem } from './__reusable';

it('should accept non-tag functions', () => {
    isolateProse(() => {
        PROSE_REGISTRY.setItems(paragraphRegistryItem);

        function ConditionalElement(props: {
            foo?: boolean;
            children?: undefined;
        }) {
            return props.foo ? <P>Foo paragraph</P> : <P>Bar paragraph</P>;
        }

        const rawProse = (
            <>
                <ConditionalElement foo />
                <ConditionalElement />
                {/* @ts-expect-error No children allowed */}
                <ConditionalElement>Hello World</ConditionalElement>
            </>
        );

        expect(rawProse.children!.length).toBe(3);
        expect(rawProse.children![0]).toEqual(<P>Foo paragraph</P>);
        expect(rawProse.children![1]).toEqual(<P>Bar paragraph</P>);
        expect(rawProse.children![2]).toEqual(<P>Bar paragraph</P>);
    });
});

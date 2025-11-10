import { inlinersTag, type inlinersSchema } from './default/inliners.js';
import { mixTag, type mixSchema } from './default/mix.js';
import type { RawElement } from './element.js';
import type { AnySchema } from './schema.js';
import { PROSE_REGISTRY } from './singleton.js';
import type { AnyTag } from './tag.js';

declare global {
    namespace JSX {
        /** No intrinsic elements to avoid first letter casing confusion. */
        interface IntrinsicElements {}

        /**
         * Unfortunately, JSX/TSX tag constructions (<...>) always return general JSX.Element type.
         * No matter what tag you use, it will be widened to JSX.Element loosing all generics.
         * This prevents some cool compile/editor time checkings like prohibiting certain tags in specific contexts (blocks in inliners and etc.)
         * All this has to be done in runtime or with other tools, like ESLint.
         *
         * @todo Remove this when TypeScript supports proper JSX/TSX generics.
         * @see [TypeScript issue](https://github.com/microsoft/TypeScript/issues/21699)
         */
        type Element = RawElement<AnySchema>;
    }
}

export function Fragment(
    props: Record<string, any>,
): RawElement<typeof mixSchema> | RawElement<typeof inlinersSchema> {
    try {
        return inlinersTag({ ...props });
    } catch {
        return mixTag({ ...props });
    }
}

export function jsx(tag: AnyTag<AnySchema>, props: Record<string, any>) {
    const augmentedProps = { ...props, __JSPROSERegistry: PROSE_REGISTRY };

    if (tag === Fragment) {
        return Fragment(augmentedProps);
    }

    return tag(augmentedProps);
}

export const jsxs = jsx;
export const jsxDEV = jsx;

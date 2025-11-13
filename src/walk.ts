import type { ProseElement, RawElement } from './element.js';
import type { AnySchema } from './schema.js';

export const WalkStop = { __JSPROSE_walkStop: true };
export const WalkNoDeeper = { __JSPROSE_walkNoDeeper: true };

/**
 * Walk raw/prose element and its children, calling fallback `step` for each element.
 *
 * If `step` returns `WalkNoDeeper`, children of current element will be skipped.
 * If `step` returns `WalkStop`, the whole walk process will be stopped immediately.
 */
export async function walkElements<
    TElementKind extends RawElement<AnySchema> | ProseElement<AnySchema>,
>(
    element: TElementKind,
    step: (
        element: TElementKind,
    ) =>
        | typeof WalkStop
        | typeof WalkNoDeeper
        | void
        | Promise<typeof WalkStop | typeof WalkNoDeeper | void>,
): Promise<typeof WalkStop | void> {
    const result = await step(element);

    if (result === WalkStop) {
        return WalkStop;
    }

    if (result === WalkNoDeeper) {
        return;
    }

    const children = element.children;
    if (children) {
        for (const child of children.filter(Boolean)) {
            const childResult = await walkElements(child as TElementKind, step);
            if (childResult === WalkStop) {
                return WalkStop;
            }
        }
    }
}

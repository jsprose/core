import { draftElement, type ProseElement, type RawElement } from './element.js';
import { createId, throwDuplicateUniqueId, uniqueName2Id } from './id.js';
import { type AnySchema } from './schema.js';
import { PROSE_REGISTRY } from './singleton.js';
import { walkElements } from './walk.js';

/**
 * Transforms given RawElement into ProseElement.
 * If `linkable` is true, linkable elements will receive IDs that are unique across given raw element children.
 */
export async function resolveRawElement(args: {
    rawElement: RawElement<AnySchema>;
    linkable?: boolean;
    ids?: Set<string>;
    pre?: (rawElement: RawElement<AnySchema>) => Promise<void> | void;
    post?: (proseElement: ProseElement<AnySchema>) => Promise<void> | void;
    step?: ResolveStep;
}): Promise<ResolvedRawElement> {
    const { rawElement, linkable, pre, post, step, ids: externalIds } = args;

    const ids = new Set<string>(externalIds);
    const uniqueIds = new Set<string>();
    if (linkable) {
        // We need to pre-scan all children uniques to avoid collisions between auto-generated IDs and unique IDs
        await walkElements(rawElement, async (rawElement) => {
            if (rawElement.uniqueName) {
                const id = uniqueName2Id(rawElement.uniqueName);
                if (ids.has(id)) {
                    throwDuplicateUniqueId(rawElement.uniqueName, id);
                }
                uniqueIds.add(id);
            }
        });
    }

    const uniques: Record<string, ProseElement<AnySchema>> = {};

    async function resolveRecursive(
        rawElement: RawElement<AnySchema>,
    ): Promise<ProseElement<AnySchema>> {
        let resolvedChildren: ProseElement<AnySchema>[] | undefined = undefined;

        if (rawElement.children) {
            resolvedChildren = [];
            for (const child of rawElement.children) {
                const resolvedChild = await resolveRecursive(child);
                resolvedChildren.push(resolvedChild);
            }
        }

        if (pre) {
            await pre(rawElement);
        }

        const schema = PROSE_REGISTRY.getSchema(rawElement.schemaName);

        const proseElement: ProseElement<AnySchema> = {
            ...draftElement('prose', schema),
            data: rawElement.data,
            storageKey: rawElement.storageKey,
            children: resolvedChildren,
        };

        if (linkable && schema.linkable) {
            proseElement.id = createId(ids, uniqueIds, rawElement);
        }

        if (rawElement.uniqueName) {
            proseElement.uniqueName = rawElement.uniqueName;
            uniques[rawElement.uniqueName] = proseElement;
        }

        if (post) {
            await post(proseElement);
        }

        if (step) {
            await step({ rawElement, proseElement });
        }

        return proseElement;
    }

    return {
        proseElement: await resolveRecursive(rawElement),
        uniques,
        ids,
    };
}

export type ResolveStep<TReturn = void> = (args: {
    rawElement: RawElement<AnySchema>;
    proseElement: ProseElement<AnySchema>;
}) => TReturn | Promise<TReturn>;

export interface ResolvedRawElement {
    proseElement: ProseElement<AnySchema>;
    uniques: Record<string, ProseElement<AnySchema>>;
    ids: Set<string>;
}

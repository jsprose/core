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
    hook?: ResolveHook;
    ids?: Set<string>;
}): Promise<ResolvedRawElement> {
    const { rawElement, linkable, hook, ids: externalIds } = args;
    const { pre, post } = hook ? await hook() : {};

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
        if (pre) {
            await pre(rawElement);
        }

        let resolvedChildren: ProseElement<AnySchema>[] | undefined = undefined;

        if (rawElement.children) {
            resolvedChildren = [];
            for (const child of rawElement.children) {
                const resolvedChild = await resolveRecursive(child);
                resolvedChildren.push(resolvedChild);
            }
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

        return proseElement;
    }

    return {
        proseElement: await resolveRecursive(rawElement),
        uniques,
        ids,
    };
}

export type ResolveHook = () => ResolveHookReturn | Promise<ResolveHookReturn>;

export interface ResolveHookReturn {
    pre?: (element: RawElement<AnySchema>) => void | Promise<void>;
    post?: (element: ProseElement<AnySchema>) => void | Promise<void>;
}

export interface ResolvedRawElement {
    proseElement: ProseElement<AnySchema>;
    uniques: Record<string, ProseElement<AnySchema>>;
    ids: Set<string>;
}

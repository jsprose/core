import { draftElement, type ProseElement, type RawElement } from './element.js';
import { ProseError } from './error.js';
import { type AnySchema } from './schema.js';
import { PROSE_REGISTRY } from './singleton.js';
import { kebabCase } from './utils/case.js';

/**
 * Transforms given RawElement into ProseElement.
 * If `linkable` is true, linkable elements will receive IDs that are unique across given raw element children.
 */
export async function resolveRawElement(args: {
    rawElement: RawElement<AnySchema>;
    linkable?: boolean;
    hook?: ResolveHook;
}): Promise<ResolvedRawElement> {
    const { rawElement, linkable, hook } = args;
    const { pre, post } = hook ? await hook() : {};

    const ids = new Set<string>();
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
            proseElement.id = createId(ids, rawElement);
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
}

function createId(ids: Set<string>, rawElement: RawElement<AnySchema>): string {
    if (rawElement.uniqueName) {
        const id = kebabCase(rawElement.uniqueName);

        if (ids.has(id)) {
            throw new ProseError(
                `
Duplicate unique element ID detected: ${id}!
This should not be possible, unless you somehow allowed two elements with same "uniqueName: ${rawElement.uniqueName}" to exist in same document.
                `.trim(),
            );
        }

        ids.add(id);
        return id;
    }

    const baseId = rawElement.slug
        ? kebabCase(rawElement.slug)
        : rawElement.schemaName + '-' + rawElement.hash;
    let id = baseId;
    let dedupeCounter = 0;

    while (ids.has(id)) {
        dedupeCounter += 1;
        id = `${baseId}-${dedupeCounter}`;
    }

    ids.add(id);
    return id;
}

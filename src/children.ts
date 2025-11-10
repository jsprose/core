import { draftElement, isRawProseElement, type RawElement } from './element.js';
import { hash } from './utils/hash.js';
import { schemaKind, type AnySchema } from './schema.js';
import { textSchema } from './default/text.js';
import { isUnique } from './unique.js';

/**
 * Raw JSX/TSX children converted to array of RawProseElements or `undefined` if no children were provided.
 * Adjacent non-special nodes are stringified and merged into single text elements.
 * ```
 * <foo />
 * <foo></foo>
 * <foo>{undefined}</foo>
 *   -> undefined
 *
 * <foo>A {'B'} C </foo>
 *   -> [RawProseElement<TextSchema>]
 *
 * <foo>
 *   <bar />
 *   <baz />
 * </foo>
 *   -> [RawProseElement<BarSchema>, RawProseElement<BazSchema>]
 * ```
 */
export type NormalizedChildren =
    | [RawElement<AnySchema>, ...RawElement<AnySchema>[]]
    | undefined;

/**
 * Normalizes raw children from JSX/TSX syntax into an array of RawProseElements or `undefined` if no children were provided.
 */
export function normalizeChildren(
    children: any,
    step?: (child: RawElement<AnySchema>) => void,
): NormalizedChildren {
    if (children === undefined) {
        return undefined;
    }

    const childrenArray = Array.isArray(children) ? children : [children];
    const normalizedChildren: RawElement<AnySchema>[] = [];

    for (const child of childrenArray) {
        //
        // Raw Prose ELement
        //

        if (isRawProseElement(child)) {
            const clonedRawProseElement = deepCloneRawElement(child);
            step?.(clonedRawProseElement);
            normalizedChildren.push(clonedRawProseElement);
            continue;
        }

        //
        // Unique
        //

        if (isUnique(child)) {
            const clonedRawProseElement = deepCloneRawElement(child.rawElement);

            // Transform uniqueName to slug to keep human-readable ID
            clonedRawProseElement.slug = clonedRawProseElement.uniqueName;
            // But still remove uniqueName, because unique clone is not a unique anymore!
            delete clonedRawProseElement.uniqueName;

            step?.(clonedRawProseElement);
            normalizedChildren.push(clonedRawProseElement);
            continue;
        }

        //
        // Something else. Just stringify it and possibly merge with previous text node.
        //

        const strChild = String(child);

        const jsxText: RawElement<typeof textSchema> = {
            ...draftElement('raw-prose', textSchema),
            tagName: 'pure-text',
            data: strChild,
            storageKey: undefined,
            children: undefined,
            hash: hash(strChild, 12),
        };

        step?.(jsxText);

        const lastNormalized = normalizedChildren.at(-1);

        if (isRawProseElement(lastNormalized, textSchema)) {
            lastNormalized.data += strChild;
            lastNormalized.hash = hash(lastNormalized.data, 12);
        } else {
            normalizedChildren.push(jsxText);
        }
    }

    return normalizedChildren as NormalizedChildren;
}

/**
 * Deep clone a RawProseElement and restore all schemaKind symbols recursively.
 * structuredClone doesn't preserve symbols, so we need to manually restore them.
 */
function deepCloneRawElement(
    element: RawElement<AnySchema>,
): RawElement<AnySchema> {
    const cloned = structuredClone(element);
    cloned[schemaKind] = element[schemaKind];

    if (Array.isArray(element.children) && Array.isArray(cloned.children)) {
        for (let i = 0; i < cloned.children.length; i++) {
            const originalChild = element.children[i] as RawElement<AnySchema>;
            if (isRawProseElement(originalChild)) {
                cloned.children[i] = deepCloneRawElement(originalChild);
            }
        }
    }

    return cloned;
}

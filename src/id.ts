import type { RawElement } from './element.js';
import { ProseError } from './error.js';
import type { AnySchema } from './schema.js';
import { kebabCase } from './utils/case.js';

/**
 * Unique names never change even between documents, so their IDs.
 * Using this function you are guaranteed to get the same unique id as in `resolveRawElement()` process.
 */
export function uniqueName2Id(uniqueName: string): string {
    return kebabCase(uniqueName);
}

/**
 * Creates unique ID for given RawElement, ensuring no collisions with existing IDs in given sets.
 */
export function createId(
    ids: Set<string>,
    uniqueIds: Set<string>,
    rawElement: RawElement<AnySchema>,
): string {
    if (rawElement.uniqueName) {
        const id = uniqueName2Id(rawElement.uniqueName);

        if (ids.has(id)) {
            throwDuplicateUniqueId(rawElement.uniqueName, id);
        }

        ids.add(id);
        return id;
    }

    const baseId = rawElement.slug
        ? kebabCase(rawElement.slug)
        : rawElement.schemaName + '-' + rawElement.hash;
    let id = baseId;
    let dedupeCounter = 0;

    while (ids.has(id) || uniqueIds.has(id)) {
        dedupeCounter += 1;
        id = `${baseId}-${dedupeCounter}`;
    }

    ids.add(id);
    return id;
}

export function throwDuplicateUniqueId(uniqueName: string, id: string): never {
    throw new ProseError(
        `
Duplicate unique ID "${id}" detected for unique name "${uniqueName}"!
This should not be possible, unless you somehow allowed two elements with same "uniqueName: ${uniqueName}" to exist in same element tree.
        `.trim(),
    );
}

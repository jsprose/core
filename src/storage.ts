import type { ProseElement } from './element.js';
import type { CreateStorage } from './registry.js';
import type { AnySchema } from './schema.js';

export async function fillStorage(args: {
    storage: GenericStorage;
    proseElement: ProseElement<AnySchema>;
    storageCreators: Record<string, undefined | CreateStorage<AnySchema>>;
    step?: (proseElement: ProseElement<AnySchema>) => void;
}): Promise<void> {
    const storage: GenericStorage = args.storage;

    async function createStorageFor(
        proseElement: ProseElement<AnySchema>,
    ): Promise<void> {
        const storageKey = proseElement.storageKey;

        if (storageKey && !storage[storageKey]) {
            const generator = args.storageCreators[proseElement.schemaName];
            if (generator) {
                storage[storageKey] = await generator(proseElement);
            }
        }

        if (args.step) {
            args.step(proseElement);
        }

        if (proseElement.children) {
            await Promise.all(
                proseElement.children.map((child) => createStorageFor(child)),
            );
        }
    }

    await createStorageFor(args.proseElement);
}

export type GenericStorage = Record<string, any>;

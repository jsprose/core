import { ProseError } from './error.js';
import type { AnySchema, schemaKind } from './schema.js';
import type { AnyTag } from './tag.js';
import { textSchema } from './default/text.js';
import { inlinersSchema } from './default/inliners.js';
import { mixSchema } from './default/mix.js';
import type { ProseElement } from './element.js';

/**
 * Registry that contains all defined prose schemas and tags.
 */
export class Registry {
    readonly items: Map<string, AnyRegistryItem> = new Map();
    readonly tags: Map<string, AnyTag<AnySchema>> = new Map();

    constructor() {
        this.setDefaultItems();
    }

    private setDefaultItems() {
        [textSchema, inlinersSchema, mixSchema].forEach((schema) =>
            this.addItem(defineRegistryItem({ schema })),
        );
    }

    addItem(item: AnyRegistryItem): void {
        const schemaName = item.schema.name;

        if (this.items.has(schemaName)) {
            throw new ProseError(
                `Schema "${schemaName}" is already defined in registry!`,
            );
        }

        for (const [tagName, tag] of Object.entries(item.tags)) {
            if (this.tags.has(tagName)) {
                throw new ProseError(
                    `Tag <${tagName}> is already defined in registry!`,
                );
            }
        }

        this.items.set(schemaName, item as any);

        for (const tagName in item.tags) {
            this.tags.set(tagName, item.tags[tagName]);
        }
    }

    addItems(...items: AnyRegistryItem[]): void {
        for (const item of items) {
            this.addItem(item as any);
        }
    }

    setItems(...items: AnyRegistryItem[]): void {
        this.items.clear();
        this.tags.clear();
        this.setDefaultItems();
        this.addItems(...(items as any));
    }

    removeItem(item: AnyRegistryItem): void;
    removeItem(schema: AnySchema): void;
    removeItem(arg: AnyRegistryItem | AnySchema): void {
        const item = 'schema' in arg ? arg : this.items.get(arg.name);

        if (!item) {
            return;
        }

        const schemaName = item.schema.name;
        this.items.delete(schemaName);

        for (const tag of Object.values(item.tags)) {
            this.tags.delete(tag.tagName);
        }
    }

    getItem(schemaName: string): AnyRegistryItem {
        const item = this.items.get(schemaName);

        if (!item) {
            throw new ProseError(`Missing item "${schemaName}" in registry!`);
        }

        return item;
    }

    getSchema(schemaName: string): AnySchema {
        const item = this.items.get(schemaName);

        if (!item) {
            throw new ProseError(`Missing schema "${schemaName}" in registry!`);
        }

        return item.schema;
    }

    getTag(tagName: string): AnyTag<AnySchema> {
        const tag = this.tags.get(tagName);

        if (!tag) {
            throw new ProseError(`Missing tag <${tagName}> in registry!`);
        }

        return tag;
    }

    getTagSchema<TSchema extends AnySchema, TTag extends AnyTag<TSchema>>(
        tag: TTag,
    ) {
        return this.getSchema(
            tag.schemaName,
        ) as unknown as TTag[typeof schemaKind];
    }

    getStorageCreators(): Record<string, CreateStorage<AnySchema>> {
        const creators: Record<string, CreateStorage<AnySchema>> = {};

        for (const item of this.items.values()) {
            if (item.createStorage) {
                creators[item.schema.name] = item.createStorage;
            }
        }

        return creators;
    }
}

export function defineRegistryItem<
    const TSchema extends AnySchema,
    const TExtra extends {
        tags?: AnyTag<TSchema>[];
        createStorage?: CreateStorage<TSchema>;
    },
>(item: { schema: TSchema } & TExtra) {
    type TagObject = TExtra extends { tags: AnyTag<TSchema>[] }
        ? {
              [K in TExtra['tags'][number]['tagName']]: Extract<
                  TExtra['tags'][number],
                  { tagName: K }
              >;
          }
        : Record<string, never>;

    const tagObject = (item.tags ?? []).reduce(
        (acc, tag) => {
            acc[tag.tagName] = tag;
            return acc;
        },
        {} as Record<string, AnyTag<TSchema>>,
    );

    type FinalCreateStorage = TExtra extends {
        createStorage: CreateStorage<TSchema>;
    }
        ? TExtra['createStorage']
        : undefined;

    const result = {
        ...item,
        createStorage: item.createStorage,
        tags: tagObject,
    };

    return result as unknown as RegistryItem<
        TSchema,
        TagObject,
        FinalCreateStorage
    >;
}

export type RegistryItem<
    TSchema extends AnySchema,
    TTagObj extends Record<string, AnyTag<TSchema>>,
    TCreateStorage extends CreateStorage<TSchema> | undefined,
> = {
    schema: TSchema;
    tags: TTagObj;
    createStorage: TCreateStorage;
};

export type CreateStorage<TSchema extends AnySchema> = {
    (
        proseElement: ProseElement<TSchema>,
    ): Promise<TSchema['Storage']> | TSchema['Storage'];
};

export type AnyRegistryItem = RegistryItem<
    AnySchema,
    Record<string, AnyTag<AnySchema>>,
    CreateStorage<AnySchema> | undefined
>;

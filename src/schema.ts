/**
 * General element schema.
 * Can represent block-level or inline-level elements.
 */
export type AnySchema = BlockSchema | InlinerSchema;

/**
 * Schema representing a block-level element.
 * Block element children can contain other block or inliner elements as children.
 */
export type BlockSchema = Schema & {
    type: 'block';
    Children: (BlockSchema | InlinerSchema)[] | undefined;
};

/**
 * Schema representing an inline-level element.
 * Inliner element children can only contain other inliner elements as children.
 */
export type InlinerSchema = Schema & {
    type: 'inliner';
    Children: InlinerSchema[] | undefined;
};

/**
 * Schema type brand to distinguish different schema wrappers: elements, tags, etc.
 * Used on both type level and runtime.
 */
export const schemaKind = Symbol('__JSPROSESchemaKind');

/**
 * Real properties of the schema.
 * These properties are actually present in the runtime schema object.
 */
interface SchemaRealProperties {
    /**
     * Unique name of the schema.
     */
    name: string;
    /**
     * Fundamental layout of the element.
     * Think of it as HTML's block-level and inline-level elements.
     */
    type: 'block' | 'inliner';
    /**
     * Whether the element can be linked to.
     */
    linkable: boolean;
}

/**
 * Type properties of the schema.
 * These properties are not a part of the runtime schema object, but are used for type checking JSX/Prose elements created from this schema.
 */
interface SchemaTypeProperties {
    /**
     * Element data.
     * Use this to store "fast" data that is easy to retrieve, validate and serialize.
     *
     * Examples:
     * * List type and params (ol, ul, start attribute)
     * * Heading level (h1, h2, h3...)
     * * Text formatting (bold, italic, code, etc.)
     *
     * **Caution:** never store JSX/Prose elements in `Data`!
     * They won't be included in JSX/Prose parsing process and won't appear during `walk`ing the element tree!
     *
     * **Caution:** must be serializable!
     */
    Data: any;
    /**
     * Element storage data.
     * Use this to store "heavy", "slow", non-unique, or immediately uncomputable data to avoid recomputation, duplication, and ease JSX initialization and parsing.
     * Storage data is kept separate from elements in its own global key-value map.
     *
     * Examples:
     * * Rendered math formulas — too long to render them during JSX tree parsing, too big to duplicate for same formula used in multiple places in document.
     * * Media metadata (images, videos) — requires async fetching, sometimes not possible to immediately locate the media during JSX parsing.
     * * Link data — not possible to get direct link immediately, need to wait for the whole project to be parsed.
     *
     * **Caution:** must be serializable!
     */
    Storage: any;
    /**
     * Schemas of allowed children elements (if any).
     * Provided schemas will be converted to corresponding JSX/Prose elements during parsing:
     * ```
     * (ParagraphSchema | HeadingSchema)[]
     *     ---> (RawProseElement<ParagraphSchema> | RawProseElement<HeadingSchema>)[]
     *   OR
     *     ---> (ProseElement<ParagraphSchema> | ProseElement<HeadingSchema>)[]
     * ```
     */
    Children: AnySchema[] | undefined;
}

type Schema = SchemaRealProperties & SchemaTypeProperties;

/**
 * Defines prose element schema.
 *
 * Example:
 * ```
 * const HeadingSchema = defineSchema({
 *     name: 'heading',
 *     type: 'block',
 *     linkable: true,
 * })<{
 *    Data: { level: 1 | 2 | 3 };
 *    Storage: undefined;
 *    Children: TextSchema[];
 * }>();
 * ```
 */
export function defineSchema<
    const TRealProperties extends SchemaRealProperties,
>(realProperties: TRealProperties) {
    function finalizeSchema<
        const TTypeProperties extends SchemaTypeProperties & {
            // Ensure Children type matches the exact realProperties.type
            Children: TRealProperties['type'] extends 'block'
                ? BlockSchema['Children']
                : InlinerSchema['Children'];
        },
    >() {
        // We cast to unknown here because type properties do not exist at runtime
        // Type properties are only needed for type checking
        return realProperties as unknown as {
            name: TRealProperties['name'];
            type: TRealProperties['type'];
            linkable: TRealProperties['linkable'];
            Data: TTypeProperties['Data'];
            Storage: TTypeProperties['Storage'];
            Children: TTypeProperties['Children'];
        } satisfies Schema;
    }

    return finalizeSchema;
}

import { ProseError } from './error.js';
import { schemaKind, type AnySchema } from './schema.js';
import type { IsAny } from './utils/isAny.js';

/**
 * Serializable object returned from tag function execution in JSX syntax:
 * ```
 * <MyElement /> ---> RawProseElement<MyElementSchema>
 * ```
 * Raw Prose ELements only contain info about itself and own children elements, but not about parent/siblings/document.
 */
export type RawElement<
    TSchema extends AnySchema,
    TTagName extends string = string,
> = {
    /**
     * Branding property to distinguish RawProseElement from other JavaScript values.
     */
    __JSPROSE_rawElement: true;
    /**
     * String representation of the element.
     * It is computed based on element's schema, data and hashes of its children.
     *
     * **Caution:** hash is not guaranteed to be unique across document!
     */
    hash: string;
    /**
     * Name of the tag from which this element was created.
     * Actual tag function can be retrieved from prose registry by name.
     * ```
     * <H1 /> ---> schema = "heading"; tag = "H1"
     * <H2 /> ---> schema = "heading"; tag = "H2"
     * ```
     * Useful for debugging and error messages since there can be many tags that produce the same element.
     * Can be used to access actual tag function.
     */
    tagName: TTagName;
    /**
     * Human-readable slug for the element used to create element ID on resolve stage.
     * Also, unique names of cloned unique elements are transformed into slugs.
     */
    slug?: string;
} & SharedProperties<'raw-prose', TSchema>;

/**
 * Serializable object representing an element in the Prose document.
 * Prose elements are produced during parsing all Raw Prose ELements in the context of the whole document:
 */
export type ProseElement<TSchema extends AnySchema> = {
    /**
     * Branding property to distinguish ProseElement from other JavaScript values.
     */
    __JSPROSE_element: true;
    /**
     * Guaranteed unique identifier of the element in the document.
     */
    id?: string;
} & SharedProperties<'prose', TSchema>;

interface SharedProperties<
    Wrapper extends 'raw-prose' | 'prose',
    TSchema extends AnySchema,
> {
    [schemaKind]: TSchema;
    /**
     * Schema name of the element.
     * Actual schema object can be retrieved from prose registry by name.
     */
    schemaName: TSchema['name'];
    /**
     * Data associated with the element.
     * The exact type of data is defined by the schema's Data type.
     *
     * @see `SchemaTypeProperties.Data`
     */
    data: TSchema['Data'];
    /**
     * Key to access storage data (if any) for this element.
     * Depending on schema Storage type, this can be string or undefined.
     *
     * @see `SchemaTypeProperties.Storage`
     */
    storageKey?: ResolveElementStorageKey<TSchema['Storage']>;
    /**
     * Children elements (if any).
     * The exact type of children is constructed by wrapping Schema['Children'] schemas into their respective element types (RawProse or Prose).
     *
     * @see `SchemaTypeProperties.Children`
     */
    children: WrapSchemas<Wrapper, TSchema['Children']>;
    /**
     * Name of associated with this element unique.
     */
    uniqueName?: string;
}

/**
 * Wraps schemas into their respective RawProse or Prose element types.
 *
 * Examples:
 * ```
 * textSchema[]
 *   ---> RawProseElement<textSchema>[]
 *
 * [textSchema, paragraphSchema]
 *   ---> [RawProseElement<textSchema>, RawProseElement<paragraphSchema>]
 *
 * [paragraphSchema | textSchema] | paragraphSchema[]
 *   ---> [RawProseElement<paragraphSchema | textSchema>] | RawProseElement<paragraphSchema>[]
 * ```
 */
type WrapSchemas<
    Wrapper extends 'raw-prose' | 'prose',
    Schemas,
> = Schemas extends undefined
    ? undefined
    : Schemas extends readonly any[]
      ? MapTupleOrArray<Wrapper, Schemas>
      : never;

type MapTupleOrArray<
    Wrapper extends 'raw-prose' | 'prose',
    Schemas extends readonly any[],
> = number extends Schemas['length']
    ? Schemas extends readonly (infer U)[]
        ? WrapSingle<Wrapper, U>[]
        : never
    : { [K in keyof Schemas]: WrapSingle<Wrapper, Schemas[K]> };

type WrapSingle<Wrapper extends 'raw-prose' | 'prose', Schema> = [
    Schema,
] extends [AnySchema]
    ? Wrapper extends 'raw-prose'
        ? RawElement<Schema>
        : ProseElement<Schema>
    : never;

/**
 * If Storage is `any`, storageKey can be string or undefined.
 * If Storage is `undefined`, storageKey is always undefined.
 * If Storage is defined and not optional, storageKey is always string.
 * If Storage is defined but optional, storageKey can be string or undefined.
 */
export type ResolveElementStorageKey<Storage> =
    IsAny<Storage> extends true
        ? string | undefined
        : [Storage] extends [undefined]
          ? undefined
          : undefined extends Storage
            ? string | undefined
            : string;

/**
 * Draft a RawProseElement or ProseElement with given schema.
 * Fills only branding and schema-related properties.
 */
export function draftElement<
    TSchema extends AnySchema,
    TWrapper extends 'raw-prose' | 'prose',
>(
    wrapper: TWrapper,
    schema: TSchema,
): TWrapper extends 'raw-prose'
    ? { __JSPROSE_rawElement: true } & Pick<
          RawElement<TSchema>,
          typeof schemaKind | 'schemaName'
      >
    : { __JSPROSE_element: true } & Pick<
          ProseElement<TSchema>,
          typeof schemaKind | 'schemaName'
      > {
    const base = {
        [schemaKind]: schema,
        schemaName: schema.name,
    };

    return (
        wrapper === 'raw-prose'
            ? {
                  __JSPROSE_rawElement: true,
                  ...base,
              }
            : {
                  __JSPROSE_element: true,
                  ...base,
              }
    ) as any;
}

/**
 * Type guard to check if given element is a RawProseElement of given schema (if provided).
 */
export function isRawProseElement<TSchema extends AnySchema>(
    element: any,
    schema?: TSchema,
): element is RawElement<TSchema> {
    return checkElementType(element, '__JSPROSE_rawElement', schema);
}

/**
 * Proceed further only if given element is a RawProseElement and matches the given schema (if provided).
 */
export function ensureRawProseElement<TSchema extends AnySchema>(
    element: any,
    schema?: TSchema,
): asserts element is RawElement<TSchema> {
    if (!isRawProseElement(element, schema)) {
        throw new ProseError(formatElementError('RawElement', element, schema));
    }
}

/**
 * Type guard to check if given element is a ProseElement of given schema (if provided).
 */
export function isProseElement<TSchema extends AnySchema>(
    element: any,
    schema?: TSchema,
): element is ProseElement<TSchema> {
    return checkElementType(element, '__JSPROSE_element', schema);
}

/**
 * Proceed further only if given element is a ProseElement and matches the given schema (if provided).
 */
export function ensureProseElement<TSchema extends AnySchema>(
    element: any,
    schema?: TSchema,
): asserts element is ProseElement<TSchema> {
    if (!isProseElement(element, schema)) {
        throw new ProseError(
            formatElementError('ProseElement', element, schema),
        );
    }
}

function checkElementType<TSchema extends AnySchema>(
    element: any,
    brandKey: '__JSPROSE_rawElement' | '__JSPROSE_element',
    schema?: TSchema,
): boolean {
    return (
        Boolean(element && element[brandKey] === true) &&
        (!schema || element.schemaName === schema.name)
    );
}

function formatElementError(
    elementType: 'RawElement' | 'ProseElement',
    element: any,
    schema?: AnySchema,
): string {
    const elementSchemaName = element?.schemaName;
    const elementTagName = (element as any)?.tag;

    if (schema === undefined) {
        return `
Given element is not a ${elementType}!
Provided element: ${JSON.stringify(element)}.
        `.trim();
    }

    const lines = [
        `Given element is not a ${elementType} with expected schema!`,
        `Expected schema: ${schema.name}`,
    ];

    if (elementSchemaName) {
        lines.push(`Provided schema: ${elementSchemaName}`);
    }

    if (elementTagName) {
        lines.push(`Provided tag: <${elementTagName}>`);
    }

    if (!elementSchemaName && !elementTagName) {
        lines.push(`Provided element: ${JSON.stringify(element)}`);
    }

    return lines.join('\n');
}

import { normalizeChildren, type NormalizedChildren } from './children.js';
import { draftElement, isRawElement, type RawElement } from './element.js';
import { ProseError } from './error.js';
import type { Registry } from './registry.js';
import {
    schemaKind,
    type AnySchema,
    type BlockSchema,
    type InlinerSchema,
} from './schema.js';
import type { Unique } from './unique.js';
import { validTagName } from './utils/name.js';
import { hash } from './utils/hash.js';

/**
 * Prose tag used in JSX/TSX syntax to write content.
 */
export type Tag<
    TTagName extends string,
    TSchema extends AnySchema,
    TConfigurableTagProps extends ConfigurableTagProps,
> = {
    [schemaKind]: TSchema;
    /**
     * Branding property to distinguish Prose Tag from other JavaScript values.
     */
    __JSPROSE_tag: true;
    /**
     * Tag name to be used in JSX/TSX syntax.
     */
    tagName: TTagName;
    /**
     * Schema name of elements created by this tag.
     */
    schemaName: TSchema['name'];
} & ((
    props: TagProps<TTagName, TSchema, TConfigurableTagProps>,
) => RawElement<TSchema, TTagName>);

/**
 * General prose tag.
 */
export type AnyTag<TSchema extends AnySchema> = Tag<string, TSchema, any>;

/**
 * Tag which creates linkable elements, meaning these elements can be assigned to uniques.
 */
export type LinkableTag = AnyTag<AnySchema & { linkable: true }>;

/**
 * Defines prose tag.
 *
 * Example:
 * ```
 * const headingSchema = defineSchema({
 *   name: 'heading',
 *   type: 'block',
 *   linkable: true,
 * })<{
 *   Data: { level: 1 | 2 | 3 };
 *   Storage: undefined;
 *   Children: [typeof textSchema];
 * }>();
 *
 * const headingTag = defineTag({
 *   tagName: 'Heading',
 *   schema: headingSchema,
 * })<{ level: 1 | 2 | 3 } & TagChildren>(({
 *   tagName, props, children, element, registry
 * }) => {
 *   // ...
 * });
 * ```
 */
export function defineTag<
    const TSchema extends AnySchema,
    const TTagDefinition extends TagDefinition<TSchema>,
>(definition: TTagDefinition) {
    if (!validTagName(definition.tagName)) {
        throw new ProseError(
            `Invalid tag name format "${definition.tagName}"!`,
        );
    }

    function finalizeTag<
        const TConfigurableTagProps extends ConfigurableTagProps,
    >(
        processTag: ProcessTagFunction<
            TSchema,
            TTagDefinition,
            TConfigurableTagProps
        >,
    ) {
        const tag = (
            props: TagProps<
                TTagDefinition['tagName'],
                TTagDefinition['schema'],
                TConfigurableTagProps
            >,
        ) => {
            const tagName = definition.tagName;
            const schema = definition.schema;

            const registry = (props as any).__JSPROSE_registryProp as Registry;
            if (!registry) {
                throw new ProseError(
                    `Prose registry is not provided to <${tagName}> tag!`,
                );
            }

            const normalizedChildren = normalizeChildren(
                props?.children,
                (child) => {
                    const childSchema = registry.getSchema(child.schemaName);

                    if (
                        schema.type === 'inliner' &&
                        childSchema.type === 'block'
                    ) {
                        throw new ProseError(
                            `Inliner <${tagName}> can not contain block <${child.tagName}>!`,
                        );
                    }
                },
            );

            type ElementType = RawElement<
                TTagDefinition['schema'],
                TTagDefinition['tagName']
            >;

            const element = <ElementType>{
                ...draftElement('raw-prose', schema),
                schemaName: schema.name,
                tagName: tagName,
            };

            const unique = (props as any).$ as Unique<LinkableTag> | undefined;

            if (unique) {
                if (!schema.linkable) {
                    throw new ProseError(
                        `Tag <${tagName}> with schema "${schema.name}" is not linkable and cannot be assigned to a unique!`,
                    );
                }

                element.uniqueName = unique.name;
                unique.rawElement = element as any;
            }

            processTag({
                tagName,
                props,
                children: normalizedChildren,
                element,
                registry,
            });

            element.hash = hash(
                schema.name +
                    JSON.stringify(element.data) +
                    JSON.stringify(element.children?.map((c) => c.hash).join()),
                12,
            );

            return element;
        };

        Object.defineProperties(tag, {
            __JSPROSE_tag: { value: true },
            [schemaKind]: { value: definition.schema },
            tagName: { value: definition.tagName },
            schemaName: { value: definition.schema.name },
        });

        return tag as Tag<
            TTagDefinition['tagName'],
            TTagDefinition['schema'],
            TConfigurableTagProps
        >;
    }

    return finalizeTag;
}

/**
 * Type that actulally determines which props can be passed to the tag.
 */
export type TagProps<
    TTagName extends string,
    TSchema extends AnySchema,
    TConfigurableTagProps extends ConfigurableTagProps,
> = TConfigurableTagProps &
    (TSchema['linkable'] extends true
        ? {
              /**
               * Assign this element to document unique.
               * It will allow linking to this element and it also gains human-readable ID after resolving.
               */
              $?: Unique<Extract<Tag<TTagName, TSchema, any>, LinkableTag>>;
          }
        : {});

/**
 * Type checker for allowed configurable tag props.
 */
export type ConfigurableTagProps = NoTagChildren | TagChildren;

/**
 * Helper type to indicate tag must not have children.
 * Used when constructing configurable tag props.
 */
export type NoTagChildren = { children?: never };

/**
 * Helper type to indicate tag must have children (one or more).
 * Used when constructing configurable tag props.
 */
export type TagChildren = { children: {} };

export interface TagDefinition<TSchema extends AnySchema> {
    tagName: string;
    schema: TSchema;
}

export type ProcessTagFunction<
    TSchema extends AnySchema,
    TTagDefinition extends TagDefinition<TSchema>,
    TConfigurableTagProps extends ConfigurableTagProps,
    TElement extends RawElement<TSchema> = RawElement<
        TTagDefinition['schema'],
        TTagDefinition['tagName']
    >,
> = (args: {
    tagName: TTagDefinition['tagName'];
    props: TagProps<
        TTagDefinition['tagName'],
        TTagDefinition['schema'],
        TConfigurableTagProps
    >;
    children: NormalizedChildren;
    element: TElement;
    registry: Registry;
}) => void;

/**
 * Proceed and narrow down children type only if tag has no children after normalization.
 */
export function ensureTagNoChildren(
    tagName: string,
    children: NormalizedChildren,
): asserts children is undefined {
    if (children !== undefined) {
        throw new ProseError(
            `<${tagName}> must not have children, but some were provided!`,
        );
    }
}

/**
 * Proceed and narrow down children type only if tag has exactly one child after normalization.
 */
export function ensureTagChild<TSchemas extends AnySchema | AnySchema[]>(
    tagName: string,
    children: NormalizedChildren,
    schemas?: TSchemas,
): asserts children is [
    RawElement<TSchemas extends AnySchema[] ? TSchemas[number] : TSchemas>,
] {
    if (children?.length !== 1) {
        throw new ProseError(
            `<${tagName}> must have a single child, but received ${
                children === undefined ? 'none' : children.length
            }!`,
        );
    }

    if (schemas === undefined) {
        return;
    }

    const schemaArray = Array.isArray(schemas) ? schemas : [schemas];

    for (const child of children) {
        let matched = false;
        for (const schema of schemaArray) {
            if (isRawElement(child, schema)) {
                matched = true;
                break;
            }
        }
        if (!matched) {
            throw new ProseError(
                `<${tagName}> child <${child.tagName}> does not match any of the allowed schemas!`,
            );
        }
    }
}

/**
 * Proceed and narrow down children type only if tag has one or more children after normalization.
 */
export function ensureTagChildren<TSchemas extends AnySchema | AnySchema[]>(
    tagName: string,
    children: NormalizedChildren,
    schemas?: TSchemas,
): asserts children is [
    RawElement<TSchemas extends AnySchema[] ? TSchemas[number] : TSchemas>,
    ...RawElement<TSchemas extends AnySchema[] ? TSchemas[number] : TSchemas>[],
] {
    if (children === undefined) {
        throw new ProseError(
            `<${tagName}> must have one or more children, but none were provided!`,
        );
    }

    if (schemas === undefined) {
        return;
    }

    const schemaArray = Array.isArray(schemas) ? schemas : [schemas];

    for (const child of children) {
        let matched = false;
        for (const schema of schemaArray) {
            if (isRawElement(child, schema)) {
                matched = true;
                break;
            }
        }
        if (!matched) {
            throw new ProseError(
                `<${tagName}> child <${child.tagName}> does not match any of the allowed schemas!`,
            );
        }
    }
}

/**
 * Proceed and narrow down children type only if tag has only block children after normalization.
 */
export function ensureTagBlockChildren(
    tagName: string,
    children: NormalizedChildren,
    registry: Registry,
): asserts children is [RawElement<BlockSchema>, ...RawElement<BlockSchema>[]] {
    ensureTagChildren(tagName, children);

    for (const child of children) {
        const childSchema = registry.getSchema(child.schemaName);
        if (childSchema.type !== 'block') {
            throw new ProseError(
                `<${tagName}> must have only block children, but received <${child.tagName}>!`,
            );
        }
    }
}

/**
 * Proceed and narrow down children type only if tag has exactly one block child after normalization.
 */
export function ensureTagBlockChild(
    tagName: string,
    children: NormalizedChildren,
    registry: Registry,
): asserts children is [RawElement<BlockSchema>] {
    ensureTagChild(tagName, children);

    const child = children[0];
    const childSchema = registry.getSchema(child.schemaName);

    if (childSchema.type !== 'block') {
        throw new ProseError(
            `<${tagName}> must have a single block child, but received <${child.tagName}>!`,
        );
    }
}

/**
 * Proceed and narrow down children type only if tag has only inliner children after normalization.
 */
export function ensureTagInlinerChildren(
    tagName: string,
    children: NormalizedChildren,
    registry: Registry,
): asserts children is [
    RawElement<InlinerSchema>,
    ...RawElement<InlinerSchema>[],
] {
    ensureTagChildren(tagName, children);

    for (const child of children) {
        const childSchema = registry.getSchema(child.schemaName);
        if (childSchema.type !== 'inliner') {
            throw new ProseError(
                `<${tagName}> must have only inline children, but received <${child.tagName}>!`,
            );
        }
    }
}

/**
 * Proceed and narrow down children type only if tag has exactly one inliner child after normalization.
 */
export function ensureTagInlinerChild(
    tagName: string,
    children: NormalizedChildren,
    registry: Registry,
): asserts children is [RawElement<InlinerSchema>] {
    ensureTagChild(tagName, children);

    const child = children[0];
    const childSchema = registry.getSchema(child.schemaName);

    if (childSchema.type !== 'inliner') {
        throw new ProseError(
            `<${tagName}> must have a single inline child, but received <${child.tagName}>!`,
        );
    }
}

/**
 * Type guard to check if given element is a RawProseElement and was created with the specified tag.
 */
export function isTagRawProseElement<
    TSchema extends AnySchema,
    TTag extends AnyTag<TSchema>,
>(element: any, tag: TTag): element is RawElement<TSchema, TTag['tagName']> {
    if (!isRawElement(element)) {
        return false;
    }

    if (element.schemaName !== tag.schemaName) {
        return false;
    }

    if (element.tagName !== tag.tagName) {
        return false;
    }

    return true;
}

/**
 * Proceed further only if given element is a RawProseElement and was created with the specified tag.
 */
export function ensureTagRawProseElement<
    TSchema extends AnySchema,
    TTag extends AnyTag<TSchema>,
>(
    element: any,
    tag: TTag,
): asserts element is RawElement<TSchema, TTag['tagName']> {
    if (!isTagRawProseElement(element, tag)) {
        throw new ProseError(
            `Given element is not a RawProseElement created with <${tag.tagName}>!`,
        );
    }
}

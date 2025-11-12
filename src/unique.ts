import { type RawElement } from './element.js';
import { ProseError } from './error.js';
import type { AnySchema, schemaKind } from './schema.js';
import type { LinkableTag } from './tag.js';

export interface Unique<TTag extends LinkableTag> {
    __JSPROSE_unique: true;
    documentId: string;
    tag: TTag;
    name: string;
    rawElement: RawElement<TTag[typeof schemaKind]>;
}

export type AnyUnique = Unique<LinkableTag>;

/**
 * **Caution:** Normally you don't need to define uniques manually since document definition creates them internally!
 */
export function defineUnique<TTag extends LinkableTag>(unique: {
    documentId: string;
    name: string;
    tag: TTag;
}): Unique<TTag> {
    let _rawElement: RawElement<TTag[typeof schemaKind]> | undefined;

    return {
        __JSPROSE_unique: true,
        documentId: unique.documentId,
        tag: unique.tag,
        name: unique.name,
        get rawElement() {
            return _rawElement!;
        },
        set rawElement(value: RawElement<TTag[typeof schemaKind]>) {
            if (_rawElement) {
                throw new ProseError(
                    `
Unique "${unique.name}" raw element is already assigned and cannot be reassigned!
                    `.trim(),
                );
            }

            if (value.tagName !== unique.tag.tagName) {
                throw new ProseError(
                    `
Unique "${unique.name}" tag mismatch on raw element assignment!
Expected tag <${unique.tag.tagName}>.
Provided tag: <${value.tagName}>.
                    `.trim(),
                );
            }

            _rawElement = value;
        },
    };
}

export function isUnique<TTag extends LinkableTag>(
    value: any,
    tag?: TTag,
): value is Unique<TTag> {
    if (value?.__JSPROSE_unique === true) {
        if (tag) {
            return value.tag === tag;
        }
        return true;
    }
    return false;
}

/**
 * Defines a JSX wrapper with unique.
 * Allows to pass unique to non-tag function in JSX-style.
 *
 * Usage:
 * ```tsx
 * // ./foo.tsx
 * export const MyWrapper = defineUniqueWrapper(P, (unique) => {
 *   return <P $={unique}>My wrapped paragraph</P>;
 * });
 *
 * // ./main.tsx
 * import { MyWrapper } from './foo';
 *
 * const document = defineDocument({
 *   uniques: { pUnique: P }
 * })(({ uniques }) => {
 *   return (
 *     <>
 *       <P>First paragraph</P>
 *       <MyWrapper $={uniques.pUnique} />
 *     </>
 *   );
 * });
 * ```
 */
export function defineUniqueWrapper<TTag extends LinkableTag>(
    _tag: TTag,
    wrapper: (unique: Unique<TTag>) => RawElement<AnySchema>,
): (props: { $: Unique<TTag>; children?: undefined }) => RawElement<AnySchema> {
    return (props: { $: Unique<TTag>; children?: undefined }) =>
        wrapper(props.$);
}

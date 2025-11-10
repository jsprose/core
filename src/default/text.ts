import { defineSchema } from '../schema.js';

/**
 * Default schema for all non-specific nodes in JSX/TSX syntax.
 * ```
 * <...>`Hello, {'foo'} {3} {undefined} world!`</...>
 *   -> RawProseElement<typeof textSchema>
 *     -> ProseElement<typeof textSchema>
 * ```
 * **Caution:** Adjacent text elements are automatically concatenated into a single text element!
 */
export const textSchema = defineSchema({
    name: 'text',
    type: 'inliner',
    linkable: false,
})<{
    /** "Hello, foo 3 undefined world!" */
    Data: string;
    Storage: undefined;
    Children: undefined;
}>();

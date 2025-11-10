import { defineSchema, type AnySchema } from '../schema.js';
import { defineTag, ensureTagChildren } from '../tag.js';

/**
 * Default schema representing a container for both block and inliner elements.
 * Mix schema elements are created from Fragment JSX/TSX syntax: `<>...</>` if block elements are present among children.
 */
export const mixSchema = defineSchema({
    name: 'mix',
    type: 'block',
    linkable: false,
})<{
    Data: undefined;
    Storage: undefined;
    Children: AnySchema[];
}>();

export const mixTag = defineTag({
    tagName: 'Mix',
    schema: mixSchema,
})(({ tagName, element, children }) => {
    ensureTagChildren(tagName, children);
    element.children = children;
});

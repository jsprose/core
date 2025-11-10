import { defineSchema, type InlinerSchema } from '../schema.js';
import { defineTag, ensureTagInlinerChildren } from '../tag.js';

/**
 * Default schema representing a container for inliner elements.
 * Inliners schema elements are created from Fragment JSX/TSX syntax: `<>...</>` in case all children are inliners.
 */
export const inlinersSchema = defineSchema({
    name: 'inliners',
    type: 'inliner',
    linkable: false,
})<{
    Data: undefined;
    Storage: undefined;
    Children: InlinerSchema[];
}>();

export const inlinersTag = defineTag({
    tagName: 'Inliners',
    schema: inlinersSchema,
})(({ tagName, element, children, registry }) => {
    ensureTagInlinerChildren(tagName, children, registry);
    element.children = children;
});

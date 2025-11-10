import {
    type TagChildren,
    type InlinerSchema,
    defineSchema,
    textSchema,
    defineTag,
    ensureTagChildren,
    defineRegistryItem,
    ensureTagInlinerChildren,
} from '@jsprose/core';

//
// Paragraph (typical block)
//

export const paragraphSchema = defineSchema({
    name: 'paragraph',
    type: 'block',
    linkable: true,
})<{
    Data: undefined;
    Storage: undefined;
    Children: (typeof textSchema)[];
}>();

export const P = defineTag({
    tagName: 'P',
    schema: paragraphSchema,
})<TagChildren>(({ tagName, element, children }) => {
    ensureTagChildren(tagName, children, textSchema);
    element.children = children;
});

export const paragraphRegistryItem = defineRegistryItem({
    schema: paragraphSchema,
    tags: [P],
});

//
// Bold (typical inliner)
//

export const boldSchema = defineSchema({
    name: 'bold',
    type: 'inliner',
    linkable: true,
})<{
    Data: undefined;
    Storage: undefined;
    Children: InlinerSchema[];
}>();

export const Bold = defineTag({
    tagName: 'Bold',
    schema: boldSchema,
})<TagChildren>(({ tagName, element, children, registry }) => {
    ensureTagInlinerChildren(tagName, children, registry);
    element.children = children;
});

export const boldRegistryItem = defineRegistryItem({
    schema: boldSchema,
    tags: [Bold],
});

//
// Storagable
//

export const storagableSchema = defineSchema({
    name: 'storagable',
    type: 'block',
    linkable: false,
})<{
    Data: undefined;
    Storage: { info: string };
    Children: (typeof textSchema)[];
}>();

export const Storagable = defineTag({
    tagName: 'Storagable',
    schema: storagableSchema,
})<TagChildren>(({ tagName, element, children }) => {
    ensureTagChildren(tagName, children, textSchema);
    element.children = children;
});

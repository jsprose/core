import { describe, it, expect } from 'vitest';

import {
    validateTagName,
    ensureTagNoChildren,
    ensureTagChild,
    ensureTagChildren,
    ensureTagBlockChildren,
    ensureTagBlockChild,
    ensureTagInlinerChildren,
    ensureTagInlinerChild,
    isTagRawProseElement,
    ensureTagRawProseElement,
    defineTag,
    defineSchema,
    defineRegistryItem,
    textSchema,
    Registry,
    draftElement,
    ProseError,
    type RawElement,
} from '@jsprose/core';

// Test schemas
const boldSchema = defineSchema({
    type: 'inliner',
    name: 'test-bold',
    linkable: false,
})<{
    Data: undefined;
    Storage: undefined;
    Children: (typeof textSchema)[];
}>();

const paragraphSchema = defineSchema({
    type: 'block',
    name: 'test-paragraph',
    linkable: false,
})<{
    Data: undefined;
    Storage: undefined;
    Children: (typeof textSchema | typeof boldSchema)[];
}>();

const headingSchema = defineSchema({
    type: 'block',
    name: 'test-heading',
    linkable: false,
})<{
    Data: { level: number };
    Storage: undefined;
    Children: (typeof textSchema)[];
}>();

// Create a shared registry for tests
const testRegistry = new Registry();
testRegistry.addItem(defineRegistryItem({ schema: boldSchema }));
testRegistry.addItem(defineRegistryItem({ schema: paragraphSchema }));
testRegistry.addItem(defineRegistryItem({ schema: headingSchema }));

// Shared tag definitions
const textTag = defineTag({
    tagName: 'Text',
    schema: textSchema,
})<{ children?: never }>(({ element }) => {
    element.data = 'Hello';
    element.storageKey = undefined;
    element.children = undefined;
});

const boldTag = defineTag({
    tagName: 'Bold',
    schema: boldSchema,
})<{ children: {} }>(({ element, children }) => {
    element.data = undefined;
    element.storageKey = undefined;
    element.children = children as any;
});

// Helper to create mock elements
function makeTextElement(): RawElement<typeof textSchema> {
    return {
        ...draftElement('raw-prose', textSchema),
        tagName: 'Text',
        data: 'Hello',
        storageKey: undefined,
        children: undefined,
        hash: 'text-hash',
    };
}

function makeBoldElement(): RawElement<typeof boldSchema> {
    return {
        ...draftElement('raw-prose', boldSchema),
        tagName: 'Bold',
        data: undefined,
        storageKey: undefined,
        children: [makeTextElement()],
        hash: 'bold-hash',
    };
}

function makeParagraphElement(): RawElement<typeof paragraphSchema> {
    return {
        ...draftElement('raw-prose', paragraphSchema),
        tagName: 'Paragraph',
        data: undefined,
        storageKey: undefined,
        children: [makeTextElement()],
        hash: 'para-hash',
    };
}

function makeHeadingElement(): RawElement<typeof headingSchema> {
    return {
        ...draftElement('raw-prose', headingSchema),
        tagName: 'Heading',
        data: { level: 1 },
        storageKey: undefined,
        children: [makeTextElement()],
        hash: 'heading-hash',
    };
}

describe('validateTagName', () => {
    it('should accept valid tag names', () => {
        expect(() => validateTagName('Component')).not.toThrow();
        expect(() => validateTagName('MyComponent')).not.toThrow();
        expect(() => validateTagName('_private')).not.toThrow();
        expect(() => validateTagName('$element')).not.toThrow();
    });

    it('should reject invalid tag names', () => {
        expect(() => validateTagName('div')).toThrow(ProseError);
        expect(() => validateTagName('1Component')).toThrow(ProseError);
        expect(() => validateTagName('')).toThrow(ProseError);
        expect(() => validateTagName('my-component')).toThrow(ProseError);
    });
});

describe('ensureTagNoChildren', () => {
    it('should pass when children is undefined', () => {
        expect(() => ensureTagNoChildren('TestTag', undefined)).not.toThrow();
    });

    it('should throw when children contains elements', () => {
        expect(() =>
            ensureTagNoChildren('TestTag', [makeTextElement()]),
        ).toThrow(ProseError);
    });
});

describe('ensureTagChild', () => {
    it('should pass when children has exactly one element', () => {
        expect(() =>
            ensureTagChild('TestTag', [makeTextElement()]),
        ).not.toThrow();
    });

    it('should throw when children is undefined', () => {
        expect(() => ensureTagChild('TestTag', undefined)).toThrow(ProseError);
    });

    it('should throw when children has multiple elements', () => {
        expect(() =>
            ensureTagChild('TestTag', [makeTextElement(), makeTextElement()]),
        ).toThrow(ProseError);
    });

    it('should validate against single schema', () => {
        expect(() =>
            ensureTagChild('TestTag', [makeTextElement()], textSchema),
        ).not.toThrow();

        expect(() =>
            ensureTagChild('TestTag', [makeBoldElement()], textSchema),
        ).toThrow(ProseError);
    });

    it('should validate against array of schemas', () => {
        expect(() =>
            ensureTagChild(
                'TestTag',
                [makeTextElement()],
                [textSchema, boldSchema],
            ),
        ).not.toThrow();

        expect(() =>
            ensureTagChild(
                'TestTag',
                [makeBoldElement()],
                [textSchema, boldSchema],
            ),
        ).not.toThrow();

        expect(() =>
            ensureTagChild(
                'TestTag',
                [makeParagraphElement()],
                [textSchema, boldSchema],
            ),
        ).toThrow(ProseError);
    });
});

describe('ensureTagChildren', () => {
    it('should pass when children has one or more elements', () => {
        expect(() =>
            ensureTagChildren('TestTag', [makeTextElement()]),
        ).not.toThrow();
        expect(() =>
            ensureTagChildren('TestTag', [
                makeTextElement(),
                makeBoldElement(),
            ]),
        ).not.toThrow();
    });

    it('should throw when children is undefined', () => {
        expect(() => ensureTagChildren('TestTag', undefined)).toThrow(
            ProseError,
        );
    });

    it('should validate against single schema', () => {
        expect(() =>
            ensureTagChildren('TestTag', [makeTextElement()], textSchema),
        ).not.toThrow();

        expect(() =>
            ensureTagChildren('TestTag', [makeBoldElement()], textSchema),
        ).toThrow(ProseError);
    });

    it('should validate against array of schemas', () => {
        expect(() =>
            ensureTagChildren(
                'TestTag',
                [makeTextElement(), makeBoldElement()],
                [textSchema, boldSchema],
            ),
        ).not.toThrow();

        expect(() =>
            ensureTagChildren(
                'TestTag',
                [makeTextElement(), makeParagraphElement()],
                [textSchema, boldSchema],
            ),
        ).toThrow(ProseError);
    });
});

describe('ensureTagBlockChildren', () => {
    it('should pass when children has only block elements', () => {
        expect(() =>
            ensureTagBlockChildren(
                'TestTag',
                [makeParagraphElement()],
                testRegistry,
            ),
        ).not.toThrow();
    });

    it('should throw when children is undefined', () => {
        expect(() =>
            ensureTagBlockChildren('TestTag', undefined, testRegistry),
        ).toThrow(ProseError);
    });

    it('should throw when children contains inliner elements', () => {
        expect(() =>
            ensureTagBlockChildren(
                'TestTag',
                [makeTextElement()],
                testRegistry,
            ),
        ).toThrow(ProseError);
    });
});

describe('ensureTagBlockChild', () => {
    it('should pass when child is a block element', () => {
        expect(() =>
            ensureTagBlockChild(
                'TestTag',
                [makeParagraphElement()],
                testRegistry,
            ),
        ).not.toThrow();
    });

    it('should throw when children is undefined', () => {
        expect(() =>
            ensureTagBlockChild('TestTag', undefined, testRegistry),
        ).toThrow(ProseError);
    });

    it('should throw when child is an inliner element', () => {
        expect(() =>
            ensureTagBlockChild('TestTag', [makeTextElement()], testRegistry),
        ).toThrow(ProseError);
    });
});

describe('ensureTagInlinerChildren', () => {
    it('should pass when children has only inliner elements', () => {
        expect(() =>
            ensureTagInlinerChildren(
                'TestTag',
                [makeTextElement()],
                testRegistry,
            ),
        ).not.toThrow();
    });

    it('should throw when children is undefined', () => {
        expect(() =>
            ensureTagInlinerChildren('TestTag', undefined, testRegistry),
        ).toThrow(ProseError);
    });

    it('should throw when children contains block elements', () => {
        expect(() =>
            ensureTagInlinerChildren(
                'TestTag',
                [makeParagraphElement()],
                testRegistry,
            ),
        ).toThrow(ProseError);
    });
});

describe('ensureTagInlinerChild', () => {
    it('should pass when child is an inliner element', () => {
        expect(() =>
            ensureTagInlinerChild('TestTag', [makeTextElement()], testRegistry),
        ).not.toThrow();
    });

    it('should throw when children is undefined', () => {
        expect(() =>
            ensureTagInlinerChild('TestTag', undefined, testRegistry),
        ).toThrow(ProseError);
    });

    it('should throw when child is a block element', () => {
        expect(() =>
            ensureTagInlinerChild(
                'TestTag',
                [makeParagraphElement()],
                testRegistry,
            ),
        ).toThrow(ProseError);
    });
});

describe('defineTag', () => {
    it('should set tagName property on created elements', () => {
        const textElement = textTag({
            __JSPROSE_registryProp: testRegistry,
        } as any);
        expect(textElement.tagName).toBe('Text');

        const boldElement = boldTag({
            __JSPROSE_registryProp: testRegistry,
            children: [textElement],
        } as any);
        expect(boldElement.tagName).toBe('Bold');
    });

    it('should set schemaName property on created elements', () => {
        const textElement = textTag({
            __JSPROSE_registryProp: testRegistry,
        } as any);
        expect(textElement.schemaName).toBe('text');

        const boldElement = boldTag({
            __JSPROSE_registryProp: testRegistry,
            children: [textElement],
        } as any);
        expect(boldElement.schemaName).toBe('test-bold');
    });
});

describe('isTagRawProseElement', () => {
    it('should return true for matching element and tag', () => {
        const textElement = makeTextElement();
        expect(isTagRawProseElement(textElement, textTag)).toBe(true);
    });

    it('should return false for non-RawProseElement', () => {
        expect(isTagRawProseElement(null, textTag)).toBe(false);
    });

    it('should return false for mismatched schema', () => {
        const textElement = makeTextElement();
        expect(isTagRawProseElement(textElement, boldTag)).toBe(false);
    });

    it('should return false for mismatched tag name', () => {
        const element = makeTextElement();
        element.tagName = 'DifferentTag';
        expect(isTagRawProseElement(element, textTag)).toBe(false);
    });
});

describe('ensureTagRawProseElement', () => {
    it('should pass for matching element and tag', () => {
        const textElement = makeTextElement();
        expect(() =>
            ensureTagRawProseElement(textElement, textTag),
        ).not.toThrow();
    });

    it('should throw for non-RawProseElement', () => {
        expect(() => ensureTagRawProseElement(null, textTag)).toThrow(
            ProseError,
        );
    });

    it('should throw for mismatched schema', () => {
        const textElement = makeTextElement();
        expect(() => ensureTagRawProseElement(textElement, boldTag)).toThrow(
            ProseError,
        );
    });

    it('should throw for mismatched tag name', () => {
        const element = makeTextElement();
        element.tagName = 'DifferentTag';
        expect(() => ensureTagRawProseElement(element, textTag)).toThrow(
            ProseError,
        );
    });
});

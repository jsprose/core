import { describe, expectTypeOf, it } from 'vitest';

import {
    type ConfigurableTagProps,
    type NoTagChildren,
    type TagChildren,
    defineSchema,
    textSchema,
    defineTag,
    type TagProps,
    type RawElement,
    type NormalizedChildren,
    schemaKind,
} from '@jsprose/core';

describe('ConfigurableTagProps', () => {
    type TagPropsCorrect<T> = T extends ConfigurableTagProps ? true : false;

    it('should not allow non-object props', () => {
        expectTypeOf<TagPropsCorrect<string>>().toEqualTypeOf<false>();
        expectTypeOf<TagPropsCorrect<number>>().toEqualTypeOf<false>();
        expectTypeOf<TagPropsCorrect<boolean>>().toEqualTypeOf<false>();
        expectTypeOf<TagPropsCorrect<null>>().toEqualTypeOf<false>();
        expectTypeOf<TagPropsCorrect<undefined>>().toEqualTypeOf<false>();
    });

    it('should not allow props without NoTagChildren or TagChildren structure', () => {
        expectTypeOf<TagPropsCorrect<{ foo: 3 }>>().toEqualTypeOf<false>();
        expectTypeOf<TagPropsCorrect<{ bar: 'baz' }>>().toEqualTypeOf<false>();
    });

    it('should allow props with correct children structure', () => {
        expectTypeOf<
            TagPropsCorrect<{ foo: 3 } & NoTagChildren>
        >().toEqualTypeOf<true>();
        expectTypeOf<
            TagPropsCorrect<{ bar: 'baz' } & TagChildren>
        >().toEqualTypeOf<true>();
        expectTypeOf<
            TagPropsCorrect<TagChildren | NoTagChildren>
        >().toEqualTypeOf<true>();
    });
});

describe('defineTag', () => {
    it('should return tag with specific schema and tag typings', () => {
        const headingSchema = defineSchema({
            name: 'heading',
            type: 'block',
            linkable: true,
        })<{
            Data: { level: 1 | 2 | 3 };
            Storage: undefined;
            Children: [typeof textSchema];
        }>();

        const headingTag = defineTag({
            tagName: 'Heading',
            schema: headingSchema,
        })<{ level: 1 | 2 | 3 } & TagChildren>(({
            tagName,
            props,
            children,
            element,
        }) => {
            expectTypeOf<typeof tagName>().toEqualTypeOf<'Heading'>();
            expectTypeOf<typeof props>().toEqualTypeOf<
                TagProps<
                    'Heading',
                    typeof headingSchema,
                    { level: 1 | 2 | 3 } & TagChildren
                >
            >();
            expectTypeOf<typeof children>().toEqualTypeOf<NormalizedChildren>();
            expectTypeOf<typeof element>().toEqualTypeOf<
                RawElement<typeof headingSchema, 'Heading'>
            >();
        });

        expectTypeOf<typeof headingTag>().toEqualTypeOf<
            {
                [schemaKind]: typeof headingSchema;
                __JSPROSE_tag: true;
                tagName: 'Heading';
                schemaName: 'heading';
            } & ((
                props: TagProps<
                    'Heading',
                    typeof headingSchema,
                    {
                        level: 1 | 2 | 3;
                    } & TagChildren
                >,
            ) => RawElement<
                {
                    name: 'heading';
                    type: 'block';
                    linkable: true;
                    Data: {
                        level: 1 | 2 | 3;
                    };
                    Storage: undefined;
                    Children: [
                        {
                            name: 'text';
                            type: 'inliner';
                            linkable: false;
                            Data: string;
                            Storage: undefined;
                            Children: undefined;
                        },
                    ];
                },
                'Heading'
            >)
        >();
    });
});

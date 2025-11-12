import type { RawElement } from './element.js';
import { ProseError } from './error.js';
import type { AnySchema } from './schema.js';
import { PROSE_SINGLETON } from './singleton.js';
import type { LinkableTag } from './tag.js';
import { defineUnique, type Unique } from './unique.js';

/**
 * Defines a scoped portion of prose content with an explicit document ID.
 */
export function defineDocument<const TDefinition extends DocumentDefinition>(
    documentId: string,
    definition: TDefinition,
): DocumentFinalizer<ExtractUniques<TDefinition>>;

/**
 * Defines a scoped portion of prose content with an auto-generated or inserted at build time document ID.
 * @see `insertDocumentId()`
 */
export function defineDocument<const TDefinition extends DocumentDefinition>(
    definition: TDefinition,
): DocumentFinalizer<ExtractUniques<TDefinition>>;

export function defineDocument<const TDefinition extends DocumentDefinition>(
    idOrDefinitionArg: string | TDefinition,
    definitionArg?: TDefinition,
): DocumentFinalizer<ExtractUniques<TDefinition>> {
    let rawDocumentId: string | undefined;
    let definition: TDefinition;

    if (typeof idOrDefinitionArg === 'string') {
        rawDocumentId = idOrDefinitionArg;
        definition = definitionArg as TDefinition;
    } else {
        definition = idOrDefinitionArg;
        rawDocumentId = undefined;
    }

    const documentId = tryAddDocumentId(rawDocumentId);

    type UniquesType = ExtractUniques<TDefinition>;

    const uniques = {} as UniqueMap<UniquesType>;
    for (const [key, tag] of Object.entries(definition.uniques ?? {})) {
        (uniques as any)[key] = defineUnique({
            documentId,
            name: key,
            tag,
        });
    }

    function finalizeDocument(
        contentFunction: DocumentContentFunction<UniquesType>,
    ): Document<UniquesType> {
        const content = contentFunction({ uniques });

        for (const unique of Object.values(uniques) as Array<
            Unique<LinkableTag>
        >) {
            if (!unique.rawElement) {
                throw new ProseError(
                    `
Unique "${unique.name}" is not used in document content!
All uniques must be used in document!
                    `.trim(),
                );
            }
        }

        return {
            __JSPROSE_document: true,
            documentId,
            uniques,
            content,
        };
    }

    return finalizeDocument;
}

/**
 * Extracts and normalizes the uniques type from a definition.
 * Returns the exact uniques object type, or empty object if none provided.
 */
type ExtractUniques<TDefinition extends DocumentDefinition> =
    TDefinition['uniques'] extends infer U
        ? U extends Record<string, LinkableTag>
            ? U
            : {}
        : {};

/**
 * Maps a record of tags to a record of Unique instances.
 */
type UniqueMap<TUniques extends Record<string, LinkableTag>> = {
    [K in keyof TUniques]: Unique<TUniques[K]>;
};

/**
 * Function that receives uniques and returns document content.
 */
type DocumentContentFunction<TUniques extends Record<string, LinkableTag>> =
    (args: { uniques: UniqueMap<TUniques> }) => RawElement<AnySchema>;

/**
 * Function that finalizes document definition by accepting content.
 */
type DocumentFinalizer<TUniques extends Record<string, LinkableTag>> = (
    contentFunction: DocumentContentFunction<TUniques>,
) => Document<TUniques>;

/**
 * Represents a complete document with metadata and content.
 */
export interface Document<TUniques extends Record<string, LinkableTag>> {
    __JSPROSE_document: true;
    documentId: string;
    uniques: UniqueMap<TUniques>;
    content: RawElement<AnySchema>;
}

/**
 * Definition structure for creating documents.
 */
export interface DocumentDefinition {
    /**
     * Document-scope unique elements.
     */
    uniques?: Record<string, LinkableTag>;
}

export type AnyDocument = Document<Record<string, LinkableTag>>;

function tryAddDocumentId(documentId?: string): string {
    let finalId: string;

    if (documentId === undefined) {
        finalId = `__JSPROSE_DOCUMENT_ID_${PROSE_SINGLETON.document.autoIdCounter++}__`;
    } else {
        if (PROSE_SINGLETON.document.ids.has(documentId)) {
            throw new ProseError(
                `
Duplicate document ID detected: "${documentId}"!
Each document must have a unique ID!
            `.trim(),
            );
        }

        finalId = documentId;
    }

    PROSE_SINGLETON.document.ids.add(finalId);
    return finalId;
}

export function isDocument(value: any): value is AnyDocument {
    return value?.__JSPROSE_document === true;
}

/**
 * Inserts a document ID as the first argument of defineDocument calls that don't have an explicit ID.
 * Can be used in build tools to add custom IDs to documents.
 * For example, in "single document per file" path to file can be used as document ID.
 */
export function insertDocumentId(options: InsertDocumentIdOptions): string {
    const { insertId: documentId, aliasName: functionName = 'defineDocument' } =
        options;
    let { insertIn: searchIn } = options;

    // Escape special regex characters in function name
    const escapedFunctionName = functionName.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
    );

    // Match the function call with opening parenthesis and capture everything until we can determine if there's a comma
    const regex = new RegExp(`${escapedFunctionName}\\s*\\(`, 'g');

    let result = searchIn;
    let match;
    const matches: Array<{ index: number; length: number; hasComma: boolean }> =
        [];

    // Find all matches and check if they already have an ID (indicated by a comma before the first meaningful closing character)
    while ((match = regex.exec(searchIn)) !== null) {
        const startIndex = match.index;
        const matchLength = match[0].length;
        const afterParen = searchIn.slice(startIndex + matchLength);

        // Check if there's already a comma indicating two arguments
        // We need to find the first comma that's not inside nested structures
        const hasComma = hasCommaBeforeDefinition(afterParen);

        matches.push({
            index: startIndex,
            length: matchLength,
            hasComma,
        });
    }

    // Process matches in reverse order to maintain correct indices
    for (let i = matches.length - 1; i >= 0; i--) {
        const { index, length, hasComma } = matches[i];

        if (!hasComma) {
            const beforeMatch = searchIn.slice(0, index + length);
            const afterMatch = searchIn.slice(index + length);
            const whitespaceMatch = afterMatch.match(/^(\s*)/);
            const whitespace = whitespaceMatch ? whitespaceMatch[1] : '';
            const restAfterWhitespace = afterMatch.slice(whitespace.length);

            result =
                beforeMatch +
                whitespace +
                `'${documentId}', ` +
                restAfterWhitespace;
            searchIn = result; // Update searchIn for next iteration
        }
    }

    return result;
}

interface InsertDocumentIdOptions {
    /**
     * The source code to search in.
     */
    insertIn: string;
    /**
     * The document ID to insert.
     */
    insertId: string;
    /**
     * The function name to search for. Defaults to 'defineDocument'.
     * Useful when defineDocument is imported with an alias.
     */
    aliasName?: string;
}

function hasCommaBeforeDefinition(afterParen: string): boolean {
    let depth = 0;
    let inString: string | null = null;
    let escaped = false;

    for (let i = 0; i < afterParen.length; i++) {
        const char = afterParen[i];
        const prevChar = i > 0 ? afterParen[i - 1] : '';

        // Handle escape sequences
        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === '\\') {
            escaped = true;
            continue;
        }

        // Handle strings
        if (inString) {
            if (char === inString) {
                inString = null;
            }
            continue;
        }

        if (char === '"' || char === "'" || char === '`') {
            inString = char;
            continue;
        }

        // Track nesting depth
        if (char === '(' || char === '[' || char === '{') {
            depth++;
            continue;
        }

        if (char === ')' || char === ']' || char === '}') {
            if (depth === 0 && char === ')') {
                // Reached the end of the function call without finding a comma
                return false;
            }
            depth--;
            continue;
        }

        // Check for comma at depth 0
        if (char === ',' && depth === 0) {
            return true;
        }
    }

    return false;
}

import { test } from 'vitest';

import { defineUnique, type AnyUnique } from '@jsprose/core';

import { P } from './__reusable';

test('AnyUnique should be compatible with specific Unique types', () => {
    const exactUnique = defineUnique({
        documentId: 'doc1',
        name: 'exactUnique',
        tag: P,
    });

    const anyUnique: AnyUnique = exactUnique;
});

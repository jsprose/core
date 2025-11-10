import { defineConfig } from 'vitest/config';

function rel(path: string) {
    return new URL(path, import.meta.url).pathname;
}

export default defineConfig({
    test: {
        typecheck: { enabled: true, tsconfig: './tsconfig.test.json' },
    },
    resolve: {
        alias: {
            '@jsprose/core/jsx-dev-runtime': rel('./src/jsx-dev-runtime.ts'),
            '@jsprose/core/jsx-runtime': rel('./src/jsx-runtime.ts'),
            '@jsprose/core': rel('./src/index.ts'),
        },
    },
});

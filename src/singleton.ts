import { ProseError } from './error.js';
import { Registry } from './registry.js';

export interface Singleton {
    version: string;
    registry: Registry;
    document: {
        autoIdCounter: number;
    };
}

export const PROSE_SINGLETON: Singleton = {
    version: '{{ VERSION }}',
    registry: new Registry(),
    document: {
        autoIdCounter: 1,
    },
};

export const PROSE_REGISTRY = PROSE_SINGLETON.registry;

const singletonGlobalKey = '__JSPROSE__';

if ((globalThis as any)[singletonGlobalKey]) {
    // @TODO: Does not seem to work properly in SSR environments like Nuxt.
    // Nitro execute this file, after that Nuxt App server side does it again in same context causing this error to be thrown.
    //
    //     throw new ProseError(
    //         `
    // Attempting to create multiple JSProse singleton instances in the same context!
    // This can happen if multiple versions of @jsprose/core are included in the project.
    // Also make sure not to inline @jsprose/core package in your project!
    //         `.trim(),
    //     );
} else {
    (globalThis as any)[singletonGlobalKey] = PROSE_SINGLETON;
}

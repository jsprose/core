import { PROSE_REGISTRY, PROSE_SINGLETON } from './singleton.js';

/**
 * Clears all changes made to global `PROSE_SINGLETON` (registry items, document ids and etc.) after executing the provided function.
 * Allows safe testing without polluting global state between tests.
 */
export function isolateProse(
    func: () => void | Promise<void>,
): void | Promise<void> {
    const result = func();

    if (result instanceof Promise) {
        return result.finally(() => {
            PROSE_REGISTRY.setItems();
            PROSE_SINGLETON.document.ids.clear();
        });
    }

    PROSE_REGISTRY.setItems();
    PROSE_SINGLETON.document.ids.clear();
}

import type { ProseElement } from './element.js';
import type { AnySchema } from './schema.js';
import type { GenericStorage } from './storage.js';

export interface FinalizedProse {
    proseElement: ProseElement<AnySchema>;
    storage: GenericStorage;
}

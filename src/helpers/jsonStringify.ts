
import stableStringify from 'json-stable-stringify';
import { SkuidPage } from '../types/types';

/**
 * Serializes an object to a JSON string using a stable, prioritized key ordering
 * @param obj - the object to be stringified
 * @returns {String} a JSON stringy
 */
function stringify(obj:SkuidPage):string {
    return stableStringify(obj, {
        cmp(a, b) {
            // Prioritize name property
            if (a.key === 'name') return -1;
            if (b.key === 'name') return 1;
            // Otherwise alpha-sort
            return a.key.localeCompare(b.key);
        },
        // Use tabs
        space: '\t'
    }) || "";
}

export {
    stringify
};

// eslint-disable-next-line header/header
import stableStringify = require('json-stable-stringify');

/**
 * Serializes an object to a JSON string using a stable, prioritized key ordering
 *
 * @param obj - the object to be stringified
 * @returns {String} a JSON stringy
 */
function stringify(obj): string | undefined {
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
    });
}

export {
    stringify
};

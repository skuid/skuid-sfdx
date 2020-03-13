

const stableStringify = require("json-stable-stringify");

/**
 * 
 * @param obj - the object to be stringified
 * @returns {String} a JSON stringy
 */

function stringify(obj) {
    return stableStringify(obj, {
        cmp: function (a, b) {
            // Prioritize name property
            if (a.key === "name") return -1;
            if (b.key === "name") return 1;
            // Otherwise alpha-sort
            return a.key.localeCompare(b.key);
        },
        // Use tabs
        space: "\t",
    });
}

export {
    stringify,
};
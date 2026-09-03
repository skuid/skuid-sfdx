/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { isValidPageXML, PAGE_ROOT_ELEMENTS } from '../helpers/xml.js';
import { PageFileResults, SkippedPageFile, SkuidPage } from '../types/types.js';

const REQUIRED_PAGE_PROPERTIES = [
    'name',
    'uniqueId'
];

const INVALID_PAGE_JSON = 'Invalid Skuid Page JSON file';
const INVALID_PAGE_XML = 'Invalid Skuid Page XML file';

type GlobOptions = {
    cwd: string;
};

/**
 * Expands a single path / glob pattern.
 *
 * glob v7 sorted its matches; v9 onwards returns them in filesystem traversal
 * order. Page order is load-bearing -- AB#545952 made push payloads and log
 * output deterministic by preserving "the order their paths were globbed in" --
 * so sort explicitly here rather than inheriting whatever order the filesystem
 * hands back.
 *
 * @param {String} filePath - a path to a file, which may or may not contain a glob
 * @param {GlobOptions} opts - glob options
 * @return String[] - array of file paths, sorted
 */
async function globAsync(filePath: string, opts: GlobOptions): Promise<string[]> {
    const matches = await glob(filePath, opts);
    return matches.sort((a, b) => a.localeCompare(b));
}

/**
 * @param {String[]} filePaths - an array of file paths / globs, optionally within a source directory.
 * @returns {PageFileResults} the page definitions to push, plus any page files that were excluded
 */

async function getPageDefinitionsFromFileGlobs(filePaths: string[], sourceDirectory: string|undefined): Promise<PageFileResults> {
    const opts = {} as GlobOptions;
    if (sourceDirectory) opts.cwd = sourceDirectory;

    // For each path provided, expand any globs, resulting in an array of arrays.
    const globResults = await Promise.all(filePaths.map(filePath => globAsync(filePath, opts)));

    // Condense the arrays into one
    const combinedResults: string[] = [];
    const uniquePaths = new Set();
    for (const resultsArray of globResults) {
        for (let result of resultsArray) {
            // Ignore everything that's not .xml/.json
            if (!result.endsWith('.xml') && !result.endsWith('.json')) continue;
            // We're going to be looking for just .json files later,
            // so convert all .xml paths to .json, and deduplicate.
            if (result.endsWith('.xml')) result = result.substring(0, result.lastIndexOf('.xml')) + '.json';
            if (!uniquePaths.has(result) && result.endsWith('.json')) {
                uniquePaths.add(result);
                combinedResults.push(result);
            }
        }
    }

    const pageDefinitions = [] as SkuidPage[];
    const skippedFiles = [] as SkippedPageFile[];
    await Promise.all(
        combinedResults
            .map(async (f, index) => {
                let result: SkuidPage;
                try {
                    result = await getPageDefinitionFromJsonPath(path.resolve(sourceDirectory ?? '', f));
                    // Assign by index rather than pushing. These reads settle in I/O completion
                    // order, so pushing made the page order vary between runs, which produced
                    // nondeterministic push payloads and log output.
                    pageDefinitions[index] = result;
                } catch (e) {
                    let errorMessage: string;
                    if (typeof e === 'string') {
                        errorMessage = e;
                    } else if (e instanceof Error) {
                        errorMessage = e.message;
                    } else {
                        throw e;
                    }

                    // A file that is not a Skuid Page definition at all gets ignored without
                    // comment, so that broad globs (e.g. "**/*") remain usable.
                    if (errorMessage === INVALID_PAGE_JSON) return;

                    // A valid page definition whose companion XML we do not recognize is a
                    // different matter: that is a real page being dropped from the push, so
                    // record it for the caller to report rather than losing it silently.
                    if (errorMessage === INVALID_PAGE_XML) {
                        // Assigned by index for the same reason as pageDefinitions above, so that
                        // the warnings the caller emits also come out in a stable order.
                        skippedFiles[index] = {
                            filePath: f,
                            reason: `${INVALID_PAGE_XML}. Expected the document root to be one of: ${PAGE_ROOT_ELEMENTS.map(rootElement => `<${rootElement}>`).join(', ')}`
                        };
                        return;
                    }

                    throw e;
                }
            })
    );
    // Files that were skipped leave holes in the sparse arrays above; filter() drops those,
    // and the entries that did resolve keep the order their paths were globbed in.
    return {
        pageDefinitions: pageDefinitions.filter(pageDefinition => pageDefinition !== undefined),
        skippedFiles: skippedFiles.filter(skippedFile => skippedFile !== undefined)
    };
}

async function getFileBody(filePath: string): Promise<string> {
    return readFile(filePath, 'utf8');
}

/**
 * Performs a very basic sanity test on whether the input file a valid Skuid Page JSON definition
 *
 * @param pageDef {SkuidPage} pageDef - a potential Skuid Page JSON definition
 * @returns {Boolean}
 */
function isValidPageJSONDefinition(pageDef): boolean {
    // Our goal here is just to prevent users from inadvertently grabbing non-Skuid JSON files
    // via a glob pattern. We will defer to server-side validation to ensure the JSON is
    // properly formatted.
    let isValid = true;
    REQUIRED_PAGE_PROPERTIES.forEach((prop: string) => {
        if (!Object.prototype.hasOwnProperty.call(pageDef, prop)) {
            isValid = false;
        }
    });
    return isValid;
}

/**
 *
 * @param {String} jsonFilePath
 * @returns {SkuidPage} a Skuid Page definition
 * @throws Exception if the input file path corresponds to invalid Skuid Page JSON / XML
 */
async function getPageDefinitionFromJsonPath(jsonFilePath: string): Promise<SkuidPage> {
    const results = await Promise.all([
        getFileBody(jsonFilePath.replace('.json', '.xml')).catch(() => ''),
        getFileBody(jsonFilePath).catch(() => '')
    ]);
    const xml: string = results[0];
    const metadata: string = results[1];

    let pageDefinition;
    try {
        pageDefinition = JSON.parse(metadata) as SkuidPage;
    } catch { /* not valid JSON; handled below */ }

    // Ensure that the provided page JSON definition is valid,
    // otherwise do not include it.
    if (!pageDefinition || !isValidPageJSONDefinition(pageDefinition)) {
        throw Error(INVALID_PAGE_JSON);
    }
    if (xml && !isValidPageXML(xml)) {
        throw Error(INVALID_PAGE_XML);
    }

    return Object.assign(pageDefinition, {
        body: xml || null
    }) as SkuidPage;
}

export {
    getPageDefinitionsFromFileGlobs
};

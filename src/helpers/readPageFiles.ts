/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable unicorn/prefer-node-protocol */
import { readFile } from 'fs';
import path = require('path');
import glob = require('glob');
import { isValidPageXML } from '../helpers/xml';
import { SkuidPage } from '../types/types';

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
 *
 * @param {String} filePath - a path to a file, which may or may not contain a glob
 * @param {GlobOptions} opts - glob options
 * @return String[] - array of file paths
 */
async function globAsync(filePath: string, opts: GlobOptions): Promise<string[]> {
    return new Promise((resolve, reject) => {
        glob(filePath, opts, (err, files: string[]): void => {
            if (err) reject(err);
            else resolve(files);
        });
    });
}

/**
 * @param {String[]} filePaths - an array of file paths / globs, optionally within a source directory.
 * @returns {SkuidPage[]}
 */

async function getPageDefinitionsFromFileGlobs(filePaths: string[], sourceDirectory: string|undefined): Promise<SkuidPage[]> {
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
    await Promise.all(
        combinedResults
            .map(async f => {
                let result: SkuidPage;
                try {
                    result = await getPageDefinitionFromJsonPath(path.resolve(sourceDirectory ?? '', f));
                    pageDefinitions.push(result);
                } catch (e) {
                    let errorMessage: string;
                    if (typeof e === 'string') {
                        errorMessage = e;
                    } else if (e instanceof Error) {
                        errorMessage = e.message;
                    } else {
                        throw e;
                    }

                    if ([
                        INVALID_PAGE_XML,
                        INVALID_PAGE_JSON
                    ].includes(errorMessage)) {
                        return;
                    } else {
                        throw e;
                    }
                }
            })
    );
    return pageDefinitions;
}

async function getFileBody(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        readFile(filePath, 'utf8', (err, fileBody) => {
            if (err) reject(err);
            else resolve(fileBody);
        });
    });
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
    } catch (ex) { /* empty */ }

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

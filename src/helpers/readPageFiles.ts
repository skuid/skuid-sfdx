
import { readFile } from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import { SkuidPage } from '../types/types';

type GlobOptions = {
    cwd: string;
};

/**
 *
 * @param {String} filePath - a path to a file, which may or may not contain a glob
 * @param {GlobOptions} opts - glob options
 * @return String[] - array of file paths
 */
async function globAsync(filePath: string, opts: GlobOptions) {
    return new Promise((resolve, reject) => {
        glob(filePath, opts, async (err, files: string[]) => {
            if (err) reject(err);
            else resolve(files);
        });
    });
}

/**
 * @param {String[]} filePaths - an array of file paths / globs, optionally within a source directory.
 * @returns {SkuidPage[]}
 */

async function getPageDefinitionsFromFileGlobs(filePaths, sourceDirectory) {
    const opts = {} as GlobOptions;
    if (sourceDirectory) opts.cwd = sourceDirectory;

    // For each path provided, expand any globs, resulting in an array of arrays.
    const globResults = await Promise.all(filePaths.map(filePath => globAsync(filePath, opts))) as string[][];

    // Condense the arrays into one
    const combinedResults = [];
    const uniquePaths = new Set();
    for (const resultsArray of globResults) {
        for (let result of resultsArray) {
            // We're going to be looking for just .json files later,
            // so convert all .xml paths to .json, and deduplicate.
            if (result.endsWith('.xml')) result = result.substring(0, result.lastIndexOf('.xml')) + '.json';
            if (!uniquePaths.has(result) && result.endsWith('.json')) {
                uniquePaths.add(result);
                combinedResults.push(result);
            }
        }
    }

    const finalResults = await Promise.all(
        combinedResults
            .map(f => getPageDefinitionFromJsonPath(
                path.resolve(sourceDirectory || '', f)
            ))
    );
    return finalResults as SkuidPage[];
}

async function getFileBody(filePath) {
    return new Promise((resolve, reject) => {
        readFile(filePath, 'utf8', (err, fileBody) => {
            if (err) reject(err);
            else resolve(fileBody);
        });
    });
}

/**
 *
 * @param jsonFilePath
 * @returns {SkuidPage} a Skuid Page definition
 */
async function getPageDefinitionFromJsonPath(jsonFilePath) {
    const results = await Promise.all([
        getFileBody(jsonFilePath.replace('.json', '.xml')),
        getFileBody(jsonFilePath)
    ]);
    const xml: string = results[0] as string;
    const metadata: string = results[1] as string;

    const pageDefinition: SkuidPage = JSON.parse(metadata) as SkuidPage;

    return Object.assign(pageDefinition, {
        body: xml || null
    }) as SkuidPage;
}

export {
    getPageDefinitionFromJsonPath,
    getPageDefinitionsFromFileGlobs
};

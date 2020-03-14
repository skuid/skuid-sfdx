
import { readFile } from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import { SkuidPage } from '../types/types';

type GlobOptions = {
    cwd: string;
};

/**
 *
 * @param {String} fileGlob - a file glob pattern to use to find files within a source directory
 * @returns {SkuidPage[]}
 */

async function getPageDefinitionsFromGlob(fileGlob, sourceDirectory) {
    return new Promise((resolve, reject) => {
        const opts = {} as GlobOptions;
        if (sourceDirectory) opts.cwd = sourceDirectory;
        glob(fileGlob, opts, async (err, files: string[]) => {
            if (err) reject(err);
            else {
                const results = await Promise.all(
                    files
                        .filter(f => f.endsWith('.json'))
                        .map(f => getPageDefinitionFromJsonPath(
                            path.resolve(sourceDirectory || '', f)
                        ))
                );
                resolve(results as SkuidPage[]);
            }
        });
    });
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
    getPageDefinitionsFromGlob
};

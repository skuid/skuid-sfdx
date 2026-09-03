type SkuidPage = {
    apiVersion: string;
    name: string;
    uniqueId: string;
    type: string;
    module: string;
    maxAutoSaves: number;
    masterPageUniqueId: string;
    isMasterPage: boolean;
    composerSettings: object;
    // Marks the page's authoring format, e.g. "ink2" for a Page Designer (v3) page.
    // Absent on older pages.
    formatVersion?: string;
    body?: string;
    content?: string;
};

type PagePost = {
    changes: SkuidPage[];
    deletions: SkuidPage[];
};

/**
 * A file that looked like a Skuid Page but was excluded from the push.
 */
type SkippedPageFile = {
    filePath: string;
    reason: string;
};

type PageFileResults = {
    pageDefinitions: SkuidPage[];
    skippedFiles: SkippedPageFile[];
};

type PagePostResult = {
    pages: string[];
    success: boolean;
    upsertErrors: string[];
    skippedFiles?: SkippedPageFile[];
};

type PullQueryParams = {
    nomodule: boolean;
    module: string;
    page: string;
};

export {
    PageFileResults,
    PagePost,
    PagePostResult,
    PullQueryParams,
    SkippedPageFile,
    SkuidPage
};

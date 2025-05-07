// eslint-disable-next-line header/header
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
    body?: string;
    content?: string;
};

type PagePost = {
    changes: SkuidPage[];
    deletions: SkuidPage[];
};

type PagePostResult = {
    pages: string[];
    success: boolean;
    upsertErrors: string[];
};

type PullQueryParams = {
    nomodule: boolean;
    module: string;
    page: string;
};

export {
    PagePost,
    PagePostResult,
    PullQueryParams,
    SkuidPage
};


interface PullResponse {
    apiVersion: string;
    name: string;
    uniqueId: string;
    type: string;
    module: string;
    maxAutoSaves: number;
    masterPageUniqueId: string;
    isMasterPage: boolean;
    composerSettings: object;
    body: string;
    content: string;
}

type PullQueryParams = {
    nomodule: boolean;
    module: string;
    page: string;
};

export {
    PullResponse,
    PullQueryParams
};

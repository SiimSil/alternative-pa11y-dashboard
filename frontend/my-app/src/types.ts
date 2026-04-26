export type Scan = {
    _id: string
    name: string
    rootUrl: string
    standard: string
    config: object
    requiresAuth: boolean
    status: string
    createdAt: string
    scanCount: number
};

export type RerunScanInput = {
    id: string;
    username: string;
    password: string;
    runWithoutAuth: boolean;
};

export type ScanDetails = {
    scan: {
        _id: string,
        name: string,
        rootUrl: string,
        standard: string,
        config: object,
        requiresAuth: boolean,
        status: string,
        createdAt: string,
        scanCount: number,
        rerunAt: string
    },
    summary: {
        pageCount: number,
        total: number,
        error: number,
        warning: number,
        notice: number,
        aiCompleted: number,
        aiFailed: number
    },
    pages: Array<object>
};

export type SubpageTableData = {
    id: string,
    url: string,
    status: string,
    aiStatus: string,
    total: number,
    errors: number,
    warnings: number,
    notices: number,
    createdAt: Date,
}

export type SubpageResponse = {
    id: string,
    url: string,
    pa11yTaskId: string,
    status: string,
    aiStatus?: string,
    aiAnalysis?: string,
    createdAt: string,
    count: {
        total: number,
        error: number,
        warning: number,
        notice: number,
    }
    results: Array<Issue>
}

export type Issue = {
    code: string
    type: string
    typeCode: number
    message: string
    context: string
    selector: string
    runner: string
    runnerExtras: object
}

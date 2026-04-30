export type Scan = {
    _id: string
    name: string
    rootUrl: string
    standard: string
    config: object
    requiresAuth: boolean
    status: string
    createdAt: Date
    scanCount: number
    includeQuery: boolean
    includeHash: boolean
    depthLimit: number
    count?: {
        error: number
        warning: number
        notice: number
    }
    verdict?: string
};

export type RerunScanInput = {
    id: string;
    username: string;
    password: string;
    runWithoutAuth: boolean;
};

export type ScanDetails = {
    scan: Scan
    aiCompleted: number,
    aiFailed: number
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
    updatedAt: Date,
    aiSourceResultDate?: Date | string
}

export type SubpageResponse = {
    id: string,
    url: string,
    pa11yTaskId: string,
    status: string,
    aiStatus?: string,
    aiAnalysis?: string,
    aiSourceResultDate?: Date,
    createdAt: Date,
    updatedAt: Date,
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

export type Stats = {
    totalScans: number
    totalPages: number
    totalIssues: number
    totalErrors: number
    totalWarnings: number
    totalNotices: number
    wcag2ACount: number
    wcag2AACount: number
    wcag2AAACount: number
    nonConformingCount: number
    conformingCount: number
    manualAssessmentCount: number
    notVerifiedCount: number
    wcag2A_conforming: number
    wcag2A_non_conforming: number
    wcag2A_manualAssessment: number
    wcag2A_notVerified: number
    wcag2AA_conforming: number
    wcag2AA_non_conforming: number
    wcag2AA_manualAssessment: number
    wcag2AA_notVerified: number
    wcag2AAA_conforming: number
    wcag2AAA_non_conforming: number
    wcag2AAA_manualAssessment: number
    wcag2AAA_notVerified: number
    scanStartedCount: number
    scanFailedCount: number
    scanCompletedCount: number
    scanPartialCount: number
    pageStartedCount: number
    pageFailedCount: number
    pageCompletedCount: number
    pagePartialCount: number
    aiCompleted: number
    aiFailed: number
    avgIssuePage: number
    avgErrorPage: number
    avgWarningPage: number
    avgNoticePage: number
    avgIssueScan: number
    avgErrorScan: number
    avgWarningScan: number
    avgNoticeScan: number
    conformPercent: number
    aiCompletePercent: number
    scanCompletePercent: number
    pageCompletePercent: number
    manualPercent: number
}

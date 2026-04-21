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
}
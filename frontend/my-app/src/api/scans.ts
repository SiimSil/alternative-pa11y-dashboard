import type { Scan, RerunScanInput } from '../types.ts'

export async function getScans(): Promise<Scan[]> {
    const response = await fetch(`/api/scans`, {
        method: 'GET'
    })

    if(!response.ok)
        throw new Error('Failed to fetch scans');
    
    return response.json();
}

export async function postScan(scanInfo: object): Promise<object> {
    const response = await fetch(`/api/scans`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }, body: JSON.stringify(scanInfo)
        })

        if(!response.ok)
            throw new Error('Failed to create scan');

        return response.json();
}

export async function deleteScan(id: string) {
    const response = await fetch(`/api/scans/${id}`, {
        method: 'DELETE',
    })

    if(!response.ok)
        throw new Error('Failed to delete scan');
}

export async function rerunScan({id, username, password, runWithoutAuth}: RerunScanInput): Promise<object> {
    const response = await fetch(`/api/scans/${id}/rerun`, {
        method: 'POST',         
        headers: {
            'Content-Type': 'application/json',
        }, body: JSON.stringify({
            username,
            password,
            runWithoutAuth
        })
    })

    if(!response.ok)
        throw new Error('Failed to rerun scan');

    return response.json();
}

export async function getScanDetails(id: string) {
    const response = await fetch(`/api/scans/${id}/detail`, {
        method: 'GET'
    })

    if(!response.ok)
        throw new Error('Failed to fetch scan details');
    
    return response.json();
}

export async function aiAnalyzeScan(id: string) {
    const response = await fetch(`/api/scans/${id}/analyze`, {
        method: 'POST'
    })

    if(!response.ok)
        throw new Error('Failed to AI analyze scan');
    
    return response.json();
}
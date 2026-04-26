import type { Scan, RerunScanInput } from '../types.ts'

const API_BASE = 'http://localhost:4000'

export async function getScans(): Promise<Scan[]> {
    const response = await fetch(`${API_BASE}/scans`, {
        method: 'GET'
    })

    if(!response.ok)
        throw new Error('Failed to fetch scans');
    
    return response.json();
}

export async function postScan(scanInfo: object): Promise<object> {
    const response = await fetch(`${API_BASE}/scans`, {
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
    const response = await fetch(`${API_BASE}/scans/${id}`, {
        method: 'DELETE',
    })

    if(!response.ok)
        throw new Error('Failed to delete scan');
}

export async function rerunScan({id, username, password, runWithoutAuth}: RerunScanInput): Promise<object> {
    const response = await fetch(`${API_BASE}/scans/${id}/rerun`, {
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
    const response = await fetch(`${API_BASE}/scans/${id}/detail`, {
        method: 'GET'
    })

    if(!response.ok)
        throw new Error('Failed to fetch scan details');
    
    return response.json();
}

export async function aiAnalyzeScan(id: string) {
    const response = await fetch(`${API_BASE}/scans/${id}/analyze`, {
        method: 'POST'
    })

    if(!response.ok)
        throw new Error('Failed to AI analyze scan');
    
    return response.json();
}
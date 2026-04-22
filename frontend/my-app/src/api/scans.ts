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

export async function rerunScan({id, username, password, auth}: RerunScanInput): Promise<object> {
    const response = await fetch(`${API_BASE}/scans/${id}/rerun`, {
        method: 'POST',         
        headers: {
            'Content-Type': 'application/json',
        }, body: JSON.stringify({
            id,
            username,
            password,
            auth
        })
    })

    if(!response.ok)
        throw new Error('Failed to rerun scan');

    return response.json();
}
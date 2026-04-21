import type { Scan } from '../types.ts'

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
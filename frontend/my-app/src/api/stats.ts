import type { Stats } from "../types";

const API_BASE = 'http://localhost:4000'

export async function getStats(): Promise<Stats> {
    const response = await fetch(`${API_BASE}/stats`, {
        method: 'GET'
    })

    if(!response.ok)
        throw new Error('Failed to fetch statistics');
    
    return response.json();
}
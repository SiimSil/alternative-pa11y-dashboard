import type { Stats } from "../types";

export async function getStats(): Promise<Stats> {
    const response = await fetch(`/api/stats`, {
        method: 'GET'
    })

    if(!response.ok)
        throw new Error('Failed to fetch statistics');
    
    return response.json();
}
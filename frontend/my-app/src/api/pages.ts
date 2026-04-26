const API_BASE = 'http://localhost:4000'

export async function aiAnalyzePage(id: string) {
    const response = await fetch(`${API_BASE}/pages/${id}/analyze`, {
        method: 'POST'
    })

    if(!response.ok)
        throw new Error('Failed to AI analyze page');
    
    return response.json();
}
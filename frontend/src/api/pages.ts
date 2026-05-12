export async function aiAnalyzePage(id: string) {
    const response = await fetch(`/api/pages/${id}/analyze`, {
        method: 'POST'
    })

    if(!response.ok)
        throw new Error('Failed to AI analyze page');
    
    return response.json();
}
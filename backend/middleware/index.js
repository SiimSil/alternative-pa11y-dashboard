const express = require('express')
const app = express()
const port = 4000

app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.post('/scan', async (req, res) => {
    var scanCount = 0;
    var tasks = [];
    try {
        const url = req.body.url;
        const name = req.body.name
        const standard = req.body.standard

        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }

        var subpages = await crawl(url);

        while (subpages.length > 0) {
            let element = subpages.pop();
            let taskName = name + ' ' + element.url || "Accessibility Scan";
            let taskStandard = standard || "WCAG2AA";

            const response = await fetch('http://localhost:3000/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: taskName,
                    url: element.url,
                    standard: taskStandard
                })
            })
                
            if (!response.ok) {
                throw new Error(`Pa11y task creation failed: ${response.status}`);
            }

            const task = await response.json();

            const runResponse = await fetch(`http://localhost:3000/tasks/${task.id}/run`, {
                method: 'POST'
            })

            if (!runResponse.ok) {
                throw new Error(`Pa11y run failed: ${runResponse.status}`);
            }

            scanCount++;
            tasks.push({
                url: element.url,
                taskId: task.id
            })
        };
        res.json({
            message: "Tasks created and started",
            pagesScanned: scanCount,
            tasks: tasks
        }) 
    } catch (e) {
        console.error(e);

        res.status(500).json({
            error: "Failed to start scan",
            msg: e.message
        });
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

async function crawl(url) {
    const visited = new Set();
    const originUrl = new URL(url)
    const depthLimit = 3;

    const queue = [{url: url, depth: 0}];
    const results = [];

    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    while (queue.length>0) {
        let link = queue.shift(); //take element

        let linkUrl = new URL(link.url, originUrl);
        let normUrl = linkUrl.hostname+linkUrl.pathname
        visited.add(normUrl);

        try {
            var resultObj = null;
            await page.goto(linkUrl.href);
            await page.waitForLoadState('load'); //wait for DOM to load
            var links = []

            if (link.depth<depthLimit) {
                links = (await page.$$eval('a', links => links.map(link => link.href)));
                links.forEach(element => {
                    try {
                    let elUrl = new URL(element, originUrl)
                    let normElUrl = elUrl.hostname+elUrl.pathname
                    
                    if (!visited.has(normElUrl) && //has been visited?
                    !queue.some(queueEl => 
                        {let queueElUrl = new URL(queueEl.url)
                        let normQueueEl = queueElUrl.hostname + queueElUrl.pathname
                        return normQueueEl == normElUrl}) && //is duplicate?
                    originUrl.hostname == elUrl.hostname) //is external link?
                        queue.push({url: elUrl.href, depth: link.depth+1})
                    }
                    catch (e) {
                        console.error("Could not parse URL: "+e)
                    }
                });
            }
            let dom = await page.content();
            
            resultObj = {
                url: link.url,
                dom: dom,
                links: links
            }
        }
        catch (e) {
            console.error(e)
        }
        if(resultObj)
            results.push(resultObj)
    }
    await browser.close();
    return results;
}
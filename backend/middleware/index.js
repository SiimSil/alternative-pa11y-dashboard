const express = require('express')
const { MongoClient, ObjectId } = require('mongodb');
const app = express()
const port = 4000

// Connection URL
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

// Database Name
const dbName = 'pa11y-middleware';

app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.post('/scan', async (req, res) => {
    var scanCount = 0;
    var tasks = [];
    var requiresAuth = false;
    var username = undefined;
    var password = undefined;

    await client.connect()
    console.log('Connected successfully to server');

    const db = client.db(dbName);
    const collection = db.collection('scans');
    const id = new ObjectId();
    try {
        const url = req.body.url;
        const name = req.body.name || "Accessibility Scan"

        var config = {};
        const allowedOptionals = ["ignore", "timeout", "wait", "hideElements", "headers", "actions"]
        allowedOptionals.forEach(element => {
            if (req.body[element]!=undefined && req.body[element]!=null)
                config[element] = req.body[element]
        });
        const standard = req.body.standard || "WCAG2AA";
        if(req.body["username"]!=undefined && 
            req.body["username"]!=null &&
            req.body["password"]!=undefined &&
            req.body["password"]!=null) {
            requiresAuth = true;
            username = req.body["username"];
            password = req.body["password"];
        }

        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }

        const insertResult = await collection.insertOne({
            _id: id,
            name: name, 
            rootUrl: url,
            standard: standard,
            config: config,
            requiresAuth: requiresAuth,
            status: "running",
            createdAt: new Date(),});
        console.log('Inserted results into db =>', insertResult);

        var subpages = await crawl(url);

        while (subpages.length > 0) {
            let element = subpages.pop();

            console.log("Creating task: "+element.url)

            const response = await fetch('http://localhost:3000/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    url: element.url,
                    standard: standard,
                    ignore: config.ignore,
                    timeout: config.timeout,
                    wait: config.wait,
                    username: username,
                    password: password,
                    hideElements: config.hideElements,
                    headers: config.headers,
                    actions: config.actions
                })
            })
                
            if (!response.ok) {
                throw new Error(`Pa11y task creation failed: ${response.status}`);
            }

            const task = await response.json();

            console.log("Running task: "+element.url)

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
        let updateResult = await collection.updateOne({ _id: id }, { $set: { status: "completed", scanCount: scanCount } });
        console.log('Updated status to completed =>', updateResult);
        res.json({
            message: "Tasks created and started",
            scanId: id,
            scanCount: scanCount,
            tasks
        }) 
    } catch (e) {
        console.error(e);
        await collection.updateOne({ _id: id }, { $set: { status: "failed", scanCount: scanCount } });
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
    console.log("Crawling started: "+url)

    const visited = new Set();
    const originUrl = new URL(url)
    const depthLimit = 0;

    const queue = [{url: url, depth: 0}];
    const results = [];

    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    while (queue.length>0) {
        let link = queue.shift(); //take element

        console.log("Crawling: " + link.url)
        console.log("Queue size: " + queue.length)

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
            //let dom = await page.content();
            
            resultObj = {
                url: link.url,
                links: links
            }
        }
        catch (e) {
            console.error(e)
        }
        if(resultObj)
            results.push(resultObj)
    }
    console.log("Crawling finished: "+url)
    await browser.close();
    return results;
}
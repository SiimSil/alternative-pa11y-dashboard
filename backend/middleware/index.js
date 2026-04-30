const { MongoClient, ObjectId } = require('mongodb')
const OpenAI = require('openai')
const express = require('express')
const cors = require('cors')
const app = express()
const port = 4000
app.use(cors())
app.use(express.json())

const dbName = 'pa11y-middleware';
let db = null;

async function connect() {
    // Connection URL
    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);
    await client.connect()
    console.log('Connected successfully to server');
    db = client.db(dbName)
}

(async () => {
    await connect();
    app.listen(port, () => {
        console.log(`Alternative Pa11y dashboard listening on port ${port}`)
    })
    poll();
})();

//Get all scans
app.get('/scans', async (req, res) => {
    console.log('Fetching all scans')
    let collection = db.collection('scans')
    let find = await collection.find().toArray();
    return res.json(find);
})

//Get one scan by id
app.get('/scans/:id', async (req, res) => {
    let collection = db.collection('scans')
    try {
    let scan = await collection.findOne({ _id: { $eq: new ObjectId(req.params.id) } });
    if(scan===null) {
        console.log("Scan not found; id: "+req.params.id)
        return res.status(404).json({"error": "Scan not found; id: "+req.params.id})
    }
    return res.json(scan);
    } catch (e) {
        console.log("Invalid scanId:"+req.params.id+" error: "+e)
        return res.status(400).json({ error: "Invalid scanId:"+req.params.id+" error: "+e });
    }
})

//Delete one scan and all data related to it
app.delete('/scans/:id', async (req,res) => {
    let scanCollection = db.collection('scans')
    let pageCollection = db.collection('pages')
    let pages;
    let scanId;

    //Find all subpages
    try {
        scanId = new ObjectId(req.params.id);
        pages = await pageCollection.find({ scanId: { $eq: scanId } }).toArray();
        if(pages.length===0) {
            console.log("No pages found, scanId: "+req.params.id)
        }
    }
    catch (e) {
        console.log("Invalid scanId:"+req.params.id+" error: "+e)
        return res.status(400).json({ error: "Invalid scanId:"+req.params.id+" error: "+e });
    }

    //Delete pa11y tasks
    while (pages.length>0) {
        let page = pages.pop();
        let pa11yTaskId = page.pa11yTaskId;
        let taskResponse = await fetch(`http://localhost:3000/tasks/${page.pa11yTaskId}`, {
            method: 'DELETE'
        })
        if(!taskResponse.ok) {
            console.log("Pa11y task not found: "+pa11yTaskId+" page id: "+page._id)
        }
    }

    //Delete all subpages and the scan
    let deletePages = await pageCollection.deleteMany({ scanId: { $eq: scanId}});
    if(deletePages.deletedCount<1) {
        console.log("No pages to delete, scanId: "+req.params.id)
    }
    let deleteScan = await scanCollection.deleteOne({ _id: { $eq: scanId }});
    if(deleteScan.deletedCount<1) {
        console.log("No scan to delete, _id: "+req.params.id)
        return res.status(404).json({"error": "No scan found with id: "+req.params.id})
    }

    return res.sendStatus(204);
})

//Get results for all pages in a scan
app.get('/scans/:id/detail', async (req, res) => {
    let resultObj = {};
    let scansCollection = db.collection('scans')
    let scan;
    try {    
        scan = await scansCollection.findOne({ _id: { $eq: new ObjectId(req.params.id)}})
    } catch (e) {
        console.log("Invalid scanId:"+req.params.id+" error: "+e)
        return res.status(400).json({ error: "Invalid scanId:"+req.params.id+" error: "+e });
    }
    if(scan===null) {
        console.log("Scan not found; id: "+req.params.id)
        return res.status(404).json({"error": "Scan not found; id: "+req.params.id})
    }
    resultObj.scan=scan;
    let pagesCollection = db.collection('pages')
    let pages = await pagesCollection.find({ scanId: { $eq: new ObjectId(req.params.id) } }).toArray()
    let aiCompleted = 0;
    let aiFailed = 0;
    let resultPages = [];
    while (pages.length > 0) {
        let page = pages.pop()
        if(page.aiStatus==="completed")
            aiCompleted++;
        if(page.aiStatus==="failed")
            aiFailed++;
        let resultResponse = await fetch(`http://localhost:3000/tasks/${page.pa11yTaskId}/results?full=true`, {
            method: 'GET'
        })
        let resultPage=page;
        if(!resultResponse.ok) {
            console.log("Error getting response from pa11y");
            resultPage.results=null;
            resultPage.resultStatus="failed";
            resultPages.push(resultPage);
            continue;
        }
        let result = await resultResponse.json();
        let latestResult = Array.isArray(result) ? result[0] : null;
        if(!latestResult) {
            console.log("Pa11y response contains no results");
            resultPage.results=null;
            resultPage.resultStatus="failed";
            resultPages.push(resultPage);
            continue;
        }
        resultPage.results = latestResult.results;
        resultPages.push(resultPage);
    }
    resultObj.aiCompleted = aiCompleted;
    resultObj.aiFailed = aiFailed;
    resultObj.pages = resultPages;
    return res.json(resultObj);
})

//AI analyze all subpages
app.post('/scans/:id/analyze', async (req, res) => {
    let collection = db.collection('pages')
    let result = [];
    let pages;
    let browser = null;
    let playwrightPage = null;
    const includeNotices = req.query.notices === 'true';
    const includeDom = req.query.dom === 'true';
    try {
        if(includeDom) {
            const { chromium } = require('playwright');
            browser = await chromium.launch();
            const context = await browser.newContext();
            playwrightPage = await context.newPage();
        }
        try {    
            pages = await collection.find({ scanId: { $eq: new ObjectId(req.params.id) } }).toArray()
        } catch (e) {
            console.log("Invalid scanId:"+req.params.id+" error: "+e)
            return res.status(400).json({ error: "Invalid scanId:"+req.params.id+" error: "+e });
        }
        const client = new OpenAI({
            baseURL: "http://127.0.0.1:1337/v1",
            apiKey: "jan-local"
        });
        while (pages.length > 0) {
            let pageDoc = pages.pop()
            let warningsNotices = [];
            let dom;
            let resultEl = {
                url: pageDoc.url,
                pageId: pageDoc._id,
                pa11yTaskId: pageDoc.pa11yTaskId,
                status: "running"
            }
            let pa11yResults = await fetch(`http://localhost:3000/tasks/${pageDoc.pa11yTaskId}/results?full=true`, {
                method: 'GET'
            })
            if(pa11yResults.ok) {
                pa11yResults = await pa11yResults.json();
            }
            else {
                console.log("Error getting response from pa11y")
                resultEl.status="failed"
                let updateAi = await collection.updateOne({ _id: pageDoc._id }, { $set: { analysedAt: new Date(), aiStatus: "failed" }});
                console.log('Updated AI status to failed =>', updateAi);
                result.push(resultEl)
                continue
            }

            const latestResult = Array.isArray(pa11yResults) ? pa11yResults[0] : null;
            if(!latestResult) {
                resultEl.status = "failed";
                await collection.updateOne({ _id: pageDoc._id }, { $set: { analysedAt: new Date(), aiStatus: "failed" } });
                result.push(resultEl);
                continue;
            }
            const issues = Array.isArray(latestResult.results) ? latestResult.results : [];
            const aiSourceResultDate = latestResult.date
            resultEl.aiSourceResultDate = aiSourceResultDate;

            if(includeNotices) {
                warningsNotices = issues.filter(issue =>
                issue?.type === "warning" || issue?.type === "notice"
                );
            }
            else {
                warningsNotices = issues.filter(issue =>
                issue?.type === "warning"
                );
            }   
            let prompt = `
                Summarize these Pa11y accessibility warnings for a developer.

                Focus on:
                1. grouping similar issues,
                2. which fixes are highest priority,
                3. what can likely be fixed once in a shared component/template.

                Do not restate every instance.
                Be concise.

                Page URL: ${pageDoc.url}`;
            if(includeDom) {
                try {
                    await playwrightPage.goto(pageDoc.url);
                    await playwrightPage.waitForLoadState('load');
                    dom = await playwrightPage.content();
                    prompt = prompt + ("; dom: "+dom+";");
                }
                catch (e) {
                    console.log("Error in fetching DOM: "+e)
                    resultEl.status="failed"
                    let updateAi = await collection.updateOne({ _id: pageDoc._id }, { $set: { analysedAt: new Date(), aiStatus: "failed" }});
                    console.log('Updated AI status to failed =>', updateAi);
                    result.push(resultEl)
                    continue
                }
            }
            try {
                if(warningsNotices.length>0) {
                    let stringWarnings = [];
                    warningsNotices.forEach(warning => {
                        let stringWarning = "{"+warning.code+";"+warning.message+";"+warning.context+";"+warning.selector+"}";
                        stringWarnings.push(stringWarning)
                    });
                    const issueLabel = includeNotices ? 'warnings/notices' : 'warnings';
                    prompt += ` Pa11y ${issueLabel}: ${stringWarnings};`;
                    const completion = await client.chat.completions.create({
                        model: "Qwen3.5-4B-Q4_K_M.gguf",
                        messages: [
                            {   role: "user",
                                content: prompt}],
                        stream: false
                    });
                    const aiText = completion.choices?.[0]?.message?.content ?? null;
                    resultEl.aiAnalysis=aiText
                    let updateAi = await collection.updateOne({ _id: pageDoc._id }, { $set: { aiAnalysis: aiText,
                        analysedAt: new Date(), aiStatus: "completed", aiSourceResultDate: aiSourceResultDate
                    }});
                    console.log('Updated AI status to completed =>', updateAi);
                    resultEl.status="completed"
                    result.push(resultEl)
                }
                else {
                    let updateAi = await collection.updateOne({ _id: pageDoc._id }, { $set: {analysedAt: new Date(), aiAnalysis: null, 
                        aiStatus: "completed", aiSourceResultDate: aiSourceResultDate}});
                    console.log('Updated AI status to completed, no warnings and notices found =>', updateAi);
                    resultEl.status="completed";
                    resultEl.aiAnalysis=null;
                    result.push(resultEl);
                }
            }
            catch (e) {
                console.log("Error in AI generation: "+e)
                let updateAi = await collection.updateOne({ _id: pageDoc._id }, { $set: {analysedAt: new Date(), aiStatus: "failed"}});
                console.log('Updated AI status to failed =>', updateAi);
                resultEl.status="failed"
                result.push(resultEl)
            }
        }
        } finally {
            if (browser) await browser.close()
        }
        res.json(result);
})

//AI analyze a subpage
app.post('/pages/:id/analyze', async (req, res) => {
    let collection = db.collection('pages')
    let pageDoc;
    const includeNotices = req.query.notices === 'true';
    const includeDom = req.query.dom === 'true';
    try {    
        pageDoc = await collection.findOne({ _id: { $eq: new ObjectId(req.params.id) } })
        if (pageDoc===null)
            return res.status(404).json({"error": "Page not found"})
    } catch (e) {
        console.log("Invalid page id:"+req.params.id+" error: "+e)
        return res.status(400).json({ error: "Invalid page id:"+req.params.id+" error: "+e });
    }
    const client = new OpenAI({
        baseURL: "http://127.0.0.1:1337/v1",
        apiKey: "jan-local"
    });
    let warningsNotices = [];
    let dom;
    let resultEl = {
        url: pageDoc.url,
        pageId: pageDoc._id,
        pa11yTaskId: pageDoc.pa11yTaskId,
        status: "running"
    }
    let pa11yResult = await fetch(`http://localhost:3000/tasks/${pageDoc.pa11yTaskId}/results?full=true`, {
        method: 'GET'
    })
    if(pa11yResult.ok) {
        pa11yResult = await pa11yResult.json();
    }
    else {
        console.log("Error getting response from pa11y")
        resultEl.status="failed"
        let updateAi = await collection.updateOne({ _id: pageDoc._id }, { $set: { analysedAt: new Date(), aiStatus: "failed" }});
        console.log('Updated AI status to failed =>', updateAi);
        return res.status(400).json(resultEl)
    }

    const latestResult = Array.isArray(pa11yResult) ? pa11yResult[0] : null;
    if(!latestResult) {
        resultEl.status = "failed";
        await collection.updateOne({ _id: pageDoc._id }, { $set: { analysedAt: new Date(), aiStatus: "failed" } });
        return res.status(400).json(resultEl)
    }
    const issues = Array.isArray(latestResult.results) ? latestResult.results : [];

    const aiSourceResultDate = latestResult.date
    resultEl.aiSourceResultDate = aiSourceResultDate;
    if(includeNotices) {
        warningsNotices = issues.filter(issue =>
        issue?.type === "warning" || issue?.type === "notice"
        );
    }
    else {
        warningsNotices = issues.filter(issue =>
        issue?.type === "warning"
        );
    }  

    let prompt = `
    Summarize these Pa11y accessibility warnings for a developer.

    Focus on:
    1. grouping similar issues,
    2. which fixes are highest priority,
    3. what can likely be fixed once in a shared component/template.

    Do not restate every instance.
    Be concise.

    Page URL: ${pageDoc.url}`;

    let browser = null;
    if(includeDom) {
        try {
            const { chromium } = require('playwright');
            browser = await chromium.launch();
            const context = await browser.newContext();
            const playwrightPage = await context.newPage();
            await playwrightPage.goto(pageDoc.url);
            await playwrightPage.waitForLoadState('load');
            dom = await playwrightPage.content();
            prompt = prompt + ("; dom: "+dom+";");
        }
        catch (e) {
            console.log("Error in fetching DOM: "+e)
            resultEl.status="failed"
            let updateAi = await collection.updateOne({ _id: pageDoc._id }, { $set: { analysedAt: new Date(), aiStatus: "failed" }});
            console.log('Updated AI status to failed =>', updateAi);
            return res.status(400).json(resultEl);
        } finally {
            if (browser) await browser.close();
        }
    }
    try {
        if(warningsNotices.length>0) {
            let stringWarnings = []
            warningsNotices.forEach(warning => {
                let stringWarning = "{"+warning.code+";"+warning.message+";"+warning.context+";"+warning.selector+"}";
                stringWarnings.push(stringWarning)
            });
            const issueLabel = includeNotices ? 'warnings/notices' : 'warnings';
            prompt += ` Pa11y ${issueLabel}: ${stringWarnings};`;
            
            const completion = await client.chat.completions.create({
                model: "Qwen3.5-4B-Q4_K_M.gguf",
                messages: [
                    {   role: "user",
                        content: prompt}],
                stream: false
            });
            const aiText = completion.choices?.[0]?.message?.content ?? null;
            resultEl.aiAnalysis=aiText
            let updateAi = await collection.updateOne({ _id: pageDoc._id }, { $set: { aiAnalysis: aiText,
                analysedAt: new Date(), aiStatus: "completed", aiSourceResultDate: aiSourceResultDate
            }});
            console.log('Updated AI status to completed =>', updateAi);
            resultEl.status="completed"
            return res.status(200).json(resultEl)
        }
        else {
            let updateAi = await collection.updateOne({ _id: pageDoc._id }, { $set: {analysedAt: new Date(), aiAnalysis: null, 
                aiStatus: "completed", aiSourceResultDate: aiSourceResultDate}});
            console.log('Updated AI status to completed, no warnings and notices found =>', updateAi);
            resultEl.status="completed";
            resultEl.aiAnalysis=null;
            return res.status(200).json(resultEl)
        }
    }
    catch (e) {
        console.log("Error in AI generation: "+e)
        let updateAi = await collection.updateOne({ _id: pageDoc._id }, { $set: {analysedAt: new Date(), aiStatus: "failed"}});
        console.log('Updated AI status to failed =>', updateAi);
        resultEl.status="failed"
        return res.status(400).json(resultEl)
    }
})

//Make a new scan
app.post('/scans', async (req, res) => {
    let scanCount = 0;
    let tasks = [];
    let requiresAuth = false;
    let username = undefined;
    let password = undefined;

    const collection = db.collection('scans');
    const id = new ObjectId();
    try {
        const url = req.body.url;
        const name = req.body.name || "Accessibility Scan"

        let config = {};
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
        const includeQuery = req.body.includeQuery;
        const includeHash = req.body.includeHash;
        const depthLimit = req.body.depthLimit;

        const insertResult = await collection.insertOne({
            _id: id,
            name: name, 
            rootUrl: url,
            standard: standard,
            config: config,
            requiresAuth: requiresAuth,
            status: "running",
            includeQuery,
            includeHash,
            depthLimit,
            createdAt: new Date(),});
        console.log('Inserted results into db =>', insertResult);

        const subpages = await crawl(url, includeQuery, includeHash, depthLimit);

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

            const pageCollection = db.collection('pages');
            const pageId = new ObjectId();
            let insertPage = await pageCollection.insertOne({
            _id: pageId,
            scanId: id, 
            url: element.url,
            pa11yTaskId: task.id,
            status: "running",
            createdAt: new Date(),});
            console.log('Inserted page into db =>', insertPage);

            console.log("Running task: "+element.url)

            const runResponse = await fetch(`http://localhost:3000/tasks/${task.id}/run`, {
                method: 'POST'
            })

            if (!runResponse.ok) {
                let updatePage = await pageCollection.updateOne({ _id: pageId }, { $set: { status: "failed" } });
                console.log('Updated page status to failed =>', updatePage);
                throw new Error(`Pa11y run failed: ${runResponse.status}`);
            }
            else {
                let updatePage = await pageCollection.updateOne({ _id: pageId }, { $set: { status: "started" } });
                console.log('Updated page status to started =>', updatePage);
            }

            scanCount++;
            tasks.push({
                url: element.url,
                taskId: task.id
            })
        };
        let updateResult = await collection.updateOne({ _id: id }, { $set: { status: "started", scanCount: scanCount } });
        console.log('Updated status to started =>', updateResult);
        return res.json({
            message: "Tasks created and started",
            scanId: id.toString(),
            scanCount: scanCount,
            tasks
        }) 
    } catch (e) {
        console.error(e);
        await collection.updateOne({ _id: id }, { $set: { status: "failed", scanCount: scanCount } });
        return res.status(500).json({
            error: "Failed to start scan",
            msg: e.message
        });
    }
});

//Rerun scan
app.post('/scans/:id/rerun', async (req, res) => {
    let scanCount = 0;
    let tasks = [];
    let username;
    let password;
    let idObj;
    let existingScan;

    const scanCollection = db.collection('scans');
    const pageCollection = db.collection('pages')

    try {
        idObj = new ObjectId(req.params.id);
        existingScan = await scanCollection.findOne({ _id: idObj });
        if (existingScan === null) {
            return res.status(404).json({ error: "Scan not found; id: " + req.params.id });
        }
    } catch (e) {
        return res.status(400).json({ error: "Invalid scan id: " + req.params.id });
    }


    const rootUrl = existingScan.rootUrl;
    let taskBody = {
        name: existingScan.name,
        standard: existingScan.standard,
    };

    const allowedOptionals = ["ignore", "timeout", "wait", "hideElements", "headers", "actions"]
    allowedOptionals.forEach(element => {
        if (existingScan.config[element]!=undefined && existingScan.config[element]!=null)
            taskBody[element] = existingScan.config[element]
    });

    const runWithoutAuth = req.body.runWithoutAuth === true;
    if(!runWithoutAuth) {
        if(existingScan.requiresAuth===true) {
            console.log("Requires auth, checking new credentials...")
            username = req.body.username || undefined;
            password = req.body.password || undefined;
            const hasCredentials = username !== undefined && password !== undefined;
            if(hasCredentials) {
                taskBody.username = username;
                taskBody.password = password;
            }
            else {
                return res.status(400).json({error: "This scan requires credentials to rerun, unless runWithoutAuth is explicitly set to true."});
            }
        }
    }

    console.log("Deleting old subpages and Pa11y tasks")
    let pages;

    //Find all subpages
    try {
        pages = await pageCollection.find({ scanId: idObj }).toArray();
        if(pages.length===0) {
            console.log("No pages found, scanId: "+req.params.id)
        }
    }
    catch (e) {
        console.log("Invalid scanId:"+req.params.id+" error: "+e)
        return res.status(400).json({ error: "Invalid scanId:"+req.params.id+" error: "+e });
    }

    //Delete pa11y tasks
    while (pages.length>0) {
        let page = pages.pop();
        let pa11yTaskId = page.pa11yTaskId;
        let taskResponse = await fetch(`http://localhost:3000/tasks/${page.pa11yTaskId}`, {
            method: 'DELETE'
        })
        if(!taskResponse.ok) {
            console.log("Pa11y task not found: "+pa11yTaskId+" page id: "+page._id)
        }
    }

    //Delete all subpages
    let deletePages = await pageCollection.deleteMany({ scanId: idObj });
    if(deletePages.deletedCount<1) {
        console.log("No pages to delete, scanId: "+req.params.id)
    }

    try {
        const updateResult = await scanCollection.updateOne({ _id: idObj },{ $set: {
            status: "running",
            rerunAt: new Date(),}});
        console.log('Updated results in db =>', updateResult);

        const subpages = await crawl(rootUrl, existingScan.includeQuery, existingScan.includeHash, existingScan.depthLimit);

        while (subpages.length > 0) {
            let element = subpages.pop();

            console.log("Creating task: "+element.url)
            const pa11yTaskBody = {
                ...taskBody,
                url: element.url
            };
            console.log(pa11yTaskBody)

            const response = await fetch('http://localhost:3000/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(pa11yTaskBody)
            })
                
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Pa11y task creation failed:", response.status, errorText);
                throw new Error(`Pa11y task creation failed: ${response.status} ${errorText}`);
            }

            const task = await response.json();
            const pageId = new ObjectId();
            let insertPage = await pageCollection.insertOne({
            _id: pageId,
            scanId: idObj, 
            url: element.url,
            pa11yTaskId: task.id,
            status: "running",
            createdAt: new Date(),});
            console.log('Inserted page into db =>', insertPage);

            console.log("Running task: "+element.url)

            const runResponse = await fetch(`http://localhost:3000/tasks/${task.id}/run`, {
                method: 'POST'
            })

            if (!runResponse.ok) {
                let updatePage = await pageCollection.updateOne({ _id: pageId }, { $set: { status: "failed" } });
                console.log('Updated page status to failed =>', updatePage);
                throw new Error(`Pa11y run failed: ${runResponse.status}`);
            }
            else {
                let updatePage = await pageCollection.updateOne({ _id: pageId }, { $set: { status: "started" } });
                console.log('Updated page status to started =>', updatePage);
            }

            scanCount++;
            tasks.push({
                url: element.url,
                taskId: task.id
            })
        };
        let finalUpdateResult = await scanCollection.updateOne({ _id: idObj }, { $set: { status: "started", scanCount: scanCount } });
        console.log('Updated status to started =>', finalUpdateResult);
        return res.json({
            message: "Tasks created and started",
            scanId: idObj.toString(),
            scanCount: scanCount,
            tasks
        }) 
    } catch (e) {
        console.error(e);
        await scanCollection.updateOne({ _id: idObj }, { $set: { status: "failed", scanCount: scanCount } });
        return res.status(500).json({
            error: "Failed to start scan",
            msg: e.message
        });
    }
})

app.get('/stats', async (req, res) => {
    let scanCollection = db.collection('scans');
    let pageCollection = db.collection('pages')
    let scans = await scanCollection.find().toArray();
    let pages = await pageCollection.find().toArray();

    let scansLength = scans.length;
    let pagesLength = pages.length;

    let totalPages = pagesLength;
    let totalScans = scansLength;
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalNotices = 0;

    let wcag2ACount = 0;
    let wcag2AACount = 0;
    let wcag2AAACount = 0;

    let wcag2A_conforming = 0;
    let wcag2AA_conforming = 0;
    let wcag2AAA_conforming = 0;

    let wcag2A_non_conforming = 0;
    let wcag2AA_non_conforming = 0;
    let wcag2AAA_non_conforming = 0;

    let wcag2A_manualAssessment = 0;
    let wcag2AA_manualAssessment = 0;
    let wcag2AAA_manualAssessment = 0;

    let wcag2A_notVerified = 0;
    let wcag2AA_notVerified = 0;
    let wcag2AAA_notVerified = 0;

    let nonConformingCount = 0;
    let conformingCount = 0;
    let notVerifiedCount = 0;
    let manualAssessmentCount = 0;

    let scanStartedCount = 0;
    let scanCompletedCount = 0;
    let scanFailedCount = 0;
    let scanPartialCount = 0;

    let pageStartedCount = 0;
    let pageCompletedCount = 0;
    let pageFailedCount = 0;

    let aiCompleted = 0;
    let aiFailed = 0;

    while (scans.length > 0) {
        let scan = scans.shift();

        if(Object.hasOwn(scan, 'count')) {
            totalErrors+=scan.count.error ?? 0;
            totalWarnings+=scan.count.warning ?? 0;
            totalNotices+=scan.count.notice ?? 0;
        }

        if(scan.standard==='WCAG2A') {
            wcag2ACount++;
        }
        else {
            scan.standard==="WCAG2AA" ? wcag2AACount++ : wcag2AAACount++;
        }

        if(Object.hasOwn(scan, 'verdict')) {
            if(scan.verdict==='Non-conforming') {
                nonConformingCount++;
                if(scan.standard==='WCAG2A') {
                    wcag2A_non_conforming++;
                }
                else {
                    scan.standard==="WCAG2AA" ? wcag2AA_non_conforming++ : wcag2AAA_non_conforming++;
                }
            }
            else if (scan.verdict==='Conforming') {
                conformingCount++;
                if(scan.standard==='WCAG2A') {
                    wcag2A_conforming++;
                }
                else {
                    scan.standard==="WCAG2AA" ? wcag2AA_conforming++ : wcag2AAA_conforming++;
                }
            }
            else if (scan.verdict==='Not verified') {
                notVerifiedCount++;
                if(scan.standard==='WCAG2A') {
                    wcag2A_notVerified++;
                }
                else {
                    scan.standard==="WCAG2AA" ? wcag2AA_notVerified++ : wcag2AAA_notVerified++;
                }
            }
            else {
                manualAssessmentCount++;
                if(scan.standard==='WCAG2A') {
                    wcag2A_manualAssessment++;
                }
                else {
                    scan.standard==="WCAG2AA" ? wcag2AA_manualAssessment++ : wcag2AAA_manualAssessment++;
                }
            }
        }

        if(scan.status==='completed') {
            scanCompletedCount++;
        }
        else if (scan.status==='failed') {
            scanFailedCount++;
        }
        else {
            scan.status==='started' ? scanStartedCount++ : scanPartialCount++;
        }
    }

    while (pages.length>0) {
        let page = pages.shift();
        if(Object.hasOwn(page, 'aiStatus')) {
            page.aiStatus==='completed' ? aiCompleted++ : aiFailed++;
        }
        if(page.status==='started') {
            pageStartedCount++;
        }
        else {
            page.status==='completed' ? pageCompletedCount++ : pageFailedCount++;
        }
    }
    let conformPercent = Math.round((conformingCount*100/scansLength)*100)/100;
    let manualPercent = Math.round((manualAssessmentCount*100/scansLength)*100)/100;
    let aiCompletePercent = Math.round((aiCompleted*100/(aiCompleted+aiFailed))*100)/100;
    let scanCompletePercent = Math.round((scanCompletedCount*100/scansLength)*100)/100;
    let pageCompletePercent = Math.round((pageCompletedCount*100/pagesLength)*100)/100;

    let avgIssuePage = Math.round(((totalErrors+totalWarnings+totalNotices)/pagesLength)*100)/100;
    let avgErrorPage = Math.round((totalErrors/pagesLength)*100)/100;
    let avgWarningPage = Math.round((totalWarnings/pagesLength)*100)/100;
    let avgNoticePage = Math.round((totalNotices/pagesLength)*100)/100;

    let avgIssueScan = Math.round(((totalErrors+totalWarnings+totalNotices)/scansLength)*100)/100;
    let avgErrorScan = Math.round((totalErrors/scansLength)*100)/100;
    let avgWarningScan = Math.round((totalWarnings/scansLength)*100)/100;
    let avgNoticeScan = Math.round((totalNotices/scansLength)*100)/100;

    let returnObj = {
        totalScans,
        totalPages,
        totalIssues: totalErrors+totalWarnings+totalNotices,
        totalErrors,
        totalWarnings,
        totalNotices,
        wcag2ACount,
        wcag2AACount,
        wcag2AAACount,
        nonConformingCount,
        conformingCount,
        manualAssessmentCount,
        notVerifiedCount,
        wcag2A_conforming,
        wcag2A_non_conforming,
        wcag2A_manualAssessment,
        wcag2A_notVerified,
        wcag2AA_conforming,
        wcag2AA_non_conforming,
        wcag2AA_manualAssessment,
        wcag2AA_notVerified,
        wcag2AAA_conforming,
        wcag2AAA_non_conforming,
        wcag2AAA_manualAssessment,
        wcag2AAA_notVerified,
        scanStartedCount,
        scanFailedCount,
        scanCompletedCount,
        scanPartialCount,
        pageStartedCount,
        pageCompletedCount,
        pageFailedCount,
        aiCompleted,
        aiFailed,
        avgIssuePage,
        avgErrorPage,
        avgWarningPage,
        avgNoticePage,
        avgIssueScan,
        avgErrorScan,
        avgWarningScan,
        avgNoticeScan,
        conformPercent,
        aiCompletePercent,
        scanCompletePercent,
        pageCompletePercent,
        manualPercent
    }
    return res.status(200).json(returnObj);
})

async function crawl(url, includeQuery=false, includeHash=false, depthLimit=3) {
    console.log("Crawling started: "+url)

    const visited = new Set();
    const queued = new Set();

    const originUrl = new URL(url)
    const originNorm = normalizeUrl(url, originUrl, includeQuery, includeHash);

    const queue = [{url: url, depth: 0}];
    queued.add(originNorm)

    const results = [];

    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    while (queue.length>0) {
        let current = queue.shift(); //take element

        console.log("Crawling: " + current.url)
        console.log("Queue size: " + queue.length)

        let linkUrl = new URL(current.url, originUrl);
        let normUrl = normalizeUrl(linkUrl.href, originUrl, includeQuery, includeHash)
        queued.delete(normUrl)
        visited.add(normUrl);
        let resultObj = null;
        try {
            await page.goto(linkUrl.href, {
                waitUntil: "load",
                timeout: 30000});
            let links = []
            let resultLinks = []
            
            if (current.depth<depthLimit) {
                links = await page.locator('a[href]').evaluateAll(links => links.map(link => link.href));
                links.forEach(link => {
                    try {
                    let elUrl = new URL(link, originUrl)
                    let normElUrl = normalizeUrl(elUrl.href, originUrl, includeQuery, includeHash)

                    if (elUrl.protocol !== "http:" && elUrl.protocol !== "https:") { //wrong protocol?
                        return;
                    }

                    if(originUrl.host !== elUrl.host) { //external link?
                        return;
                    }
                    
                    if(!resultLinks.includes(normElUrl)) {
                        resultLinks.push(normElUrl)
                    }

                    if (!visited.has(normElUrl) && !queued.has(normElUrl)) {
                        queued.add(normElUrl)
                        queue.push({url: elUrl.href, depth: current.depth+1})
                    }
                    }
                    catch (e) {
                        console.error("Could not parse URL: "+e)
                    }
                });
            }
            
            resultObj = {
                url: current.url,
                links: resultLinks
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

function normalizeUrl(url, baseUrl, includeQuery, includeHash) {
    const norm = new URL(url, baseUrl)
    if(!includeQuery)
        norm.search = "";
    if(!includeHash)
        norm.hash = "";
    return norm.host+norm.pathname+norm.search+norm.hash
}

async function poll() {
    let scanCollection = db.collection('scans')
    let pageCollection = db.collection('pages')

    while (true) {
        try {
            console.log('Poll: Fetching all scans')
            let scans = await scanCollection.find().toArray();
            while (scans.length>0) {
                let scan = scans.shift();
                console.log("Poll: Scan found with id: "+scan._id)
                let error = 0;
                let warning = 0;
                let notice = 0;
                let verdict;
                let allResultsFound = true;
                let unchanged = true;
                let updatedAt = null;
                let pages = await pageCollection.find({ scanId: scan._id }).toArray();
                while (pages.length>0) {
                    let page = pages.shift();
                    let pa11yTaskId = page.pa11yTaskId
                    let pa11yResult = await fetch(`http://localhost:3000/tasks/${pa11yTaskId}/results?full=true`, {
                        method: 'GET'
                    })
                    let latestResult = null;
                    if(pa11yResult.ok) {
                        pa11yResult = await pa11yResult.json();
                        latestResult = Array.isArray(pa11yResult) ? pa11yResult[0] : null;
                        if(latestResult) {
                            let resultDate = new Date(latestResult.date);
                            let pageDate = page.updatedAt || page.createdAt;
                            console.log(resultDate.getTime())
                            console.log(pageDate.getTime())
                            console.log(!(pageDate.getTime()===resultDate.getTime()))

                            if(!(pageDate.getTime()===resultDate.getTime())) {
                                unchanged=false;
                                let updatePage = await pageCollection.updateOne({ _id: page._id }, { $set: { 
                                    status: "completed",
                                    count: {
                                        error: latestResult.count.error,
                                        warning: latestResult.count.warning,
                                        notice: latestResult.count.notice
                                    },
                                    updatedAt: resultDate
                                }});
                                if(updatedAt===null || resultDate.getTime()>updatedAt.getTime()) {
                                    updatedAt = resultDate
                                }
                                console.log('Poll: Updated page update date '+resultDate+' and status to completed', updatePage);
                            }
                        }
                        else {
                            console.log("Poll: Pa11y response okay: no results found")
                            allResultsFound=false;
                        }
                    } else {
                        console.log("Poll: Error getting response from pa11y")
                        allResultsFound=false;
                    }
                    if(latestResult) {
                        error+=latestResult.count.error
                        warning+=latestResult.count.warning;
                        notice+=latestResult.count.notice;
                    }
                    else if (Object.hasOwn(page, "count")) {
                        error+=page.count.error || 0;
                        warning+=page.count.warning || 0;
                        notice+=page.count.notice || 0;
                    }
                };
                if(updatedAt!==null) {
                    let updateScan = await scanCollection.updateOne({ _id: scan._id }, { $set: { 
                        updatedAt
                    }});
                }
                if(!unchanged) {
                    let count = {
                        error: error,
                        warning: warning,
                        notice: notice
                    }
                    if(!allResultsFound) {
                        verdict = "Not verified"
                    }
                    else if(error>0) {
                        verdict = "Non-conforming"
                    }
                    else {
                        if(warning>0 || notice>0) {
                            verdict = "Requires manual assessment"
                        }
                        else {
                            verdict = "Conforming"
                        }
                    }
                    if(allResultsFound) {
                        let updateScan = await scanCollection.updateOne({ _id: scan._id }, { $set: { 
                            status: "completed",
                            verdict,
                            count
                        }});
                        console.log('Poll: Updated scan status to completed =>', updateScan);
                    }
                    else {
                        //partial results update
                        let updateScan = await scanCollection.updateOne({ _id: scan._id }, { $set: { 
                            status: "partially complete",
                            verdict,
                            count
                        }});
                        console.log('Poll: Partial update of scan =>', updateScan);
                    }
                }
            };
        } catch (e) {
            console.log(e)
        }
        await new Promise(r => setTimeout(r, 60000));
    }
}
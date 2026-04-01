const express = require('express')
const app = express()
const port = 4000

app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.post('/scan', async (req, res) => {
    try {
        const url = req.body.url;
        const name = req.body.name
        const standard = req.body.standard

        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }

        const taskName = name || "Accessibility Scan";
        const taskStandard = standard || "WCAG2AA";

        const response = await fetch('http://localhost:3000/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: taskName,
            url: url,
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

        res.json({
            message: "Task created and started",
            taskId: task.id
        })
        
    } catch (e) {
        console.error(e);

        res.status(500).json({
            error: "Failed to start scan",
            msg: e.message
        });
    }
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
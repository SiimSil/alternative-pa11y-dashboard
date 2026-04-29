import { useQuery } from "@tanstack/react-query";
import { getStats } from "./api/stats";
import { Pie, PieChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';
import './Stats.css'

function Stats() {
    const { isPending, isError, data: queryData, error: queryError } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    })

    if(isPending) {
        return <h2 className="load">Loading statistics...</h2>
    }

    if(isError) {
        return <h2 className="load">{(queryError as Error).message}</h2>
    }

    let aiTotal = queryData.aiCompleted+queryData.aiFailed
    let standardChartData = [{ 
            name: 'WCAG2 A', 
            conforming: queryData.wcag2A_conforming,
            nonConforming: queryData.wcag2A_non_conforming,
            manualAssessment: queryData.wcag2A_manualAssessment,
            notVerified: queryData.wcag2A_notVerified
        },
        { 
            name: 'WCAG2 AA', 
            conforming: queryData.wcag2AA_conforming,
            nonConforming: queryData.wcag2AA_non_conforming,
            manualAssessment: queryData.wcag2AA_manualAssessment,
            notVerified: queryData.wcag2AA_notVerified
        },
        {
            name: 'WCAG2 AAA',
            conforming: queryData.wcag2AAA_conforming,
            nonConforming: queryData.wcag2AAA_non_conforming,
            manualAssessment: queryData.wcag2AAA_manualAssessment,
            notVerified: queryData.wcag2AAA_notVerified
        }];

    let aiChartData = [
        {
            name: 'completed',
            value: queryData.aiCompleted,
            fill: '#55ff2e'
        },
        {
            name: 'failed',
            value: queryData.aiFailed,
            fill: '#ff2e2e'
        }
    ]

    let pa11yIssueChartData = [
        {
            name: 'Issues',
            errors: queryData.totalErrors,
            warnings: queryData.totalWarnings,
            notices: queryData.totalNotices
        }
    ]

    let scanStatusChartData = [
        {
            name: 'Status',
            started: queryData.scanStartedCount,
            completed: queryData.scanCompletedCount,
            partial: queryData.scanPartialCount,
            failed: queryData.scanFailedCount
        }
    ]

    let pageStatusChartData = [
        {
            name: 'Status',
            started: queryData.pageStartedCount,
            completed: queryData.pageCompletedCount,
            failed: queryData.pageFailedCount
        }
    ]

    return <div className="statsContainer">
            <div className="statContainer">
            <h2 className="statsHeading">Pa11y Issues: {queryData.totalIssues}</h2>
            <div className="chartContainer">
                <div className="statsText">
                    <h3 className="innerHeading">Scan</h3>
                    <p>Average issues: {queryData.avgIssueScan}</p>
                    <p>Average errors: {queryData.avgErrorScan}</p>
                    <p>Average warnings: {queryData.avgWarningScan}</p>
                    <p>Average notices: {queryData.avgNoticeScan}</p>
                    <h3 className="innerHeading">Page</h3>
                    <p>Average issues: {queryData.avgIssuePage}</p>
                    <p>Average errors: {queryData.avgErrorPage}</p>
                    <p>Average warnings: {queryData.avgWarningPage}</p>
                    <p>Average notices: {queryData.avgNoticePage}</p>
                </div>
                <BarChart
                    style={{ width: '100%', minWidth:'25rem', maxWidth: '30rem', maxHeight: '20rem', height: '100%', aspectRatio: 1 }}
                    responsive
                    data={pa11yIssueChartData}
                    margin={{
                        top: 5,
                        right: 0,
                        left: 0,
                        bottom: 5,
                    }}
                    >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis width="auto" />
                    <Tooltip contentStyle={{
                        backgroundColor: '#1f2028', 
                        border: '1px solid #ffae00',
                        borderRadius: '8px',}}>
                    </Tooltip>
                    <Legend />
                    <Bar name="Errors" dataKey="errors" fill="#ff2e2e" activeBar={{ fill: 'pink', stroke: 'blue' }} radius={[8, 8, 0, 0]} />
                    <Bar name="Warnings" dataKey="warnings" fill="#ffe32e" activeBar={{ fill: 'pink', stroke: 'blue' }} radius={[8, 8, 0, 0]} />
                    <Bar name="Notices" dataKey="notices" fill="#327aff" activeBar={{ fill: 'pink', stroke: 'blue' }} radius={[8, 8, 0, 0]} />
                    <RechartsDevtools />
                </BarChart>
            </div>
        </div>
        <div className="statContainer">
            <h2 className="statsHeading">Standard and Conformity</h2>
            <div className="chartContainer">
                <div className="statsText">
                    <p>Total WCAG2 A scans: {queryData.wcag2ACount}</p>
                    <p>Total WCAG2 AA scans: {queryData.wcag2AACount}</p>
                    <p>Total WCAG2 AAA scans: {queryData.wcag2AAACount}</p>
                    <p>Manual assessment: {queryData.manualPercent}%</p>
                    <p>Conforming scans: {queryData.conformPercent}%</p>
                </div>
                <BarChart
                    style={{ width: '100%', minWidth: '25rem', maxWidth: '30rem', maxHeight: '20rem', height: '100%', aspectRatio: 1 }}
                    responsive
                    data={standardChartData}
                    margin={{
                        top: 20,
                        right: 0,
                        left: 0,
                        bottom: 5,
                    }}
                    >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" niceTicks="snap125" />
                    <YAxis width="auto" niceTicks="snap125" />
                    <Tooltip contentStyle={{
                        backgroundColor: '#1f2028', 
                        border: '1px solid #ffae00',
                        borderRadius: '8px',}}>
                    </Tooltip>
                    <Legend />
                    <Bar name='Conforming' dataKey="conforming" stackId="a" fill="#55ff2e" background />
                    <Bar name='Non-conforming' dataKey="nonConforming" stackId="a" fill="#ff2e2e" background />
                    <Bar name='Manual assessment required' dataKey="manualAssessment" stackId="a" fill="#ffe32e" background />
                    <Bar name='Not verified' dataKey="notVerified" stackId="a" fill="#7e7e7e" background />
                    <RechartsDevtools />
                </BarChart>
            </div>
        </div>
        <div className="statContainer">
            <h2 className="statsHeading">Scan Status</h2>
            <div className="chartContainer">
                <div className="statsText">
                    <p>Total scans: {queryData.totalScans}</p>
                    <p>Scan completion: {queryData.scanCompletePercent}%</p>
                </div>
                <BarChart
                    style={{ width: '100%', minWidth: '15rem', maxWidth: '15rem', maxHeight: '15rem', height: '100%', aspectRatio: 0.5 }}
                    responsive
                    data={scanStatusChartData}
                    margin={{
                        top: 5,
                        right: 0,
                        left: 0,
                        bottom: 5,
                    }}
                    >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis width="auto" />
                    <Tooltip contentStyle={{
                        backgroundColor: '#1f2028', 
                        border: '1px solid #ffae00',
                        borderRadius: '8px',}}>
                    </Tooltip>
                    <Legend />
                    <Bar name="Started" dataKey="started" fill="#327aff" activeBar={{ fill: 'pink', stroke: 'blue' }} radius={[8, 8, 0, 0]} />
                    <Bar name="Completed" dataKey="completed" fill="#55ff2e" activeBar={{ fill: 'pink', stroke: 'blue' }} radius={[8, 8, 0, 0]} />
                    <Bar name="Partially completed" dataKey="partial" fill="#ffe32e" activeBar={{ fill: 'pink', stroke: 'blue' }} radius={[8, 8, 0, 0]} />
                    <Bar name="Failed" dataKey="failed" fill="#ff2e2e" activeBar={{ fill: 'pink', stroke: 'blue' }} radius={[8, 8, 0, 0]} />
                    <RechartsDevtools />
                </BarChart>
            </div>
        </div>
        <div className="statContainer">
            <h2 className="statsHeading">Page Status</h2>
            <div className="chartContainer">
                <div className="statsText">
                    <p>Total pages: {queryData.totalPages}</p>
                    <p>Page completion: {queryData.pageCompletePercent}%</p>
                </div>
                <BarChart
                    style={{ width: '100%', minWidth: '10rem', maxWidth: '15rem', maxHeight: '15rem', height: '100%', aspectRatio: 0.5 }}
                    responsive
                    data={pageStatusChartData}
                    margin={{
                        top: 5,
                        right: 0,
                        left: 0,
                        bottom: 5,
                    }}
                    >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis width="auto" />
                    <Tooltip contentStyle={{
                        backgroundColor: '#1f2028', 
                        border: '1px solid #ffae00',
                        borderRadius: '8px',}}>
                    </Tooltip>
                    <Legend />
                    <Bar name="Started" dataKey="started" fill="#327aff" activeBar={{ fill: 'pink', stroke: 'blue' }} radius={[8, 8, 0, 0]} />
                    <Bar name="Completed" dataKey="completed" fill="#55ff2e" activeBar={{ fill: 'pink', stroke: 'blue' }} radius={[8, 8, 0, 0]} />
                    <Bar name="Failed" dataKey="failed" fill="#ff2e2e" activeBar={{ fill: 'pink', stroke: 'blue' }} radius={[8, 8, 0, 0]} />
                    <RechartsDevtools />
                </BarChart>
            </div>
        </div>
        <div className="statContainer">
            <h2 className="statsHeading">AI Status</h2>
            {aiTotal>0 ?
            <div className="chartContainer">
                <div className="statsText">
                    <p>AI completed: {queryData.aiCompleted}</p>
                    <p>AI failed: {queryData.aiFailed}</p>
                    <p>AI completion: {queryData.aiCompletePercent}%</p>
                </div>
                <PieChart
                    style={{ width: '100%', height: '100%', minHeight: '15', minWidth: '15rem', maxWidth: '10rem', maxHeight: '15rem', aspectRatio: 1 }}
                    responsive
                    >
                    <Pie
                        data={aiChartData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                        fill="#ffae00"
                        isAnimationActive={true}
                        label
                    />
                    <Tooltip contentStyle={{
                    backgroundColor: '#1f2028', 
                    border: '1px solid #ffae00',
                    borderRadius: '8px',}}>
                    </Tooltip>
                    <RechartsDevtools />
                </PieChart>
            </div> :
            <div className="statsText">
                <p>AI completed: {queryData.aiCompleted}</p>
                <p>AI failed: {queryData.aiFailed}</p>
            </div>}
        </div>
    </div>
}

export default Stats
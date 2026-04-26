import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiAnalyzeScan, getScanDetails } from "./api/scans"
import { useParams } from "react-router"
import './ScanDetails.css'
import { useState } from "react"
import Modal from "./Modal"
import { Pie, PieChart, Tooltip} from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';
import SubpageTable from "./SubpageTable.tsx"

function ScanDetails() {
    const queryClient = useQueryClient();
    const [isConfigModalOpen, setConfigModalOpen] = useState(false)
    const [modalTitle, setModalTitle] = useState('')
    const [modalContent, setModalContent] = useState<string>('')

    const aiAnalyzeScanMutation = useMutation({
    mutationFn: aiAnalyzeScan,
    onError: (e) =>
        console.log(e),
    onSuccess: async() => {
        await queryClient.invalidateQueries({queryKey: ['scanDetails', id]})
    }})

    let params = useParams();
    let id = params.id;
    const { isPending, isError, data, error } = useQuery({
    queryKey: ['scanDetails', id],
    queryFn: () => getScanDetails(id!),
    })

    if(isPending)
        return <h2 className='load'>Loading details...</h2>
    if(isError)
        return <h2 className='load'>{(error as Error).message}</h2>
    
    let summary = data.summary;
    let scan = data.scan;
    let optionals = scan.config;
    let chartData = [{ name: 'errors', value: summary.error },
        { name: 'warnings', value: summary.warning },
        { name: 'notices', value: summary.notice }];

    function openConfigModal(title: string, content: string) {
        setModalTitle(title)
        setModalContent(content)
        setConfigModalOpen(true)
    }

    function optionalRender() {
        const allowedOptionals = ["timeout", "wait", "hideElements", "headers", "actions", "ignore"]
        const result = allowedOptionals.filter((optional) => optionals[optional]!=null)
        return result.map((optional: string) => 
            {const value = optionals[optional]
            
            if (optional === "wait" || optional === "timeout") {
                return (<p key={optional}>
                            {optional}: {String(value)}ms
                        </p>)
            }
            if (optional === "hideElements") {
                return (
                    <p className="optionalContainer" key={optional}>
                        Hide elements: {value.split('\n').length} element(s){' '}
                        <button type="button" onClick={() => openConfigModal('Hidden elements:', value)}>View</button>
                    </p>
                )
            }
            if (optional === "ignore" && Array.isArray(value)) {
                return (
                    <p className="optionalContainer" key={optional}>
                        Ignore: {value.length} rule(s){' '}
                        <button type="button" onClick={() => openConfigModal('Ignored rules', value.join('\n'))}>View</button>
                    </p>
                )
            }
            if (optional === "actions" && Array.isArray(value)) {
                return (
                    <p className="optionalContainer" key={optional}>
                        Actions: {value.length} action(s){' '}
                        <button type="button" onClick={() => openConfigModal('Actions', value.join('\n'))}>View</button>
                    </p>
                )
            }
            if (optional === "headers" && typeof value === 'object' && !Array.isArray(value)) {
                const headerText = Object.entries(value)
                    .map(([key, val]) => `${key}: ${val}`)
                    .join('\n')

                return (
                    <p className="optionalContainer" key={optional}>
                        Headers: {Object.keys(value).length} header(s){' '}
                        <button type="button" onClick={() => openConfigModal('HTTP headers', headerText)}>View</button>
                    </p>
                )
            }
            return (
                <p key={optional}>
                    {optional}: {String(value)}
                </p>
            )}
        )
    }

    return (
    <div className="outerContainer">
        <h1 className="scanName">Scan details: {scan.name}</h1>
        <div className="detailsContainer">
            <div className='summaryContainer'>
                <h2>Summary</h2>
                <div className="summaryChartContainer">
                    <div className='summary'>
                        <p>Pages analyzed: {summary.pageCount}</p>
                        <p>Scan status: {scan.status}</p>
                        <p>Total issues: {summary.total}</p>
                        <p>Errors: {summary.error}</p>
                        <p>Warnings: {summary.warning}</p>
                        <p>Notices: {summary.notice}</p>
                    </div>
                    <PieChart
                        style={{ width: '100%', height: '100%', maxWidth: '15rem', maxHeight: '15rem', aspectRatio: 1 }}
                        responsive
                        >
                        <Pie
                            data={chartData}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            outerRadius="70%"
                            fill="#ffae00"
                            isAnimationActive={true}
                            label
                        />
                        <Tooltip defaultIndex={0} contentStyle={{
                        backgroundColor: '#2e303a', 
                        border: '1px solid #ffae00',
                        borderRadius: '8px',}}>
                        </Tooltip>
                        <RechartsDevtools />
                    </PieChart>
                </div>
                </div>
            <div className="ai">
                <h2>AI analysis</h2>
                <p>AI analyzed: {summary.aiCompleted+summary.aiFailed} page(s)</p>
                <p>AI analysis completed: {summary.aiCompleted}</p>
                <p>AI analysis failed: {summary.aiFailed}</p>
                <button onClick={() => aiAnalyzeScanMutation.mutate(id!)} 
                disabled={aiAnalyzeScanMutation.isPending}>
                {aiAnalyzeScanMutation.isPending ? 'Running...' : 'Run AI analysis'}
                </button>
            </div>
            <div className="ai">
                <h2>Pa11y task config</h2>
                <p>Standard: {scan.standard}</p>
                <p>{scan.requiresAuth ? "Authentication required" : "No authentication"}</p>
                {optionalRender()}
                {isConfigModalOpen && (
                <Modal onClose={() => setConfigModalOpen(false)} closeButton={true} boxClass="optionalModal">
                    <h2>{modalTitle}</h2>
                    <pre>{modalContent}</pre>
                </Modal>
            )}
            </div>
        </div>
        <SubpageTable pagesData={data.pages} />
    </div>
    )}

export default ScanDetails
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getScans, postScan } from './api/scans.ts'
import ScanItem from './ScanItem.tsx'
import './Scans.css'
import { useState } from 'react'
import Modal from './Modal.tsx';
import type { Scan } from './types.ts'
import './Modal.css'

function Scans(){
    const queryClient = useQueryClient();
    const [isModalOpen, setModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [rootUrl, setRootUrl] = useState('');
    const [standard, setStandard] = useState('WCAG2A');
    const [configIgnore, setConfigIgnore] = useState('')
    const [configTimeout, setConfigTimeout] = useState(0)
    const [configWait, setConfigWait] = useState(0)
    const [configUsername, setConfigUsername] = useState('')
    const [configPassword, setConfigPassword] = useState('')
    const [configHideElements, setConfigHideElements] = useState('')
    const [configHeaders, setConfigHeaders] = useState('')
    const [configActions, setConfigActions] = useState('')

    const { isPending, isError, data, error } = useQuery({
    queryKey: ['scans'],
    queryFn: getScans,
    })

    function displayScans(data: Array<Scan>) {
        if(data.length===0)
            return <h2 className='noScans'>No scans found. Add some!</h2>
        else {
            return data?.map((scan) => (
                <ScanItem key={scan._id} scan={scan}></ScanItem>
            ))
        }
    }

    const resetForm = () => {
        setModalOpen(false);
        setName('');
        setRootUrl('');
        setStandard('WCAG2A');
        setConfigIgnore('')
        setConfigTimeout(0)
        setConfigWait(0)
        setConfigUsername('')
        setConfigPassword('')
        setConfigHideElements('')
        setConfigHeaders('')
        setConfigActions('')
    };

    const addScan = useMutation({
        mutationFn: postScan,
        onError: (e) =>
            console.log('Failed to create scan: '+e),
        onSuccess: async() => {
            await queryClient.invalidateQueries({queryKey: ['scans']})
            resetForm();
        }
    })

    const handleSubmit = (e: React.SubmitEvent) => {
        e.preventDefault();

        setModalOpen(false);
        const configHeadersObject: Record<string, string> = {};
        configHeaders.split('\n').map(line => line.trim()).filter(Boolean).forEach((line) => {
            const separatorIndex = line.indexOf(':')
            if (separatorIndex === -1) {
                console.log(`Invalid header syntax: ${line}`)
                return
            }

            const key = line.slice(0, separatorIndex).trim()
            const value = line.slice(separatorIndex + 1).trim()

            if (key) {
                configHeadersObject[key] = value
            }
        });
        const configActionsArray = configActions.split('\n').map(line => line.trim()).filter(Boolean)
        const configIgnoreArray = configIgnore.split('\n').map(line => line.trim()).filter(Boolean)

        const newScan = {
            name: name.trim(),
            url: rootUrl.trim(),
            standard,
            ignore: configIgnoreArray.length>0 ? configIgnoreArray : undefined,
            timeout: configTimeout || undefined,
            wait: configWait || undefined,
            username: configUsername.trim() || undefined,
            password: configPassword.trim() || undefined,
            hideElements: configHideElements.trim() || undefined,
            headers: Object.keys(configHeadersObject).length ? configHeadersObject : undefined,
            actions: configActionsArray.length>0 ? configActionsArray : undefined
        };

        console.log('Submitting scan:', newScan);

        addScan.mutate(newScan);
    };

    if(isPending)
        return <h2 className='load'>Loading scans...</h2>
    if(isError)
        return <h2 className='load'>{(error as Error).message}</h2>

    return (
        <div>
            <div className={data.length>0 ? 'scans' : 'scans-empty'}>
                {displayScans(data)}
            </div>
            <button onClick={() => setModalOpen(true)} className='scanButton'>+</button>
            {isModalOpen && (
            <Modal onClose={() => setModalOpen(false)} boxClass='modal-box'>
                <div className='createScan'>
                    <h2>Create scan</h2>
                    <div className='scanConfig'>
                        <h3>Scan configuration (required)</h3>
                        <form className='scanForm' onSubmit={handleSubmit}>
                            <div className='configItem'>
                                <label>Scan name</label>
                                <input 
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                />
                            </div>
                            <div className='configItem'>
                                <label>Root URL</label>
                                <input
                                type="url"
                                value={rootUrl}
                                onChange={(e) => setRootUrl(e.target.value)}
                                required
                                />
                            </div>
                            <div className='configItem'>
                                <label>Standard</label>
                                <select 
                                name="standard"
                                onChange={(e) => setStandard(e.target.value)}
                                required
                                value={standard}>
                                    <option value="WCAG2A">WCAG2 A</option>
                                    <option value="WCAG2AA">WCAG2 AA</option>
                                    <option value="WCAG2AAA">WCAG2 AAA</option>
                                </select>
                            </div>
                            <h3>Pa11y task configuration (optional)</h3>
                            <div className='configItem'>
                                <label>Timeout (Default: 0ms)</label>
                                <input
                                type="number"
                                value={configTimeout}
                                onChange={(e) => setConfigTimeout(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
                                min="0"
                                placeholder='0'
                                />
                            </div>
                            <div className='configItem'>
                            <label>Wait (Default: 0ms)</label>
                                <input
                                type="number"
                                value={configWait}
                                onChange={(e) => setConfigWait(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
                                min="0"
                                placeholder='0'
                                />
                            </div>
                            <div className='configItem'>
                                <label>Username</label>
                                <input
                                type="text"
                                value={configUsername}
                                onChange={(e) => setConfigUsername(e.target.value)}
                                />
                            </div>
                            <div className='configItem'>
                                <label>Password (Stored in plain-text. Use only in secure environment!)</label>
                                <input
                                type="text"
                                value={configPassword}
                                onChange={(e) => setConfigPassword(e.target.value)}
                                />
                            </div>
                            <div className='configItem'>
                                <label>Hide elements</label>
                                <input
                                type="text"
                                value={configHideElements}
                                onChange={(e) => setConfigHideElements(e.target.value)}
                                placeholder='.advert, #modal, div[aria-role=presentation]'
                                ></input>
                            </div>
                            <div className='configItem'>
                            <label>HTTP headers (Separate headers with new line)</label>
                                <textarea
                                    value={configHeaders}
                                    onChange={(e) => setConfigHeaders(e.target.value)}
                                    placeholder="Cookie:foo=bar"
                                />
                            </div>
                            <div className='configItem'>
                            <label>Actions (Separate actions with new line)</label>
                                <textarea
                                    value={configActions}
                                    onChange={(e) => setConfigActions(e.target.value)}
                                    placeholder="Click element #login button"
                                />
                            </div>
                            <div className='configItem'>
                            <label>Ignored rules (Separate ignored rules with new line)</label>
                            <textarea
                                value={configIgnore}
                                onChange={(e) => setConfigIgnore(e.target.value)}
                                placeholder="E.g. WCAG2AA.Principle1.Guideline1_1.1_1_1.H30.2"
                            />
                            </div>
                            {addScan.isError && (<p>{(addScan.error as Error).message}</p>)}  
                            <button type="submit" disabled={addScan.isPending}>
                                {addScan.isPending ? 'Creating scan...' : 'Create scan'}</button>
                        </form>
                    </div>
                </div>
            </Modal>
            )}
        </div>
    )
}

export default Scans
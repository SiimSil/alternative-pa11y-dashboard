import { Link } from 'react-router'
import type { Scan } from './types.ts'
import './ScanItem.css'
import Modal from './Modal.tsx';
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteScan, rerunScan } from './api/scans.ts';

type Props = {
    scan: Scan
}

function ScanItem({ scan }: Props) {
    const queryClient = useQueryClient();
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isRerunModalOpen, setRerunModalOpen] = useState(false);
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [runWithoutAuth, setRunWithoutAuth] = useState(false)

    function verdictClass(): string {
        let verdict = scan.verdict;
        if(verdict==="Non-conforming") {
            return "redPill"
        }
        else if(verdict==="Needs review") {
            return "yellowPill"
        }
        else if(verdict==="Not verified") {
            return "greyPill"
        }
        else {
            return "greenPill"
        }
    }

    function statusClass(): string {
        let status = scan.status;
        if(status==="failed") {
            return "redPill"
        }
        else if(status==="partially complete") {
            return "greyPill"
        }
        else if(status==="completed") {
            return "greenPill"
        }
        else {
            return "bluePill"
        }
    }

    const deleteScanMutation = useMutation({
    mutationFn: deleteScan,
    onError: (e) =>
        console.log('Failed to delete scan: '+e),
    onSuccess: async() => {
        await queryClient.invalidateQueries({queryKey: ['scans']})
        setDeleteModalOpen(false);
    }})

    const rerunScanMutation = useMutation({
    mutationFn: rerunScan,
    onError: (e) =>
        console.log('Failed to rerun scan: '+e),
    onSuccess: async() => {
        await queryClient.invalidateQueries({queryKey: ['scans']})
        setRerunModalOpen(false);
    }})

    function rerunModal() {
        if(scan.requiresAuth) {
            return (
            <div>
                <button onClick={() => setRerunModalOpen(true)}>Rerun ⟲</button>
                {isRerunModalOpen && (
                <Modal onClose={() => setRerunModalOpen(false)} boxClass='modal-box' closeButton={false}>
                    <div>
                        <h2>Rerun {scan.name}?</h2>
                        <label>Username</label>
                        <input type='text' onChange={(e) => setUsername(e.target.value)} disabled={runWithoutAuth}></input>
                        <label>Password</label>
                        <input type='text' onChange={(e) => setPassword(e.target.value)} disabled={runWithoutAuth}></input>
                        <div className='rerunCheck'>
                            <label>Run without credentials this time</label>
                            <input type='checkbox' onChange={(e) => setRunWithoutAuth(e.target.checked)}></input>
                        </div>
                        <div className='rerunButtons'>
                            <button onClick={() => {setRerunModalOpen(false);
                                rerunScanMutation.mutate({id: scan._id, username, password, runWithoutAuth}); setRunWithoutAuth(false)}}>Rerun</button>
                            <button onClick={() => {setRerunModalOpen(false);
                                setRunWithoutAuth(false)
                            }}>Cancel</button>
                        </div>
                    </div>
                </Modal>)}
            </div>)
        }
        else {
            return (<button onClick={() => rerunScanMutation.mutate({id: scan._id, username, password, runWithoutAuth})}>Rerun ⟲</button>)
        }
    }

    return (
        <div className='scan'>
            <h2 className='scan-name'>{scan.name}</h2>
                <div className='standard-container'>
                    <p className={(scan.standard==="WCAG2A" || scan.standard==="WCAG2AA" || scan.standard==="WCAG2AAA") ? "standard-active":"standard"}>WCAG2 A</p>
                    <p className={(scan.standard==="WCAG2AA" || scan.standard==="WCAG2AAA") ? "standard-active":"standard"}>WCAG2 AA</p>
                    <p className={(scan.standard==="WCAG2AAA") ? "standard-active":"standard"}>WCAG2 AAA</p>
                </div>
                {scan.count &&
                    <div className='countContainer'>
                        <p className='error'>{scan.count?.error}</p>
                        <p className='warning'>{scan.count?.warning}</p>
                        <p className='notice'>{scan.count?.notice}</p>
                    </div>
                }
                <div className='scan-content'>
                    <p>Root url: {scan.rootUrl}</p>
                    <p>Pages discovered: {scan.scanCount}</p>
                    <div className='pillContainer'>
                        <p>Status: </p>
                        <p className={statusClass()}>{scan.status}</p>
                    </div>
                    {scan.verdict && 
                    (<div className='pillContainer'>
                        <p>Verdict:</p>
                        <p className={verdictClass()}>{scan.verdict}</p>
                    </div>)}
                </div>
                <div className='buttons'>
                    <button className='dangerButton' onClick={() => setDeleteModalOpen(true)}>Delete 🗑</button>
                    {isDeleteModalOpen && (
                        <Modal onClose={() => setDeleteModalOpen(false)} boxClass='deleteBox' closeButton={false}>
                            <h2>Delete {scan.name}?</h2>
                            <div className='deleteButtons'>
                                <button onClick={() => deleteScanMutation.mutate(scan._id)} className='dangerButton'>Delete</button>
                                <button onClick={() => setDeleteModalOpen(false)}>Cancel</button>
                            </div>
                        </Modal>
                    )}
                    {rerunModal()}
                    <Link to={`/scans/${scan._id}`}>Details ⇱</Link>
            </div>
        </div>
    )
}

export default ScanItem
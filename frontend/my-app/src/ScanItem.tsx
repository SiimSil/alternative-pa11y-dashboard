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

    return (
        <div className='scan'>
            <h3 className='scan-name'>{scan.name}</h3>
                <div className='standard-container'>
                    <p className={(scan.standard==="WCAG2A" || scan.standard==="WCAG2AA" || scan.standard==="WCAG2AAA") ? "standard-active":"standard"}>WCAG2 A</p>
                    <p className={(scan.standard==="WCAG2AA" || scan.standard==="WCAG2AAA") ? "standard-active":"standard"}>WCAG2 AA</p>
                    <p className={(scan.standard==="WCAG2AAA") ? "standard-active":"standard"}>WCAG2 AAA</p>
                </div>
                <div className='scan-content'>
                    <p>Root url: {scan.rootUrl}</p>
                    <p>Pages discovered: {scan.scanCount}</p>
                    <p>Status: {scan.status}</p>
                    <div className='buttons'>
                        <button onClick={() => setDeleteModalOpen(true)}>Delete scan</button>
                        {isDeleteModalOpen && (
                            <Modal onClose={() => setDeleteModalOpen(false)}>
                                <h2>Delete {scan.name}?</h2>
                                <button onClick={() => deleteScanMutation.mutate(scan._id)}>Delete</button>
                                <button onClick={() => setDeleteModalOpen(false)}>Cancel</button>
                            </Modal>
                        )}
                        <button onClick={() => setRerunModalOpen(true)}>Rerun scan</button>
                        {isRerunModalOpen && (
                            <Modal onClose={() => setRerunModalOpen(false)}>
                                <h2>Rerun {scan.name}?</h2>
                                <label>Username</label>
                                <input type='text' onChange={(e) => setUsername(e.target.value)}></input>
                                <label>Password</label>
                                <input type='text' onChange={(e) => setPassword(e.target.value)}></input>
                                <label>Run without credential this time</label>
                                <input type='checkbox' onChange={(e) => setRunWithoutAuth(e.target.checked)}></input>
                                <button onClick={() => rerunScanMutation.mutate({id: scan._id, username, password, auth: runWithoutAuth})}>Rerun</button>
                                <button onClick={() => setRerunModalOpen(false)}>Cancel</button>
                            </Modal>
                        )}
                        <Link to={`/scans/${scan._id}`}>Open details</Link>
                </div>
            </div>
        </div>
    )
}

export default ScanItem
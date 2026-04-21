import { Link } from 'react-router'
import type { Scan } from './types.ts'
import './ScanItem.css'

type Props = {
    scan: Scan
}

function ScanItem({ scan }: Props) {
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
                        <button>Delete scan</button>
                        <button>Rerun scan</button>
                        <Link to={`/scans/${scan._id}`}>Open details</Link>
                </div>
            </div>
        </div>
    )
}

export default ScanItem
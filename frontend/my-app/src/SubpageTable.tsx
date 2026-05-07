import { useReactTable, createColumnHelper, getCoreRowModel, flexRender, getSortedRowModel, getPaginationRowModel } from '@tanstack/react-table'
import type { SortingState } from "@tanstack/react-table";
import type { SubpageTableData, SubpageResponse } from './types'
import './SubpageTable.css'
import { useState, useMemo } from 'react'
import SubpageDetails from './SubpageDetails';

const columnHelper = createColumnHelper<SubpageTableData>()

function verdictPillClass(verdict: SubpageTableData['verdict']) {
        switch (verdict) {
            case 'Conforming':
                return 'greenPill'
            case 'Needs review':
                return 'yellowPill'
            case 'Non-conforming':
                return 'redPill'
            default:
                return 'greyPill'
        }
    }

    function countPillClass(type: 'error' | 'warning' | 'notice', value: number) {
        if (value === 0) return 'greyPill'

        switch (type) {
            case 'error':
                return 'redPill'
            case 'warning':
                return 'yellowPill'
            case 'notice':
                return 'bluePill'
        }
    }

    const defaultColumns = [
        columnHelper.accessor('verdict', {
            header: 'Verdict',
            cell: info => {
                const verdict = info.getValue()
                return <span className={verdictPillClass(verdict)}>{verdict}</span>
            },
            sortingFn: 'text',
        }),
        columnHelper.accessor('url', {
        header: "URL",
        cell: info => info.getValue(),
        enableSorting: false
        }),
        columnHelper.accessor('status', {
            header: "Status",
            cell: info => {
                const status = info.getValue()

                return (
                <span className={status === 'completed' ? 'greenPill' : 'greyPill'}>{status}</span>
            )
        },
        sortingFn: 'text'
        }),
        columnHelper.accessor('total', {
        header: "Total",
        cell: info => info.getValue(),
        sortingFn: 'basic'
        }),
        columnHelper.accessor('errors', {
            header: "Errors",
            cell: info => {
                const value = info.getValue()
                return (
                    <span className={countPillClass('error', value)}>{value}</span>
                )
            },
            sortingFn: 'basic'
        }),
        columnHelper.accessor('warnings', {
            header: "Warnings",
            cell: info => {
                const value = info.getValue()
                return (
                    <span className={countPillClass('warning', value)}>{value}</span>
                )
            },
            sortingFn: 'basic'
        }),
        columnHelper.accessor('notices', {
            header: "Notices",
            cell: info => {
                const value = info.getValue()
                return (
                    <span className={countPillClass('notice', value)}>{value}</span>
                )
            },
            sortingFn: 'basic'
        }),
        columnHelper.accessor('updatedAt', {
        header: "Updated",
        cell: info => info.getValue().toLocaleString(),
        sortingFn: 'datetime'
        }),
        columnHelper.accessor('aiStatus', {
        header: "AI status",
        cell: info => info.getValue(),
        sortingFn: 'text'
        }),
        columnHelper.accessor('aiSourceResultDate', {
        header: "AI Result Date",
        cell: info => info.getValue()?.toLocaleString() ?? 'None',
        sortingFn: 'datetime'
        })
    ]

function SubpageTable({ pagesData }: { pagesData: SubpageResponse[] }) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [pagination, setpageIndex] = useState({pageIndex: 0, pageSize: 5,});
    const [goToIndex, setgoToIndex] = useState(pagination.pageIndex);
    const [selectedRow, setselectedRow] = useState<SubpageResponse | undefined>(undefined)
    const [search, setSearch] = useState('')

    const pages: SubpageTableData[] = useMemo(() => {
    return pagesData.map((element): SubpageTableData => ({
        _id: element._id,
        verdict: element.verdict,
        url: element.url,
        status: element.status,
        aiStatus: element.aiStatus || "Not run",
        total: (element.count?.error ?? 0)+(element.count?.warning ?? 0)+(element.count?.notice ?? 0),
        errors: element.count?.error ?? 0,
        warnings: element.count?.warning ?? 0,
        notices: element.count?.notice ?? 0,
        updatedAt: new Date(element.updatedAt),
        aiSourceResultDate: element.aiSourceResultDate ? new Date(element.aiSourceResultDate) : undefined
    }))
    }, [pagesData])

    const filteredPages: SubpageTableData[] = useMemo(() => {
        if (search.trim() === '') {
            return pages
        }

        const searchLower = search.toLowerCase()

        return pages.filter(page =>
            page.url.toLowerCase().includes(searchLower) ||
            page.verdict.toLowerCase().includes(searchLower) ||
            page.status.toLowerCase().includes(searchLower) ||
            page.aiStatus.toLowerCase().includes(searchLower)
        )
    }, [pages, search])

    const table = useReactTable({
        data: filteredPages,
        columns: defaultColumns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setpageIndex,
        state: {
            sorting,
            pagination,
        },
    })

    return (
        <div className="subpagesContainer">
        <div className='subpageTableHead'>
        <h2>Subpages</h2>
            <input
                type="search"
                placeholder="Search subpages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>
        <table className='subpagesTable'>
            <thead>
            {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                    return (
                    <th key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder ? null : (
                        <div
                            className={header.column.getCanSort() ? 'sortableHeader' : ''}
                            onClick={header.column.getToggleSortingHandler()}
                            title={header.column.getCanSort()
                                ? header.column.getNextSortingOrder() === 'asc'
                                ? 'Sort ascending'
                                : header.column.getNextSortingOrder() === 'desc'
                                    ? 'Sort descending'
                                    : 'Clear sort'
                                : undefined
                            }
                        >
                            {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                            )}
                            {{
                            asc: ' ˄',
                            desc: ' ˅',
                            }[header.column.getIsSorted() as string] ?? null}
                        </div>
                        )}
                    </th>
                    )
                })}
                </tr>
            ))}
            </thead>
            <tbody>
            {table.getRowModel().rows.length === 0 ? (
                <tr>
                    <td colSpan={defaultColumns.length}>No subpages found.</td>
                </tr>
                ) : (
                table.getRowModel().rows.map((row) => (
                    <tr key={row.id} 
                        onClick={() => {
                            setselectedRow(pagesData.find((page) => page._id===row.original._id))}
                        }>
                    {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                    ))}
                    </tr>
                ))
            )}
            </tbody>
        </table>
        <div className='tableControls'>
            <button
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
            >
            {'<<'}
            </button>
            <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            >
            {'<'}
            </button>
            Page {pagination.pageIndex + 1} of {table.getPageCount()}
            <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            >
            {'>'}
            </button>
            <button
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}
            >
            {'>>'}
            </button>
            <label>Page size:</label>
            <select
            value={table.getState().pagination.pageSize}
            onChange={e => {
                table.setPageSize(Number(e.target.value))
            }}
            >
            {[5, 10, 25, 50, 100].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                {pageSize}
                </option>
            ))}
            </select>
            <input type='number' min={1} max={table.getPageCount()} onChange={(e) => setgoToIndex(e.target.valueAsNumber)}></input>
            <button onClick={() => setpageIndex({pageIndex: goToIndex-1, pageSize: pagination.pageSize})}>Go to page</button>
        </div>
        {selectedRow!==undefined && (
            <SubpageDetails page={selectedRow}></SubpageDetails>
        )}
    </div>
)}

export default SubpageTable
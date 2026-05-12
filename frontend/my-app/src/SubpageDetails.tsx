import type { Issue, SubpageResponse } from "./types";
import { useReactTable, createColumnHelper, getCoreRowModel, getExpandedRowModel, flexRender, getSortedRowModel, getPaginationRowModel } from '@tanstack/react-table';
import { useState, useMemo, Fragment } from 'react'
import type { SortingState } from "@tanstack/react-table";
import './SubpageDetails.css'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { aiAnalyzePage } from "./api/pages";
import { useParams } from "react-router"
import ReactMarkdown from 'react-markdown'

const columnHelper = createColumnHelper<Issue>()
const defaultColumns = [
    columnHelper.accessor('type', {
    header: 'Type',
    cell: info => {
        const type = info.getValue()

        const pillClass =
        type === 'error'
            ? 'redPill'
            : type === 'warning'
            ? 'yellowPill'
            : 'bluePill'

        return <span className={pillClass}>{type}</span>
    },
    sortingFn: 'text',
    }),

    columnHelper.accessor('count', {
        header: 'Count',
        cell: info => <span className="standardPill">{info.getValue()}</span>,
        sortingFn: 'basic',
    }),

    columnHelper.accessor('code', {
        header: 'Code',
        cell: info => info.getValue(),
        sortingFn: 'text',
    }),

    columnHelper.accessor('message', {
        header: 'Message',
        cell: info => info.getValue(),
        sortingFn: 'text',
    }),
        columnHelper.display({
        id: 'expand',
        header: '',
        cell: ({ row }) => (
        <button
            type="button"
            className="expandButton"
            onClick={(e) => {
            e.stopPropagation()
            row.toggleExpanded()
            }}
            aria-label={row.getIsExpanded() ? 'Collapse issue details' : 'Expand issue details'}
        >
            {row.getIsExpanded() ? '−' : '+'}
        </button>
        ),
    }),
]

function SubpageDetails({ page }: { page: SubpageResponse}) {
    const queryClient = useQueryClient();
    const { id: scanId } = useParams()
    const [sorting, setSorting] = useState<SortingState>([])
    const [pagination, setpageIndex] = useState({pageIndex: 0, pageSize: 5,});
    const [goToIndex, setgoToIndex] = useState(pagination.pageIndex);
    const [issueType, setIssueType] = useState<'all issue' | 'error' | 'warning' | 'notice'>('error')
    const [search, setSearch] = useState('')

    const filteredIssues: Issue[] = useMemo(() => {
        let issues = page.results

        if (issueType !== 'all issue') {
            issues = issues.filter(issue => issue.type === issueType)
        }

        if (search.trim() !== '') {
            const searchLower = search.toLowerCase()

            issues = issues.filter(issue =>
                issue.code.toLowerCase().includes(searchLower) ||
                issue.message.toLowerCase().includes(searchLower) ||
                issue.occurrences.some(occurrence =>
                    occurrence.selector?.toLowerCase().includes(searchLower) ||
                    occurrence.context?.toLowerCase().includes(searchLower)
                )
            )
    }
    return issues
    }, [page.results, issueType, search])

    const aiAnalyzePageMutation = useMutation({
        mutationFn: aiAnalyzePage,
        onError: (e) =>
            console.log(e),
        onSuccess: async() => {
            await queryClient.invalidateQueries({queryKey: ['scanDetails', scanId]})
    }})

    const table = useReactTable({
        data: filteredIssues,
        columns: defaultColumns,
        getRowCanExpand: row => row.original.occurrences.length > 0,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
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
        <div className="subpageDetailsContainer">
            <h2>Subpage details: {page.url}</h2>
            <div className="innerDetails">
                <div className="aiContainer">
                    {page.aiAnalysis!==undefined ? (
                        <div className="analysis">
                            <div className="aiHeader">
                                <h2>AI analysis</h2>
                                <button className="reAnalyse" onClick={() => aiAnalyzePageMutation.mutate(page._id)} disabled={aiAnalyzePageMutation.isPending}>
                                    {aiAnalyzePageMutation.isPending ? '...' : '⟲'}
                                </button>
                            </div>
                            <ReactMarkdown>{page.aiAnalysis}</ReactMarkdown>
                        </div>
                    ) : (
                        <div>
                            <p>No AI analysis found</p>
                            <button className="centerAnalysisButton" onClick={() => aiAnalyzePageMutation.mutate(page._id)} disabled={aiAnalyzePageMutation.isPending}>
                                {aiAnalyzePageMutation.isPending ? 'Analysing...' : 'Analyse this page'}
                            </button>
                        </div>)}
                </div>
                <div className="issueTableHead">
                    <h2 className="noBorder">Showing {issueType}s</h2>
                    <div className="issueSelectContainer">
                        <input
                            type="search"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <select
                            name="issueType"
                            onChange={(e) => setIssueType(e.target.value as 'all issue' | 'error' | 'warning' | 'notice')}
                            value={issueType}
                            >
                            <option value="all issue">All issues</option>
                            <option value="error">Errors</option>
                            <option value="warning">Warnings</option>
                            <option value="notice">Notices</option>
                        </select>
                    </div>
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
                            <td colSpan={defaultColumns.length}>No issues found.</td>
                        </tr>
                        ) : (
                        table.getRowModel().rows.map((row) => (
                            <Fragment key={row.id}>
                                <tr key={row.id} onClick={row.getToggleExpandedHandler()}>
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                                {row.getIsExpanded() && (
                                    <tr className="expandedIssueRow">
                                        <td colSpan={row.getVisibleCells().length}>
                                        <div className="occurrencesContainer">
                                            {row.original.occurrences.map((occurrence, index) => (
                                            <div key={index} className="occurrenceCard">
                                                <div className="occurrenceHeader">
                                                    Occurrence {index + 1}
                                                </div>

                                                <div className="occurrenceBlock">
                                                    <strong>Selector</strong>
                                                    <code>{occurrence.selector || 'No selector'}</code>
                                                </div>

                                                <div className="occurrenceBlock">
                                                    <strong>Context</strong>
                                                    <pre>{occurrence.context || 'No context'}</pre>
                                                </div>
                                            </div>
                                            ))}
                                        </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
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
            </div>
        </div>
    )
}

export default SubpageDetails;
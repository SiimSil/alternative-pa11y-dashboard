import type { Issue, SubpageResponse } from "./types";
import { useReactTable, createColumnHelper, getCoreRowModel, flexRender, getSortedRowModel, getPaginationRowModel } from '@tanstack/react-table';
import { useState, useMemo } from 'react'
import type { SortingState, SortingFn, Row } from "@tanstack/react-table";
import './SubpageDetails.css'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { aiAnalyzePage } from "./api/pages";
import { useParams } from "react-router"
import ReactMarkdown from 'react-markdown'

const columnHelper = createColumnHelper<Issue>()
const sortByIssueType: SortingFn<Issue> = (rowA: Row<Issue>, rowB: Row<Issue>, columnId: string) => {
    if(rowA.original.typeCode===rowB.original.typeCode)
        return 0
    else
        return (rowA.original.typeCode>rowB.original.typeCode ? 1 : -1) //-1, 0, or 1 - access any row data using rowA.original and rowB.original
}
const defaultColumns = [
        columnHelper.accessor('code', {
        header: "Code",
        cell: info => info.getValue(),
        sortingFn: 'text'
        }),
        columnHelper.accessor('type', {
        header: "Type",
        cell: info => info.getValue(),
        sortingFn: sortByIssueType
        }),
        columnHelper.accessor('message', {
        header: "Message",
        cell: info => info.getValue(),
        sortingFn: 'text'
        }),
        columnHelper.accessor('context', {
        header: "Context",
        cell: info => info.getValue(),
        sortingFn: 'text'
        }),
        columnHelper.accessor('selector', {
        header: "Selector",
        cell: info => info.getValue(),
        sortingFn: 'text'
        }),
    ]

function SubpageDetails({ page }: { page: SubpageResponse}) {
    const queryClient = useQueryClient();
    const { id: scanId } = useParams()
    const [sorting, setSorting] = useState<SortingState>([])
    const [pagination, setpageIndex] = useState({pageIndex: 0, pageSize: 10,});
    const [goToIndex, setgoToIndex] = useState(pagination.pageIndex);
    const issues: Issue[] = useMemo(() => {
        return page.results ?? []
    }, [page])

    const aiAnalyzePageMutation = useMutation({
    mutationFn: aiAnalyzePage,
    onError: (e) =>
        console.log(e),
    onSuccess: async() => {
        await queryClient.invalidateQueries({queryKey: ['scanDetails', scanId]})
    }})

    const table = useReactTable({
        data: issues,
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
        <div className="subpageDetailsContainer">
            <h2>Subpage details: {page.url}</h2>
            <div className="innerDetails">
                <div className="aiContainer">
                    {page.aiAnalysis!==undefined ? (
                        <div className="analysis">
                            <div className="aiHeader">
                                <h2>AI analysis</h2>
                                <button className="reAnalyse" onClick={() => aiAnalyzePageMutation.mutate(page.id)}>⟲</button>
                            </div>
                            <ReactMarkdown>{page.aiAnalysis}</ReactMarkdown>
                        </div>
                    ) : (
                        <div>
                            <p>No AI analysis found</p>
                            <button className='centerAnalysisButton' onClick={() => aiAnalyzePageMutation.mutate(page.id)}>Analyse this page</button>
                        </div>)}
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
                            <tr key={row.id}>
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
                    {[10, 25, 50, 100].map(pageSize => (
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
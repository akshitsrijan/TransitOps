import { FileDown, FileText } from 'lucide-react'
import { Button } from './ui'
import { exportCsv, exportPdf, type ExportRow } from '../lib/export'

interface ExportButtonsProps {
  filename: string
  title: string
  headers: string[]
  rows: ExportRow[]
  compact?: boolean
}

export default function ExportButtons({ filename, title, headers, rows, compact = false }: ExportButtonsProps) {
  const sizing = compact ? 'px-2.5 py-1 text-xs' : ''
  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        title="Download as CSV spreadsheet"
        disabled={rows.length === 0}
        onClick={() => exportCsv(filename, headers, rows)}
        className={`flex items-center gap-1.5 ${sizing}`}
      >
        <FileDown className="h-4 w-4 text-indigo-600" />
        <span>CSV</span>
      </Button>
      <Button
        variant="secondary"
        title="Download as PDF report"
        disabled={rows.length === 0}
        onClick={() => exportPdf(filename, title, headers, rows)}
        className={`flex items-center gap-1.5 ${sizing}`}
      >
        <FileText className="h-4 w-4 text-indigo-600" />
        <span>PDF</span>
      </Button>
    </div>
  )
}

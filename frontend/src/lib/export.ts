import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export type ExportRow = (string | number)[]

function escapeCsvValue(value: string | number): string {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function exportCsv(filename: string, headers: string[], rows: ExportRow[]) {
  const csv = [headers, ...rows].map((r) => r.map(escapeCsvValue).join(',')).join('\r\n')
  // BOM so Excel opens UTF-8 content correctly
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  triggerDownload(blob, `${filename}.csv`)
}

export function exportPdf(filename: string, title: string, headers: string[], rows: ExportRow[]) {
  const doc = new jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait' })
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42)
  doc.text(title, 14, 18)
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`TransitOps · Generated ${new Date().toLocaleString()}`, 14, 24)
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map(String)),
    startY: 30,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })
  doc.save(`${filename}.pdf`)
}

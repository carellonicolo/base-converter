import { downloadBlob } from './download';

/** Escape per CSV con separatore ';' (Excel in italiano). */
function cell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  return [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
}

/** Scarica il CSV con il BOM, perché Excel riconosca l'UTF-8. */
export function downloadCsv(filename: string, csv: string): void {
  downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), filename);
}

/** Un nome di file senza caratteri che i sistemi operativi rifiutano. */
export function safeFileName(s: string): string {
  return s.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'file';
}

'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import ReportCompanySelect from '@/components/reports/ReportCompanySelect';
import { apiClient } from '@/lib/api-client';

const BTN = 'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60';

/**
 * Excel import of brands, products or draft brand projections:
 * template → upload → preview (validation only, nothing saved) → explicit
 * confirmation → the server re-validates and creates every row, or none.
 * Create-only: a row that clashes with an existing record is an error.
 */
export default function ImportPage() {
  const [imports, setImports] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [entity, setEntity] = useState('');
  const [company, setCompany] = useState('');
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [preview, setPreview] = useState(null);
  const [previewedFor, setPreviewedFor] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient.get('/imports')
      .then((res) => {
        setImports(res.data || []);
        if (res.data?.length) setEntity(res.data[0].key);
      })
      .catch((err) => setLoadError(err.message || 'You do not have access to imports.'));
  }, []);

  const def = (imports || []).find((i) => i.key === entity);
  const reset = () => {
    setPreview(null);
    setPreviewedFor(null);
    setResult(null);
    setError(null);
  };
  const form = () => {
    const data = new FormData();
    data.append('file', file);
    data.append('company_id', company);
    return data;
  };

  const runPreview = async () => {
    setBusy(true);
    reset();
    try {
      const res = await apiClient.post(`/imports/${entity}/preview`, form());
      setPreview(res.data);
      setPreviewedFor({ entity, company, file });
    } catch (err) {
      setError(err.message || 'Preview failed');
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    if (!confirm(`Import ${preview.summary.records} ${def.title.toLowerCase()} record(s) from ${preview.summary.rows} row(s)?\n\nEvery row is checked again first; if any row fails, nothing is imported.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post(`/imports/${entity}/confirm`, form());
      setResult(res);
      setPreview(null);
      setPreviewedFor(null);
      setFile(null);
      setFileKey((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Import failed');
      // Re-validation found problems (data changed since the preview): show them, nothing was created.
      if (err.response?.data?.rows) setPreview({ rows: err.response.data.rows, summary: err.response.data.summary, can_import: false });
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{loadError}</div></DashboardLayout>;
  if (!imports) return <DashboardLayout><div className="p-4 text-gray-500">Loading...</div></DashboardLayout>;
  if (imports.length === 0) return <DashboardLayout><div className="bg-amber-50 text-amber-800 p-3 rounded">You cannot import any record type (each import also needs that record&apos;s create permission).</div></DashboardLayout>;

  const unchanged = previewedFor && previewedFor.entity === entity && previewedFor.company === company && previewedFor.file === file;
  const canConfirm = preview?.can_import && unchanged && !busy;
  const shownColumns = def ? def.columns.slice(0, 5).map((c) => c.header) : [];

  return (
    <DashboardLayout>
      <PageHeading title="Excel Import" breadcrumbs={[{ label: 'Reports', href: '/reports' }, { label: 'Excel Import' }]} />

      <Card title="1. What to import" variant="primary">
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <div className="w-56">
            <label className="block text-xs text-gray-500 mb-1">Record type</label>
            <select value={entity} onChange={(e) => { setEntity(e.target.value); reset(); }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
              {imports.map((i) => <option key={i.key} value={i.key}>{i.title}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => apiClient.download(`/imports/${entity}/template`, `${entity}-import-template.xlsx`).catch((err) => setError(err.message))} className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}><i className="bi bi-download me-1"></i> Download template</button>
        </div>
        {def && (
          <>
            <table className="min-w-full text-sm">
              <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1 font-medium">Column</th><th className="py-1 font-medium">Required</th><th className="py-1 font-medium">Notes</th><th className="py-1 font-medium">Example</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {def.columns.map((c, i) => (
                  <tr key={c.header}><td className="py-1 font-medium">{c.header}</td><td className="py-1">{c.required ? 'Yes' : '—'}</td><td className="py-1 text-gray-600">{c.note || ''}</td><td className="py-1 font-mono text-xs">{def.example[i] ?? ''}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-2 mb-0">
              First sheet only; one header row, then one row per {def.grouped ? 'projection line (rows with the same Projection Ref form one draft projection)' : 'record'}; up to {def.max_rows} rows.
              Imports only create new records — an existing code / name is reported as an error, never updated.{def.grouped ? ' Imported projections are always drafts.' : ''}
            </p>
          </>
        )}
      </Card>

      <Card title="2. Upload and preview" variant="info">
        <div className="flex flex-wrap items-end gap-3">
          <ReportCompanySelect value={company} onChange={(v) => { setCompany(v); reset(); }} allowAll={false} />
          <div>
            <label className="block text-xs text-gray-500 mb-1">Excel file (.xlsx)</label>
            <input key={fileKey} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => { setFile(e.target.files?.[0] || null); reset(); }} className="text-sm" />
          </div>
          <button type="button" onClick={runPreview} disabled={!file || !company || busy} className={`${BTN} bg-blue-600 hover:bg-blue-700 text-white`}><i className="bi bi-search me-1"></i> {busy && !preview ? 'Checking…' : 'Preview'}</button>
        </div>
        <p className="text-xs text-gray-500 mt-2 mb-0">Preview only checks the file — nothing is saved.</p>
      </Card>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {result && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4 text-sm"><i className="bi bi-check-circle me-1"></i> {result.message} ({result.data.summary.rows} row(s) read, {result.data.created} record(s) created.)</div>}

      {preview && (
        <Card title={`3. Preview — ${preview.summary.valid} valid, ${preview.summary.invalid} with errors (${preview.summary.rows} rows)`} variant={preview.can_import ? 'success' : 'danger'}>
          <div className="overflow-x-auto border border-gray-200 rounded-md mb-3">
            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  {shownColumns.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
                  <th className="px-3 py-2 font-medium">Problems (field — reason)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {preview.rows.map((r) => (
                  <tr key={r.row_number} className={r.valid ? '' : 'bg-red-50'}>
                    <td className="px-3 py-1.5 font-mono">{r.row_number}</td>
                    <td className="px-3 py-1.5">{r.valid ? <span className="text-green-700">Valid</span> : <span className="text-red-700">Invalid</span>}</td>
                    {shownColumns.map((h) => <td key={h} className="px-3 py-1.5">{r.values?.[h] === null || r.values?.[h] === undefined ? '' : String(r.values[h])}</td>)}
                    <td className="px-3 py-1.5">
                      {r.errors.length === 0 ? '—' : (
                        <ul className="list-none p-0 m-0 space-y-0.5 text-red-700">
                          {r.errors.map((e, i) => <li key={i}><strong>{e.field || 'Row'}</strong> — {e.message}</li>)}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.can_import ? (
            <div className="flex items-center gap-3">
              <button type="button" onClick={runImport} disabled={!canConfirm} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}><i className="bi bi-check2-circle me-1"></i> {busy ? 'Importing…' : `Import ${preview.summary.records} record(s)`}</button>
              {!unchanged && <span className="text-xs text-amber-700">The file, company or record type changed — preview again first.</span>}
              <span className="text-xs text-gray-500">All rows are created, or none.</span>
            </div>
          ) : (
            <p className="text-sm text-red-700 m-0">Fix the rows marked above in the spreadsheet and preview again. Nothing has been imported.</p>
          )}
        </Card>
      )}
    </DashboardLayout>
  );
}

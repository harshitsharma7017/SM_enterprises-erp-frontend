'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import ReportCompanySelect from '@/components/reports/ReportCompanySelect';
import { apiClient } from '@/lib/api-client';

const BTN = 'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60';

/**
 * Excel import of masters, draft brand projections and opening stock (the
 * server's `GET /imports` lists the types this user may import):
 * template → upload → preview (validation only, nothing saved) → explicit
 * confirmation → the server re-validates and creates every included row, or none.
 * Rows that fail the preview are left out automatically (and any valid row can
 * be unticked), so a few bad rows do not mean editing the file and uploading again.
 * Create-only: a row that clashes with an existing record is an error.
 * Masters shared by both companies (`company_scoped: false`) ask for no company.
 * Templates carry drop-down lists of what is available now — for a per-company
 * import, that company's records — so the company is chosen before downloading.
 */
export default function ImportPage() {
  const [imports, setImports] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [entity, setEntity] = useState('');
  const [company, setCompany] = useState('');
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewedFor, setPreviewedFor] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  // Record types whose template the uploaded file's header row matches (wrong type selected).
  const [suggested, setSuggested] = useState([]);
  // Row numbers left out of the import: every invalid row, plus valid rows the user unticked.
  const [excluded, setExcluded] = useState(() => new Set());
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
  const companyScoped = def?.company_scoped !== false;
  const scopedFor = (i) => i?.company_scoped !== false;
  const downloadTemplate = (i) => {
    const query = scopedFor(i) ? `?company_id=${encodeURIComponent(company)}` : '';
    apiClient.download(`/imports/${i.key}/template${query}`, `${i.key}-import-template.xlsx`).catch((err) => setError(err.message));
  };
  const reset = () => {
    setPreview(null);
    setPreviewedFor(null);
    setResult(null);
    setError(null);
    setSuggested([]);
    setExcluded(new Set());
  };
  const chooseFile = (chosen) => {
    reset();
    if (chosen && !/\.xlsx$/i.test(chosen.name)) {
      setFile(null);
      setError('Only .xlsx files can be imported. Save the sheet as an Excel Workbook (.xlsx) and try again.');
      return;
    }
    setFile(chosen || null);
  };
  const clearFile = () => {
    setFile(null);
    setFileKey((k) => k + 1);
    reset();
  };
  const fileSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
  const invalidRows = (rows) => rows.filter((r) => !r.valid).map((r) => r.row_number);
  const toggleRow = (rowNumber) => setExcluded((prev) => {
    const next = new Set(prev);
    if (next.has(rowNumber)) next.delete(rowNumber); else next.add(rowNumber);
    return next;
  });
  const form = (forDef = def) => {
    const data = new FormData();
    data.append('file', file);
    if (scopedFor(forDef)) data.append('company_id', company);
    return data;
  };

  // `key`: preview as another record type (the "Switch to …" suggestion) without waiting for state.
  const runPreview = async (key = entity) => {
    const target = imports.find((i) => i.key === key);
    setBusy(true);
    reset();
    try {
      const res = await apiClient.post(`/imports/${key}/preview`, form(target));
      setPreview(res.data);
      setPreviewedFor({ entity: key, company, file });
      setExcluded(new Set(invalidRows(res.data.rows)));
    } catch (err) {
      setError(err.message || 'Preview failed');
      // Only offer types this user may import (GET /imports is already permission-filtered).
      setSuggested((err.response?.data?.suggested || []).filter((s) => imports.some((i) => i.key === s.key)));
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    const leftOut = excluded.size ? `\n${excluded.size} row(s) will be left out.` : '';
    if (!confirm(`Import ${includedCount} row(s) as ${def.title.toLowerCase()}?${leftOut}\n\nThe included rows are checked again first; if any of them fails, nothing is imported.`)) return;
    setBusy(true);
    setError(null);
    try {
      const data = form();
      if (excluded.size) data.append('skip_rows', [...excluded].join(','));
      const res = await apiClient.post(`/imports/${entity}/confirm`, data);
      setResult(res);
      setPreview(null);
      setPreviewedFor(null);
      setFile(null);
      setFileKey((k) => k + 1);
      setExcluded(new Set());
    } catch (err) {
      setError(err.message || 'Import failed');
      // Re-validation found problems (data changed since the preview): show the included rows again with
      // the new failures left out too — nothing was created, so the user can import the rest.
      if (err.response?.data?.rows) {
        const { rows, summary } = err.response.data;
        setPreview({ rows, summary, can_import: false });
        setExcluded((prev) => new Set([...prev, ...invalidRows(rows)]));
      }
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <DashboardLayout><div className="alert alert-danger">{loadError}</div></DashboardLayout>;
  if (!imports) return <DashboardLayout><div className="p-4 text-fg-subtle">Loading...</div></DashboardLayout>;
  if (imports.length === 0) return <DashboardLayout><div className="bg-amber-50 text-amber-800 p-3 rounded">You cannot import any record type (each import also needs that record&apos;s create permission).</div></DashboardLayout>;

  const unchanged = previewedFor && previewedFor.entity === entity && previewedFor.company === company && previewedFor.file === file;
  const includedCount = preview ? preview.rows.filter((r) => !excluded.has(r.row_number)).length : 0;
  const canConfirm = includedCount > 0 && unchanged && !busy;
  const shownColumns = def ? def.columns.slice(0, 5).map((c) => c.header) : [];

  return (
    <DashboardLayout>
      <PageHeading title="Excel Import" breadcrumbs={[{ label: 'Reports', href: '/reports' }, { label: 'Excel Import' }]} />

      <Card
        title="Import"
        variant="primary"
        actions={def && (
          <button type="button" onClick={() => downloadTemplate(def)} disabled={companyScoped && !company} title={companyScoped && !company ? 'Choose the company first: the template lists its records' : undefined} className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover`}>
            <i className="bi bi-download me-1" aria-hidden="true"></i> {def.title} template
          </button>
        )}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* What is being imported */}
          <div className="space-y-4">
            <div>
              <label htmlFor="import-entity" className="block text-xs text-fg-subtle mb-1">Record type</label>
              <select id="import-entity" value={entity} onChange={(e) => { setEntity(e.target.value); reset(); }} className="form-select">
                {imports.map((i) => <option key={i.key} value={i.key}>{i.title}</option>)}
              </select>
            </div>
            {companyScoped ? (
              <ReportCompanySelect value={company} onChange={(v) => { setCompany(v); reset(); }} allowAll={false} className="w-full" />
            ) : (
              <div>
                <span className="block text-xs text-fg-subtle mb-1">Company</span>
                <div className="flex items-center gap-2 text-sm text-fg-muted min-h-[var(--control-h)] px-3 rounded-md bg-surface-raised border border-line">
                  <i className="bi bi-people" aria-hidden="true"></i> Shared by both companies
                </div>
              </div>
            )}
            {def && (
              <ul className="list-none p-0 m-0 space-y-2 text-xs text-fg-muted">
                <li className="flex gap-2"><i className="bi bi-file-earmark-spreadsheet text-fg-subtle" aria-hidden="true"></i><span>Fill in the first sheet of the template. Its drop-downs offer what exists and is active now{companyScoped ? ' for this company' : ''}.</span></li>
                <li className="flex gap-2"><i className="bi bi-list-ol text-fg-subtle" aria-hidden="true"></i><span>One row per {def.grouped ? 'projection line (rows with the same Projection Ref form one draft projection)' : 'record'}, up to {def.max_rows} rows. Imports only create new records.</span></li>
                <li className="flex gap-2"><i className="bi bi-shield-check text-fg-subtle" aria-hidden="true"></i><span>Preview saves nothing. Rows with errors can be left out, and the rest imported.</span></li>
              </ul>
            )}
          </div>

          {/* The file */}
          <div className="flex flex-col gap-3">
            {file ? (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-line bg-surface-raised">
                <i className="bi bi-file-earmark-excel text-2xl text-green-600" aria-hidden="true"></i>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-fg truncate" title={file.name}>{file.name}</div>
                  <div className="text-xs text-fg-subtle">{fileSize(file.size)}</div>
                </div>
                <label className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover cursor-pointer`}>
                  Change
                  <input key={fileKey} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => chooseFile(e.target.files?.[0])} className="sr-only" />
                </label>
                <button type="button" onClick={clearFile} className="p-1.5 rounded text-fg-subtle hover:text-fg hover:bg-surface-hover" aria-label="Remove file">
                  <i className="bi bi-x-lg" aria-hidden="true"></i>
                </button>
              </div>
            ) : (
              <label
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); chooseFile(e.dataTransfer.files?.[0]); }}
                className={`flex flex-col items-center justify-center gap-1 text-center p-6 min-h-[9.5rem] rounded-lg border-2 border-dashed cursor-pointer transition-colors ${dragging ? 'border-[var(--accent)] bg-surface-hover' : 'border-line-strong hover:bg-surface-raised'}`}
              >
                <i className="bi bi-cloud-arrow-up text-3xl text-fg-subtle" aria-hidden="true"></i>
                <span className="text-sm text-fg">Drop the filled-in <strong>.xlsx</strong> here, or <span className="text-link underline">browse</span></span>
                <span className="text-xs text-fg-subtle">Excel workbook, up to 5 MB. Only the first sheet is read.</span>
                <input key={fileKey} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => chooseFile(e.target.files?.[0])} className="sr-only" />
              </label>
            )}
            <div className="flex flex-wrap items-center justify-end gap-3">
              {companyScoped && !company && <span className="text-xs text-amber-700 mr-auto">Choose the company first.</span>}
              <button type="button" onClick={() => runPreview()} disabled={!file || (companyScoped && !company) || busy} className={`${BTN} px-4 py-2 bg-accent hover:bg-accent-hover text-white`}>
                <i className="bi bi-search me-1" aria-hidden="true"></i> {busy && !preview ? 'Checking…' : 'Preview'}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">
          {error}
          {suggested.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {suggested.map((s) => (
                <button key={s.key} type="button" disabled={busy} onClick={() => { setEntity(s.key); runPreview(s.key); }} className={`${BTN} bg-accent hover:bg-accent-hover text-white`}>
                  <i className="bi bi-arrow-repeat me-1"></i> Switch to {s.title} and preview
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {result && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4 text-sm"><i className="bi bi-check-circle me-1"></i> {result.message} ({result.data.summary.rows} row(s) checked, {result.data.created} record(s) created{result.data.skipped ? `, ${result.data.skipped} row(s) left out` : ''}.)</div>}

      {preview && (
        <Card title={`Preview — ${preview.summary.valid} valid, ${preview.summary.invalid} with errors (${preview.summary.rows} rows)`} variant={preview.summary.invalid === 0 ? 'success' : 'warning'}>
          <div className="table-wrap mb-3">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-16">Import</th>
                  <th>Row</th>
                  <th>Status</th>
                  {shownColumns.map((h) => <th key={h}>{h}</th>)}
                  <th>Problems (field — reason)</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.row_number} className={r.valid ? (excluded.has(r.row_number) ? 'opacity-60' : '') : 'bg-red-50'}>
                    <td>
                      {/* Invalid rows are always left out; valid ones can be unticked. */}
                      <input
                        type="checkbox"
                        checked={!excluded.has(r.row_number)}
                        disabled={!r.valid || busy}
                        onChange={() => toggleRow(r.row_number)}
                        aria-label={`Import row ${r.row_number}`}
                        title={r.valid ? undefined : 'Rows with errors are left out'}
                      />
                    </td>
                    <td className="font-mono">{r.row_number}</td>
                    <td>{r.valid ? <span className="text-green-700">Valid</span> : <span className="text-red-700">Invalid</span>}</td>
                    {shownColumns.map((h) => <td key={h}>{r.values?.[h] === null || r.values?.[h] === undefined ? '' : String(r.values[h])}</td>)}
                    <td>
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
          {includedCount > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={runImport} disabled={!canConfirm} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}><i className="bi bi-check2-circle me-1"></i> {busy ? 'Importing…' : `Import ${includedCount} row(s)`}</button>
              {excluded.size > 0 && (
                <span className="text-sm text-amber-700">
                  {excluded.size} row(s) left out{preview.summary.invalid > 0 ? ` (including the ${preview.summary.invalid} with errors)` : ''} — fix them in the file and import them later.
                </span>
              )}
              {!unchanged && <span className="text-xs text-amber-700">The file, company or record type changed — preview again first.</span>}
              <span className="text-xs text-fg-subtle">The included rows are all created, or none.{def?.grouped ? ' Leaving out a line changes its projection.' : ''}</span>
            </div>
          ) : (
            <p className="text-sm text-red-700 m-0">No row can be imported: every row has errors or is unticked. Nothing has been imported.</p>
          )}
        </Card>
      )}

      <Card title="Templates">
        <p className="text-sm text-fg-muted mt-0 mb-3">
          Every record type you can import. Import masters top to bottom: a row can only refer to records that already exist
          (e.g. products need their category and UOM; markups need the supplier and buyer), and each template&apos;s drop-downs
          list what exists when it is downloaded. Per-company templates use the company chosen above.
        </p>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Record type</th><th>Company</th><th>Required columns</th><th className="text-right">Template</th></tr></thead>
            <tbody>
              {imports.map((i) => (
                <tr key={i.key}>
                  <td className="font-medium">{i.title}</td>
                  <td className="text-fg-muted">{i.company_scoped === false ? 'Shared' : 'Per company'}</td>
                  <td className="text-fg-muted">{i.columns.filter((c) => c.required).map((c) => c.header).join(', ')}</td>
                  <td className="text-right">
                    <button type="button" onClick={() => downloadTemplate(i)} disabled={scopedFor(i) && !company} title={scopedFor(i) && !company ? 'Choose the company above first' : undefined} className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover whitespace-nowrap`} aria-label={`Download ${i.title} template`}>
                      <i className="bi bi-download me-1"></i> .xlsx
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  );
}

'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { WorkflowBadge, CHECKLIST_STATUS_BADGES } from '@/components/ui/Badge';
import { storageUrl } from './exportDocumentHelpers';
import { formatDate } from '@/components/sales/shared/format';

/**
 * "Upload & Record Date" (category=uploaded) and "Manual / Record Only"
 * (category=manual) checklist rows. The Node backend's checklist action is
 * a single file-only upload (no reference_no/remarks/mark_done fields like
 * the original) — see Phase 5A report — so this is deliberately simpler
 * than the original's per-row form. "Manual" rows have no working backend
 * action at all (upload always requires a file) — shown read-only.
 */
export default function ChecklistPanel({ documentId, checklists, can, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const uploaded = checklists.filter((c) => c.checklist_type_category === 'uploaded');
  const manual = checklists.filter((c) => c.checklist_type_category === 'manual');

  const handleUpload = async (checklistId, file) => {
    if (!file) return;
    setBusyId(checklistId);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await apiClient.post(`/export/documents/${documentId}/checklist/${checklistId}`, formData);
      onChanged();
    } catch (err) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setBusyId(null);
    }
  };

  const handleReset = async (checklistId) => {
    setBusyId(checklistId);
    setError(null);
    try {
      await apiClient.delete(`/export/documents/${documentId}/checklist/${checklistId}`);
      onChanged();
    } catch (err) {
      setError(err.message || 'Failed to reset checklist entry');
    } finally {
      setBusyId(null);
    }
  };

  const Row = ({ entry, interactive }) => (
    <tr>
      <td className="cell-strong">{entry.checklist_type_name}</td>
      <td><WorkflowBadge status={entry.status} config={CHECKLIST_STATUS_BADGES} /></td>
      <td className="text-fg-muted">
        {entry.file_path ? (
          <a href={storageUrl(entry.file_path)} target="_blank" rel="noreferrer" className="text-link hover:underline">
            <i className="bi bi-paperclip me-1"></i>{entry.original_name || 'File'}
          </a>
        ) : '—'}
      </td>
      <td>{entry.uploaded_at ? formatDate(entry.uploaded_at) : '—'}</td>
      {can('export-document.edit') && (
        <td>
          {interactive ? (
            <div className="flex items-center gap-2">
              <label className="text-xs bg-blue-50 text-link border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 cursor-pointer">
                {busyId === entry.id ? 'Uploading…' : entry.file_path ? 'Replace' : 'Upload'}
                <input type="file" className="hidden" disabled={busyId === entry.id} onChange={(e) => handleUpload(entry.id, e.target.files[0])} />
              </label>
              {entry.status !== 'pending' && (
                <button type="button" disabled={busyId === entry.id} onClick={() => handleReset(entry.id)} className="text-xs border border-line-strong text-[var(--danger)] px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50">
                  Reset
                </button>
              )}
            </div>
          ) : (
            <span className="text-xs text-fg-subtle">Record only — no backend action available</span>
          )}
        </td>
      )}
    </tr>
  );

  return (
    <div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-3">{error}</div>}

      <div className="text-xs font-semibold text-fg-subtle mb-2">Upload &amp; Record Date</div>
      <div className="table-wrap mb-4">
        <table className="data-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Status</th>
              <th>File</th>
              <th>Date</th>
              {can('export-document.edit') && <th>Update</th>}
            </tr>
          </thead>
          <tbody>
            {uploaded.length === 0 ? (
              <tr><td colSpan="5" className="text-center">No checklist entries.</td></tr>
            ) : uploaded.map((entry) => <Row key={entry.id} entry={entry} interactive />)}
          </tbody>
        </table>
      </div>

      <div className="text-xs font-semibold text-fg-subtle mb-2">Manual / Record Only</div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Status</th>
              <th>File</th>
              <th>Date</th>
              {can('export-document.edit') && <th>Update</th>}
            </tr>
          </thead>
          <tbody>
            {manual.length === 0 ? (
              <tr><td colSpan="5" className="text-center">No checklist entries.</td></tr>
            ) : manual.map((entry) => <Row key={entry.id} entry={entry} interactive={false} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

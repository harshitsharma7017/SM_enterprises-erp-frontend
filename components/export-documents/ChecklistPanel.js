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
      <td className="px-3 py-2 text-gray-900">{entry.checklist_type_name}</td>
      <td className="px-3 py-2"><WorkflowBadge status={entry.status} config={CHECKLIST_STATUS_BADGES} /></td>
      <td className="px-3 py-2 text-gray-700">
        {entry.file_path ? (
          <a href={storageUrl(entry.file_path)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
            <i className="bi bi-paperclip me-1"></i>{entry.original_name || 'File'}
          </a>
        ) : '—'}
      </td>
      <td className="px-3 py-2 text-gray-500">{entry.uploaded_at ? formatDate(entry.uploaded_at) : '—'}</td>
      {can('export-document.edit') && (
        <td className="px-3 py-2">
          {interactive ? (
            <div className="flex items-center gap-2">
              <label className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 cursor-pointer">
                {busyId === entry.id ? 'Uploading…' : entry.file_path ? 'Replace' : 'Upload'}
                <input type="file" className="hidden" disabled={busyId === entry.id} onChange={(e) => handleUpload(entry.id, e.target.files[0])} />
              </label>
              {entry.status !== 'pending' && (
                <button type="button" disabled={busyId === entry.id} onClick={() => handleReset(entry.id)} className="text-xs border border-red-300 text-red-600 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50">
                  Reset
                </button>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400">Record only — no backend action available</span>
          )}
        </td>
      )}
    </tr>
  );

  return (
    <div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-3">{error}</div>}

      <div className="text-xs font-semibold text-gray-500 mb-2">Upload &amp; Record Date</div>
      <div className="overflow-x-auto border border-gray-200 rounded-md mb-4">
        <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 font-medium">Document</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">File</th>
              <th className="px-3 py-2 font-medium">Date</th>
              {can('export-document.edit') && <th className="px-3 py-2 font-medium">Update</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {uploaded.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-4 text-gray-400">No checklist entries.</td></tr>
            ) : uploaded.map((entry) => <Row key={entry.id} entry={entry} interactive />)}
          </tbody>
        </table>
      </div>

      <div className="text-xs font-semibold text-gray-500 mb-2">Manual / Record Only</div>
      <div className="overflow-x-auto border border-gray-200 rounded-md">
        <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 font-medium">Document</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">File</th>
              <th className="px-3 py-2 font-medium">Date</th>
              {can('export-document.edit') && <th className="px-3 py-2 font-medium">Update</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {manual.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-4 text-gray-400">No checklist entries.</td></tr>
            ) : manual.map((entry) => <Row key={entry.id} entry={entry} interactive={false} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

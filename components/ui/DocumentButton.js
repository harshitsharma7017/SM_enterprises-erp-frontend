'use client';

import { apiClient } from '@/lib/api-client';
import ArchivedCopyButton from '@/components/ui/ArchivedCopyButton';

/**
 * Downloads a record's PDF document (GET <endpoint>, served by the API with
 * the record's own view permission) and, when `entityType` / `entityId` are
 * given, its archived issued copy. Errors are handed to onError.
 */
export default function DocumentButton({ endpoint, number, onError, label = 'Document', entityType = null, entityId = null }) {
  const download = () => apiClient
    .download(endpoint, `${String(number).replace(/\//g, '-')}.pdf`)
    .catch((err) => onError?.(err.message || 'Failed to download the document'));
  return (
    <>
      <button type="button" onClick={download} className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
        <i className="bi bi-file-earmark-pdf me-1"></i> {label}
      </button>
      {entityType && <ArchivedCopyButton entityType={entityType} entityId={entityId} onError={onError} />}
    </>
  );
}

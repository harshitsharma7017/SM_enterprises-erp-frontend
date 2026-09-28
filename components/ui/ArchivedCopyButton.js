'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Downloads the archived (frozen) copy of a record's document — the PDF kept
 * when it was issued / posted — beside the live Document button. Hidden when
 * nothing is archived yet or the user lacks document.view.
 */
export default function ArchivedCopyButton({ entityType, entityId, onError }) {
  const { can } = useAuth(true);
  const allowed = can('document.view');
  const [latest, setLatest] = useState(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!allowed || !entityId) return;
    apiClient.get(`/documents?entity_type=${entityType}&entity_id=${entityId}&limit=1`)
      .then((res) => {
        setLatest(res.data?.data?.[0] || null);
        setCount(res.data?.total || 0);
      })
      .catch(() => setLatest(null));
  }, [allowed, entityType, entityId]);

  if (!latest) return null;
  const download = () => apiClient
    .download(`/documents/${latest.id}/download`, latest.file_name)
    .catch((err) => onError?.(err.message || 'Failed to download the archived copy'));
  return (
    <button type="button" onClick={download} title={`Archived ${new Date(latest.created_at).toLocaleString()} (${latest.event})${count > 1 ? ` — ${count} copies in the Document Archive` : ''}`}
      className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
      <i className="bi bi-archive me-1"></i> Issued copy
    </button>
  );
}

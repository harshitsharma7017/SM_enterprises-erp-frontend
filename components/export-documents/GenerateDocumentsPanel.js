'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { GENERATE_ROUTES, slugifyVariant } from './exportDocumentHelpers';

/**
 * "Generate Documents" tab — category=generated checklist rows. The 10
 * backend PDF routes are confirmed 100%-unimplemented stubs (they echo the
 * document's JSON back with a "<Type> PDF Generation" message, set no
 * Content-Type, stream no bytes — see Phase 5A report §10). Per the task's
 * explicit instruction, this must not fake a download: clicking "Generate"
 * calls the real endpoint and shows the honest result inline instead of
 * triggering a file save.
 */
export default function GenerateDocumentsPanel({ documentId, checklists, can }) {
  const generated = checklists.filter((c) => c.checklist_type_category === 'generated');
  const [status, setStatus] = useState({});

  const handleGenerate = async (entry, variantLabel) => {
    const route = GENERATE_ROUTES[entry.checklist_type_code];
    if (!route) return;
    const key = `${entry.id}-${variantLabel || 'default'}`;
    setStatus((prev) => ({ ...prev, [key]: { loading: true } }));
    try {
      const path = route.hasVariant
        ? `/export/documents/${documentId}/${route.path}/${slugifyVariant(variantLabel)}`
        : `/export/documents/${documentId}/${route.path}`;
      const res = await apiClient.get(path);
      setStatus((prev) => ({
        ...prev,
        [key]: { loading: false, message: res.message || 'PDF generation is not yet implemented on the backend — no file was produced.' },
      }));
    } catch (err) {
      setStatus((prev) => ({ ...prev, [key]: { loading: false, message: err.message || 'Failed to call the generate endpoint.', isError: true } }));
    }
  };

  if (!can('export-document.generate')) {
    return <p className="text-sm text-gray-400">Generating documents requires the <code>export-document.generate</code> permission.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded p-3 text-sm">
        PDF generation is not yet implemented on the backend — these endpoints currently return the
        document&apos;s raw data instead of a file. The buttons below are wired to the real API and will
        start producing real PDFs once that&apos;s built; for now they report what actually happened.
      </div>

      {generated.length === 0 ? (
        <p className="text-sm text-gray-400">No generated-document checklist entries.</p>
      ) : (
        <div className="space-y-2">
          {generated.map((entry) => {
            const variants = entry.checklist_type_variant_labels;
            const variantList = Array.isArray(variants) && variants.length > 0 ? variants : [null];
            return (
              <div key={entry.id} className="border rounded p-3">
                <div className="text-sm font-medium text-gray-800 mb-2">{entry.checklist_type_name}</div>
                <div className="flex flex-wrap gap-2">
                  {variantList.map((variantLabel) => {
                    const key = `${entry.id}-${variantLabel || 'default'}`;
                    const s = status[key];
                    return (
                      <div key={key} className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={s?.loading}
                          onClick={() => handleGenerate(entry, variantLabel)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-2 py-1 rounded disabled:opacity-50"
                        >
                          <i className="bi bi-file-earmark-pdf me-1"></i>
                          {s?.loading ? 'Generating…' : `Generate${variantLabel ? ` — ${variantLabel}` : ''}`}
                        </button>
                        {s && !s.loading && (
                          <span className={`text-[11px] max-w-xs ${s.isError ? 'text-red-600' : 'text-gray-500'}`}>{s.message}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

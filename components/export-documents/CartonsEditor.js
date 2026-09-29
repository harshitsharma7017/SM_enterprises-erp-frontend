'use client';

import { blankCarton, blankCartonLine } from './exportDocumentHelpers';

/**
 * Packing List (Formats B & C) carton repeater — what's physically packed in
 * each carton, distinct from the OC-derived item list. Mirrors the original
 * ERP's two-level JS repeater (carton blocks, each with line rows).
 */
export default function CartonsEditor({ cartons, onChange }) {
  const updateCarton = (index, patch) => {
    const next = cartons.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };
  const addCarton = () => onChange([...cartons, blankCarton()]);
  const removeCarton = (index) => onChange(cartons.filter((_, i) => i !== index));

  const updateLine = (cartonIndex, lineIndex, patch) => {
    const carton = cartons[cartonIndex];
    const lines = carton.lines.slice();
    lines[lineIndex] = { ...lines[lineIndex], ...patch };
    updateCarton(cartonIndex, { lines });
  };
  const addLine = (cartonIndex) => updateCarton(cartonIndex, { lines: [...cartons[cartonIndex].lines, blankCartonLine()] });
  const removeLine = (cartonIndex, lineIndex) => updateCarton(cartonIndex, { lines: cartons[cartonIndex].lines.filter((_, i) => i !== lineIndex) });

  return (
    <div className="space-y-4">
      {cartons.map((carton, cartonIndex) => (
        <div key={carton._key || carton.id} className="border rounded p-3 bg-surface-raised">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-fg-muted">Carton #{cartonIndex + 1}</span>
            <button type="button" onClick={() => removeCarton(cartonIndex)} className="text-[var(--danger)] hover:text-[var(--danger)] text-xs">
              <i className="bi bi-trash"></i> Remove carton
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Carton / Bale No.</label>
              <input type="text" maxLength={40} value={carton.carton_no} onChange={(e) => updateCarton(cartonIndex, { carton_no: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Net Weight</label>
              <input type="number" step="0.001" min="0" value={carton.net_weight} onChange={(e) => updateCarton(cartonIndex, { net_weight: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Gross Weight</label>
              <input type="number" step="0.001" min="0" value={carton.gross_weight} onChange={(e) => updateCarton(cartonIndex, { gross_weight: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Dimensions</label>
              <input type="text" maxLength={60} value={carton.dimensions} onChange={(e) => updateCarton(cartonIndex, { dimensions: e.target.value })} className="form-input" />
            </div>
          </div>

          <div className="space-y-1.5">
            {carton.lines.map((line, lineIndex) => (
              <div key={lineIndex} className="flex gap-2 items-center">
                <input type="text" placeholder="Description" maxLength={500} value={line.description} onChange={(e) => updateLine(cartonIndex, lineIndex, { description: e.target.value })} className="form-input flex-1" />
                <input type="text" placeholder="Unit" maxLength={20} value={line.unit} onChange={(e) => updateLine(cartonIndex, lineIndex, { unit: e.target.value })} className="form-input w-20" />
                <input type="number" min="0" placeholder="Qty" value={line.qty} onChange={(e) => updateLine(cartonIndex, lineIndex, { qty: e.target.value })} className="form-input w-24" />
                <button type="button" onClick={() => removeLine(cartonIndex, lineIndex)} className="text-[var(--danger)] hover:text-[var(--danger)] px-1"><i className="bi bi-x-circle"></i></button>
              </div>
            ))}
            <button type="button" onClick={() => addLine(cartonIndex)} className="text-xs text-link hover:text-link-hover">
              <i className="bi bi-plus-lg"></i> Add line
            </button>
          </div>
        </div>
      ))}

      <button type="button" onClick={addCarton} className="w-full border-2 border-dashed border-line-strong rounded py-2 text-sm text-fg-muted hover:border-blue-400 hover:text-link">
        <i className="bi bi-plus-lg me-1"></i> Add carton
      </button>
      <p className="text-xs text-fg-subtle">Blank cartons (no carton number) and blank lines (no description) are not saved.</p>
    </div>
  );
}

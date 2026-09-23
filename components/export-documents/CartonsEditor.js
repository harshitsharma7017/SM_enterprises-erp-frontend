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
        <div key={carton._key || carton.id} className="border rounded p-3 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">Carton #{cartonIndex + 1}</span>
            <button type="button" onClick={() => removeCarton(cartonIndex)} className="text-red-500 hover:text-red-700 text-xs">
              <i className="bi bi-trash"></i> Remove carton
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Carton / Bale No.</label>
              <input type="text" maxLength={40} value={carton.carton_no} onChange={(e) => updateCarton(cartonIndex, { carton_no: e.target.value })} className="form-input w-full rounded border-gray-300 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Net Weight</label>
              <input type="number" step="0.001" min="0" value={carton.net_weight} onChange={(e) => updateCarton(cartonIndex, { net_weight: e.target.value })} className="form-input w-full rounded border-gray-300 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Gross Weight</label>
              <input type="number" step="0.001" min="0" value={carton.gross_weight} onChange={(e) => updateCarton(cartonIndex, { gross_weight: e.target.value })} className="form-input w-full rounded border-gray-300 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Dimensions</label>
              <input type="text" maxLength={60} value={carton.dimensions} onChange={(e) => updateCarton(cartonIndex, { dimensions: e.target.value })} className="form-input w-full rounded border-gray-300 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            {carton.lines.map((line, lineIndex) => (
              <div key={lineIndex} className="flex gap-2 items-center">
                <input type="text" placeholder="Description" maxLength={500} value={line.description} onChange={(e) => updateLine(cartonIndex, lineIndex, { description: e.target.value })} className="form-input flex-1 rounded border-gray-300 text-xs" />
                <input type="text" placeholder="Unit" maxLength={20} value={line.unit} onChange={(e) => updateLine(cartonIndex, lineIndex, { unit: e.target.value })} className="form-input w-20 rounded border-gray-300 text-xs" />
                <input type="number" min="0" placeholder="Qty" value={line.qty} onChange={(e) => updateLine(cartonIndex, lineIndex, { qty: e.target.value })} className="form-input w-24 rounded border-gray-300 text-xs" />
                <button type="button" onClick={() => removeLine(cartonIndex, lineIndex)} className="text-red-500 hover:text-red-700 px-1"><i className="bi bi-x-circle"></i></button>
              </div>
            ))}
            <button type="button" onClick={() => addLine(cartonIndex)} className="text-xs text-blue-600 hover:text-blue-800">
              <i className="bi bi-plus-lg"></i> Add line
            </button>
          </div>
        </div>
      ))}

      <button type="button" onClick={addCarton} className="w-full border-2 border-dashed border-gray-300 rounded py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600">
        <i className="bi bi-plus-lg me-1"></i> Add carton
      </button>
      <p className="text-xs text-gray-500">Blank cartons (no carton number) and blank lines (no description) are not saved.</p>
    </div>
  );
}

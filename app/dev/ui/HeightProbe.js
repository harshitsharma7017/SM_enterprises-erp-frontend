'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Measures the rendered height of every form control inside it and reports the
 * distinct values found.
 *
 * The select/input height mismatch is a few pixels, which is easy to miss by
 * eye but trivial to confirm numerically. This turns "do the controls line up?"
 * into a number, and is the visual counterpart to the jsdom height test.
 */
export default function HeightProbe({ label, children }) {
  const ref = useRef(null);
  const [heights, setHeights] = useState([]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = () => {
      const controls = node.querySelectorAll('input, select, textarea');
      const found = Array.from(controls).map((el) => ({
        tag: el.tagName.toLowerCase(),
        height: Math.round(el.getBoundingClientRect().height * 100) / 100,
      }));
      setHeights(found);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children]);

  // A textarea is intentionally taller, so it is excluded from the parity check.
  const comparable = heights.filter((h) => h.tag !== 'textarea');
  const distinct = [...new Set(comparable.map((h) => h.height))];
  const matched = distinct.length <= 1;

  return (
    <div ref={ref} className="mb-6">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{label}</span>
        {comparable.length > 0 && (
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              matched
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            {matched
              ? `aligned — all ${distinct[0]}px`
              : `MISMATCH — ${distinct.sort((a, b) => a - b).join('px / ')}px`}
          </span>
        )}
        <span className="text-xs text-gray-500">
          {heights.map((h) => `${h.tag} ${h.height}px`).join(' · ')}
        </span>
      </div>
      {children}
    </div>
  );
}

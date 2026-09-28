/** One-line brand specification shown under a product (set in Brand → Product Specifications). */
export default function BrandSpecNote({ spec }) {
  if (!spec?.summary) return null;
  return (
    <div className="text-xs text-indigo-700 mt-0.5" title="Brand specification">
      <i className="bi bi-tag me-1"></i>{spec.summary}
    </div>
  );
}

import Link from 'next/link';

// Phase 3's `<Header title=… breadcrumbs=…>` usage on several pages is a dead
// pattern — components/layout/Header.js only ever renders the fixed top navbar
// (user dropdown, sidebar toggle) and silently ignores a `title`/`breadcrumbs`
// prop, so passing them there duplicates an empty navbar instead of showing a
// page title. This is the actually-working inline-heading pattern (matches
// app/masters/categories/page.js and app/dashboard/page.js).
export default function PageHeading({ title, breadcrumbs, actions }) {
  return (
    <div className="mb-4 flex items-start justify-between flex-wrap gap-2">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="text-xs text-gray-500 mb-1">
            {breadcrumbs.map((b, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1">/</span>}
                {b.href ? <Link href={b.href} className="hover:text-blue-600">{b.label}</Link> : <span>{b.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h2 className="text-2xl font-semibold text-gray-900 m-0">{title}</h2>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

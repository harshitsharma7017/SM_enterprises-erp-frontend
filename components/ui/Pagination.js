export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.last_page <= 1) return null;

  const { current_page, last_page, from, to, total } = pagination;
  const pages = [];

  // Simple pagination window logic
  let startPage = Math.max(1, current_page - 2);
  let endPage = Math.min(last_page, current_page + 2);

  if (current_page <= 2) endPage = Math.min(last_page, 5);
  if (current_page >= last_page - 1) startPage = Math.max(1, last_page - 4);

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const stepClasses =
    'relative inline-flex items-center px-2 py-2 bg-surface text-fg-subtle ring-1 ring-inset ring-line-strong hover:bg-surface-hover hover:text-fg focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-sm text-fg-subtle">
        Showing <span className="font-medium text-fg">{from || 0}</span>–
        <span className="font-medium text-fg">{to || 0}</span> of{' '}
        <span className="font-medium text-fg">{total}</span>
      </div>

      <nav aria-label="Pagination" className="isolate inline-flex -space-x-px rounded-md shadow-sm">
        <button
          type="button"
          onClick={() => onPageChange(current_page - 1)}
          disabled={current_page === 1}
          className={`${stepClasses} rounded-l-md`}
        >
          <span className="sr-only">Previous</span>
          <i className="bi bi-chevron-left" aria-hidden="true"></i>
        </button>

        {pages.map(page => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={page === current_page ? 'page' : undefined}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${
              page === current_page
                ? 'z-10 bg-accent text-accent-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]'
                : 'bg-surface text-fg ring-1 ring-inset ring-line-strong hover:bg-surface-hover'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(current_page + 1)}
          disabled={current_page === last_page}
          className={`${stepClasses} rounded-r-md`}
        >
          <span className="sr-only">Next</span>
          <i className="bi bi-chevron-right" aria-hidden="true"></i>
        </button>
      </nav>
    </div>
  );
}

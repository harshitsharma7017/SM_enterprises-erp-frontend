// Adapts the Inquiry list response ({ total, page, limit }) to the shape
// components/ui/Pagination.js expects ({ current_page, last_page, from, to, total }).
export function toPaginationFromPageLimit({ total, page, limit }) {
  const safeTotal = Number(total) || 0;
  const safeLimit = Number(limit) || 15;
  const safePage = Number(page) || 1;
  const lastPage = Math.max(1, Math.ceil(safeTotal / safeLimit));
  return {
    current_page: safePage,
    last_page: lastPage,
    from: safeTotal > 0 ? (safePage - 1) * safeLimit + 1 : 0,
    to: Math.min(safePage * safeLimit, safeTotal),
    total: safeTotal,
  };
}

// Adapts the Order Confirmation list response ({ total, page, last_page }).
export function toPaginationFromMeta({ total, page, last_page }, limit = 15) {
  const safeTotal = Number(total) || 0;
  const safePage = Number(page) || 1;
  const safeLastPage = Number(last_page) || Math.max(1, Math.ceil(safeTotal / limit));
  return {
    current_page: safePage,
    last_page: safeLastPage,
    from: safeTotal > 0 ? (safePage - 1) * limit + 1 : 0,
    to: Math.min(safePage * limit, safeTotal),
    total: safeTotal,
  };
}

export function StatusBadge({ status, onClick }) {
  const isActive = status === 'active';
  const Component = onClick ? 'button' : 'span';
  const props = onClick ? { type: 'button', onClick, className: `badge border rounded-md px-2 py-1 text-xs font-medium ${isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'} hover:opacity-80 transition-opacity cursor-pointer` } : { className: `badge border rounded-md px-2 py-1 text-xs font-medium ${isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}` };

  return (
    <Component {...props}>
      {isActive ? 'Active' : 'Inactive'}
    </Component>
  );
}

export function StandardBadge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ${className}`}>
      {children}
    </span>
  );
}

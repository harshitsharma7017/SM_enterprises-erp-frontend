export default function EmptyState({ colspan = 1, icon, title, message }) {
  return (
    <tr>
      <td colSpan={colspan} className="text-center py-12 text-fg-subtle">
        <div className="flex flex-col items-center justify-center">
          <i className={`bi ${icon} text-4xl mb-3 text-fg-subtle opacity-70`} aria-hidden="true" />
          <h4 className="text-lg font-medium text-fg-muted mb-1">{title}</h4>
          <p className="text-sm text-fg-subtle max-w-md mx-auto">{message}</p>
        </div>
      </td>
    </tr>
  );
}

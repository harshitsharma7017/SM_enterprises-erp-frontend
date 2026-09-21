export default function EmptyState({ colspan = 1, icon, title, message }) {
  return (
    <tr>
      <td colSpan={colspan} className="text-center py-12 text-gray-500">
        <div className="flex flex-col items-center justify-center">
          <i className={`bi ${icon} text-4xl mb-3 text-gray-400 opacity-70`}></i>
          <h4 className="text-lg font-medium text-gray-700 mb-1">{title}</h4>
          <p className="text-sm text-gray-500 max-w-md mx-auto">{message}</p>
        </div>
      </td>
    </tr>
  );
}

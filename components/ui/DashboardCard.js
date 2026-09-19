export default function DashboardCard({ title, value, subtitle, icon }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

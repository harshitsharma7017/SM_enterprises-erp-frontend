import DashboardLayout from '../../components/layout/DashboardLayout';
import DashboardCard from '../../components/ui/DashboardCard';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Overview of factory operations (Dummy Data)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard 
          title="Active Orders" 
          value="24" 
          subtitle="4 awaiting confirmation"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          }
        />
        <DashboardCard 
          title="Pending POs" 
          value="8" 
          subtitle="Across 3 suppliers"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          }
        />
        <DashboardCard 
          title="Production Today" 
          value="1,240 pcs" 
          subtitle="Target: 1,500 pcs"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          }
        />
        <DashboardCard 
          title="Pending QC" 
          value="6" 
          subtitle="Batches awaiting inspection"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Mock */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
          <ul className="space-y-4">
            <li className="flex gap-4">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Work Order #WO-8841 Released</p>
                <p className="text-xs text-gray-500">2 hours ago by Admin</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="h-2 w-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Goods Inward #GI-102 Approved</p>
                <p className="text-xs text-gray-500">5 hours ago by QC</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="h-2 w-2 rounded-full bg-yellow-500 mt-2"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">New Inquiry received from Buyer 01</p>
                <p className="text-xs text-gray-500">Yesterday</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Development Notice */}
        <div className="bg-blue-50 p-6 rounded-lg shadow-sm border border-blue-100 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-blue-900 mb-2">Development Phase</h3>
          <p className="text-sm text-blue-800">
            This dashboard contains statically marked mock data solely to verify protected routing and authentication state restoration. ERP business modules and actual metrics will be connected in future phases.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

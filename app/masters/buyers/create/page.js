'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';

import BuyerForm from '@/components/masters/buyers/BuyerForm';

export default function CreateBuyerPage() {
  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">Add Buyer</h2>
      </div>
      
      <div className="pt-2">
        <BuyerForm />
      </div>
    </DashboardLayout>
  );
}

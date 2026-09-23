'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

import SupplierForm from '@/components/masters/suppliers/SupplierForm';

export default function EditSupplierPage({ params }) {
  const { id } = use(params);

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">Edit Supplier</h2>
      </div>
      
      <div className="pt-2">
        <SupplierForm supplierId={id} />
      </div>
    </DashboardLayout>
  );
}

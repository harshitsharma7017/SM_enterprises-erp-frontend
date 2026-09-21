'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import SupplierForm from '@/components/masters/suppliers/SupplierForm';

export default function EditSupplierPage({ params }) {
  const { id } = use(params);

  return (
    <DashboardLayout>
      <Header 
        title="Edit Party" 
        breadcrumbs={[
          { label: 'Masters', href: '/masters' }, 
          { label: 'Suppliers & Jobbers', href: '/masters/suppliers' }, 
          { label: 'Edit' }
        ]} 
      />
      
      <div className="p-6">
        <SupplierForm supplierId={id} />
      </div>
    </DashboardLayout>
  );
}

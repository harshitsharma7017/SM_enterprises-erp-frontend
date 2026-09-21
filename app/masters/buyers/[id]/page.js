'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import BuyerForm from '@/components/masters/buyers/BuyerForm';

export default function EditBuyerPage({ params }) {
  const { id } = use(params);

  return (
    <DashboardLayout>
      <Header 
        title="Edit Buyer" 
        breadcrumbs={[
          { label: 'Masters', href: '/masters' }, 
          { label: 'Buyers', href: '/masters/buyers' }, 
          { label: 'Edit' }
        ]} 
      />
      
      <div className="p-6">
        <BuyerForm buyerId={id} />
      </div>
    </DashboardLayout>
  );
}

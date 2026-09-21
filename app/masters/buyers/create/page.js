'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import BuyerForm from '@/components/masters/buyers/BuyerForm';

export default function CreateBuyerPage() {
  return (
    <DashboardLayout>
      <Header 
        title="Add Buyer" 
        breadcrumbs={[
          { label: 'Masters', href: '/masters' }, 
          { label: 'Buyers', href: '/masters/buyers' }, 
          { label: 'Create' }
        ]} 
      />
      
      <div className="p-6">
        <BuyerForm />
      </div>
    </DashboardLayout>
  );
}

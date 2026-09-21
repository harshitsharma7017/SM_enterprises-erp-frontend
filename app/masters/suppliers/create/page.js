'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import SupplierForm from '@/components/masters/suppliers/SupplierForm';

function CreateSupplierForm() {
  const searchParams = useSearchParams();
  const partyType = searchParams.get('party_type') || 'supplier';
  
  return <SupplierForm initialPartyType={partyType} />;
}

export default function CreateSupplierPage() {
  // Using useSearchParams outside Suspense causes build error in Next.js 13+
  // We manage the title generically or pass it up if needed. We'll use a generic title for the Header
  // and handle the specific title inside if we want, or just generic here.
  
  return (
    <DashboardLayout>
      <Header 
        title="Add Party" 
        breadcrumbs={[
          { label: 'Masters', href: '/masters' }, 
          { label: 'Suppliers & Jobbers', href: '/masters/suppliers' }, 
          { label: 'Create' }
        ]} 
      />
      
      <div className="p-6">
        <Suspense fallback={<div className="p-4">Loading form...</div>}>
          <CreateSupplierForm />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

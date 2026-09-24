'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import DispatchForm from '@/components/dispatch/DispatchForm';

function CreateDispatchForm() {
  const searchParams = useSearchParams();
  return (
    <DispatchForm
      initialType={searchParams.get('type') || 'STOCK_DISPATCH'}
      initialOrderId={searchParams.get('order_confirmation_id') || ''}
      initialPoId={searchParams.get('purchase_order_id') || ''}
    />
  );
}

export default function CreateDispatchPage() {
  return (
    <DashboardLayout>
      <PageHeading title="New Dispatch" breadcrumbs={[{ label: 'Dispatches', href: '/dispatch' }, { label: 'New' }]} />
      {/* useSearchParams needs a Suspense boundary for the production build. */}
      <Suspense fallback={<div className="p-4">Loading form...</div>}>
        <CreateDispatchForm />
      </Suspense>
    </DashboardLayout>
  );
}

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import InvoiceForm from '@/components/finance/InvoiceForm';

function CreateInvoiceForm() {
  const searchParams = useSearchParams();
  return <InvoiceForm initialOrderId={searchParams.get('order_confirmation_id') || ''} initialDispatchId={searchParams.get('dispatch_id') || ''} />;
}

export default function CreateInvoicePage() {
  return (
    <DashboardLayout>
      <PageHeading title="New Invoice" breadcrumbs={[{ label: 'Invoices', href: '/finance/invoices' }, { label: 'New' }]} />
      {/* useSearchParams needs a Suspense boundary for the production build. */}
      <Suspense fallback={<div className="p-4">Loading form...</div>}>
        <CreateInvoiceForm />
      </Suspense>
    </DashboardLayout>
  );
}

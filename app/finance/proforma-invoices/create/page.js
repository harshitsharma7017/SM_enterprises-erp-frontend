'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import ProformaInvoiceForm from '@/components/finance/ProformaInvoiceForm';

function CreateProformaInvoiceForm() {
  const searchParams = useSearchParams();
  return <ProformaInvoiceForm initialOrderId={searchParams.get('order_confirmation_id') || ''} />;
}

export default function CreateProformaInvoicePage() {
  return (
    <DashboardLayout>
      <PageHeading title="New Proforma Invoice" breadcrumbs={[{ label: 'Proforma Invoices', href: '/finance/proforma-invoices' }, { label: 'New' }]} />
      {/* useSearchParams needs a Suspense boundary for the production build. */}
      <Suspense fallback={<div className="p-4">Loading form...</div>}>
        <CreateProformaInvoiceForm />
      </Suspense>
    </DashboardLayout>
  );
}

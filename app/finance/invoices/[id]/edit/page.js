'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import InvoiceForm from '@/components/finance/InvoiceForm';

export default function EditInvoicePage({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <PageHeading title="Edit Invoice" breadcrumbs={[{ label: 'Invoices', href: '/finance/invoices' }, { label: 'Edit' }]} />
      <InvoiceForm invoiceId={id} />
    </DashboardLayout>
  );
}

'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import ProformaInvoiceForm from '@/components/finance/ProformaInvoiceForm';

export default function EditProformaInvoicePage({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <PageHeading title="Edit Proforma Invoice" breadcrumbs={[{ label: 'Proforma Invoices', href: '/finance/proforma-invoices' }, { label: 'Edit' }]} />
      <ProformaInvoiceForm piId={id} />
    </DashboardLayout>
  );
}

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import DebitNoteForm from '@/components/quality/DebitNoteForm';

function CreateDebitNoteForm() {
  const searchParams = useSearchParams();
  return <DebitNoteForm initialQcId={searchParams.get('quality_inspection_id')} initialReturnId={searchParams.get('supplier_return_id')} />;
}

export default function CreateDebitNotePage() {
  return (
    <DashboardLayout>
      <PageHeading title="New Debit Note" breadcrumbs={[{ label: 'Debit Notes', href: '/finance/debit-notes' }, { label: 'New' }]} />
      {/* useSearchParams needs a Suspense boundary for the production build. */}
      <Suspense fallback={<div className="p-4">Loading form...</div>}>
        <CreateDebitNoteForm />
      </Suspense>
    </DashboardLayout>
  );
}

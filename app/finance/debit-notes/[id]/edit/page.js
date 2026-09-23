'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import DebitNoteForm from '@/components/quality/DebitNoteForm';

export default function EditDebitNotePage({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <PageHeading title="Edit Debit Note" breadcrumbs={[{ label: 'Debit Notes', href: '/finance/debit-notes' }, { label: 'Edit' }]} />
      <DebitNoteForm noteId={id} />
    </DashboardLayout>
  );
}

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import QcForm from '@/components/quality/QcForm';

function CreateQcForm() {
  const searchParams = useSearchParams();
  return <QcForm initialLotId={searchParams.get('lot_id')} />;
}

export default function CreateQcPage() {
  return (
    <DashboardLayout>
      <PageHeading title="New Inspection" breadcrumbs={[{ label: 'Quality Control', href: '/quality-control' }, { label: 'New' }]} />
      {/* useSearchParams needs a Suspense boundary for the production build. */}
      <Suspense fallback={<div className="p-4">Loading form...</div>}>
        <CreateQcForm />
      </Suspense>
    </DashboardLayout>
  );
}

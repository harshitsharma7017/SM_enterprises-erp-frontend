'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import ReturnForm from '@/components/quality/ReturnForm';

function CreateReturnForm() {
  const searchParams = useSearchParams();
  return <ReturnForm initialQcId={searchParams.get('quality_inspection_id')} />;
}

export default function CreateSupplierReturnPage() {
  return (
    <DashboardLayout>
      <PageHeading title="New Supplier Return" breadcrumbs={[{ label: 'Supplier Returns', href: '/procurement/returns' }, { label: 'New' }]} />
      {/* useSearchParams needs a Suspense boundary for the production build. */}
      <Suspense fallback={<div className="p-4">Loading form...</div>}>
        <CreateReturnForm />
      </Suspense>
    </DashboardLayout>
  );
}

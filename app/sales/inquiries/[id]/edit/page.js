'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import InquiryForm from '@/components/sales/inquiries/InquiryForm';

export default function EditInquiryPage({ params }) {
  const { id } = use(params);

  return (
    <DashboardLayout>
      <PageHeading
        title="Edit Inquiry"
        breadcrumbs={[
          { label: 'Inquiries', href: '/sales/inquiries' },
          { label: 'View', href: `/sales/inquiries/${id}` },
          { label: 'Edit' },
        ]}
      />
      <InquiryForm inquiryId={id} />
    </DashboardLayout>
  );
}

'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import InquiryForm from '@/components/sales/inquiries/InquiryForm';

export default function CreateInquiryPage() {
  return (
    <DashboardLayout>
      <PageHeading
        title="New Inquiry"
        breadcrumbs={[{ label: 'Inquiries', href: '/sales/inquiries' }, { label: 'New' }]}
      />
      <InquiryForm />
    </DashboardLayout>
  );
}

'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import ExportDocumentForm from '@/components/export-documents/ExportDocumentForm';

export default function EditExportDocumentPage({ params }) {
  const { id } = use(params);

  return (
    <DashboardLayout>
      <PageHeading
        title="Edit Export Document"
        breadcrumbs={[
          { label: 'Export Documents', href: '/export/documents' },
          { label: 'View', href: `/export/documents/${id}` },
          { label: 'Edit' },
        ]}
      />
      <ExportDocumentForm documentId={id} />
    </DashboardLayout>
  );
}

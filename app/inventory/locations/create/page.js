'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import LocationForm from '@/components/inventory/LocationForm';

export default function CreateStockLocationPage() {
  return (
    <DashboardLayout>
      <PageHeading title="New Stock Location" breadcrumbs={[{ label: 'Stock Locations', href: '/inventory/locations' }, { label: 'New' }]} />
      <LocationForm />
    </DashboardLayout>
  );
}

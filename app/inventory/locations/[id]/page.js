'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, LOCATION_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import LocationForm from '@/components/inventory/LocationForm';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

export default function StockLocationPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let mounted = true;
    apiClient.get(`/inventory/locations/${id}`)
      .then((res) => { if (mounted) setLocation(res.data || null); })
      .catch((err) => { if (mounted) setError(err.message || 'Failed to load location'); });
    return () => { mounted = false; };
  }, [id]);

  if (error) return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{error}</div></DashboardLayout>;
  if (!location) return <DashboardLayout><div className="p-4 text-gray-500">Loading location...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeading
        title={`${location.code} · ${location.name}`}
        breadcrumbs={[{ label: 'Stock Locations', href: '/inventory/locations' }, { label: location.code }]}
        actions={(
          <>
            <Link href="/inventory/locations" className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">Back</Link>
          </>
        )}
      />
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}

      <Card title="Location" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500 text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={location.company_label} code={location.company_code} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={location.status} config={LOCATION_STATUS_BADGES} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Lots in stock</dt><dd className="mt-1 text-gray-900">{location.lots_in_stock}</dd></div>
          <div><dt className="text-gray-500 text-xs">Movements</dt><dd className="mt-1 text-gray-900">{location.movements_count}</dd></div>
          {location.remarks && <div className="md:col-span-4"><dt className="text-gray-500 text-xs">Remarks</dt><dd className="mt-1 text-gray-900 whitespace-pre-line">{location.remarks}</dd></div>}
        </dl>
        {location.status === 'inactive' && <p className="text-xs text-amber-700 mt-3 mb-0">Inactive: no new stock can be posted here; existing stock stays visible.</p>}
      </Card>

      {can('stock-location.edit') && (
        <Card title="Edit" variant="info">
          <LocationForm
            key={location.updated_at}
            location={location}
            onSaved={(saved) => { setLocation(saved); setNotice(`Location ${saved.code} updated.`); }}
          />
        </Card>
      )}
    </DashboardLayout>
  );
}

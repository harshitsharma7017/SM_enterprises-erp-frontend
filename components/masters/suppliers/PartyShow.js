'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime } from '@/components/sales/shared/format';

/** Guru Traders' masters/{suppliers,jobbers}/show.blade.php. */
const PARTY_TYPES = { supplier: 'Supplier (trading — finished goods)', jobber: 'Jobber (jobwork — we supply the material)', both: 'Both' };
const DELIVERY_MODES = { to_office: 'To office (repacked here)', direct_to_port: 'Direct to port', to_warehouse: 'To warehouse' };

/** "45 Days", or "On dispatch" for 0 (Supplier::creditTermsLabel). */
export const creditTermsLabel = (days) => (days === null || days === undefined || days === '' ? null : Number(days) === 0 ? 'On dispatch' : `${Number(days)} Days`);
/** "2.5%" or "12 INR" (Supplier::agentCommissionLabel). */
const commissionLabel = (value, type) => {
  if (value === null || value === undefined || value === '' || !type) return null;
  const v = Number(value).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return type === 'percent' ? `${v}%` : `${v} INR`;
};

function StatusBadge({ active }) {
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{active ? 'Active' : 'Inactive'}</span>;
}
function Item({ label, children, mono = false, strong = false }) {
  return (
    <>
      <dt className="sm:col-span-5 text-gray-500 text-sm">{label}</dt>
      <dd className={`sm:col-span-7 text-sm text-gray-900 mb-2 ${mono ? 'font-mono' : ''} ${strong ? 'font-semibold' : ''}`}>{children}</dd>
    </>
  );
}
const Rule = () => <div className="sm:col-span-12 border-t border-gray-200 my-2"></div>;
const Chip = ({ children }) => <span className="inline-block bg-gray-100 border border-gray-200 rounded px-2 py-0.5 text-xs mr-1 mb-1">{children}</span>;

export default function PartyShow({ kind = 'supplier', id }) {
  const isJobber = kind === 'jobber';
  const base = isJobber ? '/masters/jobbers' : '/masters/suppliers';
  const { can } = useAuth(true);
  const [party, setParty] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.get(`${base}/${id}`)
      .then((res) => setParty(res.data?.[isJobber ? 'jobber' : 'supplier'] || null))
      .catch((err) => setError(err.message || 'Not found'));
  }, [base, id, isJobber]);

  if (error) return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{error}</div></DashboardLayout>;
  if (!party) return <DashboardLayout><div className="p-4 text-gray-500">Loading…</div></DashboardLayout>;

  const canEdit = isJobber ? (can('jobber.edit') || can('supplier.edit')) : can('supplier.edit');
  const doesJobwork = isJobber || party.party_type === 'jobber' || party.party_type === 'both';
  const agent = party.agent_name ? `${party.agent_name} (${party.agent_display_code})` : null;

  return (
    <DashboardLayout>
      <div className="mb-4"><h2 className="text-2xl font-semibold text-gray-900 m-0">{isJobber ? 'Jobber Details' : 'Supplier Details'}</h2></div>
      <div className="bg-white rounded-lg shadow-sm border border-[var(--card-border)] border-t-[3px] border-t-blue-600">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h3 className="text-[1.1rem] font-semibold text-gray-900 m-0">{party.display_code} — {party.company_name}</h3>
          <div className="flex gap-2">
            {canEdit && <Link href={`${base}/${id}/edit`} className="px-3 py-1.5 rounded text-sm bg-blue-600 hover:bg-blue-700 text-white"><i className="bi bi-pencil me-1"></i> Edit</Link>}
            <Link href={base} className="px-3 py-1.5 rounded text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"><i className="bi bi-arrow-left me-1"></i> Back</Link>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <dl className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-12 gap-x-4 m-0">
            <Item label="Display Code"><span className="inline-block bg-gray-100 border rounded px-2 font-mono text-xs">{party.display_code}</span></Item>
            <Item label="Company"><CompanyBadge label={party.company_label} code={party.company_code} emptyLabel="Shared" /></Item>
            <Item label="Party Type">{PARTY_TYPES[party.party_type]}</Item>
            <Item label="Company Name" strong>{party.company_name}</Item>
            <Item label="Name on Bill">{party.name_on_bill || '—'}</Item>
            <Item label="Product Category">{party.categories?.length ? party.categories.map((c) => <Chip key={c.id}>{c.name}</Chip>) : '—'}</Item>
            {isJobber && <Item label="Product">{party.products?.length ? party.products.map((p) => <Chip key={p.id}>{p.name}</Chip>) : '—'}</Item>}
            <Item label="Status"><StatusBadge active={party.status === 'active'} /></Item>
            <Rule />
            <Item label={isJobber ? 'Jobber Type' : 'Supplier Type'}>{party.supplier_type_name || '—'}</Item>
            <Item label="GST Number" mono>{party.gst_number || '—'}</Item>
            <Item label="PAN Number" mono>{party.pan_number || '—'}</Item>
            <Item label="MSME">{party.is_msme ? <span className="font-mono">{party.msme_registration_no || 'Registered'}</span> : 'Not registered'}</Item>
            <Rule />
            <Item label="Address">{party.address || '—'}</Item>
            <Item label="City / State">{[party.city_name, party.state_name].filter(Boolean).join(', ') || '—'}</Item>
            <Item label="Country">{party.country_name || '—'}</Item>
            <Item label="PIN Code">{party.pincode || '—'}</Item>
            <Rule />
            <Item label="Discount %">{party.discount_percent !== null && party.discount_percent !== undefined ? `${party.discount_percent}%` : '—'}</Item>
            <Item label="Credit Terms">{creditTermsLabel(party.credit_days) || '—'}</Item>
            {/* Jobwork-only, so shown only where it means something (always on a jobber). */}
            {doesJobwork && (
              <>
                <Item label="We Supply Material">{party.we_supply_material ? 'Yes' : 'No'}</Item>
                <Item label="Sample Approval">{party.requires_sample_approval ? 'Required before PO' : 'Not required'}</Item>
              </>
            )}
            <Item label="Delivery Mode">{DELIVERY_MODES[party.default_delivery_mode] || '—'}</Item>
            {isJobber && (
              <>
                <Item label="Buyer(s)">{party.buyers?.length ? party.buyers.map((b) => {
                  const text = b.display_code ? `${b.company_name} (${b.display_code})` : b.company_name;
                  return can('buyer.view') ? <Link key={b.id} href={`/masters/buyers/${b.id}`} className="inline-block bg-gray-100 border border-gray-200 rounded px-2 py-0.5 text-xs mr-1 mb-1 no-underline text-gray-800">{text}</Link> : <Chip key={b.id}>{text}</Chip>;
                }) : '—'}</Item>
                <Item label="Buyer Details"><span className="whitespace-pre-line">{party.client_details || '—'}</span></Item>
              </>
            )}
            <Rule />
            <Item label="Bank Name">{party.bank_name || '—'}</Item>
            <Item label="Account Number" mono>{party.account_number || '—'}</Item>
            <Item label="IFSC Code" mono>{party.ifsc_code || '—'}</Item>
            <Rule />
            <Item label="Agent">{agent || '—'}</Item>
            <Item label="Agent Commission">{commissionLabel(party.agent_commission_value, party.agent_commission_type) || '—'}</Item>
            <Rule />
            <Item label="Remarks">{party.remarks || '—'}</Item>
            <Item label="Comments">{party.comments || '—'}</Item>
            <Item label="Created"><span className="text-gray-500 text-xs">{formatDateTime(party.created_at)}{party.creator_name ? ` by ${party.creator_name}` : ''}</span></Item>
            <Item label="Last updated"><span className="text-gray-500 text-xs">{formatDateTime(party.updated_at)}{party.updater_name ? ` by ${party.updater_name}` : ''}</span></Item>
          </dl>

          {/* One list, primary first — how the rows are stored. */}
          <div className="lg:col-span-5">
            <div className="border rounded">
              <div className="bg-gray-50 px-3 py-2 border-b text-xs font-semibold text-gray-500 uppercase">Contacts</div>
              {party.contacts?.length ? party.contacts.map((c) => (
                <div key={c.id} className="px-3 py-2 border-b last:border-b-0">
                  <div className="flex justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm">{c.name}</div>
                      {c.designation_name && <div className="text-xs text-gray-500">{c.designation_name}</div>}
                    </div>
                    {c.is_primary ? <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 h-fit">Primary</span> : null}
                  </div>
                  {c.mobile && <div className="text-xs mt-1"><i className="bi bi-telephone me-1"></i>{c.mobile}</div>}
                  {c.email && <div className="text-xs"><i className="bi bi-envelope me-1"></i><a href={`mailto:${c.email}`} className="text-blue-600">{c.email}</a></div>}
                </div>
              )) : <div className="px-3 py-2 text-sm text-gray-500 italic">No contacts recorded.</div>}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CompanySelect from '@/components/company/CompanySelect';
import SearchMultiSelect from '@/components/masters/suppliers/SearchMultiSelect';
import { INPUT, Section, Row, toList } from '@/components/masters/shared/MasterFormParts';
import { apiClient } from '@/lib/api-client';

/**
 * Guru Traders' Buyer master form (resources/views/masters/buyers/_form.blade.php),
 * in the sheet's own order: Identification, Contact, Secondary Contact Person,
 * Address & Destination (Country → State → City cascade, India by default),
 * Agent, Trade Terms (the advance / at-sight split opens only for a payment
 * term that splits the payment), Bank Details, Carton Marking Details and
 * Other Details. "Our Company" is this ERP's company scope (blank = shared).
 * The original's accepted-currency / incoterm sets are not stored here.
 */
const API = '/masters/buyers';

// Buyer::DEFAULT_CARTON_LINES — the five lines the sheet draws, as a starting point.
const DEFAULT_CARTON_LINES = [
  { label: 'BUYER NAME', placeholder: 'ABC CORP' },
  { label: 'DESTINATION', placeholder: 'LONDON' },
  { label: 'ORDER REF', placeholder: 'C/NO' },
  { label: 'MADE IN', placeholder: 'MADE IN INDIA' },
  { label: 'GROSS WT', placeholder: 'GROSS WT:' },
];
const EMPTY_CONTACT = { name: '', designation_id: '', mobile: '', email: '' };

const blankForm = (indiaCountryId) => ({
  company_id: '', company_name: '', name_on_export_invoice: '', category_ids: [],
  contact_person: '', contact_designation_id: '', email: '', mobile: '', gst_vat_no: '',
  address: '', country_id: indiaCountryId ? String(indiaCountryId) : '', state_id: '', city_id: '', pincode: '', port_id: '',
  agent_id: '', agent_commission_value: '', agent_commission_type: 'percent',
  payment_term_id: '', advance_percent: '', sight_percent: '', incoterm_id: '', shipment_method_id: '', currency_id: '',
  bank_name: '', account_number: '', swift_code: '',
  status: 'active', remarks: '', comments: '',
});
const str = (v) => (v === null || v === undefined ? '' : String(v));

export default function BuyerForm({ buyerId = null }) {
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [lookups, setLookups] = useState({});
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [contacts, setContacts] = useState([{ ...EMPTY_CONTACT }]);
  const [secondary, setSecondary] = useState(false);
  const [carton, setCarton] = useState(DEFAULT_CARTON_LINES.map((l) => ({ label: l.label, value: '' })));
  const [displayCode, setDisplayCode] = useState(null);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const formUrl = buyerId ? `${API}/${buyerId}/edit` : `${API}/create`;

  useEffect(() => {
    apiClient.get(formUrl).then((res) => {
      const d = res.data || {};
      setLookups(d);
      setStates(d.states || []);
      setCities(d.cities || []);
      const b = d.buyer;
      if (!b) {
        setForm(blankForm(d.indiaCountryId));
        return;
      }
      setDisplayCode(b.display_code);
      setForm({
        company_id: str(b.company_id), company_name: str(b.company_name), name_on_export_invoice: str(b.name_on_export_invoice),
        category_ids: (b.categories || []).map((c) => String(c.id)),
        contact_person: str(b.contact_person), contact_designation_id: str(b.contact_designation_id), email: str(b.email), mobile: str(b.mobile), gst_vat_no: str(b.gst_vat_no),
        address: str(b.address), country_id: str(b.country_id), state_id: str(b.state_id), city_id: str(b.city_id), pincode: str(b.pincode), port_id: str(b.port_id),
        agent_id: str(b.agent_id), agent_commission_value: str(b.agent_commission_value), agent_commission_type: b.agent_commission_type || 'percent',
        payment_term_id: str(b.payment_term_id), advance_percent: str(b.advance_percent), sight_percent: str(b.sight_percent),
        incoterm_id: str(b.incoterm_id), shipment_method_id: str(b.shipment_method_id), currency_id: str(b.currency_id),
        bank_name: str(b.bank_name), account_number: str(b.account_number), swift_code: str(b.swift_code),
        status: b.status || 'active', remarks: str(b.remarks), comments: str(b.comments),
      });
      const extra = (b.contacts || []).map((c) => ({ name: str(c.name), designation_id: str(c.designation_id), mobile: str(c.mobile), email: str(c.email) }));
      setContacts(extra.length ? extra : [{ ...EMPTY_CONTACT }]);
      setSecondary(extra.length > 0);
      if (b.carton_markings?.length) setCarton(b.carton_markings.map((l) => ({ label: str(l.label), value: str(l.value) })));
    }).catch((err) => setErrors([err.message || 'Failed to load the form']));
  }, [formUrl]);

  // Country → State → City: each parent change reloads its children from the form-data endpoint.
  const reloadGeo = useCallback(async (countryId, stateId) => {
    const params = new URLSearchParams();
    if (countryId) params.set('country_id', countryId);
    if (stateId) params.set('state_id', stateId);
    try {
      const res = await apiClient.get(`${formUrl}?${params}`);
      setStates(countryId ? res.data?.states || [] : []);
      setCities(stateId ? res.data?.cities || [] : []);
    } catch {
      setStates([]);
      setCities([]);
    }
  }, [formUrl]);

  const onInput = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const onCountry = (e) => {
    const countryId = e.target.value;
    setForm((f) => ({ ...f, country_id: countryId, state_id: '', city_id: '' }));
    reloadGeo(countryId, null);
  };
  const onState = (e) => {
    const stateId = e.target.value;
    setForm((f) => ({ ...f, state_id: stateId, city_id: '' }));
    reloadGeo(form.country_id, stateId);
  };

  const splitTermIds = (lookups.splitTermIds || []).map(String);
  const splitVisible = !!form && splitTermIds.includes(String(form.payment_term_id));
  const splitTotal = Number(form?.advance_percent || 0) + Number(form?.sight_percent || 0);

  const setContact = (i, field, value) => setContacts((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const setCartonLine = (i, field, value) => setCarton((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const payload = {
      ...form,
      gst_vat_no: form.gst_vat_no.trim().toUpperCase(),
      swift_code: form.swift_code.trim().toUpperCase(),
      advance_percent: splitVisible ? form.advance_percent : '',
      sight_percent: splitVisible ? form.sight_percent : '',
      agent_commission_type: form.agent_commission_value === '' ? '' : form.agent_commission_type,
      contacts: secondary ? contacts : [],
      carton_markings: carton,
    };
    try {
      if (buyerId) await apiClient.put(`${API}/${buyerId}`, payload);
      else await apiClient.post(API, payload);
      router.push(API);
    } catch (err) {
      const list = err.response?.data?.errors;
      setErrors(Array.isArray(list) ? list : list ? Object.values(list).flat() : [err.message || 'Failed to save the buyer']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  };

  if (!form) {
    return <DashboardLayout>{errors.length ? <div className="bg-red-50 text-red-600 p-3 rounded">{errors[0]}</div> : <div className="p-8 text-center text-gray-500">Loading form data…</div>}</DashboardLayout>;
  }

  const designations = toList(lookups.designations);
  const option = (list, label = (x) => x.name) => toList(list).map((x) => <option key={x.id} value={x.id}>{label(x)}</option>);

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">{buyerId ? 'Edit Buyer' : 'Add Buyer'}</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-[var(--card-border)] overflow-hidden">
      <form onSubmit={submit}>
        <div className="p-6">
        {errors.length > 0 && (
          <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded mb-4 text-sm">
            <ul className="list-disc pl-5 m-0">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}

        {/* A–D · Identification */}
        <Section title="Identification" icon="bi-globe-asia-australia" subtitle="Who the buyer is, here and on the export invoice.">
          <Row label="Our Company" htmlFor="company_id" hint="Blank = the buyer is shared by both companies.">
            <CompanySelect value={form.company_id} onChange={onInput} emptyLabel="Shared (both companies)" className={INPUT} />
          </Row>
          <Row label="Display Code" hint={buyerId ? 'Codes never change — they appear on documents already sent.' : 'Assigned automatically when you save (BUY01, BUY02…).'}>
            <input type="text" value={displayCode || 'Auto'} readOnly className={`${INPUT} font-mono bg-gray-50`} />
          </Row>
          <Row label="Company Name" required htmlFor="company_name">
            <input id="company_name" name="company_name" type="text" required maxLength={200} value={form.company_name} onChange={onInput} placeholder="ABC Fashion Ltd" className={INPUT} />
          </Row>
          <Row label="Name on Export Invoice" htmlFor="name_on_export_invoice" hint="Leave blank to use the company name.">
            <input id="name_on_export_invoice" name="name_on_export_invoice" type="text" maxLength={200} value={form.name_on_export_invoice} onChange={onInput} placeholder="Exactly as it must print on the invoice" className={INPUT} />
          </Row>
          <Row label="Category of Items" required hint="Pick every category this buyer orders.">
            <SearchMultiSelect options={toList(lookups.categories)} value={form.category_ids} onChange={(ids) => setForm((f) => ({ ...f, category_ids: ids }))} placeholder="Search categories…" />
          </Row>
        </Section>

        {/* E–H · Contact */}
        <Section title="Contact" icon="bi-person-lines-fill">
          <Row label="Contact Person" htmlFor="contact_person">
            <input id="contact_person" name="contact_person" type="text" maxLength={120} value={form.contact_person} onChange={onInput} placeholder="John Smith" className={INPUT} />
          </Row>
          <Row label="Designation" htmlFor="contact_designation_id">
            <select id="contact_designation_id" name="contact_designation_id" value={form.contact_designation_id} onChange={onInput} className={INPUT}>
              <option value="">— Select —</option>{option(designations)}
            </select>
          </Row>
          <Row label="Email" htmlFor="email">
            <input id="email" name="email" type="email" maxLength={150} value={form.email} onChange={onInput} placeholder="john@abcfashion.com" className={INPUT} />
          </Row>
          <Row label="Mobile" htmlFor="mobile">
            <input id="mobile" name="mobile" type="text" maxLength={30} value={form.mobile} onChange={onInput} placeholder="+44 987654321" className={INPUT} />
          </Row>
          <Row label="GST / VAT No." htmlFor="gst_vat_no">
            <input id="gst_vat_no" name="gst_vat_no" type="text" maxLength={15} value={form.gst_vat_no} onChange={onInput} placeholder="33ABCDE1234F1Z5" className={`${INPUT} font-mono uppercase`} />
          </Row>
        </Section>

        {/* Secondary contact persons */}
        <Section title="Secondary Contact Person" icon="bi-people" subtitle="Optional — add as many as needed, beyond the contact person above.">
          <label className="flex items-center gap-2 text-sm mb-3">
            <input type="checkbox" checked={secondary} onChange={(e) => setSecondary(e.target.checked)} className="rounded border-gray-300" />
            Add a secondary contact person
          </label>
          {secondary && (
            <div>
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-left">
                    <tr><th className="px-2 py-2 font-medium">Name</th><th className="px-2 py-2 font-medium">Designation</th><th className="px-2 py-2 font-medium">Mobile</th><th className="px-2 py-2 font-medium">Email</th><th className="w-10"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {contacts.map((c, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5"><input type="text" maxLength={120} value={c.name} onChange={(e) => setContact(i, 'name', e.target.value)} placeholder="Full name" className={INPUT} /></td>
                        <td className="px-2 py-1.5"><select value={c.designation_id} onChange={(e) => setContact(i, 'designation_id', e.target.value)} className={INPUT}><option value="">— Select —</option>{option(designations)}</select></td>
                        <td className="px-2 py-1.5"><input type="text" maxLength={30} value={c.mobile} onChange={(e) => setContact(i, 'mobile', e.target.value)} placeholder="9876543210" className={INPUT} /></td>
                        <td className="px-2 py-1.5"><input type="email" maxLength={150} value={c.email} onChange={(e) => setContact(i, 'email', e.target.value)} placeholder="name@company.com" className={INPUT} /></td>
                        <td className="px-2 py-1.5 text-right"><button type="button" onClick={() => setContacts((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [{ ...EMPTY_CONTACT }]))} className="text-red-600 hover:text-red-800" title="Remove contact"><i className="bi bi-x-lg"></i></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => setContacts((rows) => [...rows, { ...EMPTY_CONTACT }])} className="mt-2 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"><i className="bi bi-plus-lg mr-1"></i>Add contact</button>
              <p className="mt-1 text-xs text-gray-500">Rows with no name are not saved.</p>
            </div>
          )}
        </Section>

        {/* I–N · Address & Destination */}
        <Section title="Address & Destination" icon="bi-geo-alt" subtitle="Prints on the export invoice and the packing list.">
          <Row label="Address" htmlFor="address">
            <textarea id="address" name="address" rows={2} maxLength={255} value={form.address} onChange={onInput} placeholder="12 Fashion Street" className={INPUT}></textarea>
          </Row>
          <Row label="Country" htmlFor="country_id">
            <select id="country_id" name="country_id" value={form.country_id} onChange={onCountry} className={INPUT}>
              <option value="">— Select —</option>{option(lookups.countries)}
            </select>
          </Row>
          <Row label="State" htmlFor="state_id">
            <select id="state_id" name="state_id" value={form.state_id} onChange={onState} disabled={!form.country_id} className={`${INPUT} disabled:bg-gray-50`}>
              <option value="">{form.country_id ? '— Select —' : 'Select a country first'}</option>{option(states)}
            </select>
          </Row>
          <Row label="City" htmlFor="city_id">
            <select id="city_id" name="city_id" value={form.city_id} onChange={onInput} disabled={!form.state_id} className={`${INPUT} disabled:bg-gray-50`}>
              <option value="">{form.state_id ? '— Select —' : 'Select a state first'}</option>{option(cities)}
            </select>
          </Row>
          <Row label="PIN / ZIP Code" htmlFor="pincode">
            <input id="pincode" name="pincode" type="text" maxLength={20} value={form.pincode} onChange={onInput} placeholder="EC1A1AA" className={`${INPUT} md:w-1/3`} />
          </Row>
          <Row label="Destination Port" htmlFor="port_id">
            <select id="port_id" name="port_id" value={form.port_id} onChange={onInput} className={INPUT}>
              <option value="">— Select —</option>{option(lookups.ports, (p) => (p.code ? `${p.name} (${p.code})` : p.name))}
            </select>
          </Row>
        </Section>

        {/* O–P · Agent */}
        <Section title="Agent" icon="bi-person-badge" subtitle="Optional — only agents marked as buyer-side are listed.">
          <Row label="Agent" htmlFor="agent_id" hint={toList(lookups.agents).length ? null : 'No buyer-side agents exist yet.'}>
            <select id="agent_id" name="agent_id" value={form.agent_id} onChange={onInput} className={INPUT}>
              <option value="">— None —</option>{option(lookups.agents, (a) => (a.display_code ? `${a.name} (${a.display_code})` : a.name))}
            </select>
          </Row>
          <Row label="Agent Commission" htmlFor="agent_commission_value">
            <div className="flex gap-2">
              <input id="agent_commission_value" name="agent_commission_value" type="number" step="0.0001" min="0" value={form.agent_commission_value} onChange={onInput} placeholder="0.0000" className={INPUT} />
              <select name="agent_commission_type" value={form.agent_commission_type} onChange={onInput} className={`${INPUT} max-w-[160px]`}>
                <option value="percent">% Percent</option>
                <option value="amount">Fixed amount</option>
              </select>
            </div>
          </Row>
        </Section>

        {/* Q–T · Trade Terms */}
        <Section title="Trade Terms" icon="bi-file-earmark-text" subtitle="Defaults copied onto this buyer's quotations and order confirmations.">
          <Row label="Payment Terms" htmlFor="payment_term_id">
            <select id="payment_term_id" name="payment_term_id" value={form.payment_term_id} onChange={onInput} className={INPUT}>
              <option value="">— Select —</option>{option(lookups.paymentTerms)}
            </select>
          </Row>
          {splitVisible && (
            <Row label="Advance / At Sight Split" required>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <input name="advance_percent" type="number" step="0.01" min="0.01" max="99.99" value={form.advance_percent} onChange={onInput} aria-label="Advance percentage" className={`${INPUT} w-28`} />
                <span className="text-gray-500">% advance +</span>
                <input name="sight_percent" type="number" step="0.01" min="0.01" max="99.99" value={form.sight_percent} onChange={onInput} aria-label="At-sight percentage" className={`${INPUT} w-28`} />
                <span className="text-gray-500">% at sight</span>
                <span className={`text-xs ${Math.round(splitTotal * 100) === 10000 ? 'text-green-700' : 'text-red-600'}`}>= {splitTotal.toFixed(2)}% (must be 100)</span>
              </div>
            </Row>
          )}
          <Row label="Default Inco Term" htmlFor="incoterm_id">
            <select id="incoterm_id" name="incoterm_id" value={form.incoterm_id} onChange={onInput} className={INPUT}>
              <option value="">— Select —</option>{option(lookups.incoterms, (i) => `${i.code} — ${i.name}`)}
            </select>
          </Row>
          <Row label="Shipment Method" htmlFor="shipment_method_id">
            <select id="shipment_method_id" name="shipment_method_id" value={form.shipment_method_id} onChange={onInput} className={INPUT}>
              <option value="">— Select —</option>{option(lookups.shipmentMethods)}
            </select>
          </Row>
          <Row label="Default Currency" htmlFor="currency_id">
            <select id="currency_id" name="currency_id" value={form.currency_id} onChange={onInput} className={INPUT}>
              <option value="">— Select —</option>{option(lookups.currencies, (c) => `${c.iso_code} — ${c.name}`)}
            </select>
          </Row>
        </Section>

        {/* U–W · Bank Details */}
        <Section title="Bank Details" icon="bi-bank" subtitle="Where this buyer remits payment from.">
          <Row label="Bank Name" htmlFor="bank_name"><input id="bank_name" name="bank_name" type="text" maxLength={120} value={form.bank_name} onChange={onInput} placeholder="HSBC UK" className={INPUT} /></Row>
          <Row label="Account Number" htmlFor="account_number"><input id="account_number" name="account_number" type="text" maxLength={40} value={form.account_number} onChange={onInput} placeholder="12345678" className={INPUT} /></Row>
          <Row label="SWIFT Code" htmlFor="swift_code"><input id="swift_code" name="swift_code" type="text" maxLength={20} value={form.swift_code} onChange={onInput} placeholder="HBUKGB4B" className={`${INPUT} uppercase`} /></Row>
        </Section>

        {/* X · Carton Marking Details */}
        <Section title="Carton Marking Details" icon="bi-box-seam" subtitle="Enter each line as it should appear on the carton / shipping marks.">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              {carton.map((line, i) => (
                <div key={i} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <input type="text" maxLength={60} value={line.label} onChange={(e) => setCartonLine(i, 'label', e.target.value)} placeholder="LINE LABEL" aria-label="Line label" className="text-xs font-semibold uppercase tracking-wide text-gray-600 border-0 border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-500 px-0" />
                    <button type="button" onClick={() => setCarton((rows) => rows.filter((_, idx) => idx !== i))} className="text-red-600 hover:text-red-800 text-sm" title="Remove line"><i className="bi bi-x-lg"></i></button>
                  </div>
                  <input type="text" maxLength={120} value={line.value} onChange={(e) => setCartonLine(i, 'value', e.target.value)} placeholder={DEFAULT_CARTON_LINES[i]?.placeholder || 'e.g. MADE IN INDIA'} aria-label="Line value" className={INPUT} />
                </div>
              ))}
              <button type="button" onClick={() => setCarton((rows) => [...rows, { label: '', value: '' }])} className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"><i className="bi bi-plus-lg mr-1"></i>Add line</button>
              <p className="mt-1 text-xs text-gray-500">Blank lines are not saved.</p>
            </div>
            <div className="lg:col-span-5">
              <div className="border border-gray-300 rounded-md bg-amber-50/40">
                <div className="px-3 py-1.5 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">Live preview</div>
                <pre className="p-3 m-0 text-sm font-mono whitespace-pre-wrap text-gray-800">{carton.filter((l) => l.value.trim()).map((l) => l.value.trim()).join('\n') || '—'}</pre>
              </div>
            </div>
          </div>
        </Section>

        {/* Other Details */}
        <Section title="Other Details" icon="bi-card-text">
          <Row label="Status" required htmlFor="status">
            <select id="status" name="status" value={form.status} onChange={onInput} required className={`${INPUT} md:w-1/3`}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Row>
          <Row label="Remarks" htmlFor="remarks"><textarea id="remarks" name="remarks" rows={2} maxLength={1000} value={form.remarks} onChange={onInput} placeholder="Optional notes" className={INPUT}></textarea></Row>
          <Row label="Comments" htmlFor="comments"><textarea id="comments" name="comments" rows={2} maxLength={1000} value={form.comments} onChange={onInput} placeholder="Optional comments" className={INPUT}></textarea></Row>
        </Section>

        </div>
        <div className="bg-gray-50 px-6 py-4 flex items-center gap-2 border-t border-gray-200">
          <button type="submit" disabled={saving}
            className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}>
            <i className="bi bi-check-lg mr-1"></i> {buyerId ? 'Update' : 'Save'} Buyer
          </button>
          <Link href={API} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 no-underline">Cancel</Link>
        </div>
      </form>
      </div>
    </DashboardLayout>
  );
}

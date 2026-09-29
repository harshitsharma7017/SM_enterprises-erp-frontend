'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CompanySelect from '@/components/company/CompanySelect';
import SearchMultiSelect from '@/components/masters/suppliers/SearchMultiSelect';
import { Section, Row, toList } from '@/components/masters/shared/MasterFormParts';
import { apiClient } from '@/lib/api-client';

const MONO = 'font-mono uppercase';

/** Guru Traders' Supplier / Jobber master form (resources/views/masters/{suppliers,jobbers}/_form.blade.php). */
const KINDS = {
  supplier: {
    api: '/masters/suppliers',
    route: '/masters/suppliers',
    noun: 'Supplier',
    codePlaceholder: 'SUP01',
    codeHint: 'Up to 5 characters. Must be unique.',
    typeLabel: 'Supplier Type',
    defaultDelivery: 'to_office',
  },
  jobber: {
    api: '/masters/jobbers',
    route: '/masters/jobbers',
    noun: 'Jobber',
    codePlaceholder: 'JOB01',
    codeHint: 'Short code used on orders and reports. Unique across all suppliers and jobbers.',
    typeLabel: 'Jobber Type',
    defaultDelivery: 'direct_to_port',
  },
};

const EMPTY_CONTACT = { name: '', designation_id: '', mobile: '', email: '' };

export default function PartyForm({ kind = 'supplier', id = null }) {
  const k = KINDS[kind];
  const isJobber = kind === 'jobber';
  const router = useRouter();
  const [lookups, setLookups] = useState({ partyTypes: {}, deliveryModes: {}, supplierTypes: [], designations: [], categories: [], agents: [], countries: [], states: [], cities: [], products: [], buyers: [] });
  const [form, setForm] = useState(null);
  const [contacts, setContacts] = useState([{ ...EMPTY_CONTACT }]);
  const [secondary, setSecondary] = useState(false);
  const [originalCode, setOriginalCode] = useState('');
  const [codeState, setCodeState] = useState(null);
  const [newType, setNewType] = useState('');
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const codeTimer = useRef(null);

  const recordKey = isJobber ? 'jobber' : 'supplier';

  /** Form data for a country / state (the cascade re-fetches with the parent chosen). */
  const loadLookups = useCallback(async (countryId, stateId, partyType) => {
    const params = new URLSearchParams();
    if (countryId !== undefined) params.append('country_id', countryId || '');
    if (stateId) params.append('state_id', stateId);
    if (!isJobber && partyType) params.append('party_type', partyType);
    const res = await apiClient.get(`${k.api}/${id ? `${id}/edit` : 'create'}?${params}`);
    return res.data || {};
  }, [k.api, id, isJobber]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await loadLookups(undefined, undefined, undefined);
        if (!mounted) return;
        const rec = data[recordKey];
        setLookups((prev) => ({ ...prev, ...data }));
        if (rec) {
          const primary = (rec.contacts || []).find((c) => c.is_primary);
          const extra = (rec.contacts || []).filter((c) => !c.is_primary).map((c) => ({ name: c.name || '', designation_id: c.designation_id || '', mobile: c.mobile || '', email: c.email || '' }));
          setContacts(extra.length ? extra : [{ ...EMPTY_CONTACT }]);
          setSecondary(extra.length > 0);
          setOriginalCode((rec.display_code || '').toUpperCase());
          // States / cities of the saved address.
          if (rec.country_id) {
            const geo = await loadLookups(rec.country_id, rec.state_id, rec.party_type);
            if (mounted) setLookups((prev) => ({ ...prev, states: geo.states || [], cities: geo.cities || [] }));
          }
          setForm({
            company_id: rec.company_id ?? '',
            display_code: rec.display_code || '',
            party_type: rec.party_type || (isJobber ? 'jobber' : 'supplier'),
            company_name: rec.company_name || '',
            name_on_bill: rec.name_on_bill || '',
            category_ids: (rec.categories || []).map((c) => c.id),
            product_ids: (rec.products || []).map((p) => p.id),
            supplier_type_id: rec.supplier_type_id ?? '',
            gst_number: rec.gst_number || '',
            pan_number: rec.pan_number || '',
            is_msme: !!rec.is_msme,
            msme_registration_no: rec.msme_registration_no || '',
            contact_name: primary?.name || '',
            contact_designation_id: primary?.designation_id ?? '',
            contact_email: primary?.email || '',
            contact_mobile: primary?.mobile || '',
            address: rec.address || '',
            country_id: rec.country_id ?? '',
            state_id: rec.state_id ?? '',
            city_id: rec.city_id ?? '',
            pincode: rec.pincode || '',
            discount_percent: rec.discount_percent ?? '',
            credit_days: rec.credit_days ?? '',
            we_supply_material: !!rec.we_supply_material,
            requires_sample_approval: !!rec.requires_sample_approval,
            buyer_ids: (rec.buyers || []).map((b) => b.id),
            client_details: rec.client_details || '',
            default_delivery_mode: rec.default_delivery_mode || k.defaultDelivery,
            bank_name: rec.bank_name || '',
            account_number: rec.account_number || '',
            ifsc_code: rec.ifsc_code || '',
            agent_id: rec.agent_id ?? '',
            agent_commission_value: rec.agent_commission_value ?? '',
            agent_commission_type: rec.agent_commission_type || 'percent',
            status: rec.status || 'active',
            remarks: rec.remarks || '',
            comments: rec.comments || '',
          });
        } else {
          // Change request #4 — the country defaults to India.
          setForm({
            company_id: '', display_code: '', party_type: isJobber ? 'jobber' : 'supplier', company_name: '', name_on_bill: '',
            category_ids: [], product_ids: [], supplier_type_id: '', gst_number: '', pan_number: '', is_msme: false, msme_registration_no: '',
            contact_name: '', contact_designation_id: '', contact_email: '', contact_mobile: '',
            address: '', country_id: data.indiaCountryId ?? '', state_id: '', city_id: '', pincode: '',
            discount_percent: '', credit_days: '', we_supply_material: isJobber, requires_sample_approval: false,
            buyer_ids: [], client_details: '', default_delivery_mode: k.defaultDelivery,
            bank_name: '', account_number: '', ifsc_code: '', agent_id: '', agent_commission_value: '', agent_commission_type: 'percent',
            status: 'active', remarks: '', comments: '',
          });
        }
      } catch (err) {
        if (mounted) setErrors([err.message || `Failed to load the ${k.noun.toLowerCase()} form`]);
      }
    })();
    return () => { mounted = false; };
  }, [loadLookups, recordKey, isJobber, k.defaultDelivery, k.noun]);

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const onInput = (e) => {
    const { name, type, value, checked } = e.target;
    set(name, type === 'checkbox' ? checked : value);
  };

  const supplierTypes = toList(lookups.supplierTypes);
  const registered = supplierTypes.find((t) => String(t.id) === String(form?.supplier_type_id))?.is_registered === 1
    || supplierTypes.find((t) => String(t.id) === String(form?.supplier_type_id))?.is_registered === true;

  // Col E — the GST number only applies to a registered type; switching away clears it.
  const changeType = (value) => {
    const type = supplierTypes.find((t) => String(t.id) === String(value));
    setForm((prev) => ({ ...prev, supplier_type_id: value, gst_number: type && type.is_registered ? prev.gst_number : '' }));
  };

  // Typing a name not already in the list adds it (same quick-add as the original's create-url).
  const addType = async () => {
    const name = newType.trim();
    if (!name) return;
    try {
      const created = await apiClient.post('/masters/suppliers/supplier-types', { name });
      setLookups((prev) => ({ ...prev, supplierTypes: toList(prev.supplierTypes).some((t) => t.id === created.id) ? prev.supplierTypes : [...toList(prev.supplierTypes), { id: created.id, name: created.name, is_registered: 0 }] }));
      changeType(created.id);
      setNewType('');
    } catch (err) {
      setErrors([err.message || 'Could not add the type']);
    }
  };

  const changeCountry = async (value) => {
    setForm((prev) => ({ ...prev, country_id: value, state_id: '', city_id: '' }));
    const data = value ? await loadLookups(value, '', form.party_type) : { states: [], cities: [] };
    setLookups((prev) => ({ ...prev, states: data.states || [], cities: [] }));
  };
  const changeState = async (value) => {
    setForm((prev) => ({ ...prev, state_id: value, city_id: '' }));
    const data = value ? await loadLookups(form.country_id, value, form.party_type) : { cities: [] };
    setLookups((prev) => ({ ...prev, cities: data.cities || [] }));
  };

  // The agent list follows the party type (a jobber's agent comes from the jobber side).
  const changePartyType = async (value) => {
    setForm((prev) => ({ ...prev, party_type: value, agent_id: '' }));
    try {
      const agents = await apiClient.get(`/masters/suppliers/agents?party_type=${value}`);
      setLookups((prev) => ({ ...prev, agents: Array.isArray(agents) ? agents : (agents.data || []) }));
    } catch {
      setLookups((prev) => ({ ...prev, agents: [] }));
    }
  };

  // Col A — "tell me if a certain code is used already" (the supplier form's live check).
  const changeCode = (value) => {
    set('display_code', value);
    if (isJobber) return;
    clearTimeout(codeTimer.current);
    const code = value.trim().toUpperCase();
    if (!code || code === originalCode) {
      setCodeState(null);
      return;
    }
    codeTimer.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ value: code });
        if (id) params.append('ignore', id);
        const res = await apiClient.get(`${k.api}/check-code?${params}`);
        setCodeState(res.available ? 'available' : 'taken');
      } catch {
        setCodeState(null);
      }
    }, 350);
  };

  const setContact = (index, name, value) => setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, [name]: value } : c)));
  const removeContact = (index) => setContacts((prev) => (prev.length === 1 ? [{ ...EMPTY_CONTACT }] : prev.filter((_, i) => i !== index)));
  const toggleSecondary = (checked) => {
    setSecondary(checked);
    if (!checked) setContacts([{ ...EMPTY_CONTACT }]);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const jobwork = isJobber || form.party_type === 'jobber' || form.party_type === 'both';
    const payload = {
      ...form,
      party_type: isJobber ? 'jobber' : form.party_type,
      gst_number: registered ? form.gst_number : '',
      msme_registration_no: form.is_msme ? form.msme_registration_no : '',
      contacts: secondary ? contacts : [],
      ...(isJobber ? {} : { product_ids: [], buyer_ids: [] }),
      ...(jobwork ? {} : { we_supply_material: false, requires_sample_approval: false, buyer_ids: [], client_details: '' }),
    };
    try {
      if (id) await apiClient.put(`${k.api}/${id}`, payload);
      else await apiClient.post(k.api, payload);
      router.push(k.route);
    } catch (err) {
      const list = err.response?.data?.errors;
      setErrors(Array.isArray(list) ? list : list ? Object.values(list).flat() : [err.message || `Failed to save the ${k.noun.toLowerCase()}`]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  };

  if (!form) {
    return <DashboardLayout>{errors.length ? <div className="alert alert-danger">{errors[0]}</div> : <div className="p-8 text-center text-fg-subtle">Loading form data…</div>}</DashboardLayout>;
  }

  const showJobwork = isJobber || form.party_type === 'jobber' || form.party_type === 'both';
  const designations = toList(lookups.designations);
  const agents = toList(lookups.agents);

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-fg m-0">{id ? `Edit ${k.noun}` : `Add ${k.noun}`}</h2>
      </div>

      <div className="bg-surface rounded-lg shadow-sm border border-[var(--card-border)] overflow-hidden">
      <form onSubmit={submit}>
        <div className="p-6">
        {errors.length > 0 && (
          <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded mb-4 text-sm">
            <ul className="list-disc pl-5 m-0">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}

        {/* A–C · Identification */}
        <Section title="Identification" icon={isJobber ? 'bi-tools' : 'bi-truck'} subtitle={isJobber ? 'Who the jobber is and their basic details.' : 'Who the party is, and whether we buy their labour or their goods.'}>
          <div>
            <Row label="Company" hint="Leave blank to share this party with both companies.">
              <CompanySelect value={form.company_id} onChange={onInput} emptyLabel="Shared (both companies)" />
            </Row>
            <Row label="Display Code" required htmlFor="display_code"
              hint={codeState === 'available' ? undefined : codeState === 'taken' ? undefined : k.codeHint}>
              <input id="display_code" type="text" maxLength={5} required value={form.display_code} onChange={(e) => changeCode(e.target.value)}
                autoComplete="off" placeholder={k.codePlaceholder}
                className={`form-input ${MONO} max-w-[220px] ${codeState === 'taken' ? 'border-red-500' : codeState === 'available' ? 'border-green-500' : ''}`} />
              {codeState === 'available' && <p className="text-xs text-green-600 mt-1 mb-0">Available.</p>}
              {codeState === 'taken' && <p className="text-xs text-[var(--danger)] mt-1 mb-0">Already used by another supplier — choose another.</p>}
            </Row>
            {!isJobber && (
              <Row label="Party Type" required htmlFor="party_type" hint="Jobwork means we supply the material and buy the making. Trading means we buy finished goods.">
                <select id="party_type" value={form.party_type} onChange={(e) => changePartyType(e.target.value)} required className="form-select">
                  {Object.entries(lookups.partyTypes || {}).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Row>
            )}
            <Row label="Company Name" required htmlFor="company_name">
              <input id="company_name" name="company_name" type="text" required maxLength={isJobber ? 150 : 200} value={form.company_name} onChange={onInput}
                placeholder={isJobber ? 'e.g. Tirupur Jobwork Crafts' : 'Sri Garments'} className="form-input" />
            </Row>
            <Row label="Name on Bill" htmlFor="name_on_bill" hint={isJobber ? 'Leave blank if identical to company name.' : 'Leave blank to use the company name.'}>
              <input id="name_on_bill" name="name_on_bill" type="text" maxLength={isJobber ? 150 : 200} value={form.name_on_bill} onChange={onInput}
                placeholder={isJobber ? 'Name as it appears on bills' : 'Exactly as it prints on their invoice'} className="form-input" />
            </Row>
            <Row label="Product Category" required={isJobber} hint={isJobber ? undefined : 'A jobber usually makes one category; a trading supplier one or two.'}>
              <SearchMultiSelect options={toList(lookups.categories)} value={form.category_ids} onChange={(v) => set('category_ids', v)}
                placeholder={isJobber ? 'Search and select categories…' : 'Search categories…'} />
            </Row>
            {isJobber && (
              <Row label="Product">
                <SearchMultiSelect options={toList(lookups.products).map((p) => ({ id: p.id, name: p.name }))} value={form.product_ids} onChange={(v) => set('product_ids', v)} placeholder="Search products…" />
              </Row>
            )}
          </div>
        </Section>

        {/* D–G · Tax & Registration */}
        <Section title={isJobber ? 'Registration' : 'Tax & Registration'} icon={isJobber ? 'bi-card-heading' : 'bi-file-earmark-check'} subtitle={isJobber ? undefined : 'Decides what can be claimed on their purchase bill.'}>
          <div>
            <Row label={k.typeLabel} required={isJobber} htmlFor="supplier_type_id" hint={isJobber ? undefined : 'Registered types are asked for a GST number.'}>
              <select id="supplier_type_id" value={form.supplier_type_id} onChange={(e) => changeType(e.target.value)} required={isJobber} className="form-select">
                <option value="">— Select —</option>
                {supplierTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="flex gap-2 mt-2">
                <input type="text" value={newType} onChange={(e) => setNewType(e.target.value)} maxLength={80} placeholder="Or type a new type to add it…" className={`form-input max-w-xs`}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addType(); } }} />
                <button type="button" onClick={addType} disabled={!newType.trim()} className="px-3 py-1.5 border border-line-strong rounded text-sm text-fg-muted hover:bg-surface-hover disabled:opacity-50"><i className="bi bi-plus-lg"></i> Add</button>
              </div>
            </Row>
            {registered && (
              <Row label="GST Number" required={!isJobber} htmlFor="gst_number" hint={isJobber ? undefined : '15 characters. Contains the PAN below at positions 3–12.'}>
                <input id="gst_number" name="gst_number" type="text" maxLength={15} value={form.gst_number} onChange={onInput} autoComplete="off"
                  placeholder={isJobber ? '33AAAAA0000A1Z5' : '33ABCDE1234F1Z5'} className={`form-input ${MONO} ${isJobber ? 'max-w-[260px]' : ''}`} />
              </Row>
            )}
            <Row label="PAN Number" htmlFor="pan_number">
              <input id="pan_number" name="pan_number" type="text" maxLength={10} value={form.pan_number} onChange={onInput}
                placeholder={isJobber ? 'AAAAA0000A' : 'ABCDE1234F'} className={`form-input ${MONO}`} />
            </Row>
            <Row label="MSME">
              <label className="inline-flex items-center gap-2 pt-2 text-sm text-fg-muted">
                <input type="checkbox" name="is_msme" checked={form.is_msme} onChange={onInput} className="rounded border-line-strong" />
                {isJobber ? 'Registered under MSME / Udyam' : 'This supplier is MSME registered'}
              </label>
            </Row>
            {form.is_msme && (
              <Row label="MSME Registration No" required htmlFor="msme_registration_no" hint={isJobber ? undefined : 'MSME dues carry a statutory 45-day payment limit — this drives that check later.'}>
                <input id="msme_registration_no" name="msme_registration_no" type="text" maxLength={40} value={form.msme_registration_no} onChange={onInput}
                  autoComplete="off" placeholder="UDYAM-TN-33-0001234" className={`form-input ${MONO} ${isJobber ? 'max-w-[260px]' : ''}`} />
              </Row>
            )}
          </div>
        </Section>

        {/* H–K · Primary contact */}
        {isJobber ? (
          <Section title="Contact Persons" icon="bi-people">
            <div className="p-3 bg-surface-raised rounded border">
              <div className="text-xs font-semibold text-fg-subtle uppercase mb-2">Primary Contact</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs text-fg-subtle mb-1">Name <span className="text-[var(--danger)]">*</span></label>
                  <input name="contact_name" type="text" required value={form.contact_name} onChange={onInput} placeholder="Contact Name" className="form-input" />
                </div>
                <div>
                  <label className="block text-xs text-fg-subtle mb-1">Designation</label>
                  <select name="contact_designation_id" value={form.contact_designation_id} onChange={onInput} className="form-select">
                    <option value="">Select…</option>
                    {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-fg-subtle mb-1">Mobile <span className="text-[var(--danger)]">*</span></label>
                  <input name="contact_mobile" type="text" required value={form.contact_mobile} onChange={onInput} placeholder="9876543210" className="form-input" />
                </div>
                <div>
                  <label className="block text-xs text-fg-subtle mb-1">Email</label>
                  <input name="contact_email" type="email" value={form.contact_email} onChange={onInput} placeholder="contact@jobber.com" className="form-input" />
                </div>
              </div>
            </div>
          </Section>
        ) : (
          <Section title="Primary Contact" icon="bi-person-lines-fill" subtitle="The person we deal with. Saved alongside the extra contacts below.">
            <div>
              <Row label="Name" htmlFor="contact_name"><input id="contact_name" name="contact_name" type="text" maxLength={120} value={form.contact_name} onChange={onInput} placeholder="Ramesh" className="form-input" /></Row>
              <Row label="Designation" htmlFor="contact_designation_id">
                <select id="contact_designation_id" name="contact_designation_id" value={form.contact_designation_id} onChange={onInput} className="form-select">
                  <option value="">Search designation…</option>
                  {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Row>
              <Row label="Email" htmlFor="contact_email"><input id="contact_email" name="contact_email" type="email" maxLength={150} value={form.contact_email} onChange={onInput} placeholder="ramesh@srigarments.com" className="form-input" /></Row>
              <Row label="Mobile" htmlFor="contact_mobile"><input id="contact_mobile" name="contact_mobile" type="text" maxLength={30} value={form.contact_mobile} onChange={onInput} placeholder="9876543210" className="form-input" /></Row>
            </div>
          </Section>
        )}

        {/* L · Secondary contact persons */}
        <Section title="Secondary Contact Person" icon="bi-people" subtitle={isJobber ? 'Optional — add as many as needed, beyond the primary contact above.' : 'Sheet col L — name, designation and phone number for each additional person.'}>
          <label className="inline-flex items-center gap-2 mb-3 text-sm text-fg-muted">
            <input type="checkbox" checked={secondary} onChange={(e) => toggleSecondary(e.target.checked)} className="rounded border-line-strong" />
            Add a secondary contact person
          </label>
          {secondary && (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Designation</th><th>Mobile</th><th>Email</th><th className="w-8"></th></tr></thead>
                <tbody>
                  {contacts.map((c, i) => (
                    <tr key={i}>
                      <td className="pr-2"><input type="text" maxLength={120} value={c.name} onChange={(e) => setContact(i, 'name', e.target.value)} placeholder="Full name" aria-label="Contact name" className="form-input" /></td>
                      <td className="pr-2">
                        <select value={c.designation_id} onChange={(e) => setContact(i, 'designation_id', e.target.value)} aria-label="Designation" className="form-select">
                          <option value="">— Select —</option>
                          {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </td>
                      <td className="pr-2"><input type="text" maxLength={30} value={c.mobile} onChange={(e) => setContact(i, 'mobile', e.target.value)} placeholder="9876543210" aria-label="Mobile" className="form-input" /></td>
                      <td className="pr-2"><input type="email" maxLength={150} value={c.email} onChange={(e) => setContact(i, 'email', e.target.value)} placeholder="name@company.com" aria-label="Email" className="form-input" /></td>
                      <td className="text-right"><button type="button" onClick={() => removeContact(i)} className="text-[var(--danger)] hover:text-[var(--danger)]" aria-label="Remove contact" title="Remove contact"><i className="bi bi-x-lg"></i></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={() => setContacts((prev) => [...prev, { ...EMPTY_CONTACT }])} className="mt-2 px-3 py-1 border border-line-strong rounded text-sm text-fg-muted hover:bg-surface-hover"><i className="bi bi-plus-lg me-1"></i>Add contact</button>
              <p className="text-xs text-fg-subtle mt-1 mb-0">Rows with no name are not saved.</p>
            </div>
          )}
        </Section>

        {/* M–Q · Address */}
        <Section title={isJobber ? 'Address & Location' : 'Address'} icon="bi-geo-alt" subtitle={isJobber ? undefined : 'Prints on the purchase order and the material issue note.'}>
          <div>
            <Row label="Address" htmlFor="address">
              <textarea id="address" name="address" rows={2} maxLength={255} value={form.address} onChange={onInput} placeholder={isJobber ? 'Factory / Office address' : '12 SIPCOT'} className="form-textarea"></textarea>
            </Row>
            <Row label="Country" htmlFor="country_id">
              <select id="country_id" value={form.country_id} onChange={(e) => changeCountry(e.target.value)} className="form-select">
                <option value="">Search country…</option>
                {toList(lookups.countries).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Row>
            <Row label="State" htmlFor="state_id">
              <select id="state_id" value={form.state_id} onChange={(e) => changeState(e.target.value)} disabled={!form.country_id} className="form-select">
                <option value="">{form.country_id ? 'Search state…' : 'Select a country first'}</option>
                {toList(lookups.states).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Row>
            <Row label="City" htmlFor="city_id">
              <select id="city_id" name="city_id" value={form.city_id} onChange={onInput} disabled={!form.state_id} className="form-select">
                <option value="">{form.state_id ? 'Search city…' : 'Select a state first'}</option>
                {toList(lookups.cities).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Row>
            <Row label="PIN Code" htmlFor="pincode">
              <input id="pincode" name="pincode" type="text" maxLength={isJobber ? 10 : 20} value={form.pincode} onChange={onInput} placeholder="641601" className={`form-input ${isJobber ? 'font-mono' : ''}`} />
            </Row>
          </div>
        </Section>

        {/* S–T · Trade terms */}
        <Section title="Trade Terms" icon="bi-percent" subtitle={isJobber ? undefined : 'Their discount and credit period. The discount feeds the cost build-up on a quotation.'}>
          <div>
            <Row label="Discount %" htmlFor="discount_percent" hint={isJobber ? undefined : 'Taken off their rate before our markup is added.'}>
              <div className="flex items-center gap-2 max-w-[220px]">
                <input id="discount_percent" name="discount_percent" type="number" step="0.01" min="0" max="99.99" value={form.discount_percent} onChange={onInput} placeholder="0.00" className="form-input" />
                <span className="text-sm text-fg-subtle">%</span>
              </div>
            </Row>
            <Row label="Credit Terms" htmlFor="credit_days" hint={isJobber ? undefined : 'Enter 0 for payment on dispatch. Trading suppliers are usually 30–45.'}>
              <div className="flex items-center gap-2 max-w-[220px]">
                <input id="credit_days" name="credit_days" type="number" step="1" min="0" max="999" value={form.credit_days} onChange={onInput} placeholder="45" className="form-input" />
                <span className="text-sm text-fg-subtle">days</span>
              </div>
            </Row>
          </div>
        </Section>

        {/* Jobwork */}
        {showJobwork && (
          <Section title={isJobber ? 'Jobwork Options' : 'Jobwork'} icon="bi-tools" subtitle={isJobber ? undefined : 'Applies to a jobber. We supply the material and buy the making.'}>
            <div>
              <Row label="Material" hint={isJobber ? undefined : 'Switches on Material Issue against this party.'}>
                <label className="inline-flex items-center gap-2 pt-2 text-sm text-fg-muted">
                  <input type="checkbox" name="we_supply_material" checked={form.we_supply_material} onChange={onInput} className="rounded border-line-strong" />
                  We supply the material — fabric, trims, labels, packing
                </label>
              </Row>
              <Row label="Sample">
                <label className="inline-flex items-center gap-2 pt-2 text-sm text-fg-muted">
                  <input type="checkbox" name="requires_sample_approval" checked={form.requires_sample_approval} onChange={onInput} className="rounded border-line-strong" />
                  A sample must be approved before a PO is raised
                </label>
              </Row>
              {isJobber && (
                <>
                  <Row label="Buyer(s)" hint="Who this jobwork is ultimately for — one or more buyers from the Buyer master.">
                    <SearchMultiSelect options={toList(lookups.buyers).map((b) => ({ id: b.id, name: b.display_code ? `${b.company_name} (${b.display_code})` : (b.company_name || b.name) }))}
                      value={form.buyer_ids} onChange={(v) => set('buyer_ids', v)} placeholder="Search and select buyers…" />
                  </Row>
                  <Row label="Buyer Details" htmlFor="client_details">
                    <textarea id="client_details" name="client_details" rows={3} maxLength={2000} value={form.client_details} onChange={onInput} placeholder="Optional — address, contact, or anything else worth recording" className="form-textarea"></textarea>
                  </Row>
                </>
              )}
            </div>
          </Section>
        )}

        {/* Delivery */}
        <Section title="Delivery" icon="bi-box-arrow-right">
          <Row label="Default Delivery Mode" required htmlFor="default_delivery_mode" hint={isJobber ? undefined : 'Jobwork usually ships direct to port; trading goods come to the office to be repacked.'}>
            <select id="default_delivery_mode" name="default_delivery_mode" value={form.default_delivery_mode} onChange={onInput} required className="form-select">
              {Object.entries(lookups.deliveryModes || {}).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Row>
        </Section>

        {/* U–W · Bank details */}
        <Section title="Bank Details" icon="bi-bank" subtitle={isJobber ? undefined : 'Where we remit their payment.'}>
          <div>
            <Row label="Bank Name" htmlFor="bank_name"><input id="bank_name" name="bank_name" type="text" maxLength={120} value={form.bank_name} onChange={onInput} placeholder={isJobber ? 'HDFC Bank' : 'HDFC Bank, Tiruppur'} className="form-input" /></Row>
            <Row label="Account Number" htmlFor="account_number"><input id="account_number" name="account_number" type="text" maxLength={40} value={form.account_number} onChange={onInput} placeholder="50100123456789" className={`form-input font-mono`} /></Row>
            <Row label="IFSC Code" htmlFor="ifsc_code"><input id="ifsc_code" name="ifsc_code" type="text" maxLength={11} value={form.ifsc_code} onChange={onInput} placeholder="HDFC0001234" className={`form-input ${MONO}`} /></Row>
          </div>
        </Section>

        {/* X–Y · Agent */}
        <Section title="Agent" icon="bi-person-badge" subtitle={isJobber ? undefined : 'Optional — the list follows the party type selected above.'}>
          <div>
            <Row label="Agent" htmlFor="agent_id" hint={!isJobber && agents.length === 0 ? 'No agents exist on this side yet.' : undefined}>
              <select id="agent_id" name="agent_id" value={form.agent_id} onChange={onInput} className="form-select">
                <option value="">Search agent…</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Row>
            <Row label="Agent Commission" htmlFor="agent_commission_value"
              hint={isJobber ? '"Fixed amount / piece" feeds the per-piece × quantity commission shown on this jobber\'s Purchase Orders.' : 'This supplier\'s rate for this agent. The same agent can carry a different rate for another supplier.'}>
              <div className="flex gap-2">
                <input id="agent_commission_value" name="agent_commission_value" type="number" step="0.0001" min="0" value={form.agent_commission_value} onChange={onInput} placeholder="0.0000" className="form-input" />
                <select name="agent_commission_type" value={form.agent_commission_type} onChange={onInput} className="form-select">
                  <option value="percent">% Percent</option>
                  <option value="amount">{isJobber ? 'Fixed amount / piece' : 'Fixed amount (INR)'}</option>
                </select>
              </div>
            </Row>
          </div>
        </Section>

        {/* Z, AA · Other */}
        <Section title="Other Details" icon="bi-card-text">
          <div>
            <Row label="Status" required htmlFor="status">
              <select id="status" name="status" value={form.status} onChange={onInput} required className="form-select">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Row>
            <Row label="Remarks" htmlFor="remarks"><textarea id="remarks" name="remarks" rows={2} maxLength={1000} value={form.remarks} onChange={onInput} placeholder="Optional notes" className="form-textarea"></textarea></Row>
            <Row label="Comments" htmlFor="comments"><textarea id="comments" name="comments" rows={2} maxLength={1000} value={form.comments} onChange={onInput} placeholder="Optional comments" className="form-textarea"></textarea></Row>
          </div>
        </Section>

        </div>
        <div className="bg-surface-raised px-6 py-4 flex items-center gap-2 border-t border-line">
          <button type="submit" disabled={saving}
            className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--focus-ring)] ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}>
            <i className="bi bi-check-lg mr-1"></i> {id ? 'Update' : 'Save'} {k.noun}
          </button>
          <Link href={k.route} className="inline-flex items-center px-4 py-2 border border-line-strong shadow-sm text-sm font-medium rounded-md text-fg-muted bg-surface hover:bg-surface-hover no-underline">Cancel</Link>
        </div>
      </form>
      </div>
    </DashboardLayout>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import FormSection from '@/components/ui/FormSection';
import ItemsEditor from '@/components/sales/shared/ItemsEditor';
import { itemFromServer, itemToPayload, blankItem } from '@/components/sales/shared/itemsHelpers';
import { toDateInputValue, todayDateInputValue } from '@/components/sales/shared/format';

const emptyHeader = {
  mode: 'oc',
  oc_date: todayDateInputValue(),
  buyer_ref: '',
  buyer_id: '',
  category_id: '',
  document_format_id: '',
  agent_id: '',
  agent_commission_type: '',
  agent_commission_value: '',
  currency_id: '',
  incoterm: 'FOB',
  ship_method: 'Sea',
  shipment_date: '',
  pol: '',
  pod: '',
  payment_terms: '',
  delivery_details: '',
  packing_details: '',
  remarks: '',
  status: 'draft',
};

export default function OcForm({ ocId = null }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [lookupBlocked, setLookupBlocked] = useState(false);

  const [buyers, setBuyers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formats, setFormats] = useState([]);
  const [agents, setAgents] = useState([]);
  const [fobValues, setFobValues] = useState([]);
  const [currencies, setCurrencies] = useState([]);

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [formData, setFormData] = useState(emptyHeader);
  const [items, setItems] = useState([blankItem()]);
  const [ocNum, setOcNum] = useState('');
  const [sourceInquiryNo, setSourceInquiryNo] = useState('');

  // GET /sales/order-confirmations/create is a stub with no lookup data (backend
  // gap — see final report). We reuse Inquiry's bundle, which requires
  // inquiry.create; a user with only order-confirmation.create cannot populate
  // this form's dropdowns today.
  const fetchLookups = useCallback(async () => {
    try {
      const res = await apiClient.get('/inquiries/create');
      if (res.success) {
        setBuyers(res.data.buyers || []);
        setCategories(res.data.categories || []);
        setFormats(res.data.formats || []);
        setAgents(res.data.agents || []);
        setFobValues(res.data.fobValues || []);
        setCurrencies(res.data.currencies || []);
      }
    } catch (err) {
      console.error('Failed to load OC form dropdowns', err);
      setLookupBlocked(true);
    }
  }, []);

  const fetchCascade = useCallback(async (categoryId) => {
    try {
      const params = categoryId ? `?category_id=${categoryId}` : '';
      const [productsRes, suppliersRes] = await Promise.all([
        apiClient.get(`/inquiries/products${params}`),
        apiClient.get(`/inquiries/suppliers${params}`),
      ]);
      setProducts(Array.isArray(productsRes) ? productsRes : []);
      setSuppliers(Array.isArray(suppliersRes) ? suppliersRes : []);
    } catch (err) {
      console.error('Failed to load product/supplier cascade', err);
    }
  }, []);

  const fetchOc = useCallback(async () => {
    try {
      const res = await apiClient.get(`/sales/order-confirmations/${ocId}/edit`);
      if (res.success) {
        const oc = res.data;
        setOcNum(oc.oc_num);
        setFormData({
          mode: oc.mode || 'oc',
          oc_date: toDateInputValue(oc.oc_date),
          buyer_ref: oc.buyer_ref || '',
          buyer_id: oc.buyer_id || '',
          category_id: oc.category_id || '',
          document_format_id: oc.document_format_id || '',
          agent_id: oc.agent_id || '',
          agent_commission_type: oc.agent_commission_type || '',
          agent_commission_value: oc.agent_commission_value ?? '',
          currency_id: oc.currency_id || '',
          incoterm: oc.incoterm || '',
          ship_method: oc.ship_method || '',
          shipment_date: oc.shipment_date || '',
          pol: oc.pol || '',
          pod: oc.pod || '',
          payment_terms: oc.payment_terms || '',
          delivery_details: oc.delivery_details || '',
          packing_details: oc.packing_details || '',
          remarks: oc.remarks || '',
          status: oc.status || 'draft',
        });
        setItems(oc.items && oc.items.length > 0 ? oc.items.map((it) => itemFromServer(it)) : [blankItem()]);
        if (oc.source_inquiry_id) {
          try {
            const inqRes = await apiClient.get(`/inquiries/${oc.source_inquiry_id}`);
            if (inqRes.success) setSourceInquiryNo(inqRes.data.inquiry.inquiry_no);
          } catch (e) { /* not fatal — display without the linked number */ }
        }
        if (oc.category_id) await fetchCascade(oc.category_id);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load Order Confirmation');
    } finally {
      setLoading(false);
    }
  }, [ocId, fetchCascade]);

  useEffect(() => {
    queueMicrotask(async () => {
      await fetchLookups();
      if (ocId) {
        await fetchOc();
      } else {
        setLoading(false);
      }
    });
  }, [ocId, fetchLookups, fetchOc]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBuyerChange = (e) => {
    const buyerId = e.target.value;
    const buyer = buyers.find((b) => String(b.id) === String(buyerId));
    setFormData((prev) => ({
      ...prev,
      buyer_id: buyerId,
      agent_id: buyer?.agent_id || '',
      agent_commission_type: buyer?.agent_commission_type || '',
      agent_commission_value: buyer?.agent_commission_value ?? '',
      currency_id: buyer?.currency_id || prev.currency_id,
    }));
  };

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    setFormData((prev) => ({ ...prev, category_id: categoryId }));
    fetchCascade(categoryId);
  };

  const handleFormatChange = (e) => {
    const formatId = e.target.value;
    const format = formats.find((f) => String(f.id) === String(formatId));
    setFormData((prev) => ({
      ...prev,
      document_format_id: formatId,
      delivery_details: prev.delivery_details || format?.delivery_details || '',
      packing_details: prev.packing_details || format?.packing_details || '',
    }));
  };

  const selectedFormat = formats.find((f) => String(f.id) === String(formData.document_format_id)) || null;
  const isDirect = formData.mode === 'direct';

  const submit = async (status) => {
    setSaving(true);
    setErrors([]);

    const payload = { ...formData, status };
    // Joi's numeric fields accept null but not '' — a blank <select> must become
    // null, not an empty string, or validation rejects e.g. an unset Agent.
    for (const key of ['agent_id', 'agent_commission_value', 'agent_commission_type']) {
      if (payload[key] === '') payload[key] = null;
    }
    if (isDirect) {
      delete payload.items;
    } else {
      payload.items = items.map(itemToPayload);
    }

    try {
      let res;
      if (ocId) {
        res = await apiClient.put(`/sales/order-confirmations/${ocId}`, payload);
      } else {
        res = await apiClient.post('/sales/order-confirmations', payload);
      }
      if (res.success) {
        router.push(`/sales/order-confirmations/${res.data.id}`);
      }
    } catch (err) {
      console.error(err);
      setErrors(err.data?.errors || [err.message || 'Failed to save Order Confirmation']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Loading form data...</div>;
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6 max-w-6xl">
      {lookupBlocked && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded p-3 text-sm">
          Could not load buyers/categories/formats/currencies for this form — the Order Confirmation module
          does not have its own dropdown-data endpoint, so this form reuses Inquiry&apos;s (requires the
          <code className="mx-1">inquiry.create</code> permission). Ask an administrator to grant it if this keeps happening.
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        </div>
      )}

      {sourceInquiryNo && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded p-3 text-sm">
          Converted from Inquiry <Link href={`/sales/inquiries`} className="font-medium underline">{sourceInquiryNo}</Link> — item data, sizes, colours &amp; costing pre-filled.
        </div>
      )}

      {ocId && formData.status === 'confirmed' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded p-3 text-sm">
          This OC is Confirmed — if Purchase Orders have already been raised for any items, re-saving items here
          may duplicate them (the API does not report which items are already raised). Verify before saving if unsure.
        </div>
      )}

      <FormSection title="Contract Identity" icon="bi-check2-square">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contract No.</label>
            <input type="text" readOnly value={ocId ? ocNum : 'GT/[buyer code]/[seq]/[FY]'} className="form-input w-full rounded border-gray-300 text-sm bg-gray-50 border-dashed text-gray-500" />
            <p className="text-[11px] text-gray-500 mt-1">Global running sequence</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select name="mode" value={formData.mode} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="oc">Order Confirmation</option>
              <option value="direct">Direct Buyer Contract</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">OC Date <span className="text-red-500">*</span></label>
            <input type="date" name="oc_date" required value={formData.oc_date} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buyer&apos;s Ref</label>
            <input type="text" name="buyer_ref" placeholder="Buyer's own PO/ref no." value={formData.buyer_ref} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buyer <span className="text-red-500">*</span></label>
            <select name="buyer_id" required value={formData.buyer_id} onChange={handleBuyerChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="">— Select —</option>
              {buyers.map((b) => <option key={b.id} value={b.id}>{b.company_name}{b.display_code ? ` (${b.display_code})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
            <select name="category_id" required value={formData.category_id} onChange={handleCategoryChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="">— Select —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Order Format <span className="text-red-500">*</span></label>
            <select name="document_format_id" required value={formData.document_format_id} onChange={handleFormatChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="">— Select —</option>
              {formats.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Format Type</label>
            <input type="text" readOnly value={selectedFormat?.module || ''} placeholder="— From Format —" className="form-input w-full rounded border-gray-300 text-sm bg-gray-50 border-dashed text-gray-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Agent</label>
            <select name="agent_id" value={formData.agent_id} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="">— Select —</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Commission Type</label>
            <select name="agent_commission_type" value={formData.agent_commission_type} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="">— Select —</option>
              <option value="percent">Percent</option>
              <option value="flat">Flat</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Commission</label>
            <input type="number" step="0.01" min="0" name="agent_commission_value" value={formData.agent_commission_value} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Currency <span className="text-red-500">*</span></label>
            <select name="currency_id" required value={formData.currency_id} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="">— Select —</option>
              {currencies.map((c) => <option key={c.id} value={c.id}>{c.iso_code} — {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Incoterm</label>
            <select name="incoterm" value={formData.incoterm} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
              {['FOB', 'CIF', 'CFR', 'EXW', 'DDP'].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </FormSection>

      <FormSection title="Shipment Details" icon="bi-truck" subtitle="→ Export Docs module">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ship Method</label>
            <select name="ship_method" value={formData.ship_method} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
              {['Sea', 'Air', 'Land', 'Courier'].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Shipment Month/Date</label>
            <input type="text" name="shipment_date" maxLength={60} placeholder="e.g. March 2026" value={formData.shipment_date} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">POL</label>
            <input type="text" name="pol" placeholder="e.g. Nhava Sheva, Mumbai" value={formData.pol} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">POD</label>
            <input type="text" name="pod" placeholder="e.g. Jebel Ali, Dubai" value={formData.pod} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Payment Terms</label>
            <input type="text" name="payment_terms" placeholder="e.g. 30 days AOV" value={formData.payment_terms} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
            <input type="text" name="remarks" value={formData.remarks} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
        </div>
      </FormSection>

      {isDirect ? (
        <FormSection title="Items" icon="bi-table">
          <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-600">
            Direct buyer contract — items are entered at PO stage. POs are raised against this contract number.
          </div>
        </FormSection>
      ) : (
        <FormSection title="Items" icon="bi-table">
          <ItemsEditor
            items={items}
            onChange={setItems}
            format={selectedFormat}
            products={products}
            suppliers={suppliers}
            fobValues={fobValues}
            variant="oc"
          />
        </FormSection>
      )}

      <FormSection title="Delivery & Packing Details" icon="bi-box-seam">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Details</label>
            <textarea name="delivery_details" rows={3} value={formData.delivery_details} onChange={handleChange} className="form-textarea w-full rounded border-gray-300 text-sm"></textarea>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Packing Details</label>
            <textarea name="packing_details" rows={3} value={formData.packing_details} onChange={handleChange} className="form-textarea w-full rounded border-gray-300 text-sm"></textarea>
          </div>
        </div>
      </FormSection>

      <FormSection title="Module Connections" icon="bi-diagram-3">
        <div className="flex flex-wrap gap-2">
          {['Buyer Master', 'Agent Master', 'Order Format', 'Purchase Orders (on Raise PO)'].map((m) => (
            <span key={m} className="px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-gray-700 text-sm">{m}</span>
          ))}
        </div>
      </FormSection>

      <div className="bg-white border rounded shadow-sm px-6 py-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-600">Status: <span className="font-semibold text-gray-900">{formData.status}</span></span>
        <div className="flex-1" />
        <Link href={ocId ? `/sales/order-confirmations/${ocId}` : '/sales/order-confirmations'} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm">
          Cancel
        </Link>
        <button type="button" disabled={saving} onClick={() => submit('draft')} className="px-4 py-2 border border-gray-400 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm disabled:opacity-50">
          Save Draft
        </button>
        <button type="button" disabled={saving} onClick={() => submit('sent')} className="px-4 py-2 border border-blue-400 text-blue-600 rounded hover:bg-blue-50 font-medium text-sm disabled:opacity-50">
          <i className="bi bi-send me-1"></i> Mark OC Sent
        </button>
        <button type="button" disabled={saving} onClick={() => submit('confirmed')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-50">
          <i className="bi bi-check-lg me-1"></i> {saving ? 'Saving…' : 'Buyer Confirmed'}
        </button>
      </div>
    </form>
  );
}

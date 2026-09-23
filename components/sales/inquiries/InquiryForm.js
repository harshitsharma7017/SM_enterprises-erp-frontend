'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import FormSection from '@/components/ui/FormSection';
import ItemsEditor from '@/components/sales/shared/ItemsEditor';
import { itemFromServer, itemToPayload, blankItem } from '@/components/sales/shared/itemsHelpers';
import { toDateInputValue, todayDateInputValue } from '@/components/sales/shared/format';

const STATUS_LABELS = {
  draft: 'Draft',
  price_working: 'Price Working',
  quote_sent: 'Quote Sent',
  confirmed: 'Confirmed',
  converted_to_oc: 'Converted to OC',
  lost: 'Lost',
};

const emptyHeader = {
  inquiry_date: todayDateInputValue(),
  buyer_ref: '',
  source_id: '',
  buyer_id: '',
  category_id: '',
  document_format_id: '',
  agent_id: '',
  agent_commission_type: '',
  agent_commission_value: '',
  currency_id: '',
  exchange_rate: '',
  expected_shipment_date: '',
  delivery_details: '',
  packing_details: '',
  remarks: '',
  status: 'draft',
};

export default function InquiryForm({ inquiryId = null }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  const [buyers, setBuyers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formats, setFormats] = useState([]);
  const [agents, setAgents] = useState([]);
  const [fobValues, setFobValues] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [sources, setSources] = useState([]);
  const [statuses, setStatuses] = useState(Object.keys(STATUS_LABELS));
  const [financialYear, setFinancialYear] = useState('');
  const [numberPreview, setNumberPreview] = useState('');
  const [inquiryNo, setInquiryNo] = useState('');

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [formData, setFormData] = useState(emptyHeader);
  const [items, setItems] = useState([blankItem('draft')]);
  const [followups, setFollowups] = useState([]);

  const applyBundle = (bundle) => {
    setBuyers(bundle.buyers || []);
    setCategories(bundle.categories || []);
    setFormats(bundle.formats || []);
    setAgents(bundle.agents || []);
    setFobValues(bundle.fobValues || []);
    setCurrencies(bundle.currencies || []);
    setSources(bundle.sources || []);
    setStatuses(bundle.statuses || Object.keys(STATUS_LABELS));
    setFinancialYear(bundle.financialYear || '');
    setNumberPreview(bundle.numberPreview || '');
  };

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

  const fetchInquiry = useCallback(async () => {
    try {
      const res = await apiClient.get(`/inquiries/${inquiryId}/edit`);
      if (res.success) {
        applyBundle(res.data);
        const inq = res.data.inquiry;
        setInquiryNo(inq.inquiry_no);
        setFormData({
          inquiry_date: toDateInputValue(inq.inquiry_date),
          buyer_ref: inq.buyer_ref || '',
          source_id: inq.source_id || '',
          buyer_id: inq.buyer_id || '',
          category_id: inq.category_id || '',
          document_format_id: inq.document_format_id || '',
          agent_id: inq.agent_id || '',
          agent_commission_type: inq.agent_commission_type || '',
          agent_commission_value: inq.agent_commission_value ?? '',
          currency_id: inq.currency_id || '',
          exchange_rate: inq.exchange_rate ?? '',
          expected_shipment_date: toDateInputValue(inq.expected_shipment_date),
          delivery_details: inq.delivery_details || '',
          packing_details: inq.packing_details || '',
          remarks: inq.remarks || '',
          status: inq.status || 'draft',
        });
        setItems(inq.items && inq.items.length > 0 ? inq.items.map((it) => itemFromServer(it)) : [blankItem('draft')]);
        setFollowups((inq.follow_ups || []).map((f) => ({ id: f.id, date: toDateInputValue(f.follow_up_date), comment: f.comment })));
        if (inq.category_id) await fetchCascade(inq.category_id);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load inquiry');
    } finally {
      setLoading(false);
    }
  }, [inquiryId, fetchCascade]);

  const fetchDefaults = useCallback(async () => {
    try {
      const res = await apiClient.get('/inquiries/create');
      if (res.success) applyBundle(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      if (inquiryId) fetchInquiry();
      else fetchDefaults();
    });
  }, [inquiryId, fetchInquiry, fetchDefaults]);

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

  const addSource = async () => {
    const name = window.prompt('New source name:');
    if (!name || !name.trim()) return;
    try {
      const source = await apiClient.post('/inquiries/sources', { name: name.trim() });
      setSources((prev) => [...prev, source]);
      setFormData((prev) => ({ ...prev, source_id: source.id }));
    } catch (err) {
      alert(err.message || 'Failed to add source');
    }
  };

  const updateFollowup = (index, patch) => {
    const next = followups.slice();
    next[index] = { ...next[index], ...patch };
    setFollowups(next);
  };
  const addFollowup = () => setFollowups([...followups, { date: '', comment: '' }]);
  const removeFollowup = (index) => setFollowups(followups.filter((_, i) => i !== index));

  const selectedFormat = formats.find((f) => String(f.id) === String(formData.document_format_id)) || null;

  const submit = async (mode) => {
    setSaving(true);
    setErrors([]);

    const status = mode === 'draft' ? 'draft' : formData.status;
    const payload = {
      ...formData,
      status,
      mode,
      items: items.map(itemToPayload),
      followups: followups.filter((f) => (f.comment || '').trim() !== ''),
    };

    try {
      let res;
      if (inquiryId) {
        res = await apiClient.put(`/inquiries/${inquiryId}`, payload);
      } else {
        res = await apiClient.post('/inquiries', payload);
      }
      if (res.success) {
        router.push(`/sales/inquiries/${res.data.inquiry.id}`);
      }
    } catch (err) {
      console.error(err);
      setErrors(err.data?.errors || [err.message || 'Failed to save inquiry']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submit('submit');
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Loading form data...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        </div>
      )}

      <FormSection title="Inquiry Identity" icon="bi-chat-square-text" subtitle="→ Buyer Master · Agent Master · OC on confirmation">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Inquiry No.</label>
            <input type="text" readOnly value={inquiryId ? inquiryNo : `${numberPreview} (auto)`} className="form-input w-full rounded border-gray-300 text-sm bg-gray-50 border-dashed text-gray-500" />
            <p className="text-[11px] text-gray-500 mt-1">FY {financialYear}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
            <input type="date" name="inquiry_date" required value={formData.inquiry_date} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Inquiry Date"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buyer&apos;s Ref / Season</label>
            <input type="text" name="buyer_ref" maxLength={100} placeholder="e.g. SS-2026" value={formData.buyer_ref} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
            <div className="flex gap-2">
              <select name="source_id" value={formData.source_id} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
                <option value="">— Select —</option>
                {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button type="button" onClick={addSource} className="px-2 border border-gray-300 rounded text-gray-500 hover:bg-gray-50" title="Add new source"><i className="bi bi-plus-lg"></i></button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buyer</label>
            <select name="buyer_id" value={formData.buyer_id} onChange={handleBuyerChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="">— Select —</option>
              {buyers.map((b) => <option key={b.id} value={b.id}>{b.company_name}{b.display_code ? ` (${b.display_code})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <select name="category_id" value={formData.category_id} onChange={handleCategoryChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="">— Select —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </FormSection>

      <FormSection title="Order Format & Terms" icon="bi-file-earmark-ruled">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Order Format</label>
            <select name="document_format_id" value={formData.document_format_id} onChange={handleFormatChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="">— Select —</option>
              {formats.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Format Type</label>
            <input type="text" readOnly value={selectedFormat?.module || ''} placeholder="— From Format —" className="form-input w-full rounded border-gray-300 text-sm bg-gray-50 border-dashed text-gray-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Agent <span className="text-gray-400 font-normal">(Buyer Master)</span></label>
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
            <input type="number" step="0.01" min="0" name="agent_commission_value" placeholder="0.00" value={formData.agent_commission_value} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Currency <span className="text-gray-400 font-normal">(Buyer Master)</span></label>
            <select name="currency_id" value={formData.currency_id} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="">— Select —</option>
              {currencies.map((c) => <option key={c.id} value={c.id}>{c.iso_code} — {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Exchange Rate (₹)</label>
            <input type="number" step="0.01" min="0" name="exchange_rate" placeholder="e.g. 88.50" value={formData.exchange_rate} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Expected Shipment Date</label>
            <input type="date" name="expected_shipment_date" value={formData.expected_shipment_date} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Expected Shipment Date"/>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
            <input type="text" name="remarks" maxLength={2000} placeholder="General remarks…" value={formData.remarks} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
        </div>
      </FormSection>

      <FormSection title="Items, Costing & Follow-ups" icon="bi-table">
        <ItemsEditor
          items={items}
          onChange={setItems}
          format={selectedFormat}
          products={products}
          suppliers={suppliers}
          fobValues={fobValues}
          statuses={statuses}
          variant="inquiry"
        />

        <div className="mt-6 border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-700">Buyer Follow-up</h4>
            <button type="button" onClick={addFollowup} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100">
              <i className="bi bi-plus-lg"></i> Add buyer follow-up
            </button>
          </div>
          <div className="space-y-2">
            {followups.map((f, i) => (
              <div key={f.id || i} className="flex gap-2 items-center">
                <input type="date" value={f.date} onChange={(e) = placeholder="Enter Date"> updateFollowup(i, { date: e.target.value })} className="form-input rounded border-gray-300 text-sm w-44" />
                <input type="text" placeholder="Comment" value={f.comment} onChange={(e) => updateFollowup(i, { comment: e.target.value })} className="form-input flex-1 rounded border-gray-300 text-sm" />
                <button type="button" onClick={() => removeFollowup(i)} className="text-red-500 hover:text-red-700 px-1"><i className="bi bi-trash"></i></button>
              </div>
            ))}
            {followups.length === 0 && <p className="text-sm text-gray-400">No follow-up entries recorded.</p>}
          </div>
        </div>
      </FormSection>

      <FormSection title="Delivery & Packing Details" icon="bi-box-seam">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Details</label>
            <textarea name="delivery_details" rows={3} value={formData.delivery_details} onChange={handleChange} className="form-textarea w-full rounded border-gray-300 text-sm" placeholder="Enter Delivery Details"></textarea>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Packing Details</label>
            <textarea name="packing_details" rows={3} value={formData.packing_details} onChange={handleChange} className="form-textarea w-full rounded border-gray-300 text-sm" placeholder="Enter Packing Details"></textarea>
          </div>
        </div>
      </FormSection>

      <FormSection title="Module Connections" icon="bi-diagram-3">
        <div className="flex flex-wrap gap-2">
          {['Buyer Master', 'Agent Master', 'Order Format', 'Order Confirmation (on confirmation)'].map((m) => (
            <span key={m} className="px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-gray-700 text-sm">{m}</span>
          ))}
        </div>
      </FormSection>

      <div className="bg-white border rounded shadow-sm px-6 py-4 flex items-center gap-3 flex-wrap">
        <select value={formData.status} onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))} className="form-select rounded border-gray-300 text-sm">
          {statuses.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
        </select>
        <div className="flex-1" />
        <Link href={inquiryId ? `/sales/inquiries/${inquiryId}` : '/sales/inquiries'} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm">
          Cancel
        </Link>
        <button type="button" disabled={saving} onClick={() => submit('draft')} className="px-4 py-2 border border-gray-400 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm disabled:opacity-50">
          Save Draft
        </button>
        <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-50">
          <i className="bi bi-check-lg me-1"></i> {saving ? 'Saving…' : 'Submit'}
        </button>
      </div>
    </form>
  );
}

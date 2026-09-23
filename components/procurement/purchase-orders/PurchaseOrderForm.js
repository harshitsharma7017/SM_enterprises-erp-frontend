'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import FormSection from '@/components/ui/FormSection';
import PoItemsEditor from '@/components/procurement/shared/PoItemsEditor';
import { blankPoItem, poItemFromServer, poItemToPayload } from '@/components/sales/shared/itemsHelpers';
import { toDateInputValue, todayDateInputValue } from '@/components/sales/shared/format';

const emptyHeader = {
  order_confirmation_id: '',
  supplier_id: '',
  po_date: todayDateInputValue(),
  dispatch_date: '',
  delivery_details: '',
  packing_details: '',
  remarks: '',
};

export default function PurchaseOrderForm({ poId = null }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  const [ocs, setOcs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [formats, setFormats] = useState([]);
  const [products, setProducts] = useState([]);

  const [formData, setFormData] = useState(emptyHeader);
  const [items, setItems] = useState([blankPoItem()]);
  const [poNum, setPoNum] = useState('');

  const fetchLookups = useCallback(async () => {
    try {
      const [ocRes, supplierRes, inqRes] = await Promise.all([
        apiClient.get('/sales/order-confirmations?status=confirmed&limit=200'),
        apiClient.get('/masters/suppliers?status=active&party_type=supplier&limit=1000'),
        apiClient.get('/inquiries/create'),
      ]);
      if (ocRes.success) setOcs(ocRes.data || []);
      if (supplierRes.success) setSuppliers(supplierRes.data.data || []);
      if (inqRes.success) setFormats(inqRes.data.formats || []);
    } catch (err) {
      console.error('Failed to load PO form dropdowns', err);
    }
  }, []);

  const fetchCascade = useCallback(async (categoryId) => {
    try {
      const params = categoryId ? `?category_id=${categoryId}` : '';
      const productsRes = await apiClient.get(`/inquiries/products${params}`);
      setProducts(Array.isArray(productsRes) ? productsRes : []);
    } catch (err) {
      console.error('Failed to load product cascade', err);
    }
  }, []);

  const fetchPo = useCallback(async () => {
    try {
      const res = await apiClient.get(`/procurement/purchase-orders/${poId}/edit`);
      if (res.success) {
        const po = res.data;
        setPoNum(po.po_num);
        setFormData({
          order_confirmation_id: po.order_confirmation_id || '',
          supplier_id: po.supplier_id || '',
          po_date: toDateInputValue(po.po_date),
          dispatch_date: toDateInputValue(po.dispatch_date),
          delivery_details: po.delivery_details || '',
          packing_details: po.packing_details || '',
          remarks: po.remarks || '',
        });
        setItems(po.items && po.items.length > 0 ? po.items.map((it) => poItemFromServer(it)) : [blankPoItem()]);
        const oc = ocs.find((o) => String(o.id) === String(po.order_confirmation_id));
        if (oc?.category_id) await fetchCascade(oc.category_id);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load Purchase Order');
    } finally {
      setLoading(false);
    }
  }, [poId, ocs, fetchCascade]);

  useEffect(() => {
    queueMicrotask(async () => {
      await fetchLookups();
      if (!poId) setLoading(false);
    });
  }, [fetchLookups, poId]);

  useEffect(() => {
    if (poId && ocs.length > 0) {
      queueMicrotask(fetchPo);
    }
  }, [poId, ocs, fetchPo]);

  const selectedOc = ocs.find((o) => String(o.id) === String(formData.order_confirmation_id)) || null;
  const selectedFormat = formats.find((f) => String(f.id) === String(selectedOc?.document_format_id)) || null;

  const handleOcChange = (e) => {
    const ocId = e.target.value;
    const oc = ocs.find((o) => String(o.id) === String(ocId));
    setFormData((prev) => ({
      ...prev,
      order_confirmation_id: ocId,
      delivery_details: prev.delivery_details || oc?.delivery_details || '',
      packing_details: prev.packing_details || oc?.packing_details || '',
    }));
    if (oc?.category_id) fetchCascade(oc.category_id);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (status) => {
    setSaving(true);
    setErrors([]);

    const payload = {
      ...formData,
      order_confirmation_id: formData.order_confirmation_id || null,
      supplier_id: formData.supplier_id || null,
      dispatch_date: formData.dispatch_date || null,
      status,
      items: items.map(poItemToPayload),
    };

    try {
      let res;
      if (poId) {
        // order_confirmation_id / supplier_id aren't accepted by the update
        // endpoint at all (see Phase 4B report §3) — sending them is harmless
        // (silently stripped) but we don't pretend they're editable here.
        res = await apiClient.put(`/procurement/purchase-orders/${poId}`, payload);
      } else {
        res = await apiClient.post('/procurement/purchase-orders', payload);
      }
      if (res.success) {
        router.push(`/procurement/purchase-orders/${res.data.id}`);
      }
    } catch (err) {
      console.error(err);
      setErrors(err.data?.errors || [err.message || 'Failed to save Purchase Order']);
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
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        </div>
      )}

      <FormSection title="PO Identity" icon="bi-cart-check" subtitle="→ Supplier Master · Contract / OC module">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">PO No.</label>
            <input type="text" readOnly value={poId ? poNum : 'GT/PO/[seq]/[FY]'} className="form-input w-full rounded border-gray-300 text-sm bg-gray-50 border-dashed text-gray-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">PO Date <span className="text-red-500">*</span></label>
            <input type="date" name="po_date" required value={formData.po_date} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Po Date"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buyer</label>
            <input type="text" readOnly value={selectedOc?.buyer_company_name || ''} className="form-input w-full rounded border-gray-300 text-sm bg-gray-50 border-dashed text-gray-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contract No. <span className="text-red-500">*</span></label>
            {poId ? (
              <input type="text" readOnly value={selectedOc?.oc_num || `#${formData.order_confirmation_id}`} className="form-input w-full rounded border-gray-300 text-sm bg-gray-50 border-dashed text-gray-500" />
            ) : (
              <select name="order_confirmation_id" required value={formData.order_confirmation_id} onChange={handleOcChange} className="form-select w-full rounded border-gray-300 text-sm">
                <option value="">— Select —</option>
                {ocs.map((oc) => <option key={oc.id} value={oc.id}>{oc.oc_num}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Supplier <span className="text-red-500">*</span></label>
            {poId ? (
              <input type="text" readOnly value={suppliers.find((s) => String(s.id) === String(formData.supplier_id))?.company_name || `#${formData.supplier_id}`} className="form-input w-full rounded border-gray-300 text-sm bg-gray-50 border-dashed text-gray-500" />
            ) : (
              <select name="supplier_id" required value={formData.supplier_id} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
                <option value="">— Select —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}{s.display_code ? ` (${s.display_code})` : ''}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Dispatch Date</label>
            <input type="date" name="dispatch_date" value={formData.dispatch_date} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Dispatch Date"/>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
            <input type="text" name="remarks" maxLength={1000} value={formData.remarks} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Remarks"/>
          </div>
        </div>
      </FormSection>

      <FormSection title="PO Items" icon="bi-table" subtitle="₹ price ← Inquiry costing · OC FOB → Export Invoice · HSN ← Product Master">
        <PoItemsEditor items={items} onChange={setItems} format={selectedFormat} products={products} />
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

      <div className="bg-white border rounded shadow-sm px-6 py-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1" />
        <Link href={poId ? `/procurement/purchase-orders/${poId}` : '/procurement/purchase-orders'} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm">
          Cancel
        </Link>
        <button type="button" disabled={saving} onClick={() => submit('draft')} className="px-4 py-2 border border-gray-400 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm disabled:opacity-50">
          Save Draft
        </button>
        <button type="button" disabled={saving} onClick={() => submit('raised')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-50">
          <i className="bi bi-check-lg me-1"></i> {saving ? 'Saving…' : 'Raise PO'}
        </button>
      </div>
    </form>
  );
}

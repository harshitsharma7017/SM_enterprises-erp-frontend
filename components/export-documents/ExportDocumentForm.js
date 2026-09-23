'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import FormSection from '@/components/ui/FormSection';
import CartonsEditor from './CartonsEditor';
import { blankCarton, cartonFromServer, cartonToPayload } from './exportDocumentHelpers';
import { toDateInputValue } from '@/components/sales/shared/format';

const emptyHeader = {
  incoterm_id: '', shipment_method_id: '', port_of_loading_id: '', port_of_discharge_id: '',
  final_destination: '', shipment_date: '',
  invoice_no: '', invoice_date: '', exporter_ref: '',
  buyer_ref_no: '', buyer_ref_date: '', other_reference: '',
  consignee_name: '', consignee_address: '',
  pre_carriage_by: '', place_of_receipt: '', vessel_flight_no: '', country_of_origin: '',
  forwarder_name: '', forwarder_address: '', vehicle_no: '', driver_cell: '',
  marks_and_numbers: '', total_cartons: '', package_kind: '',
  booking_no: '', bl_no: '', voyage_no: '', transshipment_port: '',
  notify_party_name: '', notify_party_address: '', goods_description: '',
  total_measurement: '', freight_terms: '', ex_rate: '',
  freight_prepaid_at: '', freight_payable_at: '', total_prepaid_in: '',
  no_of_original_bls: '', bl_place_of_issue: '', bl_date_of_issue: '',
  freight_amount: '', insurance_amount: '', gross_weight: '', net_weight: '', carton_dimensions: '',
  remarks: '',
};

export default function ExportDocumentForm({ documentId }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  const [incoterms, setIncoterms] = useState([]);
  const [ports, setPorts] = useState([]);
  const [shipmentMethods, setShipmentMethods] = useState([]);
  const [lookupBlocked, setLookupBlocked] = useState(false);

  const [buyerId, setBuyerId] = useState(null);
  const [currencyId, setCurrencyId] = useState(null);
  const [status, setStatus] = useState('draft');
  const [buyerName, setBuyerName] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [docNum, setDocNum] = useState('');
  const [formData, setFormData] = useState(emptyHeader);
  const [cartons, setCartons] = useState([blankCarton()]);

  // Export Document's own /create endpoint is a stub (same pattern as OC/PO)
  // and there's no masters endpoint for incoterms/ports/shipment-methods —
  // they're only ever bundled inside the Buyer module's own create-form
  // response (permission `buyer.create`), same cross-module reuse pattern
  // established in Phase 4A/4B.
  const fetchLookups = useCallback(async () => {
    try {
      const res = await apiClient.get('/masters/buyers/create');
      if (res.success) {
        setIncoterms(res.data.incoterms || []);
        setPorts(res.data.ports || []);
        setShipmentMethods(res.data.shipmentMethods || []);
      }
    } catch (err) {
      console.error('Failed to load Export Document form dropdowns', err);
      setLookupBlocked(true);
    }
  }, []);

  const fetchDoc = useCallback(async () => {
    try {
      const res = await apiClient.get(`/export/documents/${documentId}`);
      if (res.success) {
        const doc = res.data;
        setDocNum(doc.doc_num);
        setBuyerId(doc.buyer_id);
        setCurrencyId(doc.currency_id);
        setBuyerName(doc.buyer_name || '');
        setCurrencyCode(doc.currency_code || '');
        setStatus(doc.status || 'draft');
        setFormData({
          incoterm_id: doc.incoterm_id || '',
          shipment_method_id: doc.shipment_method_id || '',
          port_of_loading_id: doc.port_of_loading_id || '',
          port_of_discharge_id: doc.port_of_discharge_id || '',
          final_destination: doc.final_destination || '',
          shipment_date: toDateInputValue(doc.shipment_date),
          invoice_no: doc.invoice_no || '',
          invoice_date: toDateInputValue(doc.invoice_date),
          exporter_ref: doc.exporter_ref || '',
          buyer_ref_no: doc.buyer_ref_no || '',
          buyer_ref_date: toDateInputValue(doc.buyer_ref_date),
          other_reference: doc.other_reference || '',
          consignee_name: doc.consignee_name || '',
          consignee_address: doc.consignee_address || '',
          pre_carriage_by: doc.pre_carriage_by || '',
          place_of_receipt: doc.place_of_receipt || '',
          vessel_flight_no: doc.vessel_flight_no || '',
          country_of_origin: doc.country_of_origin || '',
          forwarder_name: doc.forwarder_name || '',
          forwarder_address: doc.forwarder_address || '',
          vehicle_no: doc.vehicle_no || '',
          driver_cell: doc.driver_cell || '',
          marks_and_numbers: doc.marks_and_numbers || '',
          total_cartons: doc.total_cartons ?? '',
          package_kind: doc.package_kind || '',
          booking_no: doc.booking_no || '',
          bl_no: doc.bl_no || '',
          voyage_no: doc.voyage_no || '',
          transshipment_port: doc.transshipment_port || '',
          notify_party_name: doc.notify_party_name || '',
          notify_party_address: doc.notify_party_address || '',
          goods_description: doc.goods_description || '',
          total_measurement: doc.total_measurement ?? '',
          freight_terms: doc.freight_terms || '',
          ex_rate: doc.ex_rate || '',
          freight_prepaid_at: doc.freight_prepaid_at || '',
          freight_payable_at: doc.freight_payable_at || '',
          total_prepaid_in: doc.total_prepaid_in || '',
          no_of_original_bls: doc.no_of_original_bls || '',
          bl_place_of_issue: doc.bl_place_of_issue || '',
          bl_date_of_issue: toDateInputValue(doc.bl_date_of_issue),
          freight_amount: doc.freight_amount ?? '',
          insurance_amount: doc.insurance_amount ?? '',
          gross_weight: doc.gross_weight ?? '',
          net_weight: doc.net_weight ?? '',
          carton_dimensions: doc.carton_dimensions || '',
          remarks: doc.remarks || '',
        });
        setCartons(doc.cartons && doc.cartons.length > 0 ? doc.cartons.map(cartonFromServer) : [blankCarton()]);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load Export Document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    queueMicrotask(async () => {
      await Promise.all([fetchLookups(), fetchDoc()]);
    });
  }, [fetchLookups, fetchDoc]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async () => {
    setSaving(true);
    setErrors([]);

    const payload = {
      ...formData,
      buyer_id: buyerId,
      currency_id: currencyId,
      status,
      incoterm_id: formData.incoterm_id || null,
      shipment_method_id: formData.shipment_method_id || null,
      port_of_loading_id: formData.port_of_loading_id || null,
      port_of_discharge_id: formData.port_of_discharge_id || null,
      total_cartons: formData.total_cartons === '' ? null : formData.total_cartons,
      total_measurement: formData.total_measurement === '' ? null : formData.total_measurement,
      freight_amount: formData.freight_amount === '' ? null : formData.freight_amount,
      insurance_amount: formData.insurance_amount === '' ? null : formData.insurance_amount,
      gross_weight: formData.gross_weight === '' ? null : formData.gross_weight,
      net_weight: formData.net_weight === '' ? null : formData.net_weight,
      cartons: cartons.map(cartonToPayload).filter((c) => c.carton_no.trim() !== ''),
    };

    try {
      const res = await apiClient.put(`/export/documents/${documentId}`, payload);
      if (res.success) {
        router.push(`/export/documents/${documentId}`);
      }
    } catch (err) {
      console.error(err);
      setErrors(err.data?.errors || [err.message || 'Failed to save Export Document']);
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
          Could not load Incoterm/Port/Shipment Method options — this form reuses the Buyer module&apos;s
          dropdown bundle (requires the <code className="mx-1">buyer.create</code> permission).
        </div>
      )}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded p-3 text-sm">
        Shipment logistics details — printed on the Delivery Challan, Export Invoice and E-way Bill. None
        of this comes from the Order Confirmation automatically; fill it in once the shipment is being packed.
      </div>

      <div className="bg-white border rounded shadow-sm p-4">
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <div><dt className="text-gray-500">Doc No.</dt><dd className="mt-0.5 font-mono font-semibold text-gray-900">{docNum}</dd></div>
          <div><dt className="text-gray-500">Buyer</dt><dd className="mt-0.5 text-gray-900">{buyerName}</dd></div>
          <div><dt className="text-gray-500">Currency</dt><dd className="mt-0.5 text-gray-900">{currencyCode}</dd></div>
        </dl>
      </div>

      <FormSection title="Shipment" icon="bi-truck">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Incoterm</label>
            <select name="incoterm_id" value={formData.incoterm_id} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="">— Select —</option>
              {incoterms.map((i) => <option key={i.id} value={i.id}>{i.code}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Shipment Method</label>
            <select name="shipment_method_id" value={formData.shipment_method_id} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="">— Select —</option>
              {shipmentMethods.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Port of Loading</label>
            <select name="port_of_loading_id" value={formData.port_of_loading_id} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="">— Select —</option>
              {ports.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Port of Discharge</label>
            <select name="port_of_discharge_id" value={formData.port_of_discharge_id} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="">— Select —</option>
              {ports.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Final Destination</label>
            <input type="text" name="final_destination" placeholder="Defaults to Port of Discharge" maxLength={150} value={formData.final_destination} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Shipment Date</label>
            <input type="date" name="shipment_date" value={formData.shipment_date} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Shipment Date"/>
          </div>
        </div>
      </FormSection>

      <FormSection title="Invoice Reference" icon="bi-receipt">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Invoice No.</label>
            <input type="text" name="invoice_no" placeholder="e.g. EXP25269001" maxLength={60} value={formData.invoice_no} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Date</label>
            <input type="date" name="invoice_date" value={formData.invoice_date} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Invoice Date"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Exporter&apos;s Ref</label>
            <input type="text" name="exporter_ref" maxLength={255} value={formData.exporter_ref} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Exporter Ref"/>
          </div>
        </div>
      </FormSection>

      <FormSection title="Packing List — Header Details" icon="bi-file-earmark-text" subtitle="Format C, for customs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buyer&apos;s Ref No.</label>
            <input type="text" name="buyer_ref_no" maxLength={60} value={formData.buyer_ref_no} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Buyer Ref No"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buyer&apos;s Ref Date</label>
            <input type="date" name="buyer_ref_date" value={formData.buyer_ref_date} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Buyer Ref Date"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Other Reference(s)</label>
            <input type="text" name="other_reference" maxLength={255} value={formData.other_reference} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Other Reference"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Consignee Name <span className="text-gray-400 font-normal">(blank = Buyer)</span></label>
            <input type="text" name="consignee_name" maxLength={200} value={formData.consignee_name} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Consignee Name"/>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Consignee Address</label>
            <input type="text" name="consignee_address" maxLength={1000} value={formData.consignee_address} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Consignee Address"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Pre-Carriage By</label>
            <input type="text" name="pre_carriage_by" placeholder="e.g. AIR, ROAD" maxLength={60} value={formData.pre_carriage_by} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Place of Receipt by Pre-Carrier</label>
            <input type="text" name="place_of_receipt" maxLength={150} value={formData.place_of_receipt} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Place Of Receipt"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Vessel / Flight No.</label>
            <input type="text" name="vessel_flight_no" maxLength={60} value={formData.vessel_flight_no} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Vessel Flight No"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Country of Origin</label>
            <input type="text" name="country_of_origin" maxLength={60} value={formData.country_of_origin} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Country Of Origin"/>
            <p className="text-[11px] text-gray-500 mt-1">Country of Final Destination is read from the Buyer&apos;s own country automatically.</p>
          </div>
        </div>
      </FormSection>

      <FormSection title="Forwarder / Transport" icon="bi-truck-flatbed" subtitle="Delivery Challan">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Forwarder / CHA Name</label>
            <input type="text" name="forwarder_name" maxLength={150} value={formData.forwarder_name} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Forwarder Name"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Forwarder Address</label>
            <input type="text" name="forwarder_address" maxLength={1000} value={formData.forwarder_address} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Forwarder Address"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle / Tempo No.</label>
            <input type="text" name="vehicle_no" maxLength={60} value={formData.vehicle_no} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Vehicle No"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Driver Cell No.</label>
            <input type="text" name="driver_cell" maxLength={30} value={formData.driver_cell} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Driver Cell"/>
          </div>
        </div>
      </FormSection>

      <FormSection title="Marks & Packages" icon="bi-box-seam" subtitle="Delivery Challan">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Marks &amp; Nos.</label>
            <textarea name="marks_and_numbers" rows={4} maxLength={2000} placeholder="Buyer name, destination, carton number ranges..." value={formData.marks_and_numbers} onChange={handleChange} className="form-textarea w-full rounded border-gray-300 text-sm"></textarea>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Total Cartons</label>
            <input type="number" min="0" name="total_cartons" value={formData.total_cartons} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Total Cartons"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Package Kind</label>
            <input type="text" name="package_kind" maxLength={40} value={formData.package_kind} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Package Kind"/>
          </div>
        </div>
      </FormSection>

      <FormSection title="Bill of Lading (Draft)" icon="bi-file-earmark-ruled">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Booking No.</label>
            <input type="text" name="booking_no" maxLength={60} value={formData.booking_no} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Booking No"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">B/L No.</label>
            <input type="text" name="bl_no" maxLength={60} value={formData.bl_no} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Bl No"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Voy. No.</label>
            <input type="text" name="voyage_no" maxLength={60} value={formData.voyage_no} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Voyage No"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">For Transshipment To</label>
            <input type="text" name="transshipment_port" maxLength={150} value={formData.transshipment_port} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Transshipment Port"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notify Party Name <span className="text-gray-400 font-normal">(blank = Consignee)</span></label>
            <input type="text" name="notify_party_name" maxLength={200} value={formData.notify_party_name} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Notify Party Name"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notify Party Address</label>
            <input type="text" name="notify_party_address" maxLength={1000} value={formData.notify_party_address} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Notify Party Address"/>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Goods Description</label>
            <input type="text" name="goods_description" placeholder="e.g. POWERLOOM WOVEN READYMADE GARMENTS, SAREES, PP BAGS, LADIES PURSE ETC." maxLength={1000} value={formData.goods_description} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
            <p className="text-[11px] text-gray-500 mt-1">Printed after &quot;SAID TO CONTAIN ... CARTONS CONTAINING&quot;.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Measurement (CBM)</label>
            <input type="number" step="0.001" min="0" name="total_measurement" value={formData.total_measurement} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Total Measurement"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Freight Terms</label>
            <select name="freight_terms" value={formData.freight_terms} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="">— Select —</option>
              <option value="PREPAID">PREPAID</option>
              <option value="COLLECT">COLLECT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">EX. Rate</label>
            <input type="text" name="ex_rate" maxLength={60} value={formData.ex_rate} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Ex Rate"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Freight Prepaid At</label>
            <input type="text" name="freight_prepaid_at" maxLength={100} value={formData.freight_prepaid_at} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Freight Prepaid At"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Freight Payable At</label>
            <input type="text" name="freight_payable_at" maxLength={100} value={formData.freight_payable_at} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Freight Payable At"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Total Prepaid In</label>
            <input type="text" name="total_prepaid_in" maxLength={150} value={formData.total_prepaid_in} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Total Prepaid In"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">No. of Original B(s)/L</label>
            <input type="text" name="no_of_original_bls" placeholder="e.g. 3/THREE" maxLength={40} value={formData.no_of_original_bls} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Place of Issue</label>
            <input type="text" name="bl_place_of_issue" maxLength={100} value={formData.bl_place_of_issue} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Bl Place Of Issue"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date of Issue</label>
            <input type="date" name="bl_date_of_issue" value={formData.bl_date_of_issue} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Bl Date Of Issue"/>
          </div>
        </div>
      </FormSection>

      <FormSection title="CIF Value" icon="bi-currency-exchange" subtitle="Only if the incoterm needs it — manual entry, no auto-calculation">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Freight Amount</label>
            <input type="number" step="0.01" min="0" name="freight_amount" value={formData.freight_amount} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Freight Amount"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Insurance Amount</label>
            <input type="number" step="0.01" min="0" name="insurance_amount" value={formData.insurance_amount} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Insurance Amount"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Gross Weight (kg)</label>
            <input type="number" step="0.001" min="0" name="gross_weight" value={formData.gross_weight} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Gross Weight"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Net Weight (kg)</label>
            <input type="number" step="0.001" min="0" name="net_weight" value={formData.net_weight} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Net Weight"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Carton / Bale Dimension</label>
            <input type="text" name="carton_dimensions" placeholder="25 X 15 X 20" maxLength={60} value={formData.carton_dimensions} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
        </div>
      </FormSection>

      <FormSection title="Cartons" icon="bi-boxes" subtitle="Packing List Formats B & C — what's physically packed in each carton">
        <CartonsEditor cartons={cartons} onChange={setCartons} />
      </FormSection>

      <FormSection title="Remarks" icon="bi-chat-left-text">
        <textarea name="remarks" rows={2} maxLength={2000} value={formData.remarks} onChange={handleChange} className="form-textarea w-full rounded border-gray-300 text-sm" placeholder="Enter Remarks"></textarea>
      </FormSection>

      <div className="bg-white border rounded shadow-sm px-6 py-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1" />
        <Link href={`/export/documents/${documentId}`} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm">
          Cancel
        </Link>
        <button type="button" disabled={saving} onClick={submit} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-50">
          <i className="bi bi-check-lg me-1"></i> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

/* eslint-disable */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import CompanySelect from '@/components/company/CompanySelect';

const INCENTIVE_SCHEMES = {
  drawback: 'Drawback',
  rosctl: 'RoSCTL',
  rodtep: 'RoDTEP'
};

const TWO_PERCENT_SCHEMES = ['rosctl'];

export default function ProductForm({ productId = null }) {
  const router = useRouter();

  // Reference data
  const [categories, setCategories] = useState({});
  const [units, setUnits] = useState({});
  const [uoms, setUoms] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [priceBands, setPriceBands] = useState({});
  const [gstRates, setGstRates] = useState({});
  const [calculationBases, setCalculationBases] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    company_id: '',
    category_id: '',
    material_type_id: '',
    uom_id: '',
    item_group_code: '',
    name: '',
    name_on_export_document: '',
    barcode: '',
    unit_po: '',
    unit_export: '',
    hsn_code: '',
    price_band_id: '',
    gst_rate_id: '',
    drawback_sr_no: '',
    fabric_length_mtr: '',
    fabric_width_inch: '',
    status: 'active',
    description: '',
    remarks: '',
    comments: '',
    incentives: {
      drawback: { enabled: false, percent_1: '', percent_2: '', cap_value: '', calculation_basis_id: '' },
      rosctl: { enabled: false, percent_1: '', percent_2: '', cap_value: '', calculation_basis_id: '' },
      rodtep: { enabled: false, percent_1: '', percent_2: '', cap_value: '', calculation_basis_id: '' }
    },
    bom: []
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Uniqueness check state
  const [codeAvailable, setCodeAvailable] = useState(null);
  const [nameAvailable, setNameAvailable] = useState(null);
  const codeTimerRef = useRef(null);
  const nameTimerRef = useRef(null);

  async function fetchProduct() {
    try {
            const res = await apiClient.get(`/masters/products/${productId}/edit`);
      if (res.success) {
        const { product, categories, units, uoms, materialTypes, priceBands, gstRates, calculationBases } = res.data;
        setCategories(categories || {});
        setUnits(units || {});
        setUoms(uoms || []);
        setMaterialTypes(materialTypes || []);
        setPriceBands(priceBands || {});
        setGstRates(gstRates || {});
        setCalculationBases(calculationBases || {});

        const initialIncentives = { ...formData.incentives };
        if (product.incentives) {
          product.incentives.forEach(inc => {
            if (initialIncentives[inc.scheme]) {
              initialIncentives[inc.scheme] = {
                enabled: true,
                percent_1: inc.percent_1 || '',
                percent_2: inc.percent_2 || '',
                cap_value: inc.cap_value || '',
                calculation_basis_id: inc.calculation_basis_id || ''
              };
            }
          });
        }

        setFormData({
          company_id: product.company_id || '',
          category_id: product.category_id || '',
          material_type_id: product.material_type_id || '',
          uom_id: product.uom_id || '',
          item_group_code: product.item_group_code || '',
          name: product.name || '',
          name_on_export_document: product.name_on_export_document || '',
          barcode: product.barcode || '',
          unit_po: product.unit_po || '',
          unit_export: product.unit_export || '',
          hsn_code: product.hsn_code || '',
          price_band_id: product.price_band_id || '',
          gst_rate_id: product.gst_rate_id || '',
          drawback_sr_no: product.drawback_sr_no || '',
          fabric_length_mtr: product.fabric_length_mtr || '',
          fabric_width_inch: product.fabric_width_inch || '',
          status: product.status || 'active',
          description: product.description || '',
          remarks: product.remarks || '',
          comments: product.comments || '',
          incentives: initialIncentives,
          bom: product.bomItems || []
        });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load product data');
    } finally {
      setLoading(false);
    }
  };

  async function fetchDefaults() {
    try {
            const res = await apiClient.get('/masters/products/create');
      if (res.success) {
        const { categories, units, uoms, materialTypes, priceBands, gstRates, calculationBases } = res.data;
        setCategories(categories || {});
        setUnits(units || {});
        setUoms(uoms || []);
        setMaterialTypes(materialTypes || []);
        setPriceBands(priceBands || {});
        setGstRates(gstRates || {});
        setCalculationBases(calculationBases || {});
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchProduct();
    } else {
      fetchDefaults();
    }
  }, [productId]);


  // A material type belongs to one company, so changing the company clears a mismatched type.
  const handleCompanyChange = (e) => {
    const companyId = e.target.value;
    setFormData(prev => {
      const type = materialTypes.find(m => String(m.id) === String(prev.material_type_id));
      const keepType = type && String(type.company_id) === String(companyId);
      return { ...prev, company_id: companyId, material_type_id: keepType ? prev.material_type_id : '' };
    });
  };

  const companyMaterialTypes = materialTypes.filter(m => String(m.company_id) === String(formData.company_id));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleIncentiveChange = (scheme, field, value) => {
    setFormData(prev => ({
      ...prev,
      incentives: {
        ...prev.incentives,
        [scheme]: {
          ...prev.incentives[scheme],
          [field]: value
        }
      }
    }));
  };

  const handleBomChange = (index, field, value) => {
    const newBom = [...formData.bom];
    newBom[index] = { ...newBom[index], [field]: value };
    setFormData(prev => ({ ...prev, bom: newBom }));
  };

  const addBomRow = () => {
    setFormData(prev => ({
      ...prev,
      bom: [...prev.bom, { component_name: '', qty: '1', unit: '', remarks: '', is_custom: 1 }]
    }));
  };

  const removeBomRow = (index) => {
    const newBom = [...formData.bom];
    newBom.splice(index, 1);
    setFormData(prev => ({ ...prev, bom: newBom }));
  };

  // Debounced Uniqueness Check
  const checkUniqueness = (field, value, setAvailableState) => {
    if (!value || value.trim() === '') {
      setAvailableState(null);
      return;
    }
    
    // Skip if it's the same as what we loaded
    // Need a ref for original data ideally, but we'll let API handle ignore if we pass id
    const params = new URLSearchParams({ field, value: value.trim() });
    if (productId) params.append('ignore', productId);

    apiClient.get(`/masters/products/check-code?${params.toString()}`)
      .then(res => {
        setAvailableState(res.data.available);
      })
      .catch(err => {
        setAvailableState(null);
      });
  };

  useEffect(() => {
    if (codeTimerRef.current) clearTimeout(codeTimerRef.current);
    codeTimerRef.current = setTimeout(() => {
      checkUniqueness('item_group_code', formData.item_group_code, setCodeAvailable);
    }, 350);
  }, [formData.item_group_code]);

  useEffect(() => {
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    nameTimerRef.current = setTimeout(() => {
      checkUniqueness('name', formData.name, setNameAvailable);
    }, 350);
  }, [formData.name]);

  // Sqm Calculation Preview
  const length = parseFloat(formData.fabric_length_mtr);
  const width = parseFloat(formData.fabric_width_inch);
  const sqmPreview = (!isNaN(length) && !isNaN(width)) 
    ? ((length * width) / 39.3701).toFixed(4)
    : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const payload = { ...formData };
      
      // Transform incentives to array format expected by backend if necessary
      // The backend expects an object map or array. Laravel Blade sent object: incentives[scheme][field]
      // Our state matches the blade structure `incentives: { scheme: { ... } }`
      // Wait, Blade submitted empty fields, but backend drops them. We just send the object.

      let res;
      if (productId) {
        res = await apiClient.put(`/masters/products/${productId}`, payload);
      } else {
        res = await apiClient.post('/masters/products', payload);
      }

      if (res.success) {
        router.push('/masters/products');
      }
    } catch (err) {
      console.error(err);
      if (Array.isArray(err.response?.data?.errors)) {
        // The product validator returns a flat list of messages.
        alert(err.response.data.errors.join('\n'));
      } else if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        alert(err.response?.data?.message || 'Error saving product');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading form data...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
      
      {/* Identification */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-tag text-gray-500"></i>
          <div>
            <h3 className="text-base font-semibold">Identification</h3>
            <p className="text-xs text-gray-500">What the product is called, here and on export documents.</p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Company <span className="text-red-500">*</span></label>
            <div className="md:col-span-3">
              <CompanySelect
                value={formData.company_id}
                onChange={handleCompanyChange}
                required
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                {productId && !formData.company_id
                  ? 'This product predates multi-company support — choose the company that owns it.'
                  : 'The company that sells this product. Only its own transactions can use it.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Category <span className="text-red-500">*</span></label>
            <div className="md:col-span-3">
              <select 
                name="category_id" 
                value={formData.category_id} 
                onChange={handleChange}
                required
                className={`px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm ${errors.category_id ? 'border-red-500' : ''}`}
              >
                <option value="">Search category...</option>
                {(Array.isArray(categories) ? categories : Object.entries(categories || {}).map(([id, name]) => ({id, name}))).map(item => { const id = item.id ?? item; const name = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{name}</option>; })}
              </select>
              {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Material Type</label>
            <div className="md:col-span-3">
              <select
                name="material_type_id"
                value={formData.material_type_id}
                onChange={handleChange}
                disabled={!formData.company_id}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm disabled:bg-gray-50"
              >
                <option value="">{formData.company_id ? '— None —' : 'Select a company first'}</option>
                {companyMaterialTypes.map(m => (
                  <option key={m.id} value={m.id}>{m.name}{m.status === 'active' ? '' : ' (inactive)'}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Optional. Only the selected company&apos;s material types are listed.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">UOM <span className="text-red-500">*</span></label>
            <div className="md:col-span-3">
              <select
                name="uom_id"
                value={formData.uom_id}
                onChange={handleChange}
                required
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              >
                <option value="">Select unit...</option>
                {uoms.map(u => (
                  <option key={u.id} value={u.id}>{u.code} — {u.name}{u.status === 'active' ? '' : ' (inactive)'}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">The unit this product&apos;s quantities are kept in, e.g. MTR for pocketing and elastic.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Item Group Code <span className="text-red-500">*</span></label>
            <div className="md:col-span-3">
              <input 
                type="text" 
                name="item_group_code" 
                value={formData.item_group_code} 
                onChange={handleChange}
                required
                maxLength="5"
                placeholder="PRD01"
                className={`px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm uppercase ${errors.item_group_code ? 'border-red-500' : ''} ${codeAvailable === false ? 'border-red-500' : ''} ${codeAvailable === true ? 'border-green-500' : ''}`}
              />
              {errors.item_group_code && <p className="text-xs text-red-500 mt-1">{errors.item_group_code[0]}</p>}
              <p className={`text-xs mt-1 ${codeAvailable === false ? 'text-red-500' : codeAvailable === true ? 'text-green-600' : 'text-gray-500'}`}>
                {codeAvailable === false ? 'Already taken — choose another.' : codeAvailable === true ? 'Available.' : 'Up to 5 characters. Must be unique.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Product Name <span className="text-red-500">*</span></label>
            <div className="md:col-span-3">
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange}
                required
                maxLength="200"
                placeholder="Cotton Casual Shirt"
                className={`px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm ${errors.name ? 'border-red-500' : ''} ${nameAvailable === false ? 'border-red-500' : ''} ${nameAvailable === true ? 'border-green-500' : ''}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name[0]}</p>}
              <p className={`text-xs mt-1 ${nameAvailable === false ? 'text-red-500' : nameAvailable === true ? 'text-green-600' : 'text-gray-500'}`}>
                {nameAvailable === false ? 'Already taken — choose another.' : nameAvailable === true ? 'Available.' : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Product Name as per Export Document</label>
            <div className="md:col-span-3">
              <input 
                type="text" 
                name="name_on_export_document" 
                value={formData.name_on_export_document} 
                onChange={handleChange}
                placeholder="Exactly as it must print on the invoice"
                className={`px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm ${errors.name_on_export_document ? 'border-red-500' : ''}`}
              />
              {errors.name_on_export_document && <p className="text-xs text-red-500 mt-1">{errors.name_on_export_document[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Barcode</label>
            <div className="md:col-span-3">
              <input 
                type="text" 
                name="barcode" 
                value={formData.barcode} 
                onChange={handleChange}
                placeholder="Letters and numbers"
                className={`px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm ${errors.barcode ? 'border-red-500' : ''}`}
              />
              {errors.barcode && <p className="text-xs text-red-500 mt-1">{errors.barcode[0]}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Units & Classification */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-rulers text-gray-500"></i>
          <div>
            <h3 className="text-base font-semibold">Units & Classification</h3>
            <p className="text-xs text-gray-500">Units, HSN, price band and tax rate.</p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Unit (PO & OC)</label>
            <div className="md:col-span-3">
              <select 
                name="unit_po" 
                value={formData.unit_po} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              >
                <option value="">Search unit...</option>
                {(Array.isArray(units) ? units : Object.entries(units || {}).map(([id, label]) => ({id, label}))).map(item => { const id = item.id ?? item; const label = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{label}</option>; })}
              </select>
              <p className="text-xs text-gray-500 mt-1">From the Units defined on the Order Format master.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Unit (Export Docs)</label>
            <div className="md:col-span-3">
              <select 
                name="unit_export" 
                value={formData.unit_export} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              >
                <option value="">Search unit...</option>
                {(Array.isArray(units) ? units : Object.entries(units || {}).map(([id, label]) => ({id, label}))).map(item => { const id = item.id ?? item; const label = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{label}</option>; })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">HSN Code</label>
            <div className="md:col-span-3">
              <input 
                type="text" 
                name="hsn_code" 
                value={formData.hsn_code} 
                onChange={handleChange}
                placeholder="620520"
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Price Band</label>
            <div className="md:col-span-3">
              <select 
                name="price_band_id" 
                value={formData.price_band_id} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              >
                <option value="">Search band...</option>
                {(Array.isArray(priceBands) ? priceBands : Object.entries(priceBands || {}).map(([id, label]) => ({id, label}))).map(item => { const id = item.id ?? item; const label = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{label}</option>; })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">GST %</label>
            <div className="md:col-span-3">
              <select 
                name="gst_rate_id" 
                value={formData.gst_rate_id} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              >
                <option value="">Search or type a new rate...</option>
                {(Array.isArray(gstRates) ? gstRates : Object.entries(gstRates || {}).map(([id, label]) => ({id, label}))).map(item => { const id = item.id ?? item; const label = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{label}</option>; })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Drawback Sr. No.</label>
            <div className="md:col-span-3">
              <input 
                type="text" 
                name="drawback_sr_no" 
                value={formData.drawback_sr_no} 
                onChange={handleChange}
                placeholder="B001"
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Export Incentives */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-cash-coin text-gray-500"></i>
          <div>
            <h3 className="text-base font-semibold">Export Incentives</h3>
            <p className="text-xs text-gray-500">Leave a row blank if that scheme does not apply to this product.</p>
          </div>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-3">Applicable</th>
                <th className="py-2 px-3">Scheme</th>
                <th className="py-2 px-3">Rate %</th>
                <th className="py-2 px-3">Rate % 2</th>
                <th className="py-2 px-3">Cap Value</th>
                <th className="py-2 px-3">Calculated On</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(INCENTIVE_SCHEMES).map(([scheme, label]) => {
                const inc = formData.incentives[scheme];
                const twoPercent = TWO_PERCENT_SCHEMES.includes(scheme);
                
                return (
                  <tr key={scheme} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <input 
                        type="checkbox" 
                        checked={inc.enabled}
                        onChange={(e) => handleIncentiveChange(scheme, 'enabled', e.target.checked)}
                        className="rounded border border-gray-300"
                      />
                    </td>
                    <td className="py-2 px-3 font-medium">{label}</td>
                    <td className="py-2 px-3">
                      <input 
                        type="number" step="0.001" min="0" max="100" placeholder="0.000"
                        value={inc.percent_1}
                        disabled={!inc.enabled}
                        onChange={(e) => handleIncentiveChange(scheme, 'percent_1', e.target.value)}
                        className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-24 rounded border border-gray-300 text-sm p-1"
                      />
                    </td>
                    <td className="py-2 px-3">
                      {twoPercent ? (
                        <input 
                          type="number" step="0.001" min="0" max="100" placeholder="0.000"
                          value={inc.percent_2}
                          disabled={!inc.enabled}
                          onChange={(e) => handleIncentiveChange(scheme, 'percent_2', e.target.value)}
                          className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-24 rounded border border-gray-300 text-sm p-1"
                        />
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-2 px-3">
                      <input 
                        type="number" step="0.0001" min="0" placeholder="0.0000"
                        value={inc.cap_value}
                        disabled={!inc.enabled}
                        onChange={(e) => handleIncentiveChange(scheme, 'cap_value', e.target.value)}
                        className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-28 rounded border border-gray-300 text-sm p-1"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select 
                        value={inc.calculation_basis_id}
                        disabled={!inc.enabled}
                        onChange={(e) => handleIncentiveChange(scheme, 'calculation_basis_id', e.target.value)}
                        className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-40 rounded border border-gray-300 text-sm p-1"
                      >
                        <option value="">— Select —</option>
                        {(Array.isArray(calculationBases) ? calculationBases : Object.entries(calculationBases || {}).map(([id, basis]) => ({id, basis}))).map(item => { const id = item.id ?? item; const basis = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{basis}</option>; })}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOM / Components */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-diagram-3 text-gray-500"></i>
          <div>
            <h3 className="text-base font-semibold">BOM / Components</h3>
            <p className="text-xs text-gray-500">Optional. Free-text components per finished piece. Leave empty if this product has no BOM.</p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {formData.bom.map((row, index) => (
            <div key={index} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">Component</label>
                <input 
                  type="text" 
                  value={row.component_name} 
                  onChange={(e) => handleBomChange(index, 'component_name', e.target.value)}
                  placeholder="e.g. Lining fabric"
                  className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
                  maxLength="200"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-700 mb-1">Qty / piece</label>
                <input 
                  type="number" step="0.0001" min="0" 
                  value={row.qty} 
                  onChange={(e) => handleBomChange(index, 'qty', e.target.value)}
                  className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
                />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                <select 
                  value={row.unit} 
                  onChange={(e) => handleBomChange(index, 'unit', e.target.value)}
                  className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
                >
                  <option value="">—</option>
                  {(Array.isArray(units) ? units : Object.entries(units || {}).map(([id, label]) => ({id, label}))).map(item => { const id = item.id ?? item; const label = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{label}</option>; })}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                <input 
                  type="text" 
                  value={row.remarks} 
                  onChange={(e) => handleBomChange(index, 'remarks', e.target.value)}
                  className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
                  maxLength="500"
                />
              </div>
              <div>
                <button type="button" onClick={() => removeBomRow(index)} className="btn btn-sm btn-outline-danger px-3 py-2 border rounded text-red-600 border-red-600 hover:bg-red-50">
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addBomRow} className="btn btn-sm text-blue-600 border border-blue-600 rounded px-3 py-1 hover:bg-blue-50">
            <i className="bi bi-plus-lg me-1"></i> Add component
          </button>
        </div>
      </div>

      {/* Fabric Measurement */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-bounding-box text-gray-500"></i>
          <div>
            <h3 className="text-base font-semibold">Fabric Measurement</h3>
            <p className="text-xs text-gray-500">For fabrics and sarees. Leave blank for other products.</p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Fabric Length (mtrs)</label>
            <div className="md:col-span-3">
              <input 
                type="number" step="0.001" min="0" 
                name="fabric_length_mtr" 
                value={formData.fabric_length_mtr} 
                onChange={handleChange}
                placeholder="0.000"
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Fabric Width (inch)</label>
            <div className="md:col-span-3">
              <input 
                type="number" step="0.001" min="0" 
                name="fabric_width_inch" 
                value={formData.fabric_width_inch} 
                onChange={handleChange}
                placeholder="0.000"
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Sq. Mtrs / Unit</label>
            <div className="md:col-span-3">
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 border border-gray-300 bg-gray-100 rounded-l text-gray-500">
                  <i className="bi bi-calculator"></i>
                </span>
                <input 
                  type="text" 
                  readOnly
                  value={sqmPreview}
                  placeholder="Calculated"
                  className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex-1 rounded-r border border-gray-300 text-sm bg-gray-50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Other Details */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-card-text text-gray-500"></i>
          <h3 className="text-base font-semibold">Other Details</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Status <span className="text-red-500">*</span></label>
            <div className="md:col-span-3">
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange}
                required
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            <label className="md:col-span-1 font-medium text-sm text-gray-700 pt-2">Description</label>
            <div className="md:col-span-3">
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleChange}
                rows="2"
                placeholder="100% Cotton, 180 GSM"
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              ></textarea>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            <label className="md:col-span-1 font-medium text-sm text-gray-700 pt-2">Remarks</label>
            <div className="md:col-span-3">
              <textarea 
                name="remarks" 
                value={formData.remarks} 
                onChange={handleChange}
                rows="2"
                placeholder="Optional notes"
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              ></textarea>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            <label className="md:col-span-1 font-medium text-sm text-gray-700 pt-2">Comments</label>
            <div className="md:col-span-3">
              <textarea 
                name="comments" 
                value={formData.comments} 
                onChange={handleChange}
                rows="2"
                placeholder="Optional comments"
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          type="submit" 
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
        >
          <i className="bi bi-check-lg me-1"></i> {productId ? 'Update' : 'Save'} Product
        </button>
        <Link href="/masters/products" className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium">
          Cancel
        </Link>
      </div>

    </form>
  );
}

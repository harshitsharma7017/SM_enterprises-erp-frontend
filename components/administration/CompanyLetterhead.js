'use client';
import { useState, useEffect } from 'react';
import FormSection from '../ui/FormSection';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../hooks/useAuth';
import { storageUrl } from '../export-documents/exportDocumentHelpers';
import { INPUT, Row } from '../masters/shared/MasterFormParts';

const EMPTY = {
  tagline: '', pan: '', iec_code: '', website: '',
  bank_account_name: '', bank_name: '', bank_branch: '', bank_account_number: '', bank_ifsc: '', bank_swift: '',
  signatory_name: '', signatory_designation: '', purchase_terms: '', sales_terms: '', footer_note: '',
};

/**
 * The company's letterhead and document details — printed on every document
 * the ERP generates for this company (POs, GRNs, QC reports, challans, debit
 * notes, proforma invoices, invoices …). Name, address, phone, e-mail and
 * GSTIN come from the company form above; everything here is optional.
 */
export default function CompanyLetterhead({ companyId }) {
  const { can } = useAuth(true);
  const canEdit = can('company.edit');
  const [form, setForm] = useState(EMPTY);
  const [logoPath, setLogoPath] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient.get(`/administration/companies/${companyId}/letterhead`)
      .then((res) => {
        const d = res.data || {};
        setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, d[k] ?? ''])));
        setLogoPath(d.logo_path || null);
      })
      .catch((err) => setErrors([err.message || 'Failed to load the letterhead']));
  }, [companyId]);

  const onInput = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const save = async () => {
    setBusy(true);
    setErrors([]);
    setNotice(null);
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.append(k, v ?? ''));
    if (logoFile) body.append('logo', logoFile);
    else if (removeLogo) body.append('remove_logo', '1');
    try {
      const res = await apiClient.put(`/administration/companies/${companyId}/letterhead`, body);
      setLogoPath(res.data?.logo_path || null);
      setLogoFile(null);
      setRemoveLogo(false);
      setNotice(res.message || 'Letterhead saved.');
    } catch (err) {
      const list = err.response?.data?.errors;
      setErrors(Array.isArray(list) && list.length ? list : [err.message || 'Failed to save the letterhead']);
    } finally {
      setBusy(false);
    }
  };

  const field = (name, label, props = {}) => (
    <Row label={label} hint={props.hint}>
      <input name={name} type="text" value={form[name]} onChange={onInput} disabled={!canEdit} maxLength={props.maxLength} placeholder={props.placeholder}
        className={`${INPUT} ${props.upper ? 'uppercase font-mono' : ''} disabled:bg-gray-50`} />
    </Row>
  );
  const area = (name, label, hint) => (
    <Row label={label} hint={hint}>
      <textarea name={name} rows={4} maxLength={4000} value={form[name]} onChange={onInput} disabled={!canEdit} className={`${INPUT} disabled:bg-gray-50`}></textarea>
    </Row>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[var(--card-border)] overflow-hidden mt-6">
      <div className="p-6">
        {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">
            <ul className="list-disc pl-5 m-0">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}

        <FormSection title="Letterhead & Documents" icon="bi-file-earmark-richtext" subtitle="Printed on every document this company issues. Name, address, phone, e-mail and GSTIN come from the details above.">
          <div className="max-w-[860px]">
            <Row label="Logo" hint="PNG or JPEG, up to 1 MB. A wide logo about 3:2 fits best.">
              <div className="flex items-center gap-4">
                {logoPath && !removeLogo && !logoFile && (
                  // eslint-disable-next-line @next/next/no-img-element -- served by the API host, not the Next.js image pipeline
                  <img src={storageUrl(logoPath)} alt="Company logo" className="h-14 max-w-[140px] object-contain border border-gray-200 rounded bg-white p-1" />
                )}
                {canEdit && <input type="file" accept="image/png,image/jpeg" onChange={(e) => { setLogoFile(e.target.files?.[0] || null); setRemoveLogo(false); }} className="text-sm" />}
                {canEdit && logoPath && !logoFile && (
                  <label className="flex items-center gap-1 text-sm text-gray-600"><input type="checkbox" checked={removeLogo} onChange={(e) => setRemoveLogo(e.target.checked)} /> Remove logo</label>
                )}
              </div>
            </Row>
            {field('tagline', 'Tagline', { maxLength: 200, placeholder: 'e.g. what the company makes or trades' })}
            {field('pan', 'PAN', { maxLength: 10, upper: true, placeholder: 'ABCDE1234F' })}
            {field('iec_code', 'IEC code', { maxLength: 20, upper: true, hint: 'Importer-Exporter Code, printed on export documents.' })}
            {field('website', 'Website', { maxLength: 150 })}
          </div>
        </FormSection>

        <FormSection title="Bank Details" icon="bi-bank" subtitle="Printed on proforma invoices and invoices.">
          <div className="max-w-[860px]">
            {field('bank_account_name', 'Account name', { maxLength: 200 })}
            {field('bank_name', 'Bank name', { maxLength: 150 })}
            {field('bank_branch', 'Branch', { maxLength: 150 })}
            {field('bank_account_number', 'Account number', { maxLength: 40 })}
            {field('bank_ifsc', 'IFSC', { maxLength: 11, upper: true, placeholder: 'HDFC0001234' })}
            {field('bank_swift', 'SWIFT', { maxLength: 11, upper: true })}
          </div>
        </FormSection>

        <FormSection title="Signatory, Terms & Footer" icon="bi-pen">
          <div className="max-w-[860px]">
            {field('signatory_name', 'Authorised signatory', { maxLength: 120 })}
            {field('signatory_designation', 'Designation', { maxLength: 120 })}
            {area('purchase_terms', 'Purchase terms', 'Printed on purchase orders. Leave blank to print none.')}
            {area('sales_terms', 'Sales terms', 'Printed on proforma invoices and invoices. Leave blank to print none.')}
            {field('footer_note', 'Footer note', { maxLength: 255, hint: 'Printed at the foot of every page; default "This is a computer-generated document."' })}
          </div>
        </FormSection>
      </div>
      {canEdit && (
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <button type="button" onClick={save} disabled={busy} className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
            <i className="bi bi-check-lg mr-1"></i> Save Letterhead
          </button>
        </div>
      )}
    </div>
  );
}

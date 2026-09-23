'use client';
import { use } from 'react';
import CompanyForm from '../../../../components/administration/CompanyForm';

export default function EditCompanyPage({ params }) {
  const unwrappedParams = use(params);
  return <CompanyForm companyId={unwrappedParams.id} />;
}

'use client';
import { use } from 'react';
import BrandForm from '../../../../components/masters/brands/BrandForm';

export default function EditBrandPage({ params }) {
  const unwrappedParams = use(params);
  return <BrandForm brandId={unwrappedParams.id} />;
}

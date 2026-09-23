'use client';
import { use } from 'react';
import UomForm from '../../../../components/masters/uoms/UomForm';

export default function EditUomPage({ params }) {
  const unwrappedParams = use(params);
  return <UomForm uomId={unwrappedParams.id} />;
}

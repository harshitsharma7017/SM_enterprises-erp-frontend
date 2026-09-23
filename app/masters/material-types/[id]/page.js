'use client';
import { use } from 'react';
import MaterialTypeForm from '../../../../components/masters/material-types/MaterialTypeForm';

export default function EditMaterialTypePage({ params }) {
  const unwrappedParams = use(params);
  return <MaterialTypeForm materialTypeId={unwrappedParams.id} />;
}

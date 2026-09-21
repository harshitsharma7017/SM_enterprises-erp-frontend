'use client';
import { use } from 'react';
import FormatForm from '../../../../components/masters/formats/FormatForm';

export default function EditFormatPage({ params }) {
  const unwrappedParams = use(params);
  return <FormatForm formatId={unwrappedParams.id} />;
}

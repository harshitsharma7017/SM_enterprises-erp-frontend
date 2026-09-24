'use client';

import { use } from 'react';
import PartyForm from '@/components/masters/suppliers/PartyForm';

export default function EditSupplierPage({ params }) {
  const { id } = use(params);
  return <PartyForm kind="supplier" id={id} />;
}

'use client';

import { use } from 'react';
import PartyShow from '@/components/masters/suppliers/PartyShow';

export default function ShowSupplierPage({ params }) {
  const { id } = use(params);
  return <PartyShow kind="supplier" id={id} />;
}

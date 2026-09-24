'use client';

import { use } from 'react';
import PartyForm from '@/components/masters/suppliers/PartyForm';

export default function EditJobberPage({ params }) {
  const { id } = use(params);
  return <PartyForm kind="jobber" id={id} />;
}

'use client';

import { use } from 'react';
import PartyShow from '@/components/masters/suppliers/PartyShow';

export default function ShowJobberPage({ params }) {
  const { id } = use(params);
  return <PartyShow kind="jobber" id={id} />;
}

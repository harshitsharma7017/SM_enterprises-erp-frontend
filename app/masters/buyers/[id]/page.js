'use client';

import { use } from 'react';
import BuyerForm from '@/components/masters/buyers/BuyerForm';

export default function EditBuyerPage({ params }) {
  const { id } = use(params);
  return <BuyerForm buyerId={id} />;
}

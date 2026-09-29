'use client';
import { use } from 'react';
import FobValueForm from '@/components/masters/fob-values/FobValueForm';

export default function EditFobValuePage({ params }) {
  const { id } = use(params);
  return <FobValueForm fobValueId={id} />;
}

'use client';
import FobValueForm from '@/components/masters/fob-values/FobValueForm';
export default function EditFobValuePage({ params }) {
  return <FobValueForm fobValueId={params.id} />;
}

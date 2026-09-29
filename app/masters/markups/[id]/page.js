'use client';
import { use } from 'react';
import MarkupForm from '@/components/masters/markups/MarkupForm';

export default function EditMarkupPage({ params }) {
  const { id } = use(params);
  return <MarkupForm markupId={id} />;
}

'use client';
import CategoryForm from '../../../../components/masters/categories/CategoryForm';
import { use } from 'react';

export default function EditCategoryPage({ params }) {
  const unwrappedParams = use(params);
  return <CategoryForm categoryId={unwrappedParams.id} />;
}

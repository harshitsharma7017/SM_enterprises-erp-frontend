'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

import ProductForm from '@/components/masters/products/ProductForm';

export default function EditProductPage({ params }) {
  const { id } = use(params);

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">Edit Product</h2>
      </div>
      
      <div className="pt-2">
        <ProductForm productId={id} />
      </div>
    </DashboardLayout>
  );
}

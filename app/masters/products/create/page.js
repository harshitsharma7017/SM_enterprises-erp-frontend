'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';

import ProductForm from '@/components/masters/products/ProductForm';

export default function CreateProductPage() {
  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">Add Product</h2>
      </div>
      
      <div className="pt-2">
        <ProductForm />
      </div>
    </DashboardLayout>
  );
}

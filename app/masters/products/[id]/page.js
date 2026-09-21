'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import ProductForm from '@/components/masters/products/ProductForm';

export default function EditProductPage({ params }) {
  const { id } = use(params);

  return (
    <DashboardLayout>
      <Header 
        title="Edit Product" 
        breadcrumbs={[
          { label: 'Masters', href: '/masters' }, 
          { label: 'Products', href: '/masters/products' }, 
          { label: 'Edit' }
        ]} 
      />
      
      <div className="p-6">
        <ProductForm productId={id} />
      </div>
    </DashboardLayout>
  );
}

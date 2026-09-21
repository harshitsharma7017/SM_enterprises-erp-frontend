'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import ProductForm from '@/components/masters/products/ProductForm';

export default function CreateProductPage() {
  return (
    <DashboardLayout>
      <Header 
        title="Add Product" 
        breadcrumbs={[
          { label: 'Masters', href: '/masters' }, 
          { label: 'Products', href: '/masters/products' }, 
          { label: 'Create' }
        ]} 
      />
      
      <div className="p-6">
        <ProductForm />
      </div>
    </DashboardLayout>
  );
}

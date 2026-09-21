'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../lib/api-client';
import Link from 'next/link';

const StatCard = ({ title, value, icon, color, linkHref, linkLabel, permission, loading, can }) => (
  <div className="col-span-1">
    <div className={`small-box ${color}`}>
      <div className="inner">
        <h3>{loading ? '—' : (typeof value === 'number' ? value.toLocaleString() : value)}</h3>
        <p>{title}</p>
      </div>
      <i className={`small-box-icon bi ${icon}`}></i>
      {linkHref && permission && can(permission) ? (
        <Link href={linkHref} className="small-box-footer">
          {linkLabel} <i className="bi bi-arrow-right-circle-fill ml-1"></i>
        </Link>
      ) : (
        <span className="small-box-footer opacity-75">{linkLabel || title}</span>
      )}
    </div>
  </div>
);

export default function DashboardPage() {
  const { can } = useAuth(true);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/dashboard/stats')
      .then(res => {
        setStats(res.data || res);
        setLoading(false);
      })
      .catch(() => {
        // Dashboard stats endpoint may not exist yet — show zeros
        setStats({
          inquiryCount: 0,
          orderConfirmationCount: 0,
          purchaseOrderCount: 0,
          openShipmentCount: 0,
          buyerOutstanding: 0,
          supplierOutstanding: 0,
        });
        setLoading(false);
      });
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900" style={{ fontWeight: 600 }}>Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Inquiries"
          value={stats?.inquiryCount}
          icon="bi-inbox-fill"
          color="bg-blue-600"
          linkHref="/sales/inquiries"
          linkLabel="View Inquiries"
          permission="inquiry.view"
          loading={loading}
          can={can}
        />
        <StatCard
          title="Order Confirmations"
          value={stats?.orderConfirmationCount}
          icon="bi-cart-check-fill"
          color="bg-green-600"
          linkHref="/sales/order-confirmations"
          linkLabel="View Order Confirmations"
          permission="order-confirmation.view"
          loading={loading}
          can={can}
        />
        <StatCard
          title="Purchase Orders"
          value={stats?.purchaseOrderCount}
          icon="bi-cart3"
          color="bg-cyan-500"
          linkHref="/procurement/purchase-orders"
          linkLabel="View Purchase Orders"
          permission="purchase-order.view"
          loading={loading}
          can={can}
        />
        <StatCard
          title="Open Shipments"
          value={stats?.openShipmentCount}
          icon="bi-truck"
          color="bg-amber-500"
          linkHref="/export/documents"
          linkLabel="View Export Documents"
          permission="export-document.view"
          loading={loading}
          can={can}
        />
        <StatCard
          title="Buyer Outstanding"
          value={stats?.buyerOutstanding != null ? Number(stats.buyerOutstanding).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          icon="bi-cash-stack"
          color="bg-red-600"
          linkHref="/reports/outstanding"
          linkLabel="View Outstanding"
          permission="outstanding.view"
          loading={loading}
          can={can}
        />
        <StatCard
          title="Supplier Outstanding"
          value={stats?.supplierOutstanding != null ? Number(stats.supplierOutstanding).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          icon="bi-building"
          color="bg-gray-800"
          linkHref="/reports/outstanding"
          linkLabel="View Outstanding"
          permission="outstanding.view"
          loading={loading}
          can={can}
        />
      </div>

      {/* Charts placeholder — will be connected when dashboard stats API is ready */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            <i className="bi bi-graph-up-arrow mr-1"></i>Pipeline Trend (6 Months)
          </h3>
          <div className="flex items-center justify-center text-gray-400 text-sm" style={{ minHeight: 310 }}>
            <div className="text-center">
              <i className="bi bi-bar-chart text-4xl mb-2 block opacity-30"></i>
              <p>Charts will render once the dashboard stats API is connected.</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            <i className="bi bi-pie-chart-fill mr-1"></i>Inquiry Status Distribution
          </h3>
          <div className="flex items-center justify-center text-gray-400 text-sm" style={{ minHeight: 310 }}>
            <div className="text-center">
              <i className="bi bi-pie-chart text-4xl mb-2 block opacity-30"></i>
              <p>Charts will render once the dashboard stats API is connected.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

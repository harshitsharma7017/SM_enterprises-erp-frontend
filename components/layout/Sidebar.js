'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

/**
 * Sidebar — faithful reproduction of the original Guru Traders ERP sidebar.
 *
 * Sections match config/permissions.php groups, in the same order:
 *   Masters → Sales → Planning → Procurement → Inventory → Production → Dispatch → Export → Finance → Reports → Administration
 *
 * Every entry is permission-gated. A section header only renders when the user
 * can see at least one of its children.
 */
function NavItem({ href, icon, label, permission, treeview, can, collapsed, isActive }) {
  if (permission && !can(permission)) return null;
  const active = isActive(href);
  return (
    <li>
      <Link
        href={href}
        className={`sidebar-link ${active ? 'active' : ''} ${treeview ? 'treeview-child' : ''}`}
      >
        <span className="sidebar-icon">
          <i className={`bi ${icon}`}></i>
        </span>
        {!collapsed && <span>{label}</span>}
      </Link>
    </li>
  );
}

export default function Sidebar({ can, canAny, collapsed, onToggleCollapse }) {
  const pathname = usePathname();
  const [userMgmtOpen, setUserMgmtOpen] = useState(
    pathname.startsWith('/user-management') && !pathname.startsWith('/user-management/company-profile')
  );

  const isActive = (path) => pathname.startsWith(path);


  return (
    <aside
      className={`${collapsed ? 'w-[4.6rem]' : 'w-64'} bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col h-screen transition-all duration-200 flex-shrink-0`}
      style={{ minHeight: '100vh' }}
    >
      {/* Brand */}
      <div className="flex items-center px-4 border-b border-[var(--sidebar-border)]" style={{ padding: '0.9rem 1rem' }}>
        <Link href="/dashboard" className="flex items-center gap-2.5 no-underline flex-1 min-w-0">
          <span
            className="flex-shrink-0 grid place-items-center rounded-[10px]"
            style={{
              width: 38, height: 38,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.28)',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem',
            }}
          >
            GT
          </span>
          {!collapsed && (
            <span className="flex flex-col leading-tight">
              <span style={{ fontWeight: 600, fontSize: '0.98rem', color: '#111827' }}>
                Guru Traders
              </span>
              <small style={{ fontSize: '0.68rem', fontWeight: 500, color: '#9aa4b2', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Export ERP
              </small>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex-shrink-0 grid place-items-center border-0 rounded-[7px] bg-transparent text-[#9aa4b2] hover:bg-[#f3f6fa] hover:text-[#2563eb] cursor-pointer transition-colors"
          style={{ width: 28, height: 28, fontSize: '0.8rem' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`bi ${collapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`}></i>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll mt-2">
        <ul className="list-none p-0 m-0">

          {/* Dashboard */}
          <li>
            <Link
              href="/dashboard"
              className={`sidebar-link ${pathname === '/dashboard' ? 'active' : ''}`}
            >
              <span className="sidebar-icon"><i className="bi bi-grid-1x2"></i></span>
              {!collapsed && <span>Dashboard</span>}
            </Link>
          </li>

          {/* ═══════ MASTERS ═══════ */}
          {canAny(['category.view', 'po-format.view', 'product.view', 'material-type.view', 'uom.view', 'buyer.view', 'brand.view', 'supplier.view', 'jobber.view', 'agent.view', 'fob-value.view', 'markup.view']) && (
            <>
              {!collapsed && <li className="nav-header">Masters</li>}
              <NavItem href="/masters/categories" icon="bi-tags" label="Categories" permission="category.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/masters/formats" icon="bi-file-earmark-ruled" label="Order Formats" permission="po-format.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/masters/products" icon="bi-box-seam" label="Products" permission="product.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/masters/material-types" icon="bi-diagram-3" label="Material Types" permission="material-type.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/masters/uoms" icon="bi-rulers" label="UOM" permission="uom.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/masters/buyers" icon="bi-globe-asia-australia" label="Buyers" permission="buyer.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/masters/brands" icon="bi-award" label="Brands" permission="brand.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/masters/suppliers" icon="bi-truck" label="Suppliers" permission="supplier.view" can={can} collapsed={collapsed} isActive={isActive} />
              {(can('jobber.view') || can('supplier.view')) && (
                <NavItem href="/masters/jobbers" icon="bi-tools" label="Jobbers" can={can} collapsed={collapsed} isActive={isActive} />
              )}
              <NavItem href="/masters/agents" icon="bi-person-badge" label="Agents" permission="agent.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/masters/fob-values" icon="bi-currency-dollar" label="FOB Values" permission="fob-value.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/masters/markups" icon="bi-percent" label="Markup" permission="markup.view" can={can} collapsed={collapsed} isActive={isActive} />
            </>
          )}

          {/* ═══════ SALES ═══════ */}
          {canAny(['inquiry.view', 'order-confirmation.view']) && (
            <>
              {!collapsed && <li className="nav-header">Sales</li>}
              <NavItem href="/sales/inquiries" icon="bi-chat-square-text" label="Inquiries" permission="inquiry.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/sales/order-confirmations" icon="bi-check2-square" label="Order Confirmations" permission="order-confirmation.view" can={can} collapsed={collapsed} isActive={isActive} />
            </>
          )}

          {/* ═══════ PLANNING ═══════ */}
          {canAny(['brand-projection.view', 'material-requirement.view', 'material-plan.view']) && (
            <>
              {!collapsed && <li className="nav-header">Planning</li>}
              <NavItem href="/planning/brand-projections" icon="bi-graph-up-arrow" label="Brand Projections" permission="brand-projection.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/planning/material-requirements" icon="bi-list-check" label="Material Requirements" permission="material-requirement.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/planning/material-plans" icon="bi-calendar2-week" label="Material Plans" permission="material-plan.view" can={can} collapsed={collapsed} isActive={isActive} />
            </>
          )}

          {/* ═══════ PROCUREMENT ═══════ */}
          {canAny(['purchase-order.view', 'inward-entry.view', 'supplier-return.view']) && (
            <>
              {!collapsed && <li className="nav-header">Procurement</li>}
              <NavItem href="/procurement/purchase-orders" icon="bi-cart-check" label="Purchase Orders" permission="purchase-order.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/procurement/grn" icon="bi-box-arrow-in-down" label="Goods Receipts (GRN)" permission="inward-entry.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/procurement/lots" icon="bi-stack" label="Lots" permission="inward-entry.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/quality-control" icon="bi-clipboard-check" label="Quality Control" permission="inward-entry.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/procurement/returns" icon="bi-box-arrow-up" label="Supplier Returns" permission="supplier-return.view" can={can} collapsed={collapsed} isActive={isActive} />
            </>
          )}

          {/* ═══════ INVENTORY ═══════ */}
          {canAny(['stock.view', 'stock.ledger', 'stock-location.view']) && (
            <>
              {!collapsed && <li className="nav-header">Inventory</li>}
              <NavItem href="/inventory/stock" icon="bi-boxes" label="Stock" permission="stock.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/inventory/ledger" icon="bi-journal-text" label="Stock Ledger" permission="stock.ledger" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/inventory/locations" icon="bi-geo-alt" label="Stock Locations" permission="stock-location.view" can={can} collapsed={collapsed} isActive={isActive} />
            </>
          )}

          {/* ═══════ PRODUCTION ═══════ */}
          {canAny(['material-issue.view', 'processing.view']) && (
            <>
              {!collapsed && <li className="nav-header">Production</li>}
              <NavItem href="/production/material-issues" icon="bi-box-arrow-right" label="Material Issues" permission="material-issue.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/production/processing" icon="bi-gear-wide-connected" label="Processing" permission="processing.view" can={can} collapsed={collapsed} isActive={isActive} />
            </>
          )}

          {/* ═══════ DISPATCH ═══════ */}
          {canAny(['dispatch.view']) && (
            <>
              {!collapsed && <li className="nav-header">Dispatch</li>}
              <NavItem href="/dispatch" icon="bi-truck" label="Dispatches" permission="dispatch.view" can={can} collapsed={collapsed} isActive={isActive} />
            </>
          )}

          {/* ═══════ EXPORT ═══════ */}
          {canAny(['packing.view', 'export-document.view']) && (
            <>
              {!collapsed && <li className="nav-header">Export</li>}
              <NavItem href="/export/packing" icon="bi-boxes" label="Packing" permission="packing.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/export/documents" icon="bi-files" label="Export Documents" permission="export-document.view" can={can} collapsed={collapsed} isActive={isActive} />
            </>
          )}

          {/* ═══════ FINANCE ═══════ */}
          {canAny(['proforma-invoice.view', 'invoice.view', 'purchase-bill.view', 'debit-note.view', 'payment.view', 'foreign-payment.view', 'agent-commission.view']) && (
            <>
              {!collapsed && <li className="nav-header">Finance</li>}
              <NavItem href="/finance/proforma-invoices" icon="bi-file-earmark-text" label="Proforma Invoices" permission="proforma-invoice.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/finance/invoices" icon="bi-file-earmark-check" label="Invoices" permission="invoice.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/finance/purchase-bills" icon="bi-receipt" label="Purchase Bills" permission="purchase-bill.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/finance/debit-notes" icon="bi-file-earmark-minus" label="Debit Notes" permission="debit-note.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/finance/supplier-payments" icon="bi-cash-coin" label="Supplier Payments" permission="payment.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/finance/buyer-receipts" icon="bi-currency-exchange" label="Buyer Receipts" permission="foreign-payment.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/finance/agent-commission" icon="bi-cash-stack" label="Agent Commission" permission="agent-commission.view" can={can} collapsed={collapsed} isActive={isActive} />
            </>
          )}

          {/* ═══════ REPORTS ═══════ */}
          {canAny(['outstanding.view', 'report.view']) && (
            <>
              {!collapsed && <li className="nav-header">Reports</li>}
              <NavItem href="/reports/outstanding" icon="bi-hourglass-split" label="Outstanding" permission="outstanding.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/reports" icon="bi-bar-chart-line" label="Reports" permission="report.view" can={can} collapsed={collapsed} isActive={isActive} />
            </>
          )}

          {/* ═══════ ADMINISTRATION ═══════ */}
          {canAny(['user.view', 'role.view', 'permission.view', 'company-profile.view', 'company.view']) && (
            <>
              {!collapsed && <li className="nav-header">Administration</li>}
              <NavItem href="/administration/company-profile" icon="bi-buildings" label="Company Profile" permission="company-profile.view" can={can} collapsed={collapsed} isActive={isActive} />
              <NavItem href="/administration/companies" icon="bi-building" label="Companies" permission="company.view" can={can} collapsed={collapsed} isActive={isActive} />

              {/* User Management treeview */}
              {canAny(['user.view', 'role.view', 'permission.view']) && (
                <li>
                  <button
                    type="button"
                    onClick={() => setUserMgmtOpen(!userMgmtOpen)}
                    className={`sidebar-link w-full text-left ${isActive('/user-management') ? 'active' : ''}`}
                    style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    <span className="sidebar-icon"><i className="bi bi-people"></i></span>
                    {!collapsed && (
                      <>
                        <span className="flex-1">User Management</span>
                        <i className={`bi ${userMgmtOpen ? 'bi-chevron-down' : 'bi-chevron-right'} text-xs opacity-50`}></i>
                      </>
                    )}
                  </button>
                  {userMgmtOpen && !collapsed && (
                    <ul className="list-none p-0 m-0">
                      <NavItem href="/user-management/users" icon="bi-dot" label="Users" permission="user.view" treeview can={can} collapsed={collapsed} isActive={isActive} />
                      <NavItem href="/user-management/roles" icon="bi-dot" label="Roles" permission="role.view" treeview can={can} collapsed={collapsed} isActive={isActive} />
                      <NavItem href="/user-management/permissions" icon="bi-dot" label="Permissions" permission="permission.view" treeview can={can} collapsed={collapsed} isActive={isActive} />
                    </ul>
                  )}
                </li>
              )}
            </>
          )}

        </ul>
      </nav>
    </aside>
  );
}

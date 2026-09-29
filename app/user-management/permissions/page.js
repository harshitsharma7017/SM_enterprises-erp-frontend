'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { apiClient } from '@/lib/api-client';
import { GROUPS, actionLabel } from '@/components/administration/permissionRegistry';

/**
 * Permissions — mirrors the original ERP's user-management/permissions/index.blade.php:
 * a read-only, grouped (Masters/Sales/.../Administration, in that order)
 * list of every permission with its module, action, and how many roles
 * currently grant it.
 *
 * Two things from the original are intentionally NOT here: the config/DB
 * diff warning and the "Sync from Config" button. Both assume a separate
 * declarative permissions file the database can drift from and be
 * re-synced against (config/permissions.php + `permission:sync`). The Node
 * backend has no such file — permissions live only in the database, seeded
 * once — so there is nothing genuine to diff or sync here. Faking either
 * would misrepresent what this app actually does.
 */
export default function PermissionsIndexPage() {
  const [permissions, setPermissions] = useState([]);
  const [usageByName, setUsageByName] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openGroup, setOpenGroup] = useState(Object.keys(GROUPS)[0]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [permsRes, rolesRes] = await Promise.all([
        apiClient.get('/user-management/permissions'),
        apiClient.get('/user-management/roles'),
      ]);
      setPermissions(permsRes.data || []);

      const roleDetails = await Promise.all(
        (rolesRes.data || []).map((r) => apiClient.get(`/user-management/roles/${r.id}`).catch(() => null))
      );
      const usage = new Map();
      roleDetails.forEach((detail) => {
        (detail?.data?.permissions || []).forEach((p) => usage.set(p.name, (usage.get(p.name) || 0) + 1));
      });
      setUsageByName(usage);
    } catch (err) {
      console.error(err);
      setError(err.data?.error || err.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(fetchData);
  }, [fetchData]);

  const byGroup = new Map();
  permissions.forEach((p) => {
    const group = p.group_name || 'Ungrouped';
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push(p);
  });
  const orderedGroups = [...Object.keys(GROUPS), ...[...byGroup.keys()].filter((g) => !GROUPS[g])];

  return (
    <DashboardLayout>
      <PageHeading title="Permissions" />

      <div className="bg-surface-raised border border-line rounded p-3 mb-4 text-sm text-fg-muted">
        <i className="bi bi-info-circle mr-1"></i>
        Permissions are read-only here — they&apos;re seeded directly into the database rather than declared in a
        separate config file, so there&apos;s no config/database diff or &quot;Sync from Config&quot; action to show.
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <Card title="Registered Permissions" variant="primary" actions={<span className="text-xs bg-surface-raised border border-line text-fg-muted px-2 py-1 rounded">{permissions.length} total</span>}>
        {loading ? (
          <div className="p-4 text-fg-subtle">Loading permissions...</div>
        ) : (
          <div className="border border-line rounded-md divide-y divide-line">
            {orderedGroups.filter((g) => byGroup.has(g)).map((group) => {
              const rows = byGroup.get(group) || [];
              const isOpen = openGroup === group;
              return (
                <div key={group}>
                  <button
                    type="button"
                    onClick={() => setOpenGroup(isOpen ? null : group)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-raised hover:bg-surface-hover text-left"
                  >
                    <span className="font-semibold text-sm text-fg">{group}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs bg-surface border border-line text-fg-muted px-2 py-0.5 rounded">{rows.length}</span>
                      <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'} text-xs text-fg-subtle`}></i>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead className="border-b border-line">
                          <tr>
                            <th>Permission</th>
                            <th className="w-40">Module</th>
                            <th className="w-32">Action</th>
                            <th className="text-center w-32">Used by roles</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((p) => {
                            const [moduleName, action] = p.name.split(/\.(.+)/);
                            return (
                              <tr key={p.id}>
                                <td className="font-mono cell-strong">{p.name}</td>
                                <td>{moduleName}</td>
                                <td>{actionLabel(action)}</td>
                                <td className="text-center">
                                  <span className={`text-xs border px-2 py-0.5 rounded ${usageByName.get(p.name) > 0 ? 'bg-surface-raised border-line text-fg-muted' : 'bg-surface-raised border-line text-fg-subtle'}`}>
                                    {usageByName.get(p.name) || 0}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}

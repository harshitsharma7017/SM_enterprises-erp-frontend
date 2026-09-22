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

      <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4 text-sm text-gray-600">
        <i className="bi bi-info-circle mr-1"></i>
        Permissions are read-only here — they&apos;re seeded directly into the database rather than declared in a
        separate config file, so there&apos;s no config/database diff or &quot;Sync from Config&quot; action to show.
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

      <Card title="Registered Permissions" variant="primary" actions={<span className="text-xs bg-gray-100 border border-gray-200 text-gray-600 px-2 py-1 rounded">{permissions.length} total</span>}>
        {loading ? (
          <div className="p-4 text-gray-500">Loading permissions...</div>
        ) : (
          <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
            {orderedGroups.filter((g) => byGroup.has(g)).map((group) => {
              const rows = byGroup.get(group) || [];
              const isOpen = openGroup === group;
              return (
                <div key={group}>
                  <button
                    type="button"
                    onClick={() => setOpenGroup(isOpen ? null : group)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-left"
                  >
                    <span className="font-semibold text-sm text-gray-800">{group}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded">{rows.length}</span>
                      <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'} text-xs text-gray-400`}></i>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm text-left">
                        <thead className="bg-white text-gray-500 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2 font-medium">Permission</th>
                            <th className="px-4 py-2 font-medium w-40">Module</th>
                            <th className="px-4 py-2 font-medium w-32">Action</th>
                            <th className="px-4 py-2 font-medium text-center w-32">Used by roles</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {rows.map((p) => {
                            const [moduleName, action] = p.name.split(/\.(.+)/);
                            return (
                              <tr key={p.id}>
                                <td className="px-4 py-2 font-mono text-xs text-gray-800">{p.name}</td>
                                <td className="px-4 py-2 text-gray-500">{moduleName}</td>
                                <td className="px-4 py-2 text-gray-500">{actionLabel(action)}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`text-xs border px-2 py-0.5 rounded ${usageByName.get(p.name) > 0 ? 'bg-gray-100 border-gray-200 text-gray-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
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

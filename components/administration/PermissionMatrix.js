'use client';

import { useState, useMemo } from 'react';
import { GROUPS, ALL_ACTIONS, actionLabel } from './permissionRegistry';

/**
 * Permission matrix — mirrors the original ERP's roles/_matrix.blade.php:
 * rows are modules (grouped into 7 accordion sections), columns are actions,
 * a checkbox only renders where the module actually declares that action.
 * `permissions` is the live backend list (from GET /user-management/permissions),
 * used to skip any module.action cell that isn't actually seeded server-side.
 */
export default function PermissionMatrix({ permissions, selected, onChange, readonly = false }) {
  const [openGroup, setOpenGroup] = useState(Object.keys(GROUPS)[0]);
  const existingNames = useMemo(() => new Set((permissions || []).map((p) => p.name)), [permissions]);
  const selectedSet = useMemo(() => new Set(selected || []), [selected]);

  const toggle = (name, checked) => {
    if (readonly) return;
    const next = new Set(selectedSet);
    checked ? next.add(name) : next.delete(name);
    onChange(Array.from(next));
  };

  const setMany = (names, checked) => {
    if (readonly) return;
    const next = new Set(selectedSet);
    names.forEach((name) => (checked ? next.add(name) : next.delete(name)));
    onChange(Array.from(next));
  };

  const allMatrixNames = useMemo(() => {
    const names = [];
    Object.values(GROUPS).forEach((modules) => {
      Object.entries(modules).forEach(([moduleKey, meta]) => {
        (meta.actions || ['view', 'create', 'edit', 'delete']).forEach((action) => {
          const name = `${moduleKey}.${action}`;
          if (existingNames.has(name)) names.push(name);
        });
      });
    });
    return names;
  }, [existingNames]);

  const selectedCount = allMatrixNames.filter((n) => selectedSet.has(n)).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {!readonly && (
          <>
            <button type="button" onClick={() => setMany(allMatrixNames, true)} className="text-xs border border-line-strong text-link hover:bg-surface-hover px-2 py-1 rounded">
              <i className="bi bi-check-all mr-1"></i>Select all
            </button>
            <button type="button" onClick={() => setMany(allMatrixNames, false)} className="text-xs border border-line-strong text-fg-muted hover:bg-surface-hover px-2 py-1 rounded">
              <i className="bi bi-x-lg mr-1"></i>Clear all
            </button>
            <span className="h-4 w-px bg-gray-300 mx-1" />
            {ALL_ACTIONS.map((action) => {
              const columnNames = allMatrixNames.filter((n) => n.endsWith(`.${action}`));
              if (columnNames.length === 0) return null;
              return (
                <button
                  key={action}
                  type="button"
                  onClick={() => setMany(columnNames, !columnNames.every((n) => selectedSet.has(n)))}
                  className="text-xs border border-line-strong text-fg-muted hover:bg-surface-hover px-2 py-1 rounded"
                >
                  All {actionLabel(action).toLowerCase()}
                </button>
              );
            })}
          </>
        )}
        <span className="ml-auto text-xs bg-surface-raised border border-line text-fg-muted px-2 py-1 rounded">
          {selectedCount} selected
        </span>
      </div>

      <div className="border border-line rounded-md divide-y divide-line">
        {Object.entries(GROUPS).map(([groupName, modules]) => {
          const groupNames = Object.entries(modules).flatMap(([moduleKey, meta]) =>
            (meta.actions || ['view', 'create', 'edit', 'delete'])
              .map((action) => `${moduleKey}.${action}`)
              .filter((name) => existingNames.has(name))
          );
          const grantedInGroup = groupNames.filter((n) => selectedSet.has(n)).length;
          const isOpen = openGroup === groupName;

          return (
            <div key={groupName}>
              <button
                type="button"
                onClick={() => setOpenGroup(isOpen ? null : groupName)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-raised hover:bg-surface-hover text-left"
              >
                <span className="font-semibold text-sm text-fg">{groupName}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs bg-surface border border-line text-fg-muted px-2 py-0.5 rounded">{grantedInGroup}/{groupNames.length}</span>
                  <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'} text-xs text-fg-subtle`}></i>
                </span>
              </button>

              {isOpen && (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead className="border-b border-line">
                      <tr>
                        <th className="min-w-[200px]">Module</th>
                        {ALL_ACTIONS.map((action) => (
                          <th key={action} className="text-center w-20">{actionLabel(action)}</th>
                        ))}
                        {!readonly && <th className="text-center w-16">All</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(modules).map(([moduleKey, meta]) => {
                        const moduleActionsList = meta.actions || ['view', 'create', 'edit', 'delete'];
                        const moduleNames = moduleActionsList.map((a) => `${moduleKey}.${a}`).filter((n) => existingNames.has(n));
                        const allChecked = moduleNames.length > 0 && moduleNames.every((n) => selectedSet.has(n));

                        return (
                          <tr key={moduleKey}>
                            <td>
                              <div className="font-medium text-fg">{meta.label}</div>
                              <div className="text-xs text-fg-subtle font-mono">{moduleKey}.*</div>
                            </td>
                            {ALL_ACTIONS.map((action) => {
                              const name = `${moduleKey}.${action}`;
                              const applicable = moduleActionsList.includes(action) && existingNames.has(name);
                              return (
                                <td key={action} className="text-center">
                                  {applicable ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedSet.has(name)}
                                      disabled={readonly}
                                      onChange={(e) => toggle(name, e.target.checked)}
                                      className="w-4 h-4"
                                    />
                                  ) : (
                                    <span className="text-[var(--control-fg-disabled)]">—</span>
                                  )}
                                </td>
                              );
                            })}
                            {!readonly && (
                              <td className="text-center">
                                <input
                                  type="checkbox"
                                  checked={allChecked}
                                  onChange={(e) => setMany(moduleNames, e.target.checked)}
                                  className="w-4 h-4"
                                  title="Toggle whole row"
                                />
                              </td>
                            )}
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
    </div>
  );
}

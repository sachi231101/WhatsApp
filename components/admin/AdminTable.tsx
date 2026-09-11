'use client';

import React from 'react';
import { Loader2, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export interface AdminTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

export function AdminTable<T extends Record<string, any>>({
  columns,
  data,
  loading,
  emptyMessage = 'No data found.',
  page,
  pageSize,
  total,
  onPageChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  onRefresh,
}: {
  columns: AdminTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  onRefresh?: () => void;
}) {
  const totalPages = page !== undefined && pageSize !== undefined && total !== undefined ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  return (
    <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl overflow-hidden">
      {(onSearchChange || filters || onRefresh) && (
        <div className="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            {onSearchChange && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  value={searchValue || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-white/[0.04] border border-white/[0.06] focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 outline-none"
                />
              </div>
            )}
            {filters}
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button onClick={onRefresh} className="px-3 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 cursor-pointer">
                Refresh
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-3 text-[11px] font-bold text-white/40 uppercase tracking-wider whitespace-nowrap ${c.className || ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
                  <p className="text-xs text-white/40 mt-2">Loading…</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-xs text-white/40">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={(row.id as string) || idx} className="hover:bg-white/[0.02] transition-colors">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 text-xs text-white/80 ${c.className || ''}`}>
                      {c.render ? c.render(row, idx) : String((row as any)[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {page !== undefined && total !== undefined && (
        <div className="p-4 border-t border-white/[0.06] flex items-center justify-between">
          <p className="text-[11px] text-white/40">
            Page {page} of {totalPages} • {total} total
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/60 disabled:opacity-30 hover:bg-white/[0.10] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/60 disabled:opacity-30 hover:bg-white/[0.10] cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminBadge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const map: Record<string, string> = {
    default: 'bg-white/[0.06] text-white/60 border-white/[0.08]',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${map[variant]}`}>{children}</span>;
}

export function AdminEmpty({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-12">
      <p className="text-sm font-bold text-white">{title}</p>
      {description && <p className="text-xs text-white/40 mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

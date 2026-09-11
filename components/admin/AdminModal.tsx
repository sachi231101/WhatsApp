'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export function AdminModal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-[#11141f] border border-white/[0.08] rounded-3xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="p-6 border-b border-white/[0.06] flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            {description && <p className="text-xs text-white/40 mt-1">{description}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/[0.06] text-white/40 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#11141f] border border-white/[0.08] rounded-3xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${variant === 'danger' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">{title}</h3>
            {description && <p className="text-xs text-white/50 mt-1 leading-relaxed">{description}</p>}
            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-semibold text-white/70 hover:text-white hover:bg-white/[0.10] cursor-pointer">
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer ${variant === 'danger' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}
              >
                {loading ? 'Please wait…' : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

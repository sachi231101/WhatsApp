import React from 'react';
import Link from 'next/link';
import { ArrowRight, MessageSquare, LucideIcon } from 'lucide-react';

interface EmptyStateModuleProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  actionHref?: string;
  actionText?: string;
}

export default function EmptyStateModule({
  title,
  description = 'This feature will be available after you complete your WhatsApp setup.',
  icon: Icon = MessageSquare,
  badge,
  actionHref = '/projects',
  actionText = 'Configure WhatsApp',
}: EmptyStateModuleProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center bg-white border border-gray-100 rounded-3xl p-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-4">
          <Icon className="w-7 h-7" />
        </div>

        {badge && (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 mb-2">
            {badge}
          </span>
        )}

        <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-2">
          {title}
        </h2>

        <p className="text-xs text-gray-500 leading-relaxed mb-6">
          {description}
        </p>

        {actionHref && (
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <span>{actionText}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

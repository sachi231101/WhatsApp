'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Workflow,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Layers,
} from 'lucide-react';

export default function NewAutomationPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = (params?.id || params?.projectId) as string;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ name: boolean; description: boolean }>({
    name: false,
    description: false,
  });

  // Project & Role state
  const [projectName, setProjectName] = useState<string>('Project');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  // Load project context and user role
  useEffect(() => {
    async function loadProjectInfo() {
      if (!projectId) return;
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setProjectName(json.data.name || 'Project');
            if (json.data.userRole) {
              setUserRole(json.data.userRole.toLowerCase());
            }
          }
        }
      } catch {
        // Handled silently
      } finally {
        setIsLoadingRole(false);
      }
    }

    loadProjectInfo();
  }, [projectId]);

  // Validation
  const trimmedName = name.trim();
  const nameError =
    touched.name && !trimmedName
      ? 'Automation name is required'
      : touched.name && trimmedName.length < 2
      ? 'Automation name must be at least 2 characters'
      : trimmedName.length > 255
      ? 'Automation name cannot exceed 255 characters'
      : null;

  const descError =
    description.length > 2000
      ? 'Description cannot exceed 2000 characters'
      : null;

  const isFormValid =
    trimmedName.length >= 2 &&
    trimmedName.length <= 255 &&
    description.length <= 2000;

  // Role permissions: Only OWNER, ADMIN, MANAGER can create
  const canCreate =
    !userRole || ['owner', 'admin', 'manager'].includes(userRole);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, description: true });

    if (!isFormValid) {
      if (!trimmedName) {
        setError('Please provide a name for your automation.');
      } else if (trimmedName.length < 2) {
        setError('Automation name must be at least 2 characters long.');
      } else if (trimmedName.length > 255) {
        setError('Automation name cannot exceed 255 characters.');
      } else if (description.length > 2000) {
        setError('Description cannot exceed 2000 characters.');
      }
      return;
    }

    if (!canCreate) {
      setError('You do not have permission to create automations in this project.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json.status !== 'ok') {
        if (res.status === 401) {
          setError('Your session has expired. Please log in again.');
        } else if (res.status === 403) {
          setError('Forbidden: You do not have sufficient permissions to create automations.');
        } else if (res.status === 404) {
          setError('Project not found or you do not have access to this workspace.');
        } else if (res.status === 409) {
          setError(
            json.error || `An automation named "${trimmedName}" already exists in this project.`
          );
        } else {
          setError(json.error || 'A system error occurred while creating the automation. Please try again.');
        }
        return;
      }

      const automationId = json.data?.automation?.id;
      if (automationId) {
        router.push(`/projects/${projectId}/automations/${automationId}`);
      } else {
        router.push(`/projects/${projectId}/automations`);
      }
    } catch {
      setError('Network error: Unable to reach the server. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/projects/${projectId}/automations`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Automations</span>
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-xs font-medium text-gray-400">{projectName}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Create Automation
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Configure initial details for your new automation workflow.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          {/* Permission warning for read-only roles */}
          {!isLoadingRole && !canCreate && (
            <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <p className="font-semibold">Read-Only Permission</p>
                <p className="mt-0.5">
                  You are viewing this project as a <strong>{userRole}</strong>. Creating automations requires an Administrator or Manager role.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Error Banner */}
            {error && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700 font-medium"
              >
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Unable to create automation</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Automation Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="automation-name"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider"
                >
                  Automation Name <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-gray-400 font-medium">
                  {name.length}/255
                </span>
              </div>
              <input
                id="automation-name"
                name="name"
                type="text"
                required
                disabled={isSubmitting || !canCreate}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                placeholder="Course Inquiry Automation"
                maxLength={255}
                className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  nameError
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-gray-200 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-gray-300'
                } disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed`}
              />
              {nameError ? (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {nameError}
                </p>
              ) : (
                <p className="text-[11px] text-gray-500">
                  Give your workflow a clear, recognizable name that reflects its business purpose.
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="automation-description"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider"
                >
                  Description <span className="text-gray-400 font-normal lowercase">(optional)</span>
                </label>
                <span className="text-[11px] text-gray-400 font-medium">
                  {description.length}/2000
                </span>
              </div>
              <textarea
                id="automation-description"
                name="description"
                rows={4}
                disabled={isSubmitting || !canCreate}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, description: true }))}
                placeholder="Describe what triggers this workflow, which customer messages it handles, and its expected business outcomes..."
                maxLength={2000}
                className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  descError
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-gray-200 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-gray-300'
                } disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed`}
              />
              {descError ? (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {descError}
                </p>
              ) : (
                <p className="text-[11px] text-gray-500">
                  Help your team understand the workflow purpose, triggers, and expected outcomes.
                </p>
              )}
            </div>

            {/* Workflow Default State Card */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/70 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Default Workflow State</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Your new automation will be created in <strong className="text-gray-900">DRAFT</strong> status with an initial <strong className="text-gray-900">Version 1 (Draft)</strong>. No active messages or background jobs will run until you configure triggers and publish.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-gray-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Initial Status: DRAFT</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Initial Version: v1 (Draft)</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <Link
                href={`/projects/${projectId}/automations`}
                className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !canCreate}
                className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating Automation...</span>
                  </>
                ) : (
                  <>
                    <Workflow className="w-3.5 h-3.5" />
                    <span>Create Automation</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

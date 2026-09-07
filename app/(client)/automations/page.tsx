'use client';

import { useState } from 'react';
import {
  Zap,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Bot,
  UserCheck,
  Send,
} from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  triggerIcon: React.ElementType;
  action: string;
  actionIcon: React.ElementType;
  isActive: boolean;
  executions: number;
  lastRun: string;
}

const INITIAL_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-01',
    name: 'Auto-Qualify Inbound Leads',
    trigger: 'New contact initiates chat on WhatsApp',
    triggerIcon: Clock,
    action: 'Trigger AI Sales Closer agent & score intent',
    actionIcon: Bot,
    isActive: true,
    executions: 1240,
    lastRun: '3 mins ago',
  },
  {
    id: 'wf-02',
    name: 'Hot Lead Instant Human Takeover',
    trigger: 'Lead score exceeds 80 or customer asks for human',
    triggerIcon: Zap,
    action: 'Assign to Senior Sales Rep & notify team on Slack',
    actionIcon: UserCheck,
    isActive: true,
    executions: 312,
    lastRun: '15 mins ago',
  },
  {
    id: 'wf-03',
    name: '24-Hour Care Window Expiration Reminder',
    trigger: 'WhatsApp 24h window has 2 hours remaining',
    triggerIcon: Clock,
    action: 'Send polite pre-approved follow-up template',
    actionIcon: Send,
    isActive: true,
    executions: 580,
    lastRun: '1 hour ago',
  },
  {
    id: 'wf-04',
    name: 'Post-Call Customer Satisfaction Survey',
    trigger: 'Voice WebRTC call terminates successfully',
    triggerIcon: CheckCircle2,
    action: 'Send interactive 1-5 star CSAT rating bubble',
    actionIcon: Sparkles,
    isActive: false,
    executions: 94,
    lastRun: 'Yesterday',
  },
];

export default function AutomationsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(INITIAL_WORKFLOWS);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('New message from customer');
  const [action, setAction] = useState('Trigger AI Agent response');

  const handleToggle = (id: string) => {
    setWorkflows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isActive: !w.isActive } : w))
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newWf: Workflow = {
      id: 'wf-' + Date.now(),
      name: name.trim(),
      trigger,
      triggerIcon: Clock,
      action,
      actionIcon: Bot,
      isActive: true,
      executions: 0,
      lastRun: 'Just created',
    };

    setWorkflows((prev) => [newWf, ...prev]);
    setShowModal(false);
    setName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Automations & Workflows
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Automate lead routing, template follow-ups, and AI triggers without writing code.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-sm font-semibold text-white shadow-lg shadow-yellow-900/30 hover:opacity-90 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Automation
        </button>
      </div>

      {/* Workflows List */}
      <div className="space-y-3">
        {workflows.map((wf) => {
          const TriggerIcon = wf.triggerIcon;
          const ActionIcon = wf.actionIcon;

          return (
            <div
              key={wf.id}
              className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-5 flex items-center justify-between hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-6 flex-1 min-w-0 mr-4">
                {/* Switch */}
                <input
                  type="checkbox"
                  checked={wf.isActive}
                  onChange={() => handleToggle(wf.id)}
                  className="toggle accent-green-500 cursor-pointer flex-shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white mb-2">{wf.name}</h3>

                  {/* Flow Pills */}
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    {/* Trigger */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/70">
                      <TriggerIcon className="w-3.5 h-3.5 text-blue-400" />
                      <span className="font-semibold text-white/40 text-[10px] uppercase">WHEN</span>
                      <span>{wf.trigger}</span>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />

                    {/* Action */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/70">
                      <ActionIcon className="w-3.5 h-3.5 text-green-400" />
                      <span className="font-semibold text-white/40 text-[10px] uppercase">THEN</span>
                      <span>{wf.action}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-right flex-shrink-0">
                <div>
                  <p className="text-[10px] text-white/30">Total Executions</p>
                  <p className="text-xs font-bold text-white">{wf.executions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30">Last Triggered</p>
                  <p className="text-xs text-white/60">{wf.lastRun}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141620] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create Workflow Automation</h3>
            <p className="text-xs text-white/40 mb-5">
              Select your trigger condition and the automated action to execute.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Workflow Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Inbound Demo Auto-Scheduler"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">When (Trigger)</label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#1a1d27] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-yellow-500/50"
                >
                  <option value="New message from customer">New message from customer</option>
                  <option value="Customer asks for human agent">Customer asks for human agent</option>
                  <option value="24h Care Window closing soon">24h Care Window closing soon</option>
                  <option value="New contact created">New contact created</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Then (Action)</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#1a1d27] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-yellow-500/50"
                >
                  <option value="Trigger AI Agent response">Trigger AI Agent response</option>
                  <option value="Assign to Human Operator">Assign to Human Operator</option>
                  <option value="Send Meta Approved Template">Send Meta Approved Template</option>
                  <option value="Add Hot Lead Tag">Add Hot Lead Tag</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-white/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-xs font-semibold text-white shadow-lg shadow-yellow-900/30 hover:opacity-90 transition-all cursor-pointer"
                >
                  Save Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

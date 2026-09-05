'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  Share2,
  Lock,
  DollarSign,
  Clock,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Capability, Entitlement } from '@/types';

interface CapabilitySharingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CapabilitySharingModal: React.FC<CapabilitySharingModalProps> = ({ isOpen, onClose }) => {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [activeTab, setActiveTab] = useState<'entitlements' | 'capabilities' | 'grant'>('entitlements');
  const [notification, setNotification] = useState<string | null>(null);

  // Grant form state
  const [grantUser, setGrantUser] = useState('Priya');
  const [grantCapabilityId, setGrantCapabilityId] = useState('');
  const [grantBudget, setGrantBudget] = useState('10');
  const [grantRequests, setGrantRequests] = useState('50');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/capabilities')
        .then((r) => r.json())
        .then((data) => {
          if (data.capabilities) {
            setCapabilities(data.capabilities);
            if (data.capabilities.length > 0) setGrantCapabilityId(data.capabilities[0].id);
          }
        });

      fetch('/api/entitlements')
        .then((r) => r.json())
        .then((data) => {
          if (data.entitlements) setEntitlements(data.entitlements);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRevokeOne = async (entId: string) => {
    try {
      const res = await fetch(`/api/entitlements?id=${entId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setEntitlements((prev) =>
          prev.map((e) => (e.id === entId ? { ...e, status: 'revoked' } : e))
        );
        setNotification('Entitlement revoked immediately.');
        setTimeout(() => setNotification(null), 3500);
      }
    } catch (e: any) {
      alert('Failed to revoke: ' + e.message);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm('EMERGENCY REVOCATION: Are you sure you want to revoke ALL shared access? All active friend sessions will be terminated immediately.')) {
      return;
    }
    try {
      const res = await fetch('/api/entitlements?all=true', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setEntitlements((prev) => prev.map((e) => ({ ...e, status: 'revoked' })));
        setNotification(`Emergency Revocation executed: ${data.revokedCount} entitlements invalidated.`);
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
  };

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/entitlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capabilityId: grantCapabilityId,
          grantedToUserName: grantUser,
          spendingLimitUsd: parseFloat(grantBudget) || 10,
          maxRequests: parseInt(grantRequests) || 50,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEntitlements((prev) => [data.entitlement, ...prev]);
        setActiveTab('entitlements');
        setNotification(`Granted capability to ${grantUser} with $${grantBudget} budget.`);
        setTimeout(() => setNotification(null), 3500);
      }
    } catch (e: any) {
      alert('Failed to grant: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-3xl bg-[#0F1523] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0B101D]">
          <div className="flex items-center space-x-2">
            <Share2 className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Capability Sharing & Entitlements Hub
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-nav & Emergency Action */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-white/5 bg-[#111726]/70">
          <div className="flex items-center space-x-2 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('entitlements')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'entitlements'
                  ? 'bg-purple-600/20 text-purple-300 font-medium border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active Entitlements ({entitlements.filter((e) => e.status === 'active').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('capabilities')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'capabilities'
                  ? 'bg-purple-600/20 text-purple-300 font-medium border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              My Shareable Capabilities
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('grant')}
              className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${
                activeTab === 'grant'
                  ? 'bg-purple-600/20 text-purple-300 font-medium border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3 h-3" />
              <span>Grant Access</span>
            </button>
          </div>

          {/* Emergency Revoke Button */}
          <button
            type="button"
            onClick={handleRevokeAll}
            title="Emergency Kill Switch: Invalidate all active shared entitlements immediately"
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>REVOKE ALL ACCESS</span>
          </button>
        </div>

        {/* Banner notification */}
        {notification && (
          <div className="px-5 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{notification}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs">
          {activeTab === 'entitlements' && (
            <div className="space-y-3">
              <div className="text-[11px] text-slate-400">
                Entitlements grant temporary, budget-constrained access to AI capabilities without ever sharing raw API credentials.
              </div>

              {entitlements.length === 0 ? (
                <div className="p-6 text-center text-slate-500">No active entitlements recorded.</div>
              ) : (
                entitlements.map((ent) => {
                  const isActive = ent.status === 'active';
                  return (
                    <div
                      key={ent.id}
                      className={`p-3.5 rounded-lg border transition-all ${
                        isActive
                          ? 'bg-[#111726] border-white/10'
                          : 'bg-white/2 border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-100 text-xs">
                              {ent.capabilityName}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className="px-2 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10.5px]">
                              User: {ent.grantedToUserName}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                                isActive
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {ent.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mt-2 text-slate-400 text-[11px]">
                            <div className="flex items-center space-x-1">
                              <DollarSign className="w-3 h-3 text-amber-400" />
                              <span>
                                Budget: ${ent.spentUsd.toFixed(2)} / ${ent.spendingLimitUsd.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-cyan-400" />
                              <span>
                                Requests: {ent.requestsCount} / {ent.maxRequests}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Lock className="w-3 h-3 text-purple-400" />
                              <span>Project: {ent.projectId}</span>
                            </div>
                          </div>
                        </div>

                        {isActive && (
                          <button
                            type="button"
                            onClick={() => handleRevokeOne(ent.id)}
                            className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[11px] font-medium transition-colors"
                          >
                            Revoke Access
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'capabilities' && (
            <div className="space-y-3">
              {capabilities.map((cap) => (
                <div
                  key={cap.id}
                  className="p-3.5 bg-[#111726] border border-white/10 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-100">{cap.name}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">{cap.description}</div>
                    <div className="flex items-center space-x-3 text-[10.5px] text-slate-400 mt-2">
                      <span>Owner: <strong className="text-slate-300">{cap.ownerName}</strong></span>
                      <span>Active Grants: <strong className="text-indigo-300">{cap.activeEntitlementsCount}</strong></span>
                      <span>Total Invocations: <strong className="text-emerald-300">{cap.totalUsageCount}</strong></span>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[11px]">
                    Shareable
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'grant' && (
            <form onSubmit={handleGrantSubmit} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">
                  Teammate (Grantee)
                </label>
                <select
                  value={grantUser}
                  onChange={(e) => setGrantUser(e.target.value)}
                  className="w-full bg-[#111726] border border-white/15 rounded p-2 text-slate-100 text-xs outline-none"
                >
                  <option value="Priya">Priya (Web Dashboard Lead)</option>
                  <option value="Aarav">Aarav (Firmware & Python)</option>
                  <option value="Rahul">Rahul (Hackathon Partner)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">
                  Capability to Share
                </label>
                <select
                  value={grantCapabilityId}
                  onChange={(e) => setGrantCapabilityId(e.target.value)}
                  className="w-full bg-[#111726] border border-white/15 rounded p-2 text-slate-100 text-xs outline-none"
                >
                  {capabilities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.provider})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 text-[11px] font-medium mb-1">
                    Spending Cap (USD)
                  </label>
                  <input
                    type="number"
                    value={grantBudget}
                    onChange={(e) => setGrantBudget(e.target.value)}
                    className="w-full bg-[#111726] border border-white/15 rounded p-2 text-slate-100 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-[11px] font-medium mb-1">
                    Max Requests Limit
                  </label>
                  <input
                    type="number"
                    value={grantRequests}
                    onChange={(e) => setGrantRequests(e.target.value)}
                    className="w-full bg-[#111726] border border-white/15 rounded p-2 text-slate-100 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded text-[11px] text-purple-300">
                🔒 <strong>Zero Credential Leak Guarantee</strong>: The grantee will never receive or see your API key. Invocations are executed server-side under strict budget enforcement.
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors"
              >
                Create Scoped Entitlement
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#0B101D] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 text-slate-200 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

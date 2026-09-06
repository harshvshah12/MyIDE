'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
  Trash2,
  RefreshCw,
  Server,
  Zap,
} from 'lucide-react';

interface MaskedConnection {
  id: string;
  provider: 'google' | 'anthropic' | 'openai' | 'openrouter' | 'local';
  authMethod: string;
  maskedCredential: string;
  status: 'active' | 'error' | 'revoked' | 'untested';
  errorMessage?: string;
  availableModels: string[];
  lastTestedAt?: number;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [connections, setConnections] = useState<MaskedConnection[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'anthropic' | 'openai' | 'local'>('google');
  const [credentialInput, setCredentialInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs: number; error?: string }>>({});

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/provider-connections');
      const data = await res.json();
      if (data.success && Array.isArray(data.connections)) {
        setConnections(data.connections);
      }
    } catch (e) {
      console.error('Failed to load provider connections:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConnections();
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialInput.trim()) return;

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/provider-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          credential: credentialInput.trim(),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save provider connection');
      }

      setStatusMessage(`Successfully encrypted and connected ${selectedProvider.toUpperCase()} provider.`);
      setCredentialInput('');
      await fetchConnections();
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/provider-connections/${id}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.test) {
        setTestResults((prev) => ({ ...prev, [id]: data.test }));
        await fetchConnections();
      } else {
        setTestResults((prev) => ({
          ...prev,
          [id]: { success: false, latencyMs: 0, error: data.error || 'Test failed' },
        }));
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: false, latencyMs: 0, error: err.message },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    if (!confirm('Are you sure you want to remove this provider connection?')) return;
    try {
      const res = await fetch(`/api/provider-connections/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await fetchConnections();
      }
    } catch (err) {
      console.error('Failed to delete connection:', err);
    }
  };

  const getProviderName = (p: string) => {
    switch (p) {
      case 'google': return 'Google Gemini';
      case 'anthropic': return 'Anthropic Claude';
      case 'openai': return 'OpenAI';
      case 'local': return 'Local Daemon (Ollama / vLLM)';
      default: return p;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-xl bg-[#0d121f] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#090d16]">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              AI Provider Connections & Cryptographic Vault
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Security badge */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-violet-950/20 border border-violet-500/20 text-xs text-slate-300">
            <Shield className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-violet-300">Strict Identity vs. Credential Separation</span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Login identity authenticates the developer. Provider API keys authorize LLM compute. Credentials are encrypted at rest with AES-256-GCM + PBKDF2 (100k iterations) and decrypted strictly in server memory during execution.
              </p>
            </div>
          </div>

          {/* Configured Connections List */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
              Configured Provider Connections ({connections.length})
            </h3>

            {connections.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-white/10 text-center text-xs text-slate-500">
                No provider connections configured yet. Add your first API key below.
              </div>
            ) : (
              <div className="space-y-2">
                {connections.map((conn) => {
                  const testResult = testResults[conn.id];
                  const isTesting = testingId === conn.id;

                  return (
                    <div
                      key={conn.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#111726] border border-white/10 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                          {conn.provider === 'local' ? <Server className="w-4 h-4" /> : <Key className="w-4 h-4 text-violet-400" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-100">
                              {getProviderName(conn.provider)}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                                conn.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : conn.status === 'error'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {conn.status.toUpperCase()}
                            </span>
                            {testResult && (
                              <span
                                className={`text-[10px] font-mono ${
                                  testResult.success ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {testResult.success ? `${testResult.latencyMs}ms` : 'FAIL'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {conn.maskedCredential}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTestConnection(conn.id)}
                          disabled={isTesting}
                          className="px-2 py-1 text-xs rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1"
                          title="Ping provider and measure latency"
                        >
                          <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                          <span>{isTesting ? 'Pinging...' : 'Test'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteConnection(conn.id)}
                          className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete connection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Connection Form */}
          <div className="pt-2 border-t border-white/10">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
              Add New Provider Connection
            </h3>

            <form onSubmit={handleAddConnection} className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'google', label: 'Google Gemini' },
                  { id: 'anthropic', label: 'Anthropic' },
                  { id: 'openai', label: 'OpenAI' },
                  { id: 'local', label: 'Local Daemon' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProvider(p.id as any)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                      selectedProvider === p.id
                        ? 'bg-violet-600/20 text-violet-200 border-violet-500/50 shadow-sm'
                        : 'bg-[#111726] text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {selectedProvider === 'local' ? 'Local Daemon URL (e.g. Ollama / vLLM)' : 'Provider API Key'}
                </label>
                <input
                  type={selectedProvider === 'local' ? 'text' : 'password'}
                  placeholder={
                    selectedProvider === 'local'
                      ? 'http://localhost:11434/v1'
                      : `Enter ${selectedProvider} API key...`
                  }
                  value={credentialInput}
                  onChange={(e) => setCredentialInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[#090d16] border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-violet-500 font-mono"
                  required
                />
              </div>

              {statusMessage && (
                <div
                  className={`text-xs p-2 rounded ${
                    statusMessage.startsWith('Error')
                      ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  }`}
                >
                  {statusMessage}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving || !credentialInput.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Encrypting & Testing...' : 'Save & Connect'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

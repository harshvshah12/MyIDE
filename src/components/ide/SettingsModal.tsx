'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Shield,
  CheckCircle2,
  Lock,
  Save,
  Cpu,
  Eye,
  EyeOff
} from 'lucide-react';
import { ModelProvider } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [configured, setConfigured] = useState<Record<string, string>>({});
  const [googleKey, setGoogleKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [localUrl, setLocalUrl] = useState('http://localhost:11434');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/credentials')
        .then((r) => r.json())
        .then((data) => {
          if (data.credentials) {
            const map: Record<string, string> = {};
            data.credentials.forEach((c: any) => {
              map[c.provider] = c.maskedKey;
            });
            setConfigured(map);
          }
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const keysToSave = [];
      if (googleKey.trim()) keysToSave.push({ provider: 'google', key: googleKey.trim() });
      if (anthropicKey.trim()) keysToSave.push({ provider: 'anthropic', key: anthropicKey.trim() });
      if (openaiKey.trim()) keysToSave.push({ provider: 'openai', key: openaiKey.trim() });

      for (const item of keysToSave) {
        await fetch('/api/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
      }

      setStatusMessage('Credentials encrypted at rest with AES-256-GCM successfully.');
      setGoogleKey('');
      setAnthropicKey('');
      setOpenaiKey('');

      // Refresh status
      const res = await fetch('/api/credentials');
      const data = await res.json();
      if (data.credentials) {
        const map: Record<string, string> = {};
        data.credentials.forEach((c: any) => {
          map[c.provider] = c.maskedKey;
        });
        setConfigured(map);
      }
    } catch (err: any) {
      alert('Error saving credentials: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-lg bg-[#0F1523] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0B101D]">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Encrypted API Credentials Vault
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

        {/* Security Notice */}
        <div className="p-4 bg-indigo-950/20 border-b border-indigo-500/20 text-xs text-slate-300 space-y-1">
          <div className="flex items-center space-x-1.5 text-indigo-400 font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>Zero-Leak Security Boundary</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            API keys are encrypted at rest with AES-256-GCM. Raw keys are never stored in plaintext, never sent to the browser, and never shared during collaboration sessions.
          </p>
        </div>

        {statusMessage && (
          <div className="px-5 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-300 flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {/* Google Gemini */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-200 font-medium">Google Gemini API Key</label>
              {configured['google'] && (
                <span className="text-[10px] text-emerald-400 font-mono">
                  Configured: {configured['google']}
                </span>
              )}
            </div>
            <input
              type="password"
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              placeholder={configured['google'] ? 'Leave blank to keep existing key' : 'Enter AIzaSy...'}
              className="w-full bg-[#111726] border border-white/10 rounded px-3 py-2 text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/50 font-mono text-xs"
            />
          </div>

          {/* Anthropic Claude */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-200 font-medium">Anthropic Claude API Key</label>
              {configured['anthropic'] && (
                <span className="text-[10px] text-emerald-400 font-mono">
                  Configured: {configured['anthropic']}
                </span>
              )}
            </div>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder={configured['anthropic'] ? 'Leave blank to keep existing key' : 'Enter sk-ant-...'}
              className="w-full bg-[#111726] border border-white/10 rounded px-3 py-2 text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/50 font-mono text-xs"
            />
          </div>

          {/* OpenAI */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-200 font-medium">OpenAI API Key</label>
              {configured['openai'] && (
                <span className="text-[10px] text-emerald-400 font-mono">
                  Configured: {configured['openai']}
                </span>
              )}
            </div>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder={configured['openai'] ? 'Leave blank to keep existing key' : 'Enter sk-proj-...'}
              className="w-full bg-[#111726] border border-white/10 rounded px-3 py-2 text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/50 font-mono text-xs"
            />
          </div>

          {/* Local Provider */}
          <div>
            <label className="block text-slate-200 font-medium mb-1">Local Ollama / LM Studio URL</label>
            <input
              type="text"
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full bg-[#111726] border border-white/10 rounded px-3 py-2 text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/50 font-mono text-xs"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Encrypting & Saving...' : 'Save & Encrypt Keys'}</span>
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#0B101D] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 text-slate-200 text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

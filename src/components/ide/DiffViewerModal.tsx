'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  GitPullRequest,
  GitCommit,
  Check,
  RotateCcw,
  Sparkles,
  Bot,
  ShieldCheck,
  FileCode,
  DollarSign,
  Clock,
  Send
} from 'lucide-react';
import { AIEvidence } from '@/types';

interface DiffViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilePath?: string;
  onCommitSuccess?: () => void;
}

export const DiffViewerModal: React.FC<DiffViewerModalProps> = ({
  isOpen,
  onClose,
  activeFilePath,
  onCommitSuccess,
}) => {
  const [evidenceList, setEvidenceList] = useState<AIEvidence[]>([]);
  const [gitStatus, setGitStatus] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState('feat(vision): optimize tensorRT inference pipeline');
  const [isCommitting, setIsCommitting] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/git')
        .then((r) => r.json())
        .then((data) => {
          if (data.status) setGitStatus(data.status);
          if (data.evidence) setEvidenceList(data.evidence);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim() || isCommitting) return;

    setIsCommitting(true);
    try {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusNotice(`Committed: ${commitMessage.trim()}`);
        setGitStatus(data.newStatus || 'Working tree clean');
        if (onCommitSuccess) onCommitSuccess();
        setTimeout(() => setStatusNotice(null), 3000);
      } else {
        alert('Commit failed: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-3xl bg-[#0F1523] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0B101D]">
          <div className="flex items-center space-x-2">
            <GitPullRequest className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Git Changes, AI Provenance & Evidence
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {statusNotice && (
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded text-emerald-300 font-medium">
              {statusNotice}
            </div>
          )}

          {/* Git Status Output */}
          <div className="p-3 bg-[#111726] border border-white/10 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Repository Status</span>
              <span className="text-[10px] text-indigo-400 font-mono">Branch: main</span>
            </div>
            <pre className="p-2 bg-[#090D16] rounded font-mono text-[11px] text-slate-300 whitespace-pre-wrap">
              {gitStatus || 'On branch main. Working tree clean.'}
            </pre>
          </div>

          {/* Commit Form */}
          <form onSubmit={handleCommit} className="p-3.5 bg-[#111726] border border-white/10 rounded-lg space-y-2.5">
            <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
              <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
              <span>Create Conventional Git Commit</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="feat(...): description"
                className="flex-1 bg-[#090D16] border border-white/10 rounded px-2.5 py-1.5 text-slate-100 text-xs font-mono outline-none focus:border-indigo-500/50"
              />
              <button
                type="submit"
                disabled={!commitMessage.trim() || isCommitting}
                className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center space-x-1 transition-colors shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isCommitting ? 'Committing...' : 'Commit Changes'}</span>
              </button>
            </div>
          </form>

          {/* AI Evidence & Provenance Trail */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              AI Modifications Provenance Log
            </div>

            {evidenceList.length === 0 ? (
              <div className="p-4 text-center text-slate-500 bg-[#111726]/50 rounded border border-white/5">
                No AI modifications recorded yet. Any agent code changes will appear here with full provenance.
              </div>
            ) : (
              evidenceList.map((record) => (
                <div
                  key={record.id}
                  className="p-3 bg-[#111726] border border-white/10 rounded-lg space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-semibold text-slate-100 capitalize">
                        {record.agentRole} Agent
                      </span>
                      <span className="px-1.5 py-0.2 bg-white/5 rounded text-[10px] text-slate-300 font-mono">
                        {record.modelName}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[10px] font-mono">
                      {new Date(record.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-slate-300 text-[11px] bg-black/20 p-2 rounded">
                    &ldquo;{record.prompt}&rdquo;
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-[10.5px] text-slate-400">
                    <div className="flex items-center space-x-1">
                      <FileCode className="w-3 h-3 text-cyan-400" />
                      <span>Files: {record.filesModified.join(', ') || 'inference.py'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-3 h-3 text-amber-400" />
                      <span>Cost: ~${record.costUsd.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Verification: {record.verificationResult}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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

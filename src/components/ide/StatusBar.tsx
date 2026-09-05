'use client';

import React from 'react';
import {
  GitBranch,
  Cpu,
  Users,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';
import { ModelMode } from '@/types';

interface StatusBarProps {
  activeFilePath?: string;
  cursorPos?: { lineNumber: number; column: number };
  language?: string;
  modelMode: ModelMode;
  activeModelName: string;
  activeCapabilityName?: string;
  onlineCount: number;
  onOpenModelSelector: () => void;
  onOpenExplainRationale: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  activeFilePath,
  cursorPos,
  language,
  modelMode,
  activeModelName,
  activeCapabilityName,
  onlineCount,
  onOpenModelSelector,
  onOpenExplainRationale,
}) => {
  return (
    <div className="flex items-center justify-between px-3 h-6 bg-[#080C14] border-t border-white/10 text-[11px] text-slate-400 select-none z-30">
      {/* Left items: Git branch, File path, Line/Col */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1 text-slate-300 hover:text-white cursor-pointer transition-colors">
          <GitBranch className="w-3 h-3 text-indigo-400" />
          <span className="font-medium">main</span>
        </div>

        {activeFilePath && (
          <div className="flex items-center space-x-1 text-slate-400">
            <span className="truncate max-w-[200px]">{activeFilePath}</span>
          </div>
        )}

        {cursorPos && (
          <div className="text-slate-400">
            Ln {cursorPos.lineNumber}, Col {cursorPos.column}
          </div>
        )}

        <div className="text-slate-500">UTF-8</div>

        {language && (
          <div className="capitalize text-slate-400 font-mono text-[10.5px]">
            {language}
          </div>
        )}
      </div>

      {/* Right items: AI Model Mode, Collaborators, Status */}
      <div className="flex items-center space-x-2.5">
        {/* Model & Capability Trigger */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={onOpenModelSelector}
            className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="font-semibold capitalize">
              {modelMode === 'auto'
                ? `Auto · ${activeModelName}`
                : modelMode === 'capability'
                ? `Cap · ${activeCapabilityName || activeModelName}`
                : activeModelName}
            </span>
          </button>

          {/* Explain Rationale "Why?" button */}
          {modelMode === 'auto' && (
            <button
              type="button"
              onClick={onOpenExplainRationale}
              title="Explain routing rationale (Why this model was chosen)"
              className="flex items-center px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Info className="w-3 h-3 mr-0.5 text-indigo-400" />
              <span>Why?</span>
            </button>
          )}
        </div>

        {/* Collaborators presence */}
        <div className="flex items-center space-x-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <Users className="w-3 h-3" />
          <span>{onlineCount} Online</span>
        </div>

        <div className="flex items-center space-x-1 text-slate-400">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>Ready</span>
        </div>
      </div>
    </div>
  );
};

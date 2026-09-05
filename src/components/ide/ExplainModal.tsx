'use client';

import React from 'react';
import { X, Sparkles, CheckCircle2, ShieldAlert, Cpu, Layers } from 'lucide-react';
import { RoutingDecision } from '@/types';

interface ExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
  decision: RoutingDecision | null;
}

export const ExplainModal: React.FC<ExplainModalProps> = ({ isOpen, onClose, decision }) => {
  if (!isOpen) return null;

  const currentDecision: RoutingDecision = decision || {
    mode: 'auto',
    selectedModelId: 'gemini-3.8-flash',
    selectedModelName: 'Gemini 3.8 Flash High',
    rationale:
      'Selected because the current task is focused on single-file code inspection and local prototyping where a fast, high-reasoning model yields the best developer velocity without token waste.',
    taskComplexity: 'standard',
    riskLevel: 'low',
    evaluatedFactors: {
      requiresHighReasoning: true,
      multiFileImpact: false,
      modifiesSecurityOrAuth: false,
      documentationOnly: false,
      toolCallingRequired: false,
    },
    qualityPrioritySatisfied: true,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-lg bg-[#0F1523] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0B101D]">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-100">Intelligent Routing Rationale</h2>
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
        <div className="p-5 space-y-4">
          <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-lg">
            <div className="text-[11px] text-indigo-400 font-medium uppercase tracking-wide">
              Selected Model
            </div>
            <div className="text-sm font-bold text-slate-100 mt-0.5">
              {currentDecision.selectedModelName}
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              &ldquo;{currentDecision.rationale}&rdquo;
            </p>
          </div>

          {/* Evaluated Factors */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Evaluated Task Criteria
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-[#111726] rounded border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Task Complexity:</span>
                <span className="font-semibold text-slate-200 capitalize">
                  {currentDecision.taskComplexity}
                </span>
              </div>
              <div className="p-2 bg-[#111726] rounded border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Risk Assessment:</span>
                <span className="font-semibold text-emerald-400 capitalize">
                  {currentDecision.riskLevel}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#111726] rounded border border-white/5 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quality prioritized over cost: <strong>Verified</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Multi-file impact:{' '}
                  {currentDecision.evaluatedFactors.multiFileImpact ? 'Yes' : 'No (Isolated)'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Auth/Security critical:{' '}
                  {currentDecision.evaluatedFactors.modifiesSecurityOrAuth ? 'High Guardrail' : 'Standard'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#0B101D] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};

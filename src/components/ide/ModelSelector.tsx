'use client';

import React from 'react';
import {
  X,
  Sparkles,
  Check,
  Zap,
  Brain,
  Shield,
  Clock,
  Coins,
  Cpu,
  Share2,
  Lock
} from 'lucide-react';
import { ModelMode, AIModel, Capability } from '@/types';

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: ModelMode;
  selectedModelId: string;
  selectedCapabilityId?: string;
  onSelectAuto: () => void;
  onSelectManualModel: (model: AIModel) => void;
  onSelectCapability: (cap: Capability) => void;
}

const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash High',
    provider: 'google',
    contextWindow: 1048576,
    costTier: 'low',
    reasoningScore: 8.5,
    speedScore: 9.8,
    status: 'configured',
    description: 'Ultra-fast low-latency reasoning model; ideal for rapid code generation & inline assistance.',
    isDefault: true,
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash High',
    provider: 'google',
    contextWindow: 1048576,
    costTier: 'low',
    reasoningScore: 8.2,
    speedScore: 9.5,
    status: 'configured',
    description: 'High-throughput reasoning model with thinking capabilities for complex workflows.',
  },
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    costTier: 'high',
    reasoningScore: 9.9,
    speedScore: 7.8,
    status: 'configured',
    description: 'Premier architectural reasoning, deep multi-file refactoring, and security verification.',
  },
  {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    costTier: 'medium',
    reasoningScore: 9.0,
    speedScore: 8.4,
    status: 'configured',
    description: 'Balanced multimodal model with strong function calling and tool execution.',
  },
  {
    id: 'llama-3.3-70b-local',
    name: 'Ollama LLaMA 3.3 70B (Local)',
    provider: 'local',
    contextWindow: 32000,
    costTier: 'free',
    reasoningScore: 8.0,
    speedScore: 7.2,
    status: 'local_online',
    description: 'Zero-cost offline inference running via local GPU without cloud dependency.',
  },
];

const SHARED_CAPABILITIES: Capability[] = [
  {
    id: 'cap-my-claude',
    name: 'My Claude 3.7 Sonnet (Primary)',
    ownerId: 'user-harsh',
    ownerName: 'Harsh (You)',
    provider: 'anthropic',
    modelId: 'claude-3-7-sonnet',
    type: 'model',
    description: 'High-reasoning capability configured on personal account',
    isShareable: true,
    activeEntitlementsCount: 2,
    totalUsageCount: 42,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'cap-friend-aarav-gpt',
    name: 'Aarav — GPT-4o High',
    ownerId: 'user-aarav',
    ownerName: 'Aarav (Friend)',
    provider: 'openai',
    modelId: 'gpt-4o',
    type: 'model',
    description: 'Granted by Aarav for firmware & Python inference review ($10 budget)',
    isShareable: false,
    activeEntitlementsCount: 1,
    totalUsageCount: 12,
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'cap-local-gpu',
    name: 'Local RTX 4090 Agent',
    ownerId: 'user-harsh',
    ownerName: 'Workstation Node',
    provider: 'local',
    modelId: 'llama-3.3-70b-local',
    type: 'gpu',
    description: 'Local private hardware acceleration for heavy tests and embeddings',
    isShareable: true,
    activeEntitlementsCount: 1,
    totalUsageCount: 68,
    createdAt: Date.now() - 86400000 * 10,
  }
];

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  isOpen,
  onClose,
  currentMode,
  selectedModelId,
  selectedCapabilityId,
  onSelectAuto,
  onSelectManualModel,
  onSelectCapability,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-2xl bg-[#0F1523] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0B101D]">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-100">Select AI Model or Capability</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Mode A: Auto / Intelligent Routing Option */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Mode A — Intelligent Auto Routing
            </div>
            <div
              onClick={() => {
                onSelectAuto();
                onClose();
              }}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                currentMode === 'auto'
                  ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10'
                  : 'bg-[#111726] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-100 flex items-center space-x-2">
                      <span>Auto — Intelligent Quality-First Router</span>
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-normal">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Dynamically chooses the optimal model based on task complexity, reasoning depth, and risk.
                      <strong className="text-slate-300 ml-1">Quality always takes priority over cost.</strong>
                    </p>
                  </div>
                </div>
                {currentMode === 'auto' && (
                  <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />
                )}
              </div>
            </div>
          </div>

          {/* Mode B: Manual Model Selection */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Mode B — Manual Model Selection (Never Switches Away)
            </div>
            <div className="space-y-2">
              {AVAILABLE_MODELS.map((model) => {
                const isSelected = currentMode === 'manual' && selectedModelId === model.id;
                return (
                  <div
                    key={model.id}
                    onClick={() => {
                      onSelectManualModel(model);
                      onClose();
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500'
                        : 'bg-[#111726] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-slate-300 text-xs font-mono">
                          {model.provider[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-slate-200">{model.name}</span>
                            <span className="text-[10px] text-slate-500 uppercase">{model.provider}</span>
                          </div>
                          <p className="text-[10.5px] text-slate-400 mt-0.5">{model.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 text-[10.5px] text-slate-400 shrink-0">
                        <span className="flex items-center">
                          <Brain className="w-3 h-3 mr-1 text-indigo-400" />
                          {model.reasoningScore}/10
                        </span>
                        <span className="flex items-center">
                          <Zap className="w-3 h-3 mr-1 text-amber-400" />
                          {model.speedScore}/10
                        </span>
                        <span className="capitalize px-1.5 py-0.2 rounded bg-white/5 text-slate-300">
                          {model.costTier}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-indigo-400 ml-1" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mode C: Explicit Capability Selection */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Mode C — Explicit Capability Selection (Strict Authorized Binding)
            </div>
            <div className="space-y-2">
              {SHARED_CAPABILITIES.map((cap) => {
                const isSelected = currentMode === 'capability' && selectedCapabilityId === cap.id;
                return (
                  <div
                    key={cap.id}
                    onClick={() => {
                      onSelectCapability(cap);
                      onClose();
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500'
                        : 'bg-[#111726] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-6 h-6 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center">
                          <Share2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-slate-200">{cap.name}</span>
                            <span className="text-[10px] text-indigo-400 font-mono">
                              Owner: {cap.ownerName}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-400 mt-0.5">{cap.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                          Authorized
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-indigo-400 ml-1" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#0B101D] flex items-center justify-between text-xs text-slate-400">
          <span>Your explicit choice is always respected. Mode C never reinterprets permissions.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/15 text-slate-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

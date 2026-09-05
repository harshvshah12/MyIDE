'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Shield,
  Code2,
  Bug,
  Compass,
  FileSearch,
  CheckSquare,
  FileCheck2,
  BookOpen,
  Info,
  ChevronDown,
  ChevronRight,
  Play,
  RotateCcw,
  Check,
  Zap,
  Terminal,
  FileEdit
} from 'lucide-react';
import {
  AgentRole,
  AgentChatMessage,
  ModelMode,
  RoutingDecision
} from '@/types';

interface AgentDockProps {
  modelMode: ModelMode;
  activeModelName: string;
  activeCapabilityName?: string;
  activeFilePath?: string;
  onOpenModelSelector: () => void;
  onOpenExplainRationale: () => void;
  onApplyCodeChanges: (filePath: string, newContent: string) => void;
}

const AGENT_ROLES: Array<{ role: AgentRole; label: string; icon: any; color: string; desc: string }> = [
  { role: 'coder', label: 'Coder', icon: Code2, color: 'text-indigo-400', desc: 'Code generation & refactoring' },
  { role: 'planner', label: 'Planner', icon: Compass, color: 'text-sky-400', desc: 'System architecture & sub-tasks' },
  { role: 'debugger', label: 'Debugger', icon: Bug, color: 'text-rose-400', desc: 'Error analysis & test regressions' },
  { role: 'reviewer', label: 'Reviewer', icon: FileCheck2, color: 'text-emerald-400', desc: 'Code quality & best practices' },
  { role: 'security', label: 'Security', icon: Shield, color: 'text-amber-400', desc: 'OWASP scans & vulnerability check' },
  { role: 'tester', label: 'Tester', icon: CheckSquare, color: 'text-purple-400', desc: 'Unit & integration test suites' },
  { role: 'researcher', label: 'Researcher', icon: FileSearch, color: 'text-cyan-400', desc: 'Docs, libraries & codebase patterns' },
  { role: 'docs', label: 'Docs', icon: BookOpen, color: 'text-teal-400', desc: 'Architecture specs & READMEs' },
];

export const AgentDock: React.FC<AgentDockProps> = ({
  modelMode,
  activeModelName,
  activeCapabilityName,
  activeFilePath,
  onOpenModelSelector,
  onOpenExplainRationale,
  onApplyCodeChanges,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentRole>('coder');
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      agentRole: 'coder',
      content:
        'Hello! I am your AI-Native Pair Programmer. I can plan features, analyze errors, refactor multi-file modules, or run tests with transparent model routing.',
      timestamp: Date.now() - 10000,
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [lastRouting, setLastRouting] = useState<RoutingDecision | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeAgentConfig = AGENT_ROLES.find((a) => a.role === selectedAgent)!;
  const AgentIcon = activeAgentConfig.icon;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = inputPrompt.trim();
    if (!prompt || isProcessing) return;

    const userMessage: AgentChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          agentRole: selectedAgent,
          mode: modelMode,
          activeFilePath,
          activeCapabilityName,
        }),
      });

      const data = await response.json();

      if (data.routingDecision) {
        setLastRouting(data.routingDecision);
      }

      const assistantMessage: AgentChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        agentRole: selectedAgent,
        content: data.reply || 'Task processed successfully.',
        timestamp: Date.now(),
        modelUsed: data.modelUsed,
        capabilityUsed: data.capabilityUsed,
        routingRationale: data.routingDecision?.rationale,
        toolCalls: data.toolCalls,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If the response proposed code modifications for active file
      if (data.proposedChange && activeFilePath) {
        onApplyCodeChanges(activeFilePath, data.proposedChange);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'system',
          content: `Error executing AI task: ${error.message || 'Server error'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0B101D] border-l border-white/10 text-slate-200 select-none">
      {/* Agent Dock Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#090D16]">
        {/* Agent Role Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAgentMenu(!showAgentMenu)}
            className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#111726] border border-white/10 hover:border-indigo-500/40 text-xs transition-colors"
          >
            <AgentIcon className={`w-3.5 h-3.5 ${activeAgentConfig.color}`} />
            <span className="font-semibold text-slate-100">{activeAgentConfig.label}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showAgentMenu && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-[#111726] border border-white/15 rounded shadow-2xl p-1 z-50">
              <div className="text-[10px] text-slate-400 font-semibold px-2 py-1 uppercase tracking-wider">
                Specialized Agents
              </div>
              {AGENT_ROLES.map((agent) => {
                const Icon = agent.icon;
                const isSelected = agent.role === selectedAgent;
                return (
                  <button
                    key={agent.role}
                    type="button"
                    onClick={() => {
                      setSelectedAgent(agent.role);
                      setShowAgentMenu(false);
                    }}
                    className={`flex items-start space-x-2 w-full px-2 py-1.5 rounded text-left transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-300'
                        : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${agent.color}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium">{agent.label}</div>
                      <div className="text-[10.5px] text-slate-400 truncate">{agent.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Model Route Badge in Dock */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={onOpenModelSelector}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] hover:bg-indigo-500/20"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="truncate max-w-[120px]">
              {modelMode === 'auto'
                ? `Auto (${activeModelName})`
                : modelMode === 'capability'
                ? activeCapabilityName || 'Shared Cap'
                : activeModelName}
            </span>
          </button>

          {modelMode === 'auto' && (
            <button
              type="button"
              onClick={onOpenExplainRationale}
              title="View routing explanation"
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
            >
              <Info className="w-3.5 h-3.5 text-indigo-400" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 select-text font-sans text-xs">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';

          if (isSystem) {
            return (
              <div
                key={msg.id}
                className="p-2 bg-rose-500/10 border border-rose-500/20 rounded text-rose-300 text-[11px]"
              >
                {msg.content}
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col space-y-1 ${
                isUser ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center space-x-1.5 text-[10.5px] text-slate-400">
                {isUser ? (
                  <>
                    <span className="font-semibold text-slate-300">You</span>
                    <User className="w-3 h-3 text-indigo-400" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-indigo-400" />
                    <span className="font-semibold capitalize text-indigo-300">
                      {msg.agentRole || 'Agent'}
                    </span>
                    {msg.modelUsed && (
                      <span className="px-1.5 py-0.2 bg-white/5 rounded text-[10px] text-slate-400">
                        {msg.modelUsed}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-2.5 rounded-lg max-w-[95%] leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-xs shadow-md'
                    : 'bg-[#111726] border border-white/10 text-slate-200 rounded-bl-xs'
                }`}
              >
                {msg.content}
              </div>

              {/* Tool Execution Logs (if any) */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="w-full space-y-1 mt-1 pl-2">
                  {msg.toolCalls.map((tc) => (
                    <div
                      key={tc.id}
                      className="flex items-center space-x-1.5 text-[10.5px] bg-[#090D16] border border-white/5 rounded px-2 py-1 text-slate-400 font-mono"
                    >
                      <Terminal className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="text-indigo-300 font-semibold">{tc.toolName}</span>
                      <span className="text-emerald-400 font-medium">[{tc.status}]</span>
                      {tc.output && <span className="truncate text-slate-400">: {tc.output}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Routing rationale badge */}
              {msg.routingRationale && (
                <div className="text-[10px] text-slate-400 flex items-center space-x-1 pl-1">
                  <Zap className="w-2.5 h-2.5 text-amber-400" />
                  <span className="italic">Route: {msg.routingRationale}</span>
                </div>
              )}
            </div>
          );
        })}
        {isProcessing && (
          <div className="flex items-center space-x-2 text-xs text-indigo-400 animate-pulse p-2">
            <Bot className="w-4 h-4" />
            <span>Agent thinking & routing with quality priority...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Prompt Form */}
      <form onSubmit={handleSendMessage} className="p-2.5 border-t border-white/10 bg-[#090D16]">
        {activeFilePath && (
          <div className="flex items-center space-x-1 text-[10px] text-slate-400 mb-1.5 px-1 truncate">
            <span className="text-indigo-400 font-medium">Context File:</span>
            <span className="font-mono text-slate-300 truncate">{activeFilePath}</span>
          </div>
        )}

        <div className="flex items-center bg-[#111726] border border-white/10 rounded-lg focus-within:border-indigo-500/50 p-1.5 transition-colors">
          <textarea
            rows={2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Ask ${activeAgentConfig.label} to edit, plan, or explain (Enter to send)...`}
            className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none resize-none px-1.5 py-0.5 font-sans"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isProcessing}
            className="p-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};

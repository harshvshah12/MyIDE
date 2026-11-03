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
  Terminal,
  FileEdit,
  GitCompare,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Copy,
  Check
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
        'Hello! I am your AI-Native Pair Programmer in MyIDE. I can plan features, analyze errors, refactor multi-file modules, or run tests with transparent model routing.',
      timestamp: Date.now() - 10000,
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const activeAgentConfig = AGENT_ROLES.find((a) => a.role === selectedAgent)!;
  const AgentIcon = activeAgentConfig.icon;

  const handleCopyContent = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

      if (!response.ok) {
        throw new Error(data.error || 'Execution failed');
      }

      const assistantMessage: AgentChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        agentRole: selectedAgent,
        content: data.reply || 'Task completed successfully.',
        timestamp: Date.now(),
        modelUsed: data.modelUsed,
        capabilityUsed: data.capabilityUsed,
        routingRationale: data.routingDecision?.rationale,
        toolCalls: data.toolCalls,
        evidenceId: data.evidenceId,
        usage: data.usage,
        durationMs: data.durationMs,
        isSimulated: data.isSimulated,
        simulationReason: data.simulationReason,
        proposedChange: data.proposedChange,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If the response proposed code modifications for active file, trigger side-by-side diff review
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
    <div className="flex flex-col h-full bg-[#080B11] border-l border-white/[0.08] text-slate-200 select-none">
      {/* Antigravity Agent Dock Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] bg-[#0A0E17]/95 backdrop-blur-sm">
        {/* Agent Role Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAgentMenu(!showAgentMenu)}
            className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#111726] border border-white/[0.08] hover:border-indigo-500/40 text-xs transition-all shadow-sm group"
          >
            <AgentIcon className={`w-3.5 h-3.5 ${activeAgentConfig.color} transition-transform group-hover:scale-110`} />
            <span className="font-medium text-slate-100">{activeAgentConfig.label}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showAgentMenu && (
            <div className="absolute top-full left-0 mt-1 w-60 bg-[#111726] border border-white/[0.12] rounded-lg shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
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
                    className={`flex items-start space-x-2.5 w-full px-2.5 py-1.5 rounded-md text-left transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'hover:bg-white/[0.04] text-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${agent.color}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium">{agent.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{agent.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Model Route Badge in Antigravity Style */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={onOpenModelSelector}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-slate-300 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="truncate max-w-[130px] font-mono">
              {modelMode === 'auto'
                ? activeModelName
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
              className="p-1 rounded-md hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-indigo-400" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 select-text font-sans text-xs">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';

          if (isSystem) {
            return (
              <div
                key={msg.id}
                className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-md text-rose-300 text-[11px] flex items-start space-x-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="leading-relaxed">{msg.content}</div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col space-y-1.5 ${
                isUser ? 'items-end' : 'items-start'
              }`}
            >
              {/* Message Header & Telemetry */}
              <div className="flex items-center space-x-1.5 text-[10.5px] text-slate-400 px-1">
                {isUser ? (
                  <>
                    <span className="font-medium text-slate-300">You</span>
                    <User className="w-3 h-3 text-indigo-400" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-semibold capitalize text-indigo-300">
                      {msg.agentRole || 'Agent'}
                    </span>
                    {msg.modelUsed && (
                      <span className="px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded text-[10px] text-slate-400 font-mono">
                        {msg.modelUsed}
                      </span>
                    )}
                    {msg.durationMs !== undefined && (
                      <span className="flex items-center space-x-0.5 text-[10px] text-emerald-400 font-mono">
                        <Zap className="w-2.5 h-2.5" />
                        <span>{msg.durationMs}ms</span>
                      </span>
                    )}
                    {msg.usage && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {msg.usage.totalTokens}t
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-3 rounded-lg max-w-[96%] leading-relaxed whitespace-pre-wrap text-xs shadow-sm ${
                  isUser
                    ? 'bg-[#141B2D] border border-indigo-500/30 text-slate-100 rounded-br-xs'
                    : 'bg-[#0E131F] border border-white/[0.08] text-slate-200 rounded-bl-xs'
                }`}
              >
                {msg.content}

                {/* Copy Button */}
                {!isUser && (
                  <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleCopyContent(msg.id, msg.content)}
                      className="flex items-center space-x-1 hover:text-slate-200 transition-colors"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {/* Diff Review Button if proposedChange exists */}
                    {msg.proposedChange && (
                      <button
                        type="button"
                        onClick={() => {
                          const target = (typeof msg.proposedChange === 'object' && (msg.proposedChange as any).targetPath) || activeFilePath || 'file';
                          const content = (typeof msg.proposedChange === 'object' && (msg.proposedChange as any).newContent) || (msg.proposedChange as string);
                          onApplyCodeChanges(target, content);
                        }}
                        className="flex items-center space-x-1 px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                      >
                        <GitCompare className="w-3 h-3" />
                        <span>Review Diff</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Tool Execution Cards */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="w-full space-y-1 pl-1">
                  {msg.toolCalls.map((tc) => (
                    <div
                      key={tc.id}
                      className="flex items-center space-x-2 text-[10px] bg-[#0A0E17] border border-white/[0.06] rounded px-2.5 py-1 text-slate-400 font-mono"
                    >
                      <Terminal className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="text-indigo-300 font-semibold">{tc.toolName}</span>
                      <span className="text-emerald-400 flex items-center space-x-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>success</span>
                      </span>
                      {tc.output && <span className="truncate text-slate-400">: {tc.output}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Simulation Notice if offline fallback was used */}
              {msg.isSimulated && (
                <div className="text-[10px] text-amber-400/80 flex items-center space-x-1 px-1">
                  <Info className="w-3 h-3 shrink-0" />
                  <span>Local fallback active. Add API key in Settings for live cloud compute.</span>
                </div>
              )}
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center space-x-2.5 text-xs text-indigo-400 p-2.5 bg-[#0E131F] border border-indigo-500/20 rounded-lg animate-pulse">
            <Bot className="w-4 h-4 shrink-0" />
            <span className="font-mono text-[11px]">
              Executing {activeAgentConfig.label} task via {activeModelName}...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Prompt Dock in Antigravity Style */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-white/[0.08] bg-[#0A0E17]/90 backdrop-blur-sm">
        {/* Antigravity Slash Command Pills */}
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 text-[10px] text-slate-400 no-scrollbar">
          {[
            { cmd: '/plan ', label: '/plan', desc: 'Architecture plan' },
            { cmd: '/fix ', label: '/fix', desc: 'Bug fix & diff' },
            { cmd: '/review ', label: '/review', desc: 'Code audit' },
            { cmd: '/test ', label: '/test', desc: 'Generate tests' },
            { cmd: '/security ', label: '/security', desc: 'OWASP scan' },
            { cmd: '/terminal ', label: '/terminal', desc: 'Run terminal command' },
            { cmd: '/help', label: '/help', desc: 'Command palette' },
          ].map((pill) => (
            <button
              key={pill.cmd}
              type="button"
              onClick={() => {
                setInputPrompt(pill.cmd);
              }}
              className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-indigo-600/20 hover:text-indigo-200 border border-white/[0.06] hover:border-indigo-500/30 text-slate-300 font-mono text-[10px] transition-all shrink-0 cursor-pointer"
              title={pill.desc}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {activeFilePath && (
          <div className="flex items-center space-x-1.5 text-[10.5px] text-slate-400 mb-2 px-1 truncate">
            <FileCode className="w-3 h-3 text-indigo-400" />
            <span className="text-indigo-300 font-medium">Context:</span>
            <span className="font-mono text-slate-300 truncate">{activeFilePath}</span>
          </div>
        )}

        <div className="flex items-end bg-[#111726] border border-white/[0.08] rounded-xl focus-within:border-indigo-500/50 p-2 transition-all shadow-inner">
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
            placeholder={`Ask ${activeAgentConfig.label} to code, review, or debug...`}
            className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none resize-none px-1.5 py-1 font-sans"
          />
          <div className="flex items-center space-x-2 shrink-0 ml-1.5">
            <span className="text-[9.5px] text-slate-500 hidden sm:inline font-mono">↵ send</span>
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isProcessing}
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

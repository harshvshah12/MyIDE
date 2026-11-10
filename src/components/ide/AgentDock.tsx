'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Check,
  History,
  Plus,
  Trash2,
  MessageSquare,
  Clock,
  X,
  RefreshCw,
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

interface ConversationSummary {
  id: string;
  title: string;
  agentRole: string;
  messageCount: number;
  updatedAt: number;
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

const DEFAULT_WELCOME_MESSAGE: AgentChatMessage = {
  id: 'welcome',
  role: 'assistant',
  agentRole: 'coder',
  content:
    'Hello! I am your AI-Native Pair Programmer in MyIDE. I can plan features, analyze errors, refactor multi-file modules, or run tests with transparent model routing.',
  timestamp: Date.now() - 10000,
};

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
  const [messages, setMessages] = useState<AgentChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Persistent Conversation History State
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentConversationTitle, setCurrentConversationTitle] = useState<string>('New Chat');
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');

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

  // Load list of conversations
  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        return data.conversations;
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingHistory(false);
    }
    return [];
  }, []);

  // Load a specific conversation with all messages
  const loadConversation = async (convId: string) => {
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/conversations/${convId}`);
      const data = await res.json();
      if (data.success && data.conversation) {
        setCurrentConversationId(data.conversation.id);
        setCurrentConversationTitle(data.conversation.title);
        if (data.conversation.agentRole) {
          setSelectedAgent(data.conversation.agentRole as AgentRole);
        }
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          const formatted: AgentChatMessage[] = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            agentRole: m.agentRole,
            content: m.content,
            timestamp: m.timestamp,
            modelUsed: m.modelUsed,
            capabilityUsed: m.capabilityUsed,
            routingRationale: m.routingRationale,
            toolCalls: m.toolCalls,
            evidenceId: m.evidenceId,
            usage: m.usage,
            durationMs: m.durationMs,
            isSimulated: m.isSimulated,
            simulationReason: m.simulationReason,
            proposedChange: m.proposedChange,
          }));
          setMessages(formatted);
        } else {
          setMessages([DEFAULT_WELCOME_MESSAGE]);
        }
        setShowHistoryDrawer(false);
      }
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Start fresh conversation
  const startNewConversation = () => {
    setCurrentConversationId(null);
    setCurrentConversationTitle('New Chat');
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    setShowHistoryDrawer(false);
  };

  // Delete a conversation
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      const res = await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (currentConversationId === convId) {
          startNewConversation();
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // Fetch conversations on mount and load the latest if available
  useEffect(() => {
    loadConversations().then((convs) => {
      if (convs && convs.length > 0) {
        // Automatically restore the most recent active conversation
        loadConversation(convs[0].id);
      }
    });
  }, [loadConversations]);

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
          conversationId: currentConversationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Execution failed');
      }

      if (data.conversationId) {
        setCurrentConversationId(data.conversationId);
        // If it was a new conversation, update title
        if (!currentConversationId) {
          const shortTitle = prompt.length > 40 ? `${prompt.slice(0, 37)}...` : prompt;
          setCurrentConversationTitle(shortTitle);
        }
        // Refresh conversations in background
        loadConversations();
      }

      const assistantMessage: AgentChatMessage = {
        id: data.assistantMessageId || `ai-${Date.now()}`,
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

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchHistoryQuery.toLowerCase())
  );

  const formatTimeAgo = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex flex-col h-full bg-[#080B11] border-l border-white/[0.08] text-slate-200 select-none relative">
      {/* Antigravity Agent Dock Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] bg-[#0A0E17]/95 backdrop-blur-sm z-10">
        {/* Agent Role Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAgentMenu(!showAgentMenu)}
            className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#111726] border border-white/[0.08] hover:border-indigo-500/40 text-xs transition-all shadow-sm group cursor-pointer"
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
                    className={`flex items-start space-x-2.5 w-full px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
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

        {/* Model Route & Action Controls */}
        <div className="flex items-center space-x-1.5">
          {/* New Chat Button */}
          <button
            type="button"
            onClick={startNewConversation}
            title="Start New Conversation"
            className="p-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Conversation History Drawer Button */}
          <button
            type="button"
            onClick={() => {
              loadConversations();
              setShowHistoryDrawer(!showHistoryDrawer);
            }}
            title="Conversation History"
            className={`flex items-center space-x-1 px-2 py-1 rounded-md border text-[11px] transition-colors cursor-pointer ${
              showHistoryDrawer
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-slate-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="font-mono text-[10px]">{conversations.length}</span>
          </button>

          {/* Model Route Badge in Antigravity Style */}
          <button
            type="button"
            onClick={onOpenModelSelector}
            className="flex items-center space-x-1.5 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-slate-300 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="truncate max-w-[100px] font-mono">
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
              className="p-1 rounded-md hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-indigo-400" />
            </button>
          )}
        </div>
      </div>

      {/* Active Conversation Sub-header */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#07090f] border-b border-white/[0.04] text-[10.5px] text-slate-400">
        <div className="flex items-center gap-1.5 truncate max-w-[240px]">
          <MessageSquare className="w-3 h-3 text-indigo-400 shrink-0" />
          <span className="truncate text-slate-300 font-medium">{currentConversationTitle}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-[10px] text-slate-500 font-mono">
          <span>{messages.filter((m) => m.role !== 'system').length} msgs</span>
        </div>
      </div>

      {/* History Slide-over Drawer / Modal */}
      {showHistoryDrawer && (
        <div className="absolute inset-x-0 top-[65px] bottom-0 z-40 bg-[#090D16]/98 backdrop-blur-md flex flex-col border-b border-white/[0.08] animate-in fade-in slide-in-from-top-2 duration-150 p-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-100">Saved Conversations</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={startNewConversation}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>New Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="py-2">
            <input
              type="text"
              placeholder="Search chat history..."
              value={searchHistoryQuery}
              onChange={(e) => setSearchHistoryQuery(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#111726] border border-white/[0.08] text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
            {isLoadingHistory ? (
              <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Loading sessions...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No past conversations found. Ask a question to start saving your chat history!
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === currentConversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200'
                        : 'bg-[#0d121f] hover:bg-[#121827] border-white/[0.06] text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="text-xs font-medium truncate flex items-center gap-1.5">
                        <span className="truncate">{conv.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono">
                        <span className="capitalize text-slate-400">{conv.agentRole || 'coder'}</span>
                        <span>•</span>
                        <span>{conv.messageCount} messages</span>
                        <span>•</span>
                        <span>{formatTimeAgo(conv.updatedAt)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      title="Delete conversation"
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

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
                      <span className="text-[9.5px] text-slate-500 font-mono">
                        {msg.usage.totalTokens} tok
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Message Bubble Card */}
              <div
                className={`group relative max-w-[94%] rounded-xl px-3.5 py-2.5 leading-relaxed text-xs transition-all shadow-xs ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-600/10'
                    : 'bg-[#111726] border border-white/[0.08] text-slate-200 rounded-bl-none shadow-black/20'
                }`}
              >
                {/* Content */}
                <div className="whitespace-pre-wrap font-sans break-words">{msg.content}</div>

                {/* Simulated Fallback Alert Pill */}
                {msg.isSimulated && (
                  <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center space-x-1.5 text-[10px] text-amber-300/90 font-mono">
                    <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Simulated Contextual Fallback: {msg.simulationReason}</span>
                  </div>
                )}

                {/* Tool Calls Summary */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-1">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Executed Tools ({msg.toolCalls.length})
                    </div>
                    {msg.toolCalls.map((tool, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-1.5 text-[10.5px] font-mono text-indigo-300 bg-black/30 px-2 py-0.5 rounded border border-white/[0.04]"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{tool.toolName}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Proposed Code Diff Pill */}
                {msg.proposedChange && activeFilePath && (
                  <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between bg-indigo-950/40 p-2 rounded-lg border border-indigo-500/20">
                    <div className="flex items-center space-x-1.5 text-[11px] text-indigo-300">
                      <FileEdit className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-medium">Diff Generated</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onApplyCodeChanges(activeFilePath, msg.proposedChange!)}
                      className="flex items-center space-x-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[10px] transition-colors cursor-pointer"
                    >
                      <GitCompare className="w-3 h-3" />
                      <span>Review Side-by-Side</span>
                    </button>
                  </div>
                )}

                {/* Copy button */}
                <button
                  type="button"
                  onClick={() => handleCopyContent(msg.id, msg.content)}
                  className="absolute top-2 right-2 p-1 rounded bg-black/40 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Copy message"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center space-x-2 p-3 bg-[#111726]/60 rounded-xl border border-white/[0.06] text-xs text-indigo-300 animate-pulse font-mono">
            <Bot className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>{activeAgentConfig.label} agent reasoning via {activeModelName}...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Prompt Dock in Antigravity Style */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-white/[0.08] bg-[#0A0E17]/90 backdrop-blur-sm z-10">
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
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all shadow-sm cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight
} from 'lucide-react';

interface TerminalPaneProps {
  activeFilePath?: string;
}

interface CommandLog {
  id: string;
  command: string;
  output: string;
  error?: string;
  exitCode: number;
  durationMs: number;
  timestamp: string;
}

export const TerminalPane: React.FC<TerminalPaneProps> = ({ activeFilePath }) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'output' | 'problems'>('terminal');
  const [commandInput, setCommandInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<CommandLog[]>([
    {
      id: 'init',
      command: 'system::ready',
      output: 'Intelligence Fabric Workspace Sandbox initialized. Type commands below.',
      exitCode: 0,
      durationMs: 4,
      timestamp: 'SYSTEM',
    },
  ]);

  const outputEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const executeCommand = async (cmdToRun: string) => {
    const cmd = cmdToRun.trim();
    if (!cmd || isRunning) return;

    setIsRunning(true);
    setHistory((prev) => [cmd, ...prev]);
    setHistoryIndex(-1);
    setCommandInput('');

    try {
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();

      setLogs((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          command: cmd,
          output: data.stdout || '',
          error: data.stderr || (data.success ? '' : data.error),
          exitCode: data.exitCode ?? (data.success ? 0 : 1),
          durationMs: data.durationMs || 0,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          command: cmd,
          output: '',
          error: err.message || 'Execution failed',
          exitCode: 1,
          durationMs: 0,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(commandInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setCommandInput(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setCommandInput(history[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommandInput('');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#080C14] border-t border-white/10 text-slate-300 font-mono text-xs select-text">
      {/* Terminal Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0D121F] border-b border-white/5 select-none">
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center space-x-1.5 ${
              activeTab === 'terminal'
                ? 'bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>TERMINAL</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('output')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              activeTab === 'output'
                ? 'bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            OUTPUT
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('problems')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              activeTab === 'problems'
                ? 'bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            PROBLEMS (0)
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => executeCommand('python inference.py')}
            disabled={isRunning}
            className="flex items-center px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-[11px]"
          >
            <Play className="w-3 h-3 mr-1" />
            Run inference.py
          </button>
          <button
            type="button"
            onClick={() => executeCommand('npm test')}
            disabled={isRunning}
            className="flex items-center px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors text-[11px]"
          >
            <Play className="w-3 h-3 mr-1" />
            Run Tests
          </button>
          <button
            type="button"
            onClick={() => setLogs([])}
            title="Clear Terminal"
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="space-y-1">
            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
              <span className="text-indigo-400 font-bold">$</span>
              <span className="text-slate-200 font-semibold">{log.command}</span>
              <span className="text-slate-600 text-[10px]">{log.timestamp}</span>
              {log.durationMs > 0 && (
                <span className="flex items-center text-[10px] text-slate-500">
                  <Clock className="w-2.5 h-2.5 mr-0.5" />
                  {log.durationMs}ms
                </span>
              )}
              {log.exitCode === 0 ? (
                <span className="flex items-center text-[10px] text-emerald-400">
                  <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                  0
                </span>
              ) : (
                <span className="flex items-center text-[10px] text-rose-400">
                  <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                  exit {log.exitCode}
                </span>
              )}
            </div>

            {log.output && (
              <pre className="text-slate-300 whitespace-pre-wrap pl-3 border-l-2 border-slate-700 font-mono text-[11.5px] leading-relaxed">
                {log.output}
              </pre>
            )}
            {log.error && (
              <pre className="text-rose-400 whitespace-pre-wrap pl-3 border-l-2 border-rose-600 font-mono text-[11.5px] leading-relaxed">
                {log.error}
              </pre>
            )}
          </div>
        ))}
        <div ref={outputEndRef} />
      </div>

      {/* Terminal Command Input Prompt */}
      <div className="flex items-center px-3 py-2 bg-[#0B0F19] border-t border-white/5 select-none">
        <ChevronRight className="w-4 h-4 text-indigo-400 mr-1 shrink-0" />
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRunning ? 'Executing command...' : 'Type a command (e.g. ls, git status, python inference.py)...'}
          disabled={isRunning}
          className="w-full bg-transparent text-slate-100 placeholder-slate-600 outline-none text-xs font-mono"
        />
        {isRunning && (
          <span className="text-xs text-indigo-400 animate-pulse shrink-0 ml-2">Running...</span>
        )}
      </div>
    </div>
  );
};

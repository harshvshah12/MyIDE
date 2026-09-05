'use client';

import React, { useRef, useEffect } from 'react';
import Editor, { DiffEditor, loader } from '@monaco-editor/react';
import {
  X,
  Save,
  Split,
  FileCode,
  Check,
  RotateCcw
} from 'lucide-react';
import { FileTab } from '@/types';

interface EditorPaneProps {
  tabs: FileTab[];
  activeTabId?: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onChangeContent: (tabId: string, content: string) => void;
  onSaveFile: (tabId: string) => void;
  onCursorChange?: (lineNumber: number, column: number) => void;
  diffMode?: {
    original: string;
    modified: string;
    onAccept: () => void;
    onReject: () => void;
  } | null;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onChangeContent,
  onSaveFile,
  onCursorChange,
  diffMode,
}) => {
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const editorRef = useRef<any>(null);

  // Keyboard shortcut listener for Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeTabId) {
          onSaveFile(activeTabId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, onSaveFile]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Define Dark Obsidian Luxe theme
    monaco.editor.defineTheme('obsidian-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
        { token: 'keyword', foreground: '818CF8', fontStyle: 'bold' },
        { token: 'string', foreground: '34D399' },
        { token: 'number', foreground: 'FBBF24' },
        { token: 'type', foreground: '38BDF8' },
        { token: 'function', foreground: 'A78BFA' },
        { token: 'variable', foreground: 'F8FAFC' },
      ],
      colors: {
        'editor.background': '#090D16',
        'editor.foreground': '#F8FAFC',
        'editor.lineHighlightBackground': '#111726',
        'editorCursor.foreground': '#818CF8',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#818CF8',
        'editor.selectionBackground': '#312E81',
        'editor.inactiveSelectionBackground': '#1E1B4B',
        'editorIndentGuide.background1': 'rgba(255, 255, 255, 0.05)',
        'editorIndentGuide.activeBackground1': 'rgba(99, 102, 241, 0.3)',
      },
    });
    monaco.editor.setTheme('obsidian-dark');

    editor.onDidChangeCursorPosition((e: any) => {
      if (onCursorChange) {
        onCursorChange(e.position.lineNumber, e.position.column);
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#090D16] relative overflow-hidden">
      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0B101D] px-1 overflow-x-auto select-none min-h-[36px]">
        <div className="flex items-center space-x-0.5 max-w-[80%] overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group flex items-center h-8 px-3 text-xs border-r border-white/5 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#090D16] text-indigo-300 font-medium border-t-2 border-t-indigo-500'
                    : 'bg-[#111726]/40 text-slate-400 hover:bg-[#111726]/80 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <span className="truncate max-w-[140px]">{tab.name}</span>
                {tab.isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1.5" title="Unsaved changes" />
                )}
                <button
                  type="button"
                  title="Close tab"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Tab Toolbar Actions */}
        <div className="flex items-center space-x-1 pr-2">
          {activeTab && (
            <button
              type="button"
              onClick={() => onSaveFile(activeTab.id)}
              title="Save File (Ctrl+S)"
              className={`flex items-center px-2 py-1 text-[11px] rounded transition-colors ${
                activeTab.isDirty
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Save className="w-3 h-3 mr-1" />
              <span>{activeTab.isDirty ? 'Save *' : 'Saved'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Diff Banner if in AI diff review mode */}
      {diffMode && (
        <div className="flex items-center justify-between px-4 py-2 bg-indigo-950/40 border-b border-indigo-500/30 text-xs">
          <div className="flex items-center space-x-2 text-indigo-300">
            <Split className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold">Reviewing AI Proposed Changes:</span>
            <span className="text-slate-400">Left: Original | Right: Proposed by Agent</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={diffMode.onReject}
              className="flex items-center px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reject Changes
            </button>
            <button
              type="button"
              onClick={diffMode.onAccept}
              className="flex items-center px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-medium"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Accept AI Changes
            </button>
          </div>
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 w-full h-full relative">
        {diffMode ? (
          <DiffEditor
            original={diffMode.original}
            modified={diffMode.modified}
            language={activeTab?.language || 'python'}
            theme="vs-dark"
            options={{
              fontSize: 13.5,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              renderSideBySide: true,
              minimap: { enabled: false },
              smoothScrolling: true,
              readOnly: false,
            }}
          />
        ) : activeTab ? (
          <Editor
            height="100%"
            path={activeTab.path}
            language={activeTab.language}
            value={activeTab.content}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            onChange={(val) => {
              if (typeof val === 'string') {
                onChangeContent(activeTab.id, val);
              }
            }}
            options={{
              fontSize: 13.5,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              lineNumbers: 'on',
              minimap: { enabled: true, scale: 1 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              smoothScrolling: true,
              renderLineHighlight: 'all',
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 select-none">
            <FileCode className="w-12 h-12 text-slate-600 mb-3 stroke-[1.2]" />
            <p className="text-sm font-medium text-slate-400">No File Open</p>
            <p className="text-xs text-slate-600 mt-1">Select a file from the explorer or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
};

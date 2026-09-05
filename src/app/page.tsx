'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/ide/Header';
import { FileTree } from '@/components/ide/FileTree';
import { EditorPane } from '@/components/ide/EditorPane';
import { TerminalPane } from '@/components/ide/TerminalPane';
import { AgentDock } from '@/components/ide/AgentDock';
import { StatusBar } from '@/components/ide/StatusBar';

import { ModelSelector } from '@/components/ide/ModelSelector';
import { ExplainModal } from '@/components/ide/ExplainModal';
import { CapabilitySharingModal } from '@/components/ide/CapabilitySharingModal';
import { CollaborationHub } from '@/components/ide/CollaborationHub';
import { ProjectIntelligence } from '@/components/ide/ProjectIntelligence';
import { ObsidianBridgeModal } from '@/components/ide/ObsidianBridgeModal';
import { SettingsModal } from '@/components/ide/SettingsModal';
import { DiffViewerModal } from '@/components/ide/DiffViewerModal';

import {
  FileNode,
  FileTab,
  ModelMode,
  AIModel,
  Capability,
  RoutingDecision,
  Presence
} from '@/types';

export default function FabricIDE() {
  // Workspace & Files State
  const [workspaceName, setWorkspaceName] = useState('SmartVision Edge AI');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<FileTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | undefined>(undefined);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [cursorPos, setCursorPos] = useState({ lineNumber: 1, column: 1 });

  // AI Model & Routing State
  const [modelMode, setModelMode] = useState<ModelMode>('auto');
  const [activeModelId, setActiveModelId] = useState('gemini-3.8-flash');
  const [activeModelName, setActiveModelName] = useState('Gemini 3.8 Flash High');
  const [activeCapabilityId, setActiveCapabilityId] = useState<string | undefined>(undefined);
  const [activeCapabilityName, setActiveCapabilityName] = useState<string | undefined>(undefined);
  const [lastRoutingDecision, setLastRoutingDecision] = useState<RoutingDecision | null>(null);

  // Diff Review Mode
  const [diffMode, setDiffMode] = useState<{
    original: string;
    modified: string;
    targetPath: string;
  } | null>(null);

  // Modal Dialogs State
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const [isCollabOpen, setIsCollabOpen] = useState(false);
  const [isSharingOpen, setIsSharingOpen] = useState(false);
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(false);
  const [isObsidianOpen, setIsObsidianOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGitDiffOpen, setIsGitDiffOpen] = useState(false);

  // Collaborators
  const [onlineCount, setOnlineCount] = useState(3);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load Workspace and initial files on mount
  const refreshFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/files?tree=true');
      const data = await res.json();
      if (data.tree) {
        setFiles(data.tree);

        // If no tabs open, automatically open inference.py or README.md
        if (tabs.length === 0) {
          const defaultPath = data.tree.find((f: FileNode) => f.name === 'inference.py')
            ? 'inference.py'
            : data.tree[0]?.path;

          if (defaultPath) {
            loadFileIntoTab(defaultPath);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load file tree:', e);
    }
  }, [tabs.length]);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  const loadFileIntoTab = async (filePath: string) => {
    const existing = tabs.find((t) => t.path === filePath);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.success) {
        const ext = filePath.split('.').pop() || '';
        const newTab: FileTab = {
          id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: filePath.split('/').pop() || filePath,
          path: filePath,
          content: data.content,
          savedContent: data.content,
          isDirty: false,
          language: getLanguage(ext),
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
    } catch (e) {
      console.error('Error opening file:', e);
    }
  };

  const getLanguage = (ext: string) => {
    switch (ext) {
      case 'py': return 'python';
      case 'ts':
      case 'tsx': return 'typescript';
      case 'js':
      case 'jsx': return 'javascript';
      case 'json': return 'json';
      case 'md': return 'markdown';
      default: return 'plaintext';
    }
  };

  const handleCreateItem = async (newPath: string, type: 'file' | 'directory') => {
    try {
      await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath, type }),
      });
      await refreshFiles();
      if (type === 'file') {
        await loadFileIntoTab(newPath);
      }
    } catch (e) {
      alert('Error creating item: ' + e);
    }
  };

  const handleDeleteItem = async (targetPath: string) => {
    try {
      await fetch(`/api/files?path=${encodeURIComponent(targetPath)}`, { method: 'DELETE' });
      setTabs((prev) => prev.filter((t) => t.path !== targetPath));
      await refreshFiles();
    } catch (e) {
      alert('Error deleting: ' + e);
    }
  };

  const handleSaveFile = async (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;

    try {
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: tab.path, content: tab.content }),
      });
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, isDirty: false, savedContent: t.content } : t))
      );
    } catch (e) {
      alert('Failed to save file: ' + e);
    }
  };

  const handleChangeContent = (tabId: string, newContent: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId
          ? {
              ...t,
              content: newContent,
              isDirty: newContent !== t.savedContent,
            }
          : t
      )
    );
  };

  const handleCloseTab = (tabId: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(filtered[filtered.length - 1]?.id);
      }
      return filtered;
    });
  };

  // AI Code Diff Handler
  const handleApplyProposedCode = (targetPath: string, proposedContent: string) => {
    const activeTab = tabs.find((t) => t.path === targetPath);
    const original = activeTab ? activeTab.content : '';
    setDiffMode({
      original,
      modified: proposedContent,
      targetPath,
    });
  };

  const handleAcceptDiff = () => {
    if (!diffMode) return;
    const tab = tabs.find((t) => t.path === diffMode.targetPath);
    if (tab) {
      handleChangeContent(tab.id, diffMode.modified);
      handleSaveFile(tab.id);
    }
    setDiffMode(null);
  };

  const handleRejectDiff = () => {
    setDiffMode(null);
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!isMounted) {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-[#090D16] text-slate-300 font-mono text-xs select-none">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20 mb-3 animate-pulse">
          F
        </div>
        <div className="text-slate-400">Initializing Fabric Studio...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090D16] text-[#F8FAFC] overflow-hidden select-none">
      {/* 1. Global Header */}
      <Header
        workspaceName={workspaceName}
        modelMode={modelMode}
        activeModelName={activeModelName}
        activeCapabilityName={activeCapabilityName}
        onOpenModelSelector={() => setIsModelSelectorOpen(true)}
        onOpenCollabHub={() => setIsCollabOpen(true)}
        onOpenProjectIntelligence={() => setIsIntelligenceOpen(true)}
        onOpenObsidianBridge={() => setIsObsidianOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGitDiff={() => setIsGitDiffOpen(true)}
        onOpenCapabilitySharing={() => setIsSharingOpen(true)}
        onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
        onRunActiveFile={() => {
          if (!isTerminalOpen) setIsTerminalOpen(true);
        }}
      />

      {/* 2. Main Studio Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Explorer & File Tree (w-56) */}
        <div className="w-56 shrink-0 h-full">
          <FileTree
            files={files}
            activeFilePath={activeTab?.path}
            onSelectFile={loadFileIntoTab}
            onCreateItem={handleCreateItem}
            onDeleteItem={handleDeleteItem}
            onRefresh={refreshFiles}
          />
        </div>

        {/* Center: Monaco Editor & Terminal Dock */}
        <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-white/10">
          {/* Top Center: Monaco Multi-Tab Editor */}
          <div className={`${isTerminalOpen ? 'h-[62%]' : 'h-full'} transition-all duration-150`}>
            <EditorPane
              tabs={tabs}
              activeTabId={activeTabId}
              onSelectTab={setActiveTabId}
              onCloseTab={handleCloseTab}
              onChangeContent={handleChangeContent}
              onSaveFile={handleSaveFile}
              onCursorChange={(line, col) => setCursorPos({ lineNumber: line, column: col })}
              diffMode={
                diffMode
                  ? {
                      original: diffMode.original,
                      modified: diffMode.modified,
                      onAccept: handleAcceptDiff,
                      onReject: handleRejectDiff,
                    }
                  : null
              }
            />
          </div>

          {/* Bottom Center: Integrated Terminal & Command Runner */}
          {isTerminalOpen && (
            <div className="h-[38%] border-t border-white/10">
              <TerminalPane activeFilePath={activeTab?.path} />
            </div>
          )}
        </div>

        {/* Right: AI Agent Dock & Pair Programmer (w-80) */}
        <div className="w-80 shrink-0 h-full">
          <AgentDock
            modelMode={modelMode}
            activeModelName={activeModelName}
            activeCapabilityName={activeCapabilityName}
            activeFilePath={activeTab?.path}
            onOpenModelSelector={() => setIsModelSelectorOpen(true)}
            onOpenExplainRationale={() => setIsExplainOpen(true)}
            onApplyCodeChanges={handleApplyProposedCode}
          />
        </div>
      </div>

      {/* 3. Global Status Bar */}
      <StatusBar
        activeFilePath={activeTab?.path}
        cursorPos={cursorPos}
        language={activeTab?.language}
        modelMode={modelMode}
        activeModelName={activeModelName}
        activeCapabilityName={activeCapabilityName}
        onlineCount={onlineCount}
        onOpenModelSelector={() => setIsModelSelectorOpen(true)}
        onOpenExplainRationale={() => setIsExplainOpen(true)}
      />

      {/* 4. Modals & Dialogs */}
      <ModelSelector
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        currentMode={modelMode}
        selectedModelId={activeModelId}
        selectedCapabilityId={activeCapabilityId}
        onSelectAuto={() => {
          setModelMode('auto');
          setActiveModelName('Gemini 3.8 Flash High');
          setActiveCapabilityId(undefined);
          setActiveCapabilityName(undefined);
        }}
        onSelectManualModel={(model: AIModel) => {
          setModelMode('manual');
          setActiveModelId(model.id);
          setActiveModelName(model.name);
          setActiveCapabilityId(undefined);
          setActiveCapabilityName(undefined);
        }}
        onSelectCapability={(cap: Capability) => {
          setModelMode('capability');
          setActiveCapabilityId(cap.id);
          setActiveCapabilityName(cap.name);
          setActiveModelId(cap.modelId);
          setActiveModelName(cap.name);
        }}
      />

      <ExplainModal
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
        decision={lastRoutingDecision}
      />

      <CapabilitySharingModal
        isOpen={isSharingOpen}
        onClose={() => setIsSharingOpen(false)}
      />

      <CollaborationHub
        isOpen={isCollabOpen}
        onClose={() => setIsCollabOpen(false)}
        onlineUsers={[]}
      />

      <ProjectIntelligence
        isOpen={isIntelligenceOpen}
        onClose={() => setIsIntelligenceOpen(false)}
      />

      <ObsidianBridgeModal
        isOpen={isObsidianOpen}
        onClose={() => setIsObsidianOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <DiffViewerModal
        isOpen={isGitDiffOpen}
        onClose={() => setIsGitDiffOpen(false)}
        activeFilePath={activeTab?.path}
        onCommitSuccess={refreshFiles}
      />
    </div>
  );
}

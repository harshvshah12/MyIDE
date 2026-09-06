'use client';

import React from 'react';
import {
  Layers,
  Play,
  Terminal,
  Share2,
  Brain,
  Key,
  FolderSync,
  Sparkles,
  GitPullRequest,
  ShieldCheck
} from 'lucide-react';
import { ModelMode } from '@/types';
import {
  WorkspaceContextSelector,
  WorkspaceItem,
  ProjectItem,
} from './WorkspaceContextSelector';
import { UserProfileButton, UserProfile } from './UserProfileButton';

interface HeaderProps {
  workspaceName: string;
  currentWorkspace?: WorkspaceItem | null;
  currentProject?: ProjectItem | null;
  currentUserRole?: 'owner' | 'admin' | 'member' | 'viewer' | null;
  user?: UserProfile | null;
  onLogout?: () => void;
  workspaces?: WorkspaceItem[];
  projects?: ProjectItem[];
  onSwitchContext?: (workspaceId: string, projectId?: string) => Promise<void>;
  onCreateWorkspace?: (name: string, slug: string) => Promise<void>;
  onCreateProject?: (workspaceId: string, name: string, slug: string, kind: string) => Promise<void>;
  isContextLoading?: boolean;
  modelMode: ModelMode;
  activeModelName: string;
  activeCapabilityName?: string;
  onOpenModelSelector: () => void;
  onOpenCollabHub: () => void;
  onOpenProjectIntelligence: () => void;
  onOpenObsidianBridge: () => void;
  onOpenSettings: () => void;
  onOpenGitDiff: () => void;
  onOpenCapabilitySharing?: () => void;
  onToggleTerminal: () => void;
  onRunActiveFile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  workspaceName,
  currentWorkspace,
  currentProject,
  currentUserRole,
  user,
  onLogout,
  workspaces = [],
  projects = [],
  onSwitchContext,
  onCreateWorkspace,
  onCreateProject,
  isContextLoading,
  modelMode,
  activeModelName,
  activeCapabilityName,
  onOpenModelSelector,
  onOpenCollabHub,
  onOpenProjectIntelligence,
  onOpenObsidianBridge,
  onOpenSettings,
  onOpenGitDiff,
  onOpenCapabilitySharing,
  onToggleTerminal,
  onRunActiveFile,
}) => {
  return (
    <header className="flex items-center justify-between px-3 h-10 bg-[#0B101D] border-b border-white/10 select-none z-20">
      {/* Left: Brand & Workspace */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-500/20">
            F
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xs font-bold tracking-wider text-slate-100 font-mono">
              FABRIC
            </span>
            <span className="text-[10px] text-indigo-400 font-mono">IDE</span>
          </div>
        </div>

        <div className="h-4 w-px bg-white/10" />

        {/* Workspace & Project Selector */}
        {onSwitchContext && onCreateWorkspace && onCreateProject ? (
          <WorkspaceContextSelector
            currentWorkspace={currentWorkspace || null}
            currentProject={currentProject || null}
            currentUserRole={currentUserRole || null}
            workspaces={workspaces}
            projects={projects}
            onSwitchContext={onSwitchContext}
            onCreateWorkspace={onCreateWorkspace}
            onCreateProject={onCreateProject}
            isLoading={isContextLoading}
          />
        ) : (
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5 text-xs text-slate-300">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-medium truncate max-w-[180px]">{workspaceName}</span>
          </div>
        )}
      </div>

      {/* Center: Quick Execution Actions */}
      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={onRunActiveFile}
          title="Run active file"
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors text-xs font-medium"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Run</span>
        </button>

        <button
          type="button"
          onClick={onToggleTerminal}
          title="Toggle Terminal Panel"
          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-colors text-xs"
        >
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span>Terminal</span>
        </button>

        <button
          type="button"
          onClick={onOpenGitDiff}
          title="Review AI Changes & Git Diffs"
          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-colors text-xs"
        >
          <GitPullRequest className="w-3.5 h-3.5 text-indigo-400" />
          <span>Diff & Git</span>
        </button>
      </div>

      {/* Right: Model Selector, Obsidian, Project Memory, Collab, Settings */}
      <div className="flex items-center space-x-1.5">
        {/* Model Selector Bar */}
        <button
          type="button"
          onClick={onOpenModelSelector}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#111726] hover:bg-[#182238] border border-white/10 text-xs text-slate-200 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-medium">
            {modelMode === 'auto'
              ? 'Auto Router'
              : modelMode === 'capability'
              ? `Cap: ${activeCapabilityName || 'Shared'}`
              : activeModelName}
          </span>
          <span className="text-slate-500 text-[10px]">▼</span>
        </button>

        {/* Obsidian Bridge */}
        <button
          type="button"
          onClick={onOpenObsidianBridge}
          title="Obsidian Vault Connector (C:\projects\orchestra-brain)"
          className="p-1.5 rounded hover:bg-white/10 text-purple-400 hover:text-purple-300 transition-colors"
        >
          <FolderSync className="w-4 h-4" />
        </button>

        {/* Project Intelligence */}
        <button
          type="button"
          onClick={onOpenProjectIntelligence}
          title="Project Memory & Architectural Decisions"
          className="p-1.5 rounded hover:bg-white/10 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <Brain className="w-4 h-4" />
        </button>

        {/* Share & Collaboration */}
        <button
          type="button"
          onClick={onOpenCollabHub}
          title="Collaborative Session & Presence"
          className="flex items-center space-x-1 px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors text-xs"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>

        {/* Capability Sharing & Entitlements */}
        {onOpenCapabilitySharing && (
          <button
            type="button"
            onClick={onOpenCapabilitySharing}
            title="Capability Sharing & Entitlements Vault (Zero-Leak)"
            className="flex items-center space-x-1 px-2 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-colors text-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Entitlements</span>
          </button>
        )}

        {/* Credentials & Settings */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="API Keys Vault & Settings"
          className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Key className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* User Identity Profile */}
        <UserProfileButton
          user={user || null}
          onLogout={onLogout || (() => {})}
          onOpenSettings={onOpenSettings}
        />
      </div>
    </header>
  );
};

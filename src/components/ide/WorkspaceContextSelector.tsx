'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  FolderGit2,
  ChevronDown,
  Plus,
  Check,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  currentUserRole: 'owner' | 'admin' | 'member' | 'viewer';
  membersCount: number;
  projectsCount: number;
}

export interface ProjectItem {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  kind: 'college' | 'personal' | 'hiring-cv' | 'hackathon' | 'research';
  stack: string[];
}

interface WorkspaceContextSelectorProps {
  currentWorkspace: WorkspaceItem | null;
  currentProject: ProjectItem | null;
  currentUserRole: 'owner' | 'admin' | 'member' | 'viewer' | null;
  workspaces: WorkspaceItem[];
  projects: ProjectItem[];
  onSwitchContext: (workspaceId: string, projectId?: string) => Promise<void>;
  onCreateWorkspace: (name: string, slug: string) => Promise<void>;
  onCreateProject: (workspaceId: string, name: string, slug: string, kind: string) => Promise<void>;
  isLoading?: boolean;
}

export const WorkspaceContextSelector: React.FC<WorkspaceContextSelectorProps> = ({
  currentWorkspace,
  currentProject,
  currentUserRole,
  workspaces,
  projects,
  onSwitchContext,
  onCreateWorkspace,
  onCreateProject,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);

  // Form states
  const [wsName, setWsName] = useState('');
  const [wsSlug, setWsSlug] = useState('');
  const [projName, setProjName] = useState('');
  const [projSlug, setProjSlug] = useState('');
  const [projKind, setProjKind] = useState('hackathon');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowNewWorkspace(false);
        setShowNewProject(false);
        setErrorMsg(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim() || !wsSlug.trim()) {
      setErrorMsg('Workspace name and slug are required');
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await onCreateWorkspace(wsName.trim(), wsSlug.trim().toLowerCase());
      setWsName('');
      setWsSlug('');
      setShowNewWorkspace(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    if (!projName.trim() || !projSlug.trim()) {
      setErrorMsg('Project name and slug are required');
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await onCreateProject(
        currentWorkspace.id,
        projName.trim(),
        projSlug.trim().toLowerCase(),
        projKind
      );
      setProjName('');
      setProjSlug('');
      setShowNewProject(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button in Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-2.5 py-1 rounded bg-[#111726] hover:bg-[#161F33] border border-white/10 hover:border-indigo-500/40 text-xs transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 group"
        title="Switch Workspace or Project context"
      >
        <div className="flex items-center space-x-1.5 text-slate-300 group-hover:text-white">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-200 max-w-[140px] truncate">
            {currentWorkspace ? currentWorkspace.name : 'No Workspace'}
          </span>
        </div>

        <span className="text-slate-600 font-mono">/</span>

        <div className="flex items-center space-x-1 text-slate-400 group-hover:text-slate-200">
          <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-medium max-w-[140px] truncate">
            {currentProject ? currentProject.name : 'No Project'}
          </span>
        </div>

        {currentUserRole && (
          <span className="px-1.5 py-0.2 text-[9px] uppercase font-mono tracking-wider font-semibold rounded bg-white/5 border border-white/10 text-slate-400">
            {currentUserRole}
          </span>
        )}

        {isLoading ? (
          <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
        ) : (
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-white' : ''
            }`}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-80 bg-[#0E1424] border border-white/15 rounded-lg shadow-2xl shadow-black/80 z-50 p-2 text-xs divide-y divide-white/10 animate-in fade-in zoom-in-95 duration-100">
          {errorMsg && (
            <div className="mb-2 p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start space-x-1.5 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: WORKSPACES */}
          <div className="pb-2">
            <div className="flex items-center justify-between px-1.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <span className="flex items-center space-x-1">
                <Layers className="w-3 h-3 text-indigo-400" />
                <span>Workspaces ({workspaces.length})</span>
              </span>
              <button
                onClick={() => {
                  setShowNewWorkspace(!showNewWorkspace);
                  setShowNewProject(false);
                  setErrorMsg(null);
                }}
                className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-0.5 transition-colors"
                title="Create a new workspace"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>

            {/* Inline Create Workspace Form */}
            {showNewWorkspace && (
              <form
                onSubmit={handleCreateWorkspace}
                className="mt-1 p-2 bg-[#161F33] rounded border border-indigo-500/30 space-y-2 mb-2"
              >
                <div className="text-[11px] font-semibold text-indigo-300">Create New Workspace</div>
                <input
                  type="text"
                  placeholder="Workspace Name (e.g. Robotics Lab)"
                  value={wsName}
                  onChange={(e) => {
                    setWsName(e.target.value);
                    if (!wsSlug) {
                      setWsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
                    }
                  }}
                  className="w-full px-2 py-1 bg-[#090D16] border border-white/15 rounded text-slate-100 placeholder-slate-500 text-xs focus:border-indigo-400 focus:outline-none"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="slug (e.g. robotics-lab)"
                  value={wsSlug}
                  onChange={(e) => setWsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                  className="w-full px-2 py-1 bg-[#090D16] border border-white/15 rounded text-slate-300 placeholder-slate-500 text-xs font-mono focus:border-indigo-400 focus:outline-none"
                />
                <div className="flex justify-end space-x-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewWorkspace(false)}
                    className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-2.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-medium flex items-center space-x-1 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
                  </button>
                </div>
              </form>
            )}

            {/* Workspace List */}
            <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5 mt-0.5">
              {workspaces.map((ws) => {
                const isActive = currentWorkspace?.id === ws.id;
                return (
                  <button
                    key={ws.id}
                    onClick={async () => {
                      if (!isActive) {
                        await onSwitchContext(ws.id);
                      }
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors text-left ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30'
                        : 'hover:bg-white/5 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="font-medium truncate">{ws.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({ws.projectsCount} proj)</span>
                    </div>
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <span className="text-[9px] uppercase font-mono px-1 py-0.2 bg-white/5 rounded text-slate-400">
                        {ws.currentUserRole}
                      </span>
                      {isActive && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                  </button>
                );
              })}

              {workspaces.length === 0 && (
                <div className="py-2 text-center text-slate-500 text-[11px]">
                  No accessible workspaces found.
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: PROJECTS */}
          <div className="pt-2">
            <div className="flex items-center justify-between px-1.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <span className="flex items-center space-x-1">
                <FolderGit2 className="w-3 h-3 text-cyan-400" />
                <span>Projects in Workspace ({projects.length})</span>
              </span>
              {currentWorkspace && currentUserRole !== 'viewer' && (
                <button
                  onClick={() => {
                    setShowNewProject(!showNewProject);
                    setShowNewWorkspace(false);
                    setErrorMsg(null);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-0.5 transition-colors"
                  title="Create a new project in this workspace"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              )}
            </div>

            {/* Inline Create Project Form */}
            {showNewProject && (
              <form
                onSubmit={handleCreateProject}
                className="mt-1 p-2 bg-[#161F33] rounded border border-cyan-500/30 space-y-2 mb-2"
              >
                <div className="text-[11px] font-semibold text-cyan-300">New Project in {currentWorkspace?.name}</div>
                <input
                  type="text"
                  placeholder="Project Name (e.g. Autonomous Drone)"
                  value={projName}
                  onChange={(e) => {
                    setProjName(e.target.value);
                    if (!projSlug) {
                      setProjSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
                    }
                  }}
                  className="w-full px-2 py-1 bg-[#090D16] border border-white/15 rounded text-slate-100 placeholder-slate-500 text-xs focus:border-cyan-400 focus:outline-none"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    placeholder="slug"
                    value={projSlug}
                    onChange={(e) => setProjSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                    className="px-2 py-1 bg-[#090D16] border border-white/15 rounded text-slate-300 placeholder-slate-500 text-xs font-mono focus:border-cyan-400 focus:outline-none"
                  />
                  <select
                    value={projKind}
                    onChange={(e) => setProjKind(e.target.value)}
                    className="px-2 py-1 bg-[#090D16] border border-white/15 rounded text-slate-300 text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="hackathon">hackathon</option>
                    <option value="research">research</option>
                    <option value="college">college</option>
                    <option value="hiring-cv">hiring-cv</option>
                    <option value="personal">personal</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewProject(false)}
                    className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-2.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-medium flex items-center space-x-1 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
                  </button>
                </div>
              </form>
            )}

            {/* Project List */}
            <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5 mt-0.5">
              {projects.map((proj) => {
                const isActive = currentProject?.id === proj.id;
                return (
                  <button
                    key={proj.id}
                    onClick={async () => {
                      if (!isActive && currentWorkspace) {
                        await onSwitchContext(currentWorkspace.id, proj.id);
                      }
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors text-left ${
                      isActive
                        ? 'bg-cyan-600/20 text-cyan-200 border border-cyan-500/30'
                        : 'hover:bg-white/5 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="font-medium truncate">{proj.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">[{proj.kind}]</span>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />}
                  </button>
                );
              })}

              {projects.length === 0 && (
                <div className="py-2 text-center text-slate-500 text-[11px]">
                  No projects in this workspace yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

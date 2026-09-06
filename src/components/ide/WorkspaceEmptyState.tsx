'use client';

import React, { useState } from 'react';
import { Layers, FolderGit2, Plus, ShieldAlert, Loader2 } from 'lucide-react';

interface WorkspaceEmptyStateProps {
  type: 'no-workspaces' | 'no-projects' | 'access-denied';
  workspaceName?: string;
  onCreateWorkspace?: (name: string, slug: string) => Promise<void>;
  onCreateProject?: (name: string, slug: string, kind: string) => Promise<void>;
  onResetContext?: () => void;
}

export const WorkspaceEmptyState: React.FC<WorkspaceEmptyStateProps> = ({
  type,
  workspaceName,
  onCreateWorkspace,
  onCreateProject,
  onResetContext,
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [kind, setKind] = useState('hackathon');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError('Name and slug are required');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (type === 'no-workspaces' && onCreateWorkspace) {
        await onCreateWorkspace(name.trim(), slug.trim().toLowerCase());
      } else if (type === 'no-projects' && onCreateProject) {
        await onCreateProject(name.trim(), slug.trim().toLowerCase(), kind);
      }
      setName('');
      setSlug('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  if (type === 'access-denied') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#090D16] text-slate-300">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-semibold text-slate-100 mb-1">Access Restricted</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-4">
          You do not have permission to access this workspace. Ask a workspace administrator to grant you membership.
        </p>
        {onResetContext && (
          <button
            onClick={onResetContext}
            className="px-3 py-1.5 rounded bg-[#161F33] hover:bg-[#1E2942] border border-white/10 text-xs text-slate-200 transition-colors"
          >
            Switch to Accessible Workspace
          </button>
        )}
      </div>
    );
  }

  if (type === 'no-projects') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#090D16] text-slate-300">
        <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4 text-cyan-400">
          <FolderGit2 className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-semibold text-slate-100 mb-1">
          No Projects in {workspaceName || 'Workspace'}
        </h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Every workspace contains one or more projects. Create your first project to start writing code and tracking context.
        </p>

        {onCreateProject && (
          <form onSubmit={handleSubmit} className="w-full max-w-sm bg-[#111726] border border-white/10 rounded-lg p-4 text-left space-y-3">
            {error && <div className="text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">{error}</div>}
            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Project Name</label>
              <input
                type="text"
                placeholder="e.g. Flight Controller ROS2"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
                }}
                className="w-full px-2.5 py-1.5 bg-[#090D16] border border-white/15 rounded text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Slug</label>
                <input
                  type="text"
                  placeholder="flight-controller"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                  className="w-full px-2.5 py-1.5 bg-[#090D16] border border-white/15 rounded text-xs font-mono text-slate-300 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Kind</label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#090D16] border border-white/15 rounded text-xs text-slate-300 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="hackathon">hackathon</option>
                  <option value="research">research</option>
                  <option value="college">college</option>
                  <option value="hiring-cv">hiring-cv</option>
                  <option value="personal">personal</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Create Project</span>
            </button>
          </form>
        )}
      </div>
    );
  }

  // Type: no-workspaces
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#090D16] text-slate-300">
      <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-4 text-indigo-400">
        <Layers className="w-6 h-6" />
      </div>
      <h2 className="text-sm font-semibold text-slate-100 mb-1">Welcome to Project Intelligence Fabric</h2>
      <p className="text-xs text-slate-400 max-w-sm mb-6">
        A Workspace is a secure collaboration perimeter for student engineering teams. It isolates project memory, repositories, and AI capabilities.
      </p>

      {onCreateWorkspace && (
        <form onSubmit={handleSubmit} className="w-full max-w-sm bg-[#111726] border border-white/10 rounded-lg p-4 text-left space-y-3">
          {error && <div className="text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">{error}</div>}
          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Workspace Name</label>
            <input
              type="text"
              placeholder="e.g. Formula Student Autonomous"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
              }}
              className="w-full px-2.5 py-1.5 bg-[#090D16] border border-white/15 rounded text-xs text-slate-100 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Workspace Slug</label>
            <input
              type="text"
              placeholder="formula-autonomous"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
              className="w-full px-2.5 py-1.5 bg-[#090D16] border border-white/15 rounded text-xs font-mono text-slate-300 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Initialize Workspace</span>
          </button>
        </form>
      )}
    </div>
  );
};

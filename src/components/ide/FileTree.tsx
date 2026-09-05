'use client';

import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  Terminal,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { FileNode } from '@/types';

interface FileTreeProps {
  files: FileNode[];
  activeFilePath?: string;
  onSelectFile: (path: string) => void;
  onCreateItem: (path: string, type: 'file' | 'directory') => void;
  onDeleteItem: (path: string) => void;
  onRefresh: () => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  activeFilePath,
  onSelectFile,
  onCreateItem,
  onDeleteItem,
  onRefresh,
}) => {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['']));
  const [filterQuery, setFilterQuery] = useState('');
  const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return next;
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      setIsCreating(null);
      return;
    }
    onCreateItem(newItemName.trim(), isCreating === 'folder' ? 'directory' : 'file');
    setNewItemName('');
    setIsCreating(null);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py':
        return <span className="text-amber-400 font-mono text-xs font-bold mr-1.5">PY</span>;
      case 'ts':
      case 'tsx':
        return <span className="text-sky-400 font-mono text-xs font-bold mr-1.5">TS</span>;
      case 'js':
      case 'jsx':
        return <span className="text-yellow-400 font-mono text-xs font-bold mr-1.5">JS</span>;
      case 'json':
        return <FileJson className="w-3.5 h-3.5 text-emerald-400 mr-1.5 shrink-0" />;
      case 'md':
        return <FileText className="w-3.5 h-3.5 text-indigo-400 mr-1.5 shrink-0" />;
      case 'sh':
      case 'bat':
        return <Terminal className="w-3.5 h-3.5 text-rose-400 mr-1.5 shrink-0" />;
      default:
        return <FileCode className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />;
    }
  };

  const renderNodes = (nodes: FileNode[], depth = 0) => {
    return nodes
      .filter((node) => {
        if (!filterQuery) return true;
        return node.name.toLowerCase().includes(filterQuery.toLowerCase());
      })
      .map((node) => {
        const isDir = node.type === 'directory';
        const isExpanded = expandedDirs.has(node.path);
        const isActive = activeFilePath === node.path;

        return (
          <div key={node.path} className="select-none">
            <div
              className={`group flex items-center justify-between py-1 px-2 text-xs rounded transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 font-medium border-l-2 border-indigo-500'
                  : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'
              }`}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              onClick={() => {
                if (isDir) {
                  toggleDir(node.path);
                } else {
                  onSelectFile(node.path);
                }
              }}
            >
              <div className="flex items-center min-w-0 flex-1">
                {isDir ? (
                  <>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                    )}
                    {isExpanded ? (
                      <FolderOpen className="w-3.5 h-3.5 mr-1.5 text-indigo-400 shrink-0" />
                    ) : (
                      <Folder className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                    )}
                  </>
                ) : (
                  getFileIcon(node.name)
                )}
                <span className="truncate">{node.name}</span>
              </div>

              <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 pl-1">
                <button
                  type="button"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete ${node.name}?`)) {
                      onDeleteItem(node.path);
                    }
                  }}
                  className="p-0.5 hover:text-rose-400 text-slate-500 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {isDir && isExpanded && node.children && (
              <div>{renderNodes(node.children, depth + 1)}</div>
            )}
          </div>
        );
      });
  };

  return (
    <div className="flex flex-col h-full bg-[#090D16] border-r border-white/10 text-slate-300">
      {/* File Tree Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-[#111726]/50">
        <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          EXPLORER
        </span>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            title="New File"
            onClick={() => setIsCreating('file')}
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-white/10 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="New Folder"
            onClick={() => setIsCreating('folder')}
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-white/10 rounded transition-colors"
          >
            <Folder className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Refresh Explorer"
            onClick={onRefresh}
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-white/10 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Search */}
      <div className="px-2.5 py-1.5 border-b border-white/5">
        <div className="flex items-center px-2 py-1 bg-[#111726] rounded border border-white/5 text-xs focus-within:border-indigo-500/50">
          <Search className="w-3 h-3 text-slate-500 mr-1.5 shrink-0" />
          <input
            type="text"
            placeholder="Search files..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="bg-transparent text-slate-200 placeholder-slate-500 outline-none w-full text-xs"
          />
        </div>
      </div>

      {/* Inline Creation Input */}
      {isCreating && (
        <form onSubmit={handleCreateSubmit} className="p-2 border-b border-white/5 bg-[#111726]/70">
          <div className="text-[10px] text-indigo-400 font-medium mb-1">
            New {isCreating === 'folder' ? 'Folder' : 'File'}:
          </div>
          <input
            type="text"
            autoFocus
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onBlur={() => {
              if (!newItemName.trim()) setIsCreating(null);
            }}
            placeholder={isCreating === 'folder' ? 'components/ui' : 'script.py'}
            className="w-full bg-[#090D16] border border-indigo-500/50 text-slate-100 px-2 py-1 rounded text-xs outline-none"
          />
        </form>
      )}

      {/* Nodes Tree */}
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {files.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">Workspace is empty</div>
        ) : (
          renderNodes(files)
        )}
      </div>
    </div>
  );
};

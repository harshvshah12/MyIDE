'use client';

import React, { useState } from 'react';
import {
  X,
  Users,
  Copy,
  Check,
  Circle,
  FileCode,
  Shield,
  UserPlus
} from 'lucide-react';
import { User, Presence } from '@/types';

interface CollaborationHubProps {
  isOpen: boolean;
  onClose: () => void;
  onlineUsers: Presence[];
}

export const CollaborationHub: React.FC<CollaborationHubProps> = ({
  isOpen,
  onClose,
  onlineUsers,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const mockUsers: Presence[] = [
    {
      userId: 'user-harsh',
      userName: 'Harsh (You)',
      userColor: '#6366F1',
      activeFile: 'inference.py',
      cursor: { lineNumber: 14, column: 8 },
      lastActive: Date.now(),
    },
    {
      userId: 'user-aarav',
      userName: 'Aarav (Firmware Lead)',
      userColor: '#10B981',
      activeFile: 'README.md',
      cursor: { lineNumber: 6, column: 1 },
      lastActive: Date.now() - 5000,
    },
    {
      userId: 'user-priya',
      userName: 'Priya (UI & Vision)',
      userColor: '#F59E0B',
      activeFile: 'inference.py',
      cursor: { lineNumber: 8, column: 22 },
      lastActive: Date.now() - 12000,
    },
  ];

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-md bg-[#0F1523] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0B101D]">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-100">Team Collaboration & Presence</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Invite Box */}
          <div className="p-3 bg-[#111726] border border-white/10 rounded-lg space-y-2">
            <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
              <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Invite Teammate to Live Workspace</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                readOnly
                value="https://fabric-ide.local/ws/smartvision?token=student-hackathon-2026"
                className="w-full bg-[#090D16] border border-white/10 rounded px-2 py-1 text-[11px] text-slate-300 font-mono outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1 shrink-0 transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Active Collaborators */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Active Teammates ({mockUsers.length})
            </div>

            <div className="space-y-2">
              {mockUsers.map((u) => (
                <div
                  key={u.userId}
                  className="p-2.5 bg-[#111726] border border-white/5 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs"
                      style={{ backgroundColor: u.userColor }}
                    >
                      {u.userName[0]}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200 flex items-center space-x-1.5">
                        <span>{u.userName}</span>
                        <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400" />
                      </div>
                      {u.activeFile && (
                        <div className="flex items-center space-x-1 text-[10.5px] text-slate-400 mt-0.5">
                          <FileCode className="w-3 h-3 text-slate-500" />
                          <span className="font-mono">{u.activeFile}</span>
                          {u.cursor && (
                            <span className="text-slate-500">
                              (Ln {u.cursor.lineNumber}, Col {u.cursor.column})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400">
                    Live
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#0B101D] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 text-slate-200 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

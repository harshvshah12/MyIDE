'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FolderSync,
  FileText,
  CheckSquare,
  Square,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  Folder
} from 'lucide-react';
import { ObsidianVaultNote } from '@/types';

interface ObsidianBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ObsidianBridgeModal: React.FC<ObsidianBridgeModalProps> = ({ isOpen, onClose }) => {
  const [notes, setNotes] = useState<ObsidianVaultNote[]>([]);
  const [vaultPath, setVaultPath] = useState('C:\\projects\\orchestra-brain');
  const [isConnected, setIsConnected] = useState(true);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set(['Preferences.md']));

  useEffect(() => {
    if (isOpen) {
      fetch('/api/obsidian')
        .then((r) => r.json())
        .then((data) => {
          if (data.notes) {
            setNotes(data.notes);
            setVaultPath(data.vaultPath || 'C:\\projects\\orchestra-brain');
          }
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleNote = (notePath: string) => {
    setSelectedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(notePath)) {
        next.delete(notePath);
      } else {
        next.add(notePath);
      }
      return next;
    });
  };

  const handleSaveContext = async () => {
    try {
      await fetch('/api/obsidian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPaths: Array.from(selectedNotes) }),
      });
      onClose();
    } catch (e: any) {
      alert('Error updating Obsidian context: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-2xl bg-[#0F1523] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0B101D]">
          <div className="flex items-center space-x-2">
            <FolderSync className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Obsidian Brain & Knowledge Base Bridge
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-header info */}
        <div className="p-4 border-b border-white/5 bg-[#111726]/60 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Folder className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-indigo-300 text-[11px]">{vaultPath}</span>
            </div>
            <span className="flex items-center text-emerald-400 text-[10.5px]">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Selective Scoping Active (Privacy Guard)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Select the specific notes from your Obsidian vault to include as active AI pair-programming context.
            Private notes (career, personal diaries) are never exposed.
          </p>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5 text-xs">
          {notes.map((note) => {
            const isSelected = selectedNotes.has(note.path);
            return (
              <div
                key={note.path}
                onClick={() => toggleNote(note.path)}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start justify-between ${
                  isSelected
                    ? 'bg-purple-950/20 border-purple-500/40'
                    : 'bg-[#111726] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5 text-purple-400">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-100">{note.title}</span>
                      <span className="font-mono text-[10.5px] text-slate-500">{note.path}</span>
                      {note.kind && (
                        <span className="px-1.5 py-0.2 rounded bg-white/5 text-[10px] text-slate-400">
                          {note.kind}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {note.excerpt}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#0B101D] flex items-center justify-between text-xs">
          <span className="text-slate-400">
            {selectedNotes.size} note{selectedNotes.size === 1 ? '' : 's'} linked to active context
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveContext}
              className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
            >
              Apply Selected Context
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

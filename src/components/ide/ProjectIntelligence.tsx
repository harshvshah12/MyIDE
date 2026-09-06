'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Brain,
  Search,
  Plus,
  CheckCircle2,
  HelpCircle,
  Code,
  Tag,
  Send,
  Sparkles
} from 'lucide-react';
import { ProjectMemory, ArchitecturalDecision } from '@/types';

interface ProjectIntelligenceProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectIntelligence: React.FC<ProjectIntelligenceProps> = ({ isOpen, onClose }) => {
  const [memory, setMemory] = useState<ProjectMemory | null>(null);
  const [activeTab, setActiveTab] = useState<'qa' | 'decisions' | 'stack' | 'new-decision'>('qa');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  // New decision form
  const [newTitle, setNewTitle] = useState('');
  const [newDecision, setNewDecision] = useState('');
  const [newWhy, setNewWhy] = useState('');
  const [newConsequences, setNewConsequences] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/intelligence')
        .then((r) => r.json())
        .then((data) => {
          if (data.memory) setMemory(data.memory);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isAsking) return;

    setIsAsking(true);
    setAnswer(null);

    try {
      const res = await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setAnswer(data.answer || 'No relevant memory found.');
    } catch (e: any) {
      setAnswer('Error querying project memory: ' + e.message);
    } finally {
      setIsAsking(false);
    }
  };

  const handleAddDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/intelligence', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          decision: newDecision,
          why: newWhy,
          consequences: newConsequences,
          tags: ['architecture', 'team-consensus'],
        }),
      });
      const data = await res.json();
      if (data.success && memory) {
        setMemory({
          ...memory,
          decisions: [data.decision, ...memory.decisions],
        });
        setActiveTab('decisions');
        setNewTitle('');
        setNewDecision('');
        setNewWhy('');
        setNewConsequences('');
      }
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-2xl bg-[#0F1523] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0B101D]">
          <div className="flex items-center space-x-2">
            <Brain className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">Project Intelligence & Memory</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center px-5 py-2 border-b border-white/5 bg-[#111726]/70 space-x-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('qa')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'qa'
                ? 'bg-cyan-600/20 text-cyan-300 font-medium border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ask Project Memory
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('decisions')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'decisions'
                ? 'bg-cyan-600/20 text-cyan-300 font-medium border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Architecture Decisions ({memory?.decisions.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stack')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'stack'
                ? 'bg-cyan-600/20 text-cyan-300 font-medium border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stack & Conventions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('new-decision')}
            className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${
              activeTab === 'new-decision'
                ? 'bg-cyan-600/20 text-cyan-300 font-medium border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>Record Decision</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 text-xs">
          {activeTab === 'qa' && (
            <div className="space-y-4">
              <div className="text-[11px] text-slate-400">
                Ask anything about the team&apos;s historical design decisions, chosen libraries, or past failures.
              </div>

              <form onSubmit={handleAsk} className="space-y-2">
                <div className="flex items-center bg-[#111726] border border-white/10 rounded-lg focus-within:border-cyan-500/50 p-1.5">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g. Why did we choose Monaco Editor instead of a raw textarea?"
                    className="flex-1 bg-transparent px-2 py-1 text-slate-100 placeholder-slate-500 outline-none text-xs"
                  />
                  <button
                    type="submit"
                    disabled={!question.trim() || isAsking}
                    className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center space-x-1 shrink-0 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span>Ask</span>
                  </button>
                </div>
              </form>

              {/* Sample Quick Questions */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10.5px] text-slate-500 self-center mr-1">Quick prompts:</span>
                <button
                  type="button"
                  onClick={() => setQuestion('Why did we choose Monaco Editor?')}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[10.5px]"
                >
                  Why Monaco Editor?
                </button>
                <button
                  type="button"
                  onClick={() => setQuestion('Why separate credentials from capabilities?')}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[10.5px]"
                >
                  Why separate credentials?
                </button>
              </div>

              {isAsking && (
                <div className="p-4 bg-[#111726] border border-white/10 rounded-lg text-cyan-400 animate-pulse flex items-center space-x-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Synthesizing answer from project memory and decisions...</span>
                </div>
              )}

              {answer && (
                <div className="p-4 bg-[#111726] border border-cyan-500/30 rounded-lg space-y-2">
                  <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold text-xs">
                    <Brain className="w-3.5 h-3.5" />
                    <span>Project Memory Answer:</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed whitespace-pre-wrap select-text text-xs">
                    {answer}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'decisions' && (
            <div className="space-y-3">
              {memory?.decisions.map((dec) => (
                <div key={dec.id} className="p-3.5 bg-[#111726] border border-white/10 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-100">{dec.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{dec.date}</span>
                  </div>
                  <div className="text-slate-300 text-xs">{dec.decision}</div>
                  <div className="text-slate-400 text-[11px] bg-black/30 p-2 rounded border border-white/5">
                    <strong className="text-slate-300">Why:</strong> {dec.why}
                  </div>
                  {dec.tags && (
                    <div className="flex items-center space-x-1 pt-1">
                      {dec.tags.map((t) => (
                        <span key={t} className="px-1.5 py-0.2 rounded bg-white/5 text-slate-400 text-[10px]">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'stack' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#111726] border border-white/10 rounded-lg space-y-2">
                <div className="font-semibold text-slate-200">Architecture Overview</div>
                <p className="text-slate-300 leading-relaxed">{memory?.architecture}</p>
              </div>

              <div className="p-3 bg-[#111726] border border-white/10 rounded-lg space-y-2">
                <div className="font-semibold text-slate-200">Adopted Stack</div>
                <div className="flex flex-wrap gap-1.5">
                  {memory?.stack.map((item) => (
                    <span key={item} className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#111726] border border-white/10 rounded-lg space-y-2">
                <div className="font-semibold text-slate-200">Team Conventions</div>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  {memory?.conventions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'new-decision' && (
            <form onSubmit={handleAddDecision} className="space-y-3 max-w-lg">
              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">
                  Decision Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Use TensorRT for YOLO inference on edge"
                  className="w-full bg-[#111726] border border-white/15 rounded p-2 text-slate-100 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">
                  What was decided?
                </label>
                <input
                  type="text"
                  required
                  value={newDecision}
                  onChange={(e) => setNewDecision(e.target.value)}
                  placeholder="e.g. Compile YOLOv8 model to TensorRT engine for 3x speedup"
                  className="w-full bg-[#111726] border border-white/15 rounded p-2 text-slate-100 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">
                  Why this choice? (Rationale & Alternatives Rejected)
                </label>
                <textarea
                  rows={2}
                  required
                  value={newWhy}
                  onChange={(e) => setNewWhy(e.target.value)}
                  placeholder="e.g. OpenCV CPU inference was dropping below 15 FPS; TensorRT maintains 45 FPS"
                  className="w-full bg-[#111726] border border-white/15 rounded p-2 text-slate-100 text-xs outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">
                  Consequences & Trade-offs
                </label>
                <input
                  type="text"
                  value={newConsequences}
                  onChange={(e) => setNewConsequences(e.target.value)}
                  placeholder="e.g. Engine must be compiled separately for Jetson vs RTX"
                  className="w-full bg-[#111726] border border-white/15 rounded p-2 text-slate-100 text-xs outline-none"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors"
              >
                Record in Project Memory
              </button>
            </form>
          )}
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

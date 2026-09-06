'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, LogOut, Key, Shield, ChevronDown, Check } from 'lucide-react';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  authProvider: string;
}

interface UserProfileButtonProps {
  user: UserProfile | null;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export const UserProfileButton: React.FC<UserProfileButtonProps> = ({
  user,
  onLogout,
  onOpenSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <a
        href="/api/auth/google"
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30 transition-colors"
      >
        <UserIcon className="w-3.5 h-3.5" />
        <span>Sign In</span>
      </a>
    );
  }

  const initial = (user.name || user.email || 'U')[0].toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-white/10 bg-[#111726] hover:bg-[#161f33] hover:border-white/20 transition-colors text-left"
        aria-label="User profile menu"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-5 h-5 rounded-full object-cover border border-white/10"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-violet-600/30 border border-violet-500/40 text-violet-300 text-[10px] font-bold flex items-center justify-center">
            {initial}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-slate-200 leading-none truncate max-w-[110px]">
            {user.name}
          </span>
        </div>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-white/10 bg-[#0d121f] p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-white/10 mb-1">
            <div className="flex items-center gap-2">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover border border-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-violet-600/30 border border-violet-500/40 text-violet-300 font-bold flex items-center justify-center">
                  {initial}
                </div>
              )}
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-slate-100 truncate">{user.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
              <Shield className="w-3 h-3 text-violet-400" />
              <span>Identity:</span>
              <span className="text-slate-300 uppercase tracking-wider font-mono">
                {user.authProvider}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              onOpenSettings();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left"
          >
            <Key className="w-3.5 h-3.5 text-slate-400" />
            <span>Provider Connections & Keys</span>
          </button>

          <div className="my-1 border-t border-white/10" />

          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition-colors text-left"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

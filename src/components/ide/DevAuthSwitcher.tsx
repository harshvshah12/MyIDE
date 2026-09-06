'use client';

import React from 'react';
import { UserCheck, ShieldAlert } from 'lucide-react';

interface DevAuthSwitcherProps {
  currentUserId?: string;
  onSwitchPersona: (personaId: string) => void;
}

const PERSONAS = [
  { id: 'usr_owner_1', label: 'Owner', email: 'owner@mit.edu' },
  { id: 'usr_admin_1', label: 'Admin', email: 'admin@mit.edu' },
  { id: 'usr_member_1', label: 'Member', email: 'member@mit.edu' },
  { id: 'usr_viewer_1', label: 'Viewer', email: 'viewer@mit.edu' },
  { id: 'usr_stranger_1', label: 'Stranger', email: 'stranger@stanford.edu' },
];

export const DevAuthSwitcher: React.FC<DevAuthSwitcherProps> = ({
  currentUserId,
  onSwitchPersona,
}) => {
  return (
    <div className="h-7 bg-amber-950/40 border-b border-amber-500/20 px-4 flex items-center justify-between text-[11px] text-amber-300">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-semibold uppercase tracking-wider text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
          Dev Auth Mode
        </span>
        <span className="text-amber-200/80">Switch test personas:</span>
      </div>

      <div className="flex items-center gap-1.5">
        {PERSONAS.map((p) => {
          const isActive = currentUserId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSwitchPersona(p.id)}
              className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                isActive
                  ? 'bg-amber-500/30 text-amber-100 border border-amber-400/50 font-semibold'
                  : 'text-amber-300/70 hover:text-amber-100 hover:bg-amber-500/10'
              }`}
              title={`Switch identity to ${p.email}`}
            >
              {isActive && <UserCheck className="w-3 h-3 text-amber-300" />}
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

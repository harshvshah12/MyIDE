'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Key,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'google-setup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [oauthStatus, setOauthStatus] = useState<{ isConfigured: boolean; redirectUri: string } | null>(null);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/auth/oauth-config')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setOauthStatus({ isConfigured: data.isConfigured, redirectUri: data.redirectUri });
          }
        })
        .catch(() => {});
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyRedirectUri = () => {
    if (oauthStatus?.redirectUri) {
      navigator.clipboard.writeText(oauthStatus.redirectUri);
      setCopiedRedirect(true);
      setTimeout(() => setCopiedRedirect(false), 2000);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }
      setStatusMessage({ type: 'success', text: `Welcome back, ${data.user.name}!` });
      setTimeout(() => {
        onAuthSuccess(data.user);
        onClose();
      }, 700);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Signup failed');
      }
      setStatusMessage({ type: 'success', text: `Account created! Welcome, ${data.user.name}.` });
      setTimeout(() => {
        onAuthSuccess(data.user);
        onClose();
      }, 700);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGoogleOAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/auth/oauth-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: googleClientId, clientSecret: googleClientSecret }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save Google OAuth configuration');
      }
      setStatusMessage({ type: 'success', text: 'Google OAuth configured! You can now sign in with Google.' });
      setOauthStatus((prev) => prev ? { ...prev, isConfigured: true } : null);
      setTimeout(() => setMode('signin'), 1500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerGoogleOAuth = () => {
    if (oauthStatus && !oauthStatus.isConfigured) {
      setMode('google-setup');
      return;
    }
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-md bg-[#0d121f] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#090d16]">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300 font-bold text-xs">
              F
            </div>
            <h2 className="text-sm font-semibold text-slate-100">
              {mode === 'google-setup' ? 'Configure Google OAuth' : 'Developer Identity & Authentication'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        {mode !== 'google-setup' && (
          <div className="flex border-b border-white/10 bg-[#0a0e18]">
            <button
              onClick={() => { setMode('signin'); setStatusMessage(null); }}
              className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors ${
                mode === 'signin'
                  ? 'text-white border-b-2 border-violet-500 bg-white/[0.02]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setStatusMessage(null); }}
              className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors ${
                mode === 'signup'
                  ? 'text-white border-b-2 border-violet-500 bg-white/[0.02]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Mode: Google Cloud Setup */}
          {mode === 'google-setup' ? (
            <form onSubmit={handleSaveGoogleOAuth} className="space-y-3.5">
              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200/90 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Google Cloud Console Setup</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  To authenticate users via Google OAuth, register this deployment in Google Cloud Console.
                </p>
                <div className="pt-1">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Authorized Redirect URI:</div>
                  <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded px-2 py-1 font-mono text-[11px] text-violet-300 select-all">
                    <span className="truncate">{oauthStatus?.redirectUri || 'https://myide-gold.vercel.app/api/auth/callback/google'}</span>
                    <button
                      type="button"
                      onClick={handleCopyRedirectUri}
                      className="p-1 hover:text-white"
                      title="Copy URI"
                    >
                      {copiedRedirect ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Google Client ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111726] border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Google Client Secret</label>
                <input
                  type="password"
                  required
                  placeholder="GOCSPX-..."
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111726] border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-violet-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="flex-1 py-2 text-xs rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Encrypting & Saving...' : 'Save & Enable Google'}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Google OAuth Button */}
              <div>
                <button
                  type="button"
                  onClick={handleTriggerGoogleOAuth}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-white text-slate-900 font-semibold text-xs hover:bg-slate-100 transition-colors shadow-sm"
                >
                  {/* Google "G" Logo */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {oauthStatus && !oauthStatus.isConfigured && (
                  <div className="flex items-center justify-between mt-1.5 px-1">
                    <span className="text-[11px] text-amber-400/90">Google OAuth not linked yet</span>
                    <button
                      type="button"
                      onClick={() => setMode('google-setup')}
                      className="text-[11px] text-violet-400 hover:text-violet-300 underline font-medium"
                    >
                      Configure Client ID
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[11px] text-slate-500 uppercase tracking-wider">or with email</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Form: Sign In or Sign Up */}
              <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-3">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                    <div className="relative">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="Harsh Shah"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#111726] border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-violet-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="developer@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#111726] border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#111726] border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-violet-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 mt-2"
                >
                  <span>{isLoading ? 'Authenticating...' : mode === 'signin' ? 'Sign In to Workspace' : 'Create Developer Account'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

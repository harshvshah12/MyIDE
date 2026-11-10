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
  Copy,
  Check,
  Sparkles,
  Bot,
  Zap,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'google-setup' | 'openai-setup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Google OAuth Config
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [googleOauthStatus, setGoogleOauthStatus] = useState<{ isConfigured: boolean; redirectUri: string } | null>(null);

  // OpenAI OAuth Config
  const [openaiClientId, setOpenaiClientId] = useState('');
  const [openaiClientSecret, setOpenaiClientSecret] = useState('');
  const [openaiOauthStatus, setOpenaiOauthStatus] = useState<{ isConfigured: boolean; redirectUri: string } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  const loadConfigs = async () => {
    try {
      const [gRes, oRes] = await Promise.all([
        fetch('/api/auth/oauth-config').then((r) => r.json()),
        fetch('/api/auth/openai-config').then((r) => r.json()).catch(() => ({ success: false })),
      ]);

      if (gRes.success) {
        setGoogleOauthStatus({ isConfigured: gRes.isConfigured, redirectUri: gRes.redirectUri });
      }
      if (oRes.success) {
        setOpenaiOauthStatus({ isConfigured: oRes.isConfigured, redirectUri: oRes.redirectUri });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConfigs();
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyUri = (uri?: string) => {
    if (uri) {
      navigator.clipboard.writeText(uri);
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
      setStatusMessage({ type: 'success', text: 'Google OAuth configured! Gemini models ready on login.' });
      setGoogleOauthStatus((prev) => prev ? { ...prev, isConfigured: true } : null);
      setTimeout(() => setMode('signin'), 1200);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOpenAIOAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/auth/openai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: openaiClientId, clientSecret: openaiClientSecret }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save OpenAI OAuth configuration');
      }
      setStatusMessage({ type: 'success', text: 'OpenAI OAuth configured! ChatGPT models ready on login.' });
      setOpenaiOauthStatus((prev) => prev ? { ...prev, isConfigured: true } : null);
      setTimeout(() => setMode('signin'), 1200);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerGoogleOAuth = () => {
    if (googleOauthStatus && !googleOauthStatus.isConfigured) {
      setMode('google-setup');
      return;
    }
    window.location.href = '/api/auth/google';
  };

  const handleTriggerOpenAIOAuth = () => {
    if (openaiOauthStatus && !openaiOauthStatus.isConfigured) {
      setMode('openai-setup');
      return;
    }
    window.location.href = '/api/auth/openai';
  };

  const handleQuickDemoGoogle = () => {
    window.location.href = '/api/auth/google?demo=true';
  };

  const handleQuickDemoChatGPT = () => {
    window.location.href = '/api/auth/openai?demo=true';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-md bg-[#0d121f] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#090d16]">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300 font-bold text-xs">
              F
            </div>
            <h2 className="text-sm font-semibold text-slate-100">
              {mode === 'google-setup'
                ? 'Configure Google Cloud OAuth'
                : mode === 'openai-setup'
                ? 'Configure OpenAI / ChatGPT OAuth'
                : 'Authentication & AI Model Access'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        {mode !== 'google-setup' && mode !== 'openai-setup' && (
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

        <div className="p-5 overflow-y-auto space-y-4">
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
                  Log in once with Google to automatically unlock Gemini 2.5 Pro and Flash without manually generating API keys.
                </p>
                <div className="pt-1">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Authorized Redirect URI:</div>
                  <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded px-2 py-1 font-mono text-[11px] text-violet-300 select-all">
                    <span className="truncate">{googleOauthStatus?.redirectUri || 'https://myide-gold.vercel.app/api/auth/callback/google'}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyUri(googleOauthStatus?.redirectUri)}
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
                  className="flex-1 py-2 text-xs rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'Saving...' : 'Save & Enable Google'}
                </button>
              </div>
            </form>
          ) : mode === 'openai-setup' ? (
            /* Mode: OpenAI Setup */
            <form onSubmit={handleSaveOpenAIOAuth} className="space-y-3.5">
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-200/90 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5 text-emerald-300">
                  <Bot className="w-3.5 h-3.5" />
                  <span>OpenAI / ChatGPT OAuth Setup</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Sign in with ChatGPT to automatically unlock GPT-4o, o1, and ChatGPT models directly through your OpenAI account.
                </p>
                <div className="pt-1">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Authorized Redirect URI:</div>
                  <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded px-2 py-1 font-mono text-[11px] text-emerald-300 select-all">
                    <span className="truncate">{openaiOauthStatus?.redirectUri || 'https://myide-gold.vercel.app/api/auth/callback/openai'}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyUri(openaiOauthStatus?.redirectUri)}
                      className="p-1 hover:text-white"
                      title="Copy URI"
                    >
                      {copiedRedirect ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">OpenAI Client ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. app_openai_client_id_..."
                  value={openaiClientId}
                  onChange={(e) => setOpenaiClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111726] border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">OpenAI Client Secret</label>
                <input
                  type="password"
                  required
                  placeholder="sec_..."
                  value={openaiClientSecret}
                  onChange={(e) => setOpenaiClientSecret(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111726] border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="flex-1 py-2 text-xs rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'Saving...' : 'Save & Enable ChatGPT'}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Social Login 1: Google OAuth with Gemini auto-fetch */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={handleTriggerGoogleOAuth}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-white text-slate-900 font-semibold text-xs hover:bg-slate-100 transition-colors shadow-sm cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  </div>
                  <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                    Auto Gemini
                  </span>
                </button>

                <div className="flex items-center justify-between px-1 text-[11px]">
                  <span className="text-slate-400">
                    {googleOauthStatus?.isConfigured ? '✓ OAuth Configured' : 'Needs client ID'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleQuickDemoGoogle}
                      className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                      title="1-click demo login with Google & Gemini enabled"
                    >
                      Demo 1-Click
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setMode('google-setup')}
                      className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
                    >
                      Config
                    </button>
                  </div>
                </div>
              </div>

              {/* Social Login 2: ChatGPT / OpenAI OAuth */}
              <div className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={handleTriggerOpenAIOAuth}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#10A37F] hover:bg-[#0E8E6D] text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    {/* OpenAI Logo */}
                    <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4947zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.02-1.1635a.0804.0804 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4025-.6863zm2.0059-4.5422l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L8.9023 7.7107V5.3783a.0804.0804 0 0 1 .0332-.0615l4.8303-2.7913a4.504 4.504 0 0 1 6.6829 4.6543zM8.3065 12.863l-2.02-1.1635a.0804.0804 0 0 1-.038-.0568V6.0601a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805-4.7783 2.7582a.7948.7948 0 0 0-.3927.6813zm1.145-2.0632l2.5484-1.472 2.5484 1.472v2.944l-2.5484 1.472-2.5484-1.472z" />
                    </svg>
                    <span>Continue with ChatGPT</span>
                  </div>
                  <span className="text-[10px] font-medium bg-emerald-950/60 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Auto GPT-4o
                  </span>
                </button>

                <div className="flex items-center justify-between px-1 text-[11px]">
                  <span className="text-slate-400">
                    {openaiOauthStatus?.isConfigured ? '✓ OAuth Configured' : 'Needs client ID'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleQuickDemoChatGPT}
                      className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                      title="1-click demo login with ChatGPT & OpenAI models enabled"
                    >
                      Demo 1-Click
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setMode('openai-setup')}
                      className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
                    >
                      Config
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 my-2">
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
                  className="w-full py-2.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 mt-2 cursor-pointer"
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

import { useState } from 'react';
import { Mail, User, MapPin, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, LanguageToggle, Logo } from '../components/ui.jsx';
import { DEMO_MODE } from '../lib/backend.js';
import { demoStore } from '../lib/demoStore.js';
import { authResetPassword } from '../lib/api.js';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [forgot, setForgot] = useState(false);
  // Returning visitors land on Sign in instead of Create account
  const [mode, setMode] = useState(() => (DEMO_MODE && demoStore.hasAccounts() ? 'signin' : 'signup'));
  const [guestBusy, setGuestBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    if (mode === 'signup') {
      if (username.trim().length < 2) {
        setError('Choose a username with at least 2 characters.');
        setBusy(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setBusy(false);
        return;
      }
      const { error: err, needsConfirm } = await signUp(email.trim(), password, username.trim(), city.trim());
      if (err) setError(friendlyAuthError(err));
      else if (needsConfirm) { setNotice('Almost there! Check your email and tap the confirmation link, then sign in.'); setMode('signin'); }
    } else if (forgot) {
      const { error: err } = await authResetPassword(email.trim());
      if (err) setError(friendlyAuthError(err));
      else setNotice("If this email has an account, we've sent a link to set a new password. Didn't get it within a few minutes? Ask the SwapStyle admin for a temporary password.");
    } else {
      const { error: err } = await signIn(email.trim(), password);
      if (err) setError(friendlyAuthError(err));
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 pb-10 pt-16">
        <LanguageToggle className="absolute end-5 top-5" />
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-float">
            <Logo size={44} container={false} />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink-900">SwapStyle</h1>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-500">Swap and refresh your style.</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1">
          {['signup', 'signin'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setForgot(false); }}
              className={`h-10 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}
            >
              {m === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <AuthField icon={<Mail size={18} />} type="email" placeholder="Email" value={email} onChange={setEmail} required />
          {mode === 'signup' && (
            <>
              <AuthField icon={<User size={18} />} placeholder="Username" value={username} onChange={setUsername} required />
              <AuthField icon={<MapPin size={18} />} placeholder="City (optional)" value={city} onChange={setCity} />
            </>
          )}
          {!forgot && <AuthField icon={<Lock size={18} />} type="password" placeholder="Password" value={password} onChange={setPassword} required />}
          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => { setForgot((v) => !v); setError(null); setNotice(null); }}
              className="self-end text-xs font-medium text-ink-500 underline-offset-2 hover:underline"
            >
              {forgot ? 'Back to sign in' : 'Forgot password?'}
            </button>
          )}
          {notice && <div className="rounded-xl bg-sage-50 px-4 py-3 text-sm text-sage-700">{notice}</div>}
          {error && <div className="rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>}
          <Button type="submit" size="lg" loading={busy} className="mt-2 w-full">
            {mode === 'signup' ? 'Start swapping' : forgot ? 'Send reset link' : 'Sign in'}
            <ArrowRight size={18} className="flip-rtl" />
          </Button>
        </form>

        {DEMO_MODE && (
          <div className="mt-4 flex flex-col gap-2">
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              loading={guestBusy}
              onClick={async () => { setGuestBusy(true); await demoStore.guestLogin(); setGuestBusy(false); }}
            >
              Try the demo – no sign-up
            </Button>
            <p className="rounded-xl bg-sand-100 px-4 py-2.5 text-center text-xs text-sand-700">
              {demoStore.storageWorks()
                ? 'Demo mode: your account and items are saved only on this device and browser.'
                : "Demo mode: this browser doesn't let the page save anything, so you'll start fresh each time you open it."}
            </p>
          </div>
        )}

        <p className="mt-auto pt-8 text-center text-xs text-ink-400">By continuing you agree to swap responsibly and kindly.</p>
      </div>
    </div>
  );
}

// Opened from a "reset your password" email
export function NewPasswordScreen() {
  const { setNewPassword, signOut } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const save = async (e) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 6) return setError('Password must be at least 6 characters.');
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    const { error: err } = await setNewPassword(pw);
    setBusy(false);
    if (err) setError(err);
  };
  return (
    <div className="min-h-screen bg-sand-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-10 pt-16">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-float">
            <Logo size={44} container={false} />
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Set a new password</h1>
          <p className="mt-2 text-sm text-ink-500">Choose a password you'll remember.</p>
        </div>
        <form onSubmit={save} className="flex flex-col gap-3">
          <AuthField icon={<Lock size={18} />} type="password" placeholder="New password" value={pw} onChange={setPw} required />
          <AuthField icon={<Lock size={18} />} type="password" placeholder="Repeat new password" value={pw2} onChange={setPw2} required />
          {error && <div className="rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>}
          <Button type="submit" size="lg" loading={busy} className="mt-2 w-full">Save password</Button>
          <button type="button" onClick={signOut} className="mt-1 text-xs text-ink-500 underline-offset-2 hover:underline">Cancel</button>
        </form>
      </div>
    </div>
  );
}

function AuthField({ icon, type = 'text', placeholder, value, onChange, required }) {
  return (
    <div className="flex h-12 items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 transition focus-within:border-ink-900">
      <span className="text-ink-400">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="h-full w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
      />
    </div>
  );
}

function friendlyAuthError(msg) {
  if (msg.includes('User already registered')) return 'An account with this email already exists. Try signing in.';
  if (msg.includes('Invalid login')) return 'Incorrect email or password.';
  if (msg.includes('password')) return 'Password must be at least 6 characters.';
  return msg;
}

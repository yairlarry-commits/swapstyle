// Report button (everyone) and small admin controls.
import { useState } from 'react';
import { Flag, Check, ShieldAlert } from 'lucide-react';
import { REPORT_REASONS, reportContent } from '../lib/api.js';
import { Button, Sheet } from './ui.jsx';

// A quiet "Report" link that opens a sheet with reasons
export function ReportButton({ targetType, targetId, label = 'Report', className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-ink-400 transition hover:text-accent-600 ${className}`}
      >
        <Flag size={13} /> {label}
      </button>
      <ReportSheet open={open} onClose={() => setOpen(false)} targetType={targetType} targetId={targetId} />
    </>
  );
}

function ReportSheet({ open, onClose, targetType, targetId }) {
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const what = { item: 'this item', profile: 'this person', swap: 'this conversation' }[targetType];

  const close = () => {
    onClose();
    setTimeout(() => { setReason(null); setDetails(''); setSent(false); setError(null); }, 300);
  };

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await reportContent({ target_type: targetType, target_id: targetId, reason, details });
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title={sent ? 'Report sent' : `Report ${what}`}>
      {sent ? (
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-sage-100 text-sage-700"><Check size={26} /></div>
          <p className="text-sm text-ink-600">Thanks. The SwapStyle team will take a look.</p>
          <Button className="mt-5 w-full" onClick={close}>Done</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ink-500">What's wrong? Reports are private: the other person won't see who sent them.</p>
          <div className="flex flex-col gap-1.5">
            {REPORT_REASONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setReason(r.id)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-start text-sm transition ${
                  reason === r.id ? 'border-ink-900 bg-ink-50 text-ink-900' : 'border-ink-200 text-ink-600'
                }`}
              >
                {r.label}
                {reason === r.id && <Check size={16} />}
              </button>
            ))}
          </div>
          <textarea
            id="report-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Anything else we should know? (optional)"
            className="w-full resize-none rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-ink-900 focus:outline-none"
          />
          {error && <div className="rounded-xl bg-accent-50 px-3 py-2 text-sm text-accent-700">{error}</div>}
          <Button size="lg" className="w-full" disabled={!reason} loading={sending} onClick={send}>
            <Flag size={16} /> Send report
          </Button>
        </div>
      )}
    </Sheet>
  );
}

// A button that asks for a second tap before doing something drastic
export function ConfirmButton({ children, confirmLabel = 'Tap again to confirm', onConfirm, variant = 'outline', size = 'sm', className = '' }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant={armed ? 'danger' : variant}
      size={size}
      loading={busy}
      className={className}
      onClick={async () => {
        if (!armed) {
          setArmed(true);
          setTimeout(() => setArmed(false), 4000);
          return;
        }
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
          setArmed(false);
        }
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}

// The admin panel shown on items and profiles
export function AdminBox({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-accent-200 bg-accent-50/50 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-accent-700">
        <ShieldAlert size={12} /> Admin
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

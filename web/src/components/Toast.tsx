import { useEffect } from 'react';
import { CheckCircle, WarningTriangle, Xmark } from 'iconoir-react';

export interface ToastMessage {
  kind: 'success' | 'error';
  text: string;
}

export default function Toast({ toast, onClose }: { toast: ToastMessage | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onClose, 6000);
    return () => window.clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const ok = toast.kind === 'success';
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={`fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-2 rounded-lg p-4 text-white shadow-lg ${
        ok ? 'bg-emerald-800' : 'bg-red-800'
      }`}
    >
      {ok ? <CheckCircle aria-hidden="true" /> : <WarningTriangle aria-hidden="true" />}
      <span className="flex-1">{toast.text}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer la notification"
        className="rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <Xmark aria-hidden="true" />
      </button>
    </div>
  );
}

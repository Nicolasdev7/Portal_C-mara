import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

export type ToastState = {
  kind: ToastKind;
  title: string;
  message?: string;
};

export function Toast({
  toast,
  onClose,
  autoCloseMs = 5000,
}: {
  toast: ToastState;
  onClose: () => void;
  autoCloseMs?: number;
}) {
  useEffect(() => {
    if (!autoCloseMs) return;
    const id = window.setTimeout(onClose, autoCloseMs);
    return () => window.clearTimeout(id);
  }, [autoCloseMs, onClose]);

  const Icon = toast.kind === 'error' ? AlertCircle : toast.kind === 'success' ? CheckCircle2 : Info;

  return (
    <div className="fixed top-4 right-4 z-[100] w-[min(28rem,calc(100vw-2rem))]">
      <div className="rounded-lg border border-gray-200 bg-white shadow-lg">
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5">
            <Icon className="h-5 w-5 text-gray-900" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900">{toast.title}</div>
            {toast.message ? (
              <div className="mt-1 text-sm text-gray-600 break-words">{toast.message}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}


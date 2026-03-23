import { useEffect, useMemo, useState } from 'react';
import { apiJson } from '../lib/api';

type SyncRunStatus = 'none' | 'running' | 'completed' | 'failed';

export type SyncStatus = {
  status: SyncRunStatus;
  finished_at?: string | null;
  started_at?: string | null;
  period_key?: string | null;
  error_message?: string | null;
};

function formatSyncTimestamp(iso: string) {
  const d = new Date(iso);
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d);
  const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  return `${time} - ${date}`;
}

export function useSyncStatus(pollMs = 15000) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await apiJson<SyncStatus>('/api/gastos/status', { timeoutMs: 15000 });
        if (!mounted) return;
        setStatus(data);
        setError('');
      } catch (e: unknown) {
        if (!mounted) return;
        const message =
          e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
            ? String((e as { message?: unknown }).message)
            : 'Falha ao obter status da sincronização';
        setError(message);
      }
    };

    load();
    const id = window.setInterval(load, pollMs);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [pollMs]);

  const label = useMemo(() => {
    if (!status?.status || status.status === 'none') return 'Sem atualização registrada';
    if (status.status === 'running') return 'Atualizando...';
    if (status.status === 'failed') return 'Falha na atualização';
    if (status.status === 'completed' && status.finished_at) return `Atualizado em: ${formatSyncTimestamp(status.finished_at)}`;
    return 'Sem atualização registrada';
  }, [status]);

  return { status, label, error };
}

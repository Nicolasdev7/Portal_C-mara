import 'dotenv/config';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const CAMARA_API_BASE = 'https://dadosabertos.camara.leg.br/api/v2';

type Deputy = {
  id: number;
  nome: string;
  siglaPartido?: string;
  siglaUf?: string;
};

type CamaraExpense = {
  ano: number;
  mes: number;
  codDocumento?: number | null;
  numDocumento?: string | number | null;
  id?: string | number | null;
  dataDocumento?: string | null;
  valorDocumento: number;
  tipoDespesa?: string | null;
  nomeFornecedor?: string | null;
  tipoDocumento?: string | null;
  urlDocumento?: string | null;
};

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterMs(error: unknown) {
  if (!error || typeof error !== 'object') return null;
  if (!('response' in error)) return null;
  const response = (error as { response?: { headers?: Record<string, unknown> } }).response;
  const raw = response?.headers?.['retry-after'];
  if (typeof raw === 'string') {
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  }
  return null;
}

async function camaraGet<T>(path: string, params: Record<string, unknown>) {
  const url = `${CAMARA_API_BASE}${path}`;
  const MAX_ATTEMPTS = 12;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await axios.get<T>(url, { params, timeout: 30000 });
    } catch (error: unknown) {
      const status =
        error && typeof error === 'object' && 'response' in error
          ? ((error as { response?: { status?: unknown } }).response?.status as number | undefined)
          : undefined;

      const retryableStatus = status === 429 || status === 408 || status === 502 || status === 503 || status === 504;
      if (!retryableStatus || attempt === MAX_ATTEMPTS - 1) throw error;

      const retryAfterMs = getRetryAfterMs(error);
      const baseMs = status === 429 ? Math.min(120000, 10000 * 2 ** attempt) : Math.min(60000, 1500 * 2 ** attempt);
      const waitMs = (retryAfterMs ?? baseMs) + Math.floor(Math.random() * 500);
      await sleep(waitMs);
    }
  }

  throw new Error('Falha inesperada ao chamar API da Câmara');
}

function chunkArray<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type Period = { ano: number; mes: number; periodKey: string };

function parseYearMonth(value: string): { ano: number; mes: number } {
  const m = value.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error(`Período inválido: ${value}. Use YYYY-MM`);
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  if (!ano || !mes || mes < 1 || mes > 12) throw new Error(`Período inválido: ${value}. Use YYYY-MM`);
  return { ano, mes };
}

function toPeriod(ano: number, mes: number): Period {
  return { ano, mes, periodKey: `${ano}-${String(mes).padStart(2, '0')}` };
}

function nextMonth({ ano, mes }: { ano: number; mes: number }) {
  if (mes === 12) return { ano: ano + 1, mes: 1 };
  return { ano, mes: mes + 1 };
}

function buildRange(from: { ano: number; mes: number }, to: { ano: number; mes: number }) {
  const out: Period[] = [];
  let cur = from;
  while (cur.ano < to.ano || (cur.ano === to.ano && cur.mes <= to.mes)) {
    out.push(toPeriod(cur.ano, cur.mes));
    cur = nextMonth(cur);
    if (out.length > 2400) throw new Error('Range muito grande (limite de segurança atingido).');
  }
  return out;
}

function legislaturaForYearMonth(ano: number, mes: number) {
  void mes;
  if (ano >= 2023) return 57;
  if (ano >= 2019) return 56;
  if (ano >= 2015) return 55;
  if (ano >= 2011) return 54;
  return 56;
}

async function fetchAllDeputies(ano: number, mes: number) {
  const all: Deputy[] = [];
  const itens = 100;
  let pagina = 1;
  const idLegislatura = legislaturaForYearMonth(ano, mes);

  while (true) {
    const res = await camaraGet<{ dados: Deputy[] }>('/deputados', {
      itens,
      pagina,
      ordem: 'ASC',
      ordenarPor: 'nome',
      idLegislatura,
    });

    const dados: Deputy[] = res.data?.dados || [];
    if (!dados.length) break;

    all.push(...dados);
    if (dados.length < itens) break;

    pagina += 1;
    if (pagina > 30) break;
    await sleep(200);
  }

  return all;
}

async function fetchAllExpensesForDeputy(depId: number, ano: number, mes: number) {
  const all: CamaraExpense[] = [];
  const itens = 100;
  let pagina = 1;
  const idLegislatura = legislaturaForYearMonth(ano, mes);

  while (true) {
    const res = await camaraGet<{ dados: CamaraExpense[] }>(`/deputados/${depId}/despesas`, {
      ano,
      mes,
      idLegislatura,
      itens,
      pagina,
      ordem: 'DESC',
      ordenarPor: 'dataDocumento',
    });

    const dados: CamaraExpense[] = res.data?.dados || [];
    if (!dados.length) break;

    all.push(...dados);
    if (dados.length < itens) break;

    pagina += 1;
    if (pagina > 50) break;
    await sleep(200);
  }

  return all;
}

async function syncOnePeriod(supabaseAdmin: ReturnType<typeof createClient>, period: Period) {
  const { ano, mes, periodKey } = period;

  const { data: existing } = await supabaseAdmin
    .from('sync_runs')
    .select('id,status,finished_at,started_at,fetched_count,upserted_count')
    .eq('period_key', periodKey)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.status === 'completed' && Number(existing.upserted_count || 0) > 0) {
    console.log(JSON.stringify({ status: 'skipped', periodKey, reason: 'already_completed', finished_at: existing.finished_at }));
    return { status: 'skipped' as const, periodKey };
  }
  if (existing?.status === 'running') {
    const startedAtMs = existing.started_at ? new Date(existing.started_at).getTime() : NaN;
    const ageMs = Date.now() - startedAtMs;
    const maxAgeMs = 1000 * 60 * 90;

    if (Number.isFinite(ageMs) && ageMs > maxAgeMs) {
      await supabaseAdmin
        .from('sync_runs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: 'Execução marcada como falha automaticamente (tempo excedido)',
        })
        .eq('id', existing.id);
    } else {
      console.log(JSON.stringify({ status: 'skipped', periodKey, reason: 'already_running' }));
      return { status: 'skipped' as const, periodKey };
    }
  }

  const { data: syncRun, error: syncError } = await supabaseAdmin
    .from('sync_runs')
    .insert({ status: 'running', period_key: periodKey })
    .select()
    .single();

  if (syncError) throw syncError;
  if (!syncRun?.id) throw new Error('Falha ao criar sync_run');

  let fetchedCount = 0;
  let upsertedCount = 0;

  try {
    const deputados = await fetchAllDeputies(ano, mes);
    for (const dep of deputados) {
      const despesas = await fetchAllExpensesForDeputy(dep.id, ano, mes);
      if (!despesas.length) {
        await sleep(80);
        continue;
      }

      fetchedCount += despesas.length;

      const records = despesas.map((d: CamaraExpense) => ({
        id: `${dep.id}-${d.codDocumento ?? '0'}-${d.numDocumento ?? d.id ?? ''}`,
        expense_date: d.dataDocumento ? String(d.dataDocumento).split('T')[0] : null,
        year: d.ano,
        month: d.mes,
        amount: d.valorDocumento,
        category: d.tipoDespesa,
        supplier: d.nomeFornecedor,
        org_unit: dep.nome,
        party: dep.siglaPartido,
        state: dep.siglaUf,
        description: d.tipoDocumento,
        source_url: d.urlDocumento,
        raw: d,
      }));

      for (const group of chunkArray(records, 500)) {
        const { error: upsertError } = await supabaseAdmin.from('expenses').upsert(group, { onConflict: 'id' });
        if (!upsertError) upsertedCount += group.length;
      }

      await sleep(400);
    }

    await supabaseAdmin
      .from('sync_runs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        fetched_count: fetchedCount,
        upserted_count: upsertedCount,
      })
      .eq('id', syncRun.id);

    console.log(JSON.stringify({ status: 'completed', periodKey, fetchedCount, upsertedCount }));
    return { status: 'completed' as const, periodKey };
  } catch (e: unknown) {
    const message =
      e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
        ? String((e as { message?: unknown }).message)
        : String(e);
    await supabaseAdmin
      .from('sync_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        fetched_count: fetchedCount,
        upserted_count: upsertedCount,
        error_message: message,
      })
      .eq('id', syncRun.id);

    console.error(JSON.stringify({ status: 'failed', periodKey, error: message }));
    return { status: 'failed' as const, periodKey, error: message };
  }
}

async function main() {
  process.env.TZ ||= 'America/Sao_Paulo';

  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  const args = process.argv.slice(2);
  const now = new Date();

  const fromArg = args.find((a) => a.startsWith('--from='));
  const toArg = args.find((a) => a.startsWith('--to='));

  let periods: Period[] = [];
  if (fromArg && toArg) {
    const from = parseYearMonth(fromArg.replace('--from=', ''));
    const to = parseYearMonth(toArg.replace('--to=', ''));
    periods = buildRange(from, to);
  } else {
    const argAno = args[0];
    const argMes = args[1];
    const ano = argAno ? Number(argAno) : now.getFullYear();
    const mes = argMes ? Number(argMes) : now.getMonth() + 1;
    if (!ano || !mes || mes < 1 || mes > 12) {
      throw new Error('Uso: npm run sync:daily -- [ano] [mes]  OU  npm run sync:daily -- --from=YYYY-MM --to=YYYY-MM');
    }
    periods = [toPeriod(ano, mes)];
  }

  const failed: Array<{ periodKey: string; error?: string }> = [];
  for (const period of periods) {
    const result = await syncOnePeriod(supabaseAdmin, period);
    if (result.status === 'failed') failed.push({ periodKey: result.periodKey, error: result.error });
    await new Promise((r) => setTimeout(r, 300));
  }

  if (failed.length) {
    throw new Error(`Falhas em ${failed.length} período(s): ${failed.map((f) => f.periodKey).join(', ')}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

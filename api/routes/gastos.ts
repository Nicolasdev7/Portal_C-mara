import express from 'express';
import { supabase, supabaseAdmin } from '../services/supabaseClient.js';
import axios from 'axios';

const router = express.Router();

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
  const MAX_ATTEMPTS = 8;

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
      const baseMs = Math.min(30000, 1500 * 2 ** attempt);
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
  }

  return all;
}

async function fetchAllExpensesForDeputy(depId: number, ano: number, mes: number) {
  const all: CamaraExpense[] = [];
  const itens = 100;
  let pagina = 1;

  while (true) {
    const res = await camaraGet<{ dados: CamaraExpense[] }>(`/deputados/${depId}/despesas`, {
      ano,
      mes,
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
  }

  return all;
}

// 1. Endpoint to trigger a sync for a specific year/month
router.post('/sync', async (req, res) => {
  const { ano, mes } = req.body;
  
  if (!ano || !mes) {
    return res.status(400).json({ error: 'ano and mes are required' });
  }

  const periodKey = `${ano}-${String(mes).padStart(2, '0')}`;

  try {
    // Check if sync is already running
    const { data: existingSync } = await supabase
      .from('sync_runs')
      .select('*')
      .eq('period_key', periodKey)
      .eq('status', 'running')
      .single();

    if (existingSync) {
      return res.status(400).json({ error: 'Sync already running for this period' });
    }

    // Create sync run
    const { data: syncRun, error: syncError } = await supabaseAdmin
      .from('sync_runs')
      .insert({
        period_key: periodKey,
        status: 'running',
      })
      .select()
      .single();

    if (syncError) throw syncError;

    // Start background sync (do not await)
    runSyncProcess(syncRun.id, ano, mes).catch(console.error);

    return res.status(202).json({ 
      message: 'Sync started in background',
      sync_id: syncRun.id
    });
  } catch (error: unknown) {
    const message =
      error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? String((error as { message?: unknown }).message)
        : 'Erro interno';
    console.error('Error starting sync:', error);
    return res.status(500).json({ error: message });
  }
});

// Background sync function
async function runSyncProcess(syncId: string, ano: number, mes: number) {
  try {
    // 1. Fetch all deputies
    const deputados = await fetchAllDeputies(ano, mes);

    let fetchedCount = 0;
    let upsertedCount = 0;

    for (const dep of deputados) {
      try {
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

          if (upsertError) {
            console.error(`Upsert error for deputy ${dep.nome}:`, upsertError);
          } else {
            upsertedCount += group.length;
          }
        }
      } catch (err: unknown) {
        const message =
          err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
            ? String((err as { message?: unknown }).message)
            : String(err);
        console.error(`Error fetching expenses for deputy ${dep.id}:`, message);
      }

      await sleep(120);
    }

    // Finish sync
    await supabaseAdmin
      .from('sync_runs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        fetched_count: fetchedCount,
        upserted_count: upsertedCount
      })
      .eq('id', syncId);

  } catch (error: unknown) {
    const message =
      error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? String((error as { message?: unknown }).message)
        : String(error);
    console.error('Sync failed:', error);
    await supabaseAdmin
      .from('sync_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: message
      })
      .eq('id', syncId);
  }
}

// 2. Resumo Endpoint
router.get('/resumo', async (req, res) => {
  const { ano, mes, partido, estado } = req.query;
  
  try {
    type ResumoRow = {
      amount: number;
      category: string | null;
      supplier: string | null;
      expense_date: string | null;
      party: string | null;
      state: string | null;
    };

    const byCategory = new Map<string, number>();
    const bySupplier = new Map<string, number>();
    const byParty = new Map<string, number>();
    const byDay = new Map<string, number>();

    let totalCents = 0;
    let count = 0;

    const PAGE_SIZE = 1000;
    let offset = 0;

    while (true) {
      let query = supabase
        .from('expenses')
        .select('amount, category, supplier, expense_date, party, state')
        .range(offset, offset + PAGE_SIZE - 1);

      if (ano) query = query.eq('year', ano);
      if (mes) query = query.eq('month', mes);
      if (partido) query = query.eq('party', partido);
      if (estado) query = query.eq('state', estado);

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data as ResumoRow[]) || [];
      count += rows.length;

      for (const row of rows) {
        const amountCents = Math.round((Number(row.amount) || 0) * 100);
        totalCents += amountCents;

        const categoryKey = row.category || 'Sem Categoria';
        byCategory.set(categoryKey, (byCategory.get(categoryKey) || 0) + amountCents);

        const supplierKey = row.supplier || 'Sem Fornecedor';
        bySupplier.set(supplierKey, (bySupplier.get(supplierKey) || 0) + amountCents);

        const partyKey = row.party || 'Sem Partido';
        byParty.set(partyKey, (byParty.get(partyKey) || 0) + amountCents);

        if (row.expense_date) {
          const day = String(row.expense_date).split('T')[0];
          byDay.set(day, (byDay.get(day) || 0) + amountCents);
        }
      }

      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    const topCategories = Array.from(byCategory.entries())
      .map(([name, value]) => ({ name, value: value / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topSuppliers = Array.from(bySupplier.entries())
      .map(([name, value]) => ({ name, value: value / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topParties = Array.from(byParty.entries())
      .map(([name, value]) => ({ name, value: value / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const dailyEvolution = Array.from(byDay.entries())
      .map(([date, value]) => ({ date, value: value / 100 }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return res.json({
      total: totalCents / 100,
      count,
      topCategories,
      topSuppliers,
      topParties,
      dailyEvolution
    });
  } catch (error: unknown) {
    const message =
      error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? String((error as { message?: unknown }).message)
        : 'Erro interno';
    return res.status(500).json({ error: message });
  }
});

// 3. Consultar Endpoint
router.get('/consultar', async (req, res) => {
  const { ano, mes, categoria, fornecedor, minValor, maxValor, partido, estado, sort = 'recent', page = 1, pageSize = 20 } = req.query;
  
  try {
    let query = supabase.from('expenses').select('*', { count: 'exact' });
    
    if (ano) query = query.eq('year', ano);
    if (mes) query = query.eq('month', mes);
    if (categoria) query = query.ilike('category', `%${categoria}%`);
    if (fornecedor) query = query.ilike('supplier', `%${fornecedor}%`);
    if (partido) query = query.ilike('party', `%${partido}%`);
    if (estado) query = query.ilike('state', `%${estado}%`);
    if (minValor) query = query.gte('amount', minValor);
    if (maxValor) query = query.lte('amount', maxValor);

    const from = (Number(page) - 1) * Number(pageSize);
    const to = from + Number(pageSize) - 1;

    query = query.range(from, to);

    // Apply Sorting
    switch (sort) {
      case 'oldest':
        query = query.order('expense_date', { ascending: true });
        break;
      case 'highest_amount':
        query = query.order('amount', { ascending: false });
        break;
      case 'lowest_amount':
        query = query.order('amount', { ascending: true });
        break;
      case 'recent':
      default:
        query = query.order('expense_date', { ascending: false });
        break;
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({
      data,
      total: count,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error: unknown) {
    const message =
      error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? String((error as { message?: unknown }).message)
        : 'Erro interno';
    return res.status(500).json({ error: message });
  }
});

// 4. Detalhe Endpoint
router.get('/detalhe/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });

    return res.json(data);
  } catch (error: unknown) {
    const message =
      error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? String((error as { message?: unknown }).message)
        : 'Erro interno';
    return res.status(500).json({ error: message });
  }
});

// 5. Status Endpoint
router.get('/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sync_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) return res.json({ status: 'none' });

    if (data.status === 'running' && data.started_at) {
      const startedAtMs = new Date(data.started_at).getTime();
      const ageMs = Date.now() - startedAtMs;
      const maxAgeMs = 1000 * 60 * 90;

      if (Number.isFinite(ageMs) && ageMs > maxAgeMs) {
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('sync_runs')
          .update({
            status: 'failed',
            finished_at: new Date().toISOString(),
            error_message: 'Execução marcada como falha automaticamente (tempo excedido)',
          })
          .eq('id', data.id)
          .select('*')
          .single();

        if (!updateError && updated) return res.json(updated);
      }
    }

    return res.json(data);
  } catch (error: unknown) {
    const message =
      error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? String((error as { message?: unknown }).message)
        : 'Erro interno';
    return res.status(500).json({ error: message });
  }
});

export default router;

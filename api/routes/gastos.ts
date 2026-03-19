import express from 'express';
import { supabase, supabaseAdmin } from '../services/supabaseClient.js';
import axios from 'axios';

const router = express.Router();

const CAMARA_API_BASE = 'https://dadosabertos.camara.leg.br/api/v2';

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
  } catch (error: any) {
    console.error('Error starting sync:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Background sync function
async function runSyncProcess(syncId: string, ano: number, mes: number) {
  try {
    // 1. Fetch all deputies
    const depsRes = await axios.get(`${CAMARA_API_BASE}/deputados?itens=100`); // Limiting for demo/portfolio to avoid timeouts
    const deputados = depsRes.data.dados;

    let fetchedCount = 0;
    let upsertedCount = 0;

    // 2. Fetch expenses for each deputy (Optimized with concurrency limit)
    const BATCH_SIZE = 10; // Process 10 deputies in parallel
    
    for (let i = 0; i < deputados.length; i += BATCH_SIZE) {
      const batch = deputados.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (dep: any) => {
        try {
          const expRes = await axios.get(`${CAMARA_API_BASE}/deputados/${dep.id}/despesas`, {
            params: {
              ano,
              mes,
              itens: 100
            }
          });

          const despesas = expRes.data.dados;
          
          if (despesas && despesas.length > 0) {
            fetchedCount += despesas.length;

            // Map to DB schema
            const records = despesas.map((d: any) => ({
              id: `${dep.id}-${d.codDocumento}-${d.numDocumento}`,
              expense_date: d.dataDocumento,
              year: d.ano,
              month: d.mes,
              amount: d.valorDocumento,
              category: d.tipoDespesa,
              supplier: d.nomeFornecedor,
              org_unit: dep.nome, // using deputy name as org_unit for simplicity
              party: dep.siglaPartido, // New field
              state: dep.siglaUf, // New field
              description: d.tipoDocumento,
              source_url: d.urlDocumento,
              raw: d
            }));

            // Upsert to Supabase
            const { error: upsertError } = await supabaseAdmin
              .from('expenses')
              .upsert(records, { onConflict: 'id' });

            if (upsertError) {
              console.error(`Upsert error for deputy ${dep.nome}:`, upsertError);
            } else {
              upsertedCount += records.length;
            }
          }
        } catch (err: any) {
          console.error(`Error fetching expenses for deputy ${dep.id}:`, err.message);
        }
      }));
      
      // Small delay between batches to be gentle with the API
      await new Promise(resolve => setTimeout(resolve, 100));
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

  } catch (error: any) {
    console.error('Sync failed:', error);
    await supabaseAdmin
      .from('sync_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: error.message
      })
      .eq('id', syncId);
  }
}

// 2. Resumo Endpoint
router.get('/resumo', async (req, res) => {
  const { ano, mes, partido, estado } = req.query;
  
  try {
    let query = supabase.from('expenses').select('amount, category, supplier, org_unit, expense_date, party, state');
    
    if (ano) query = query.eq('year', ano);
    if (mes) query = query.eq('month', mes);
    if (partido) query = query.eq('party', partido);
    if (estado) query = query.eq('state', estado);

    const { data, error } = await query;
    if (error) throw error;

    const total = data.reduce((acc, curr) => acc + Number(curr.amount), 0);
    
    // Group by category
    const byCategory = data.reduce((acc: any, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
      return acc;
    }, {});

    const topCategories = Object.entries(byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 5);

    // Group by Supplier
    const bySupplier = data.reduce((acc: any, curr) => {
      acc[curr.supplier] = (acc[curr.supplier] || 0) + Number(curr.amount);
      return acc;
    }, {});

    const topSuppliers = Object.entries(bySupplier)
      .map(([name, value]) => ({ name, value }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 5);

    // Group by Party
    const byParty = data.reduce((acc: any, curr) => {
      const party = curr.party || 'Sem Partido';
      acc[party] = (acc[party] || 0) + Number(curr.amount);
      return acc;
    }, {});

    const topParties = Object.entries(byParty)
      .map(([name, value]) => ({ name, value }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10);

    // Daily Evolution
    const byDay = data.reduce((acc: any, curr) => {
      const day = curr.expense_date.split('T')[0]; // Assuming ISO string or YYYY-MM-DD
      acc[day] = (acc[day] || 0) + Number(curr.amount);
      return acc;
    }, {});

    const dailyEvolution = Object.entries(byDay)
      .map(([date, value]) => ({ date, value }))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return res.json({
      total,
      count: data.length,
      topCategories,
      topSuppliers,
      topParties,
      dailyEvolution
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
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
    
    return res.json(data || { status: 'none' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;

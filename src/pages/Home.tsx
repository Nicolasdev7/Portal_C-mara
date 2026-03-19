import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { ArrowUpRight, TrendingUp, Users, Calendar, AlertCircle, Building, Wallet, Filter, BarChart3 } from 'lucide-react';

const COLORS = ['#111827', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db'];

// Helper to truncate text
const truncate = (str: string, n: number) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters State
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [party, setParty] = useState('');
  const [state, setState] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Generate Year Options (last 5 years)
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const fetchDashboardData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append('ano', year.toString());
    params.append('mes', month.toString());
    if (party) params.append('partido', party);
    if (state) params.append('estado', state);

    fetch(`/api/gastos/resumo?${params.toString()}`)
      .then(res => res.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
  }, [year, month, party, state]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const syncData = () => {
    fetch('/api/gastos/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ano: year, mes: month })
    })
    .then(res => res.json())
    .then(() => alert(`Sincronização de ${month}/${year} iniciada. Os dados aparecerão em breve.`))
    .catch(console.error);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64 text-gray-500">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-8 w-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mb-4"></div>
        <p>Carregando métricas...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg text-center">
      <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
      <h3 className="text-lg font-medium text-gray-900 mb-1">Erro ao carregar dados</h3>
      <p className="text-gray-500 text-sm mb-4">{error}</p>
      <button 
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors"
      >
        Tentar Novamente
      </button>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Visão Geral de Despesas</h2>
          <p className="text-gray-500 text-sm mt-1">
            Análise consolidada do período {String(month).padStart(2, '0')}/{year}
            {party && ` • Partido: ${party}`}
            {state && ` • UF: ${state}`}
          </p>
        </div>
        <div className="flex space-x-3 items-center">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded border ${showFilters ? 'bg-gray-100 border-gray-400' : 'bg-white border-gray-300'} hover:bg-gray-50 transition-colors`}
            title="Filtrar Dashboard"
          >
            <Filter className="w-5 h-5 text-gray-700" />
          </button>
          
          <button 
            onClick={syncData}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center shadow-sm"
          >
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Sincronizar ({month}/{year})
          </button>
          
          <Link 
            to={`/explorar?ano=${year}&mes=${month}&partido=${party}&estado=${state}`}
            className="flex items-center px-4 py-2 bg-gray-900 border border-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 hover:border-gray-800 transition-all shadow-sm"
          >
            Exploração Detalhada
            <ArrowUpRight className="ml-2 w-4 h-4 opacity-80" />
          </Link>
        </div>
      </div>

      {/* Dashboard Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ano</label>
            <select 
              value={year} 
              onChange={e => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mês</label>
            <select 
              value={month} 
              onChange={e => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Partido</label>
            <input 
              type="text" 
              placeholder="Ex: PL, PT"
              value={party} 
              onChange={e => setParty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
            <input 
              type="text" 
              placeholder="Ex: SP, RJ"
              maxLength={2}
              value={state} 
              onChange={e => setState(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Gasto</h3>
            <div className="p-2 bg-gray-100 rounded">
              <TrendingUp className="w-4 h-4 text-gray-700" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(data?.total || 0)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Registros</h3>
            <div className="p-2 bg-gray-100 rounded">
              <Calendar className="w-4 h-4 text-gray-700" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data?.count?.toLocaleString('pt-BR') || 0}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Maior Categoria</h3>
            <div className="p-2 bg-gray-100 rounded">
              <Wallet className="w-4 h-4 text-gray-700" />
            </div>
          </div>
          <div className="text-sm font-bold text-gray-900 truncate" title={data?.topCategories?.[0]?.name}>
            {truncate(data?.topCategories?.[0]?.name, 20) || 'N/A'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(data?.topCategories?.[0]?.value || 0)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Top Fornecedor</h3>
            <div className="p-2 bg-gray-100 rounded">
              <Building className="w-4 h-4 text-gray-700" />
            </div>
          </div>
          <div className="text-sm font-bold text-gray-900 truncate" title={data?.topSuppliers?.[0]?.name}>
            {truncate(data?.topSuppliers?.[0]?.name, 20) || 'N/A'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(data?.topSuppliers?.[0]?.value || 0)}
          </p>
        </div>
      </div>

      {/* Row 1: Evolution & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-6">Evolução Diária de Gastos</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.dailyEvolution || []}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#111827" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#111827" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => new Date(val).getDate().toString()} 
                  stroke="#9ca3af" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} 
                  stroke="#9ca3af" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ stroke: '#9ca3af', strokeWidth: 1 }}
                  contentStyle={{ backgroundColor: '#111827', color: '#fff', borderRadius: '4px', border: 'none' }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                  formatter={(value: number) => [formatCurrency(value), 'Gasto']}
                />
                <Area type="monotone" dataKey="value" stroke="#111827" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col min-h-[24rem]">
          <h3 className="text-base font-semibold text-gray-900 mb-6">Top Categorias</h3>
          <div className="h-64 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.topCategories || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data?.topCategories?.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', color: '#fff', borderRadius: '6px', border: 'none', padding: '8px 12px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
            {data?.topCategories?.map((entry: any, index: number) => (
              <div key={index} className="flex items-start justify-between text-xs gap-3">
                <div className="flex items-start flex-1 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full mr-2.5 mt-0.5 flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-gray-700 leading-snug break-words" title={entry.name}>
                    {entry.name}
                  </span>
                </div>
                <span className="font-semibold text-gray-900 flex-shrink-0 whitespace-nowrap pt-0.5">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Suppliers & Parties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-6">Maiores Fornecedores</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.topSuppliers || []} layout="vertical" margin={{ left: 0, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={140} 
                  tick={{ fontSize: 11, fill: '#4b5563' }} 
                  tickFormatter={(val) => truncate(val, 20)}
                />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ backgroundColor: '#111827', color: '#fff', borderRadius: '4px', border: 'none' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="value" fill="#374151" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-6">Gastos por Partido</h3>
          <div className="h-80">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.topParties || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4b5563' }} />
                <YAxis tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} fontSize={11} stroke="#9ca3af" axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ backgroundColor: '#111827', color: '#fff', borderRadius: '4px', border: 'none' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="value" fill="#111827" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

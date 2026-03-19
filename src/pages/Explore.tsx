import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, FileText, BarChart3 } from 'lucide-react';

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [ano, setAno] = useState(searchParams.get('ano') || '2024');
  const [mes, setMes] = useState(searchParams.get('mes') || '10');
  const [categoria, setCategoria] = useState(searchParams.get('categoria') || '');
  const [fornecedor, setFornecedor] = useState(searchParams.get('fornecedor') || '');
  const [minValor, setMinValor] = useState(searchParams.get('minValor') || '');
  const [maxValor, setMaxValor] = useState(searchParams.get('maxValor') || '');
  const [ordenacao, setOrdenacao] = useState(searchParams.get('ordenacao') || 'recent');
  const [partido, setPartido] = useState(searchParams.get('partido') || '');
  const [estado, setEstado] = useState(searchParams.get('estado') || '');
  const [showFilters, setShowFilters] = useState(false);
  
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = 20;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

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

  const syncData = () => {
    fetch('/api/gastos/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ano: currentYear, mes: currentMonth })
    })
    .then(res => res.json())
    .then(() => alert(`Sincronização de ${currentMonth}/${currentYear} iniciada. Os dados aparecerão em breve.`))
    .catch(console.error);
  };

  const fetchResults = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (ano) params.append('ano', ano);
    if (mes) params.append('mes', mes);
    if (categoria) params.append('categoria', categoria);
    if (fornecedor) params.append('fornecedor', fornecedor);
    if (minValor) params.append('minValor', minValor);
    if (maxValor) params.append('maxValor', maxValor);
    if (ordenacao) params.append('sort', ordenacao);
    if (partido) params.append('partido', partido);
    if (estado) params.append('estado', estado);
    
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    fetch(`/api/gastos/consultar?${params.toString()}`)
      .then(res => res.json())
      .then(d => {
        setData(d.data || []);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchResults();
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (ano) params.append('ano', ano);
    if (mes) params.append('mes', mes);
    if (categoria) params.append('categoria', categoria);
    if (fornecedor) params.append('fornecedor', fornecedor);
    if (minValor) params.append('minValor', minValor);
    if (maxValor) params.append('maxValor', maxValor);
    if (ordenacao) params.append('sort', ordenacao);
    if (partido) params.append('partido', partido);
    if (estado) params.append('estado', estado);
    
    params.append('page', '1');
    setSearchParams(params);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Explorar Gastos</h2>
          <p className="text-gray-500 text-sm mt-1">Busque e filtre detalhadamente os registros</p>
        </div>
        <div className="flex space-x-3 items-center">
          <button 
            onClick={syncData}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center shadow-sm"
          >
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Sincronizar ({currentMonth}/{currentYear})
          </button>
          <Link 
            to="/"
            className="flex items-center px-4 py-2 bg-gray-900 border border-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 hover:border-gray-800 transition-all shadow-sm"
          >
            <BarChart3 className="mr-2 w-4 h-4 opacity-80" />
            Visão Geral
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4 md:hidden">
          <h3 className="text-sm font-medium text-gray-700">Filtros</h3>
          <button 
            type="button" 
            onClick={() => setShowFilters(!showFilters)}
            className="text-gray-500 hover:text-gray-900"
          >
            {showFilters ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        
        <form onSubmit={handleSearch} className={`${showFilters ? 'block' : 'hidden'} md:block`}>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ano</label>
              <select 
                value={ano} 
                onChange={e => setAno(e.target.value)}
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
                value={mes} 
                onChange={e => setMes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Categoria</label>
              <input 
                type="text" 
                placeholder="Ex: Combustível"
                value={categoria} 
                onChange={e => setCategoria(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fornecedor</label>
              <input 
                type="text" 
                placeholder="Nome ou CNPJ"
                value={fornecedor} 
                onChange={e => setFornecedor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
             <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Partido</label>
              <input 
                type="text" 
                placeholder="Ex: PL, PT, MDB"
                value={partido} 
                onChange={e => setPartido(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Estado (UF)</label>
              <input 
                type="text" 
                placeholder="Ex: SP, RJ"
                maxLength={2}
                value={estado} 
                onChange={e => setEstado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Min (R$)</label>
                <input 
                  type="number" 
                  value={minValor} 
                  onChange={e => setMinValor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max (R$)</label>
                <input 
                  type="number" 
                  value={maxValor} 
                  onChange={e => setMaxValor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
            </div>
             <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ordenar por</label>
              <select 
                value={ordenacao} 
                onChange={e => setOrdenacao(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-white"
              >
                <option value="recent">Mais Recentes</option>
                <option value="oldest">Mais Antigos</option>
                <option value="highest_amount">Maior Valor</option>
                <option value="lowest_amount">Menor Valor</option>
              </select>
            </div>
            <div className="md:col-span-4 lg:col-span-2 flex items-end">
              <button 
                type="submit"
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors"
              >
                <Filter className="w-4 h-4 mr-2" />
                Aplicar Filtros
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500">
              <tr>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Órgão / Deputado</th>
                <th className="px-6 py-3">Fornecedor</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3 text-right">Valor</th>
                <th className="px-6 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
                      <span>Carregando resultados...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(item.expense_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{item.org_unit}</span>
                    </td>
                    <td className="px-6 py-4 truncate max-w-xs" title={item.supplier}>
                      {item.supplier}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900 whitespace-nowrap">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link 
                        to={`/despesa/${item.id}`}
                        className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors"
                        title="Ver Detalhes"
                      >
                        <FileText className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Mostrando <span className="font-medium text-gray-900">{(page - 1) * pageSize + 1}</span> a{' '}
              <span className="font-medium text-gray-900">{Math.min(page * pageSize, total)}</span> de{' '}
              <span className="font-medium text-gray-900">{total}</span> resultados
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.set('page', (page - 1).toString());
                  setSearchParams(p);
                }}
                disabled={page === 1}
                className="p-1 border border-gray-300 rounded bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.set('page', (page + 1).toString());
                  setSearchParams(p);
                }}
                disabled={page >= totalPages}
                className="p-1 border border-gray-300 rounded bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

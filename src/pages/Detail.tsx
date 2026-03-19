import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar, Building, CreditCard, FileText } from 'lucide-react';

export default function Detail() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/gastos/detalhe/${id}`)
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
  }, [id]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loading) return (
    <div className="flex justify-center items-center h-64 text-gray-500">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-8 w-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mb-4"></div>
        <p>Carregando registro...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="bg-white border border-gray-200 p-8 rounded-lg text-center shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Registro não encontrado</h3>
      <p className="text-gray-500 mb-6">{error || 'A despesa solicitada não existe ou foi removida.'}</p>
      <Link 
        to="/explorar"
        className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Exploração
      </Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link 
          to="/explorar"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para resultados
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mb-4">
              {data.category}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{data.supplier}</h2>
            <p className="text-gray-500 flex items-center">
              <Building className="w-4 h-4 mr-2" />
              {data.org_unit}
            </p>
          </div>
          <div className="text-left md:text-right">
            <div className="text-sm text-gray-500 mb-1">Valor da Despesa</div>
            <div className="text-3xl font-bold text-gray-900">
              {formatCurrency(data.amount)}
            </div>
            {data.source_url && (
              <a 
                href={data.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center mt-3 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Ver documento original
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-gray-400" />
            Dados da Transação
          </h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Data de Emissão</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(data.expense_date).toLocaleDateString('pt-BR')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Competência</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {String(data.month).padStart(2, '0')} / {data.year}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tipo de Documento</dt>
              <dd className="mt-1 text-sm text-gray-900">{data.description || 'Não especificado'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">ID do Registro</dt>
              <dd className="mt-1 text-xs text-gray-500 font-mono break-all">{data.id}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-gray-400" />
            Dados Adicionais
          </h3>
          <div className="bg-gray-50 rounded p-4 text-xs font-mono text-gray-600 overflow-x-auto max-h-64">
            <pre>{JSON.stringify(data.raw, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

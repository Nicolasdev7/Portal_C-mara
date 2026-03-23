import { Link, Outlet } from 'react-router-dom';
import { Building2, Database } from 'lucide-react';
import { useSyncStatus } from '../hooks/useSyncStatus';

function formatSyncTimestamp(iso: string) {
  const d = new Date(iso);
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d);
  const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  return `${time} - ${date}`;
}

export default function Layout() {
  const { status: syncStatus } = useSyncStatus(15000);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 font-sans selection:bg-gray-200 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <Building2 className="w-6 h-6 text-gray-700" />
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                Portal de Gastos da Câmara
              </h1>
            </Link>
            
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Database className="w-4 h-4" />
              <span>
                Base de Dados: {' '}
                {syncStatus?.status === 'running' && 'Sincronizando...'}
                {syncStatus?.status === 'completed' && syncStatus.finished_at && `Atualizado em ${formatSyncTimestamp(syncStatus.finished_at)}`}
                {syncStatus?.status === 'failed' && 'Falha na sincronização'}
                {(syncStatus?.status === 'none' || !syncStatus?.status) && 'Aguardando sincronização'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <div className="mb-2 md:mb-0">
            &copy; {new Date().getFullYear()} Portal de Gastos da Câmara.
          </div>
          <div className="flex items-center space-x-1">
            <span>Desenvolvido por</span>
            <span className="font-semibold text-gray-900">Nicolas Lima Freitas</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

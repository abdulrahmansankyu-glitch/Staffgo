import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/ui';

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell-root flex h-screen bg-slate-50">
      <Sidebar />
      <div className="app-shell-col flex flex-1 flex-col overflow-hidden">
        <header className="app-topbar flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">Materials Supply & Contracting</div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">{user?.name} <span className="text-slate-400">({user?.role})</span></span>
            <Button variant="secondary" onClick={() => logout()}>Log out</Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

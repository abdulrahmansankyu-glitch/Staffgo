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
        <header className="app-topbar flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
          <div className="text-sm font-medium text-slate-500">Materials Supply &amp; Contracting</div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-700">{user?.name} <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{user?.role}</span></span>
            <div className="h-5 w-px bg-slate-200" />
            <Button variant="secondary" onClick={() => logout()}>Sign out</Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

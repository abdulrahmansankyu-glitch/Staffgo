import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Button, Input } from '../../components/ui';
import { LogoMark } from '../../components/LogoMark';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@staffgo.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <LogoMark size={36} />
          <div className="text-xl font-semibold text-slate-800">StaffGo</div>
        </div>
        <h1 className="mb-1 text-lg font-semibold text-slate-800">Sign in</h1>
        <p className="mb-6 text-sm text-slate-500">Materials supply & contracting, all in one place.</p>

        {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="mb-6">
          <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>

        <div className="mt-6 rounded-md bg-slate-50 p-3 text-xs text-slate-500">
          Demo logins (password: password123):<br />
          admin@staffgo.com · accountant@staffgo.com · sales@staffgo.com · site@staffgo.com
        </div>
      </form>
    </div>
  );
}

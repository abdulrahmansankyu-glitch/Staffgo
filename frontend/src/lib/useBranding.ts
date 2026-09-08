import { useEffect, useState } from 'react';
import { api } from './api';

export interface Branding {
  name: string;
  logoUrl: string | null;
}

// Public, unauthenticated branding info (name + logo) — safe to call from the
// login screen before a session exists, and reused everywhere else for one source of truth.
export function useBranding(): Branding | null {
  const [branding, setBranding] = useState<Branding | null>(null);

  useEffect(() => {
    api.get('/public/branding').then((res) => setBranding(res.data)).catch(() => setBranding(null));
  }, []);

  return branding;
}

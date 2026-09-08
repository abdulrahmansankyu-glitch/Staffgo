import { useEffect } from 'react';
import { useBranding } from '../lib/useBranding';

export function FaviconUpdater() {
  const branding = useBranding();

  useEffect(() => {
    if (!branding?.logoUrl) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = branding.logoUrl;
  }, [branding?.logoUrl]);

  return null;
}

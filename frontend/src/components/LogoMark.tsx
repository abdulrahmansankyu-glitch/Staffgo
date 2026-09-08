import { useBranding } from '../lib/useBranding';

export function LogoMark({ size = 34 }: { size?: number }) {
  const branding = useBranding();

  if (branding?.logoUrl) {
    return <img src={branding.logoUrl} alt={branding.name} style={{ height: size, width: 'auto' }} className="object-contain" />;
  }

  return (
    <div
      className="flex items-center justify-center rounded-md bg-slate-800 font-bold text-white"
      style={{ height: size, width: size, fontSize: size * 0.38 }}
    >
      SG
    </div>
  );
}

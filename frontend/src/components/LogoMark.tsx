import { useBranding } from '../lib/useBranding';

export function LogoMark({ size = 34 }: { size?: number }) {
  const branding = useBranding();

  if (branding?.logoUrl) {
    return (
      <div className="flex items-center justify-center overflow-hidden rounded-md" style={{ height: size, width: size }}>
        <img src={branding.logoUrl} alt={branding.name} className="h-full w-full object-contain" />
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-md bg-slate-800 font-bold text-white"
      style={{ height: size, width: size, fontSize: size * 0.38 }}
    >
      SG
      <span className="absolute bottom-0 right-0 rounded-tl-sm bg-orange-500" style={{ height: size * 0.3, width: size * 0.3 }} />
    </div>
  );
}

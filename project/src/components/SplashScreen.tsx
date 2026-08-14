import { useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const { lang, dir } = useLang();
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 2100);
    const doneTimer = setTimeout(onFinish, 2600);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onFinish]);

  return (
    <div
      dir={dir}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-navy-900 ${fading ? 'tj-splash-out' : ''}`}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-6 tj-fade-up">
        <img
          src=""
          alt="Tajdeed"
          className="h-20 w-auto object-contain"
          onError={(e) => {
            const img = e.currentTarget;
            img.style.display = 'none';
            const fallback = img.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        {/* Fallback text logo if img src is empty/broken */}
        <div
          style={{ display: 'none' }}
          className="flex flex-col items-center gap-2"
        >
          <div className="text-3xl font-extrabold tracking-tight text-white">
            {t('brand.name', lang)}
          </div>
          <div className="text-sm font-medium tracking-[0.3em] text-gold-400 uppercase">
            {t('splash.tagline', lang)}
          </div>
        </div>

        {/* Spinner */}
        <div className="mt-4 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-gold-400" />
        </div>
      </div>

      {/* Bottom brand */}
      <div className="absolute bottom-10 text-center">
        <p className="text-xs font-medium tracking-widest text-white/40 uppercase">
          {t('splash.tagline', lang)}
        </p>
      </div>
    </div>
  );
}

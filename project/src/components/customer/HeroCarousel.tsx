import { useEffect, useRef, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import type { Banner } from '@/types';

export function HeroCarousel({ banners, onSelect }: { banners: Banner[]; onSelect?: (b: Banner) => void }) {
  const { lang, dir } = useLang();
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides = banners.length > 0 ? banners : [];

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 4500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length]);

  useEffect(() => {
    setIndex(0);
  }, [banners.length]);

  if (slides.length === 0) return null;

  const current = slides[index];

  return (
    <div dir={dir} className="relative overflow-hidden rounded-2xl bg-navy-900 tj-fade-up">
      {/* Slide */}
      <div
        key={current.id}
        className="relative min-h-[160px] sm:min-h-[180px] tj-carousel-anim"
        onClick={() => onSelect?.(current)}
      >
        {current.image_url ? (
          <img
            src={current.image_url}
            alt={lang === 'ar' ? current.title_ar : current.title_en}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : null}
        {/* Overlay gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900/90 via-navy-900/60 to-transparent" />
        <div className="relative z-10 flex h-full min-h-[160px] sm:min-h-[180px] flex-col justify-center p-6 sm:p-8">
          <p className="text-xs font-bold tracking-widest text-gold-400 uppercase">
            {t('home.offers', lang)}
          </p>
          <h2 className="mt-2 max-w-xs text-xl sm:text-2xl font-extrabold text-white leading-tight">
            {lang === 'ar' ? current.title_ar : current.title_en}
          </h2>
          <button className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-xl bg-white/95 px-4 py-2 text-sm font-bold text-navy-900 transition hover:bg-white">
            {t('home.subscribe', lang)}
            <Icon name="ArrowLeft" className="h-4 w-4 rtl:rotate-0" />
          </button>
        </div>
      </div>

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 start-1/2 z-20 flex -translate-x-1/2 gap-1.5 rtl:translate-x-1/2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-gold-400' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

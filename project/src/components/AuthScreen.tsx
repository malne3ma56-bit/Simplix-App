import { useState } from 'react';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui';
import { ProviderRegistrationModal } from '@/components/ProviderRegistrationModal';

function validateUaePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(?:\+971|0)(?:5[0-9]|5[0-9])\d{7}$/.test(cleaned) || /^(?:\+971|0)[2-9]\d{7,8}$/.test(cleaned);
}

export function AuthScreen() {
  const { lang, dir } = useLang();
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loc, setLoc] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locStatus, setLocStatus] = useState<'idle' | 'detecting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus('error');
      return;
    }
    setLocStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLoc({ lat: latitude, lng: longitude, address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
        setLocStatus('done');
      },
      () => setLocStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) { setError('auth.error.required'); return; }
    if (mode === 'signup') {
      if (!name || !phone) { setError('auth.error.required'); return; }
      if (!validateUaePhone(phone)) { setError('auth.error.phone'); return; }
    }

    setLoading(true);
    if (mode === 'signup') {
      const { error: err } = await signUp(email, password, {
        full_name: name,
        phone,
        email,
        role: 'customer',
        latitude: loc?.lat ?? null,
        longitude: loc?.lng ?? null,
        address_text: loc?.address ?? '',
      });
      if (err) setError(err);
    } else {
      const { error: err } = await signIn(email, password);
      if (err) setError(err);
    }
    setLoading(false);
  };

  return (
    <div dir={dir} className="min-h-screen tj-grad-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl tj-grad-emerald text-white shadow-lg shadow-emerald-600/30">
            <Icon name="Sparkles" className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t('brand.name', lang)}</h1>
          <p className="text-sm font-semibold text-slate-500">{t('brand.tagline', lang)}</p>
        </div>

        <div className="tj-card p-6">
          {/* Tabs */}
          <div className="mb-5 flex gap-2 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${mode === 'signup' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
            >
              {t('auth.signup', lang)}
            </button>
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${mode === 'signin' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
            >
              {t('auth.signin', lang)}
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="tj-label">{t('auth.name', lang)}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="tj-input" placeholder={t('auth.name', lang)} />
              </div>
            )}
            {mode === 'signup' && (
              <div>
                <label className="tj-label">{t('auth.phone', lang)}</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="tj-input" placeholder="+9715X XXX XXXX" dir="ltr" />
              </div>
            )}
            <div>
              <label className="tj-label">{t('auth.email', lang)}</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="tj-input" placeholder="you@example.com" dir="ltr" type="email" />
            </div>
            <div>
              <label className="tj-label">{t('auth.password', lang)}</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} className="tj-input" placeholder="••••••••" dir="ltr" type="password" />
              {mode === 'signup' && (
                <p className="mt-1 text-xs text-slate-400">{t('auth.password.hint', lang)}</p>
              )}
            </div>

            {mode === 'signup' && (
              <div>
                <label className="tj-label">{t('auth.location', lang)}</label>
                <button
                  type="button"
                  onClick={detectLocation}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition ${
                    locStatus === 'done'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : locStatus === 'error'
                      ? 'border-red-300 bg-red-50 text-red-600'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon name="MapPin" className="h-4 w-4" />
                    {locStatus === 'detecting' ? t('auth.location.detecting', lang)
                      : locStatus === 'done' ? t('auth.location.detected', lang)
                      : t('auth.location.hint', lang)}
                  </span>
                  {locStatus === 'done' && <Icon name="CheckCircle2" className="h-4 w-4" />}
                </button>
                {loc?.address && <p className="mt-1 text-xs text-slate-400" dir="ltr">{loc.address}</p>}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600">
                <Icon name="AlertCircle" className="h-4 w-4 shrink-0" />
                {t(error, lang)}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? t('common.loading', lang) : mode === 'signup' ? t('auth.signup', lang) : t('auth.signin', lang)}
            </Button>
          </form>

          <button
            onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
            className="mt-4 w-full text-center text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            {mode === 'signup' ? t('auth.haveAccount', lang) : t('auth.noAccount', lang)}
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-bold text-slate-400">{lang === 'ar' ? 'أو' : 'OR'}</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Join as Provider */}
          <button
            onClick={() => setShowProviderModal(true)}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-navy-200 bg-navy-50/40 py-3.5 text-sm font-extrabold text-navy-900 transition hover:border-navy-400 hover:bg-navy-50 active:scale-[0.98]"
          >
            <Icon name="Briefcase" className="h-5 w-5 text-navy-700" />
            {t('auth.joinProvider', lang)}
          </button>
        </div>
      </div>

      {showProviderModal && <ProviderRegistrationModal onClose={() => setShowProviderModal(false)} />}
    </div>
  );
}

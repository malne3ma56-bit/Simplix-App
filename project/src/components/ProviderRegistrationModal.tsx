import { useState } from 'react';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { useCatalog } from '@/hooks/useCatalog';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Button, Spinner } from '@/components/ui';

function validateUaePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(?:\+971|0)(?:5[0-9]|5[0-9])\d{7}$/.test(cleaned) || /^(?:\+971|0)[2-9]\d{7,8}$/.test(cleaned);
}

export function ProviderRegistrationModal({ onClose }: { onClose: () => void }) {
  const { lang, dir } = useLang();
  const { signUpProvider } = useAuth();
  const { categories } = useCatalog();
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName || !phone || !email || !password || !categoryId) {
      setError('auth.error.required');
      return;
    }
    if (!validateUaePhone(phone)) {
      setError('auth.error.phone');
      return;
    }

    setLoading(true);
    const { error: err } = await signUpProvider(email, password, {
      full_name: companyName,
      phone,
      email,
      provider_category_id: categoryId,
    });
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div
        dir={dir}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 tj-fade-in"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl tj-pop-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 tj-pulse">
            <Icon name="CheckCircle2" className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">{t('provider.success', lang)}</h3>
          <p className="mt-2 text-sm text-slate-500">{t('provider.pendingReview', lang)}</p>
          <Button variant="primary" className="mt-5 w-full" onClick={onClose}>
            {t('common.close', lang)}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 tj-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl tj-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
              <Icon name="Briefcase" className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">{t('auth.joinProvider', lang)}</h3>
              <p className="text-xs text-slate-400">{t('brand.tagline', lang)}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          {/* Company Name */}
          <div>
            <label className="tj-label">{t('provider.companyName', lang)}</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="tj-input"
              placeholder={lang === 'ar' ? 'مؤسسة النجاح للخدمات' : 'Al-Najma Services LLC'}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="tj-label">{t('auth.phone', lang)}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="tj-input"
              placeholder="+9715X XXX XXXX"
              dir="ltr"
            />
          </div>

          {/* Email */}
          <div>
            <label className="tj-label">{t('auth.email', lang)}</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="tj-input"
              placeholder="company@example.com"
              dir="ltr"
              type="email"
            />
          </div>

          {/* Password */}
          <div>
            <label className="tj-label">{t('auth.password', lang)}</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="tj-input"
              placeholder="••••••••"
              dir="ltr"
              type="password"
            />
            <p className="mt-1 text-xs text-slate-400">{t('auth.password.hint', lang)}</p>
          </div>

          {/* Service Category */}
          <div>
            <label className="tj-label">{t('provider.category', lang)}</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="tj-input"
            >
              <option value="">{t('provider.selectCategory', lang)}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === 'ar' ? c.name_ar : c.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Trade License Upload (mock) */}
          <div>
            <label className="tj-label">{t('provider.tradeLicense', lang)}</label>
            <label
              className={`flex w-full cursor-pointer items-center justify-between rounded-xl border-2 border-dashed px-4 py-3.5 text-sm font-bold transition ${
                fileName
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-navy-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon name={fileName ? 'CheckCircle2' : 'Upload'} className="h-4 w-4" />
                {fileName ?? t('provider.uploadLicense', lang)}
              </span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFileName(f.name);
                }}
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </label>
            <p className="mt-1 text-xs text-slate-400">
              {lang === 'ar' ? 'PDF, JPG, PNG' : 'PDF, JPG, PNG'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600">
              <Icon name="AlertCircle" className="h-4 w-4 shrink-0" />
              {t(error, lang)}
            </div>
          )}

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : t('provider.submit', lang)}
          </Button>
        </form>
      </div>
    </div>
  );
}

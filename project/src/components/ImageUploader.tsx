import { useState, useRef } from 'react';
import { useLang } from '@/context/LangContext';
import { Icon } from '@/components/Icon';
import { Spinner } from '@/components/ui';

export function ImageUploader({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const { lang, dir } = useLang();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError(lang === 'ar' ? 'الملف ليس صورة' : 'File is not an image');
      return;
    }

    setReading(true);
    const reader = new FileReader();

    reader.onload = () => {
      const base64 = reader.result as string;
      onChange(base64);
      setReading(false);
    };

    reader.onerror = () => {
      setError(lang === 'ar' ? 'فشل قراءة الملف' : 'Failed to read file');
      setReading(false);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div dir={dir} className="space-y-3">
      {label && <label className="tj-label">{label}</label>}

      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200">
          <img
            src={value}
            alt=""
            className="h-40 w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
            <span className="truncate text-xs font-semibold text-white">
              {lang === 'ar' ? 'تم اختيار صورة' : 'Image set'}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => inputRef.current?.click()}
                className="rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white"
              >
                <Icon name="RefreshCw" className="inline h-3.5 w-3.5" /> {lang === 'ar' ? 'تغيير' : 'Replace'}
              </button>
              <button
                onClick={() => onChange('')}
                className="rounded-lg bg-red-500/90 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-red-500"
              >
                <Icon name="Trash2" className="inline h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition hover:border-emerald-300 hover:bg-emerald-50/40"
        >
          {reading ? (
            <Spinner className="h-8 w-8 text-emerald-600" />
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <Icon name="Upload" className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">
                {lang === 'ar' ? 'اختر صورة من الاستديو' : 'Choose from gallery'}
              </p>
              <p className="text-xs text-slate-400">
                {lang === 'ar' ? 'اضغط لاختيار صورة' : 'Click to choose an image'}
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files);
          e.target.value = '';
        }}
      />

      {error && (
        <p className="flex items-center gap-1.5 text-xs font-bold text-red-600">
          <Icon name="AlertCircle" className="h-4 w-4" /> {error}
        </p>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-bold text-slate-400">{lang === 'ar' ? 'أو أدخل رابط خارجي' : 'Or paste URL'}</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <input
          value={value.startsWith('data:') ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          className="tj-input"
          dir="ltr"
          placeholder="https://..."
        />
      </div>
    </div>
  );
}

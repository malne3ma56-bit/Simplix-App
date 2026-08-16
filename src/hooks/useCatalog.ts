import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Service, Settings } from '@/types';

export function useCatalog() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const [catRes, svcRes, setRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('services').select('*').order('sort_order'),
      supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
    ]);
    if (catRes.error || svcRes.error || setRes.error) {
      setError(catRes.error?.message || svcRes.error?.message || setRes.error?.message || 'load error');
    } else {
      setCategories(catRes.data as Category[]);
      setServices(svcRes.data as Service[]);
      setSettings(setRes.data as Settings);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const sub = supabase
      .channel('catalog-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  return { categories, services, settings, loading, error, reload: load };
}

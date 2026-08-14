import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { SubscriptionPackage, ComplementaryService, Banner } from '@/types';

export function useMarketingData() {
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [complementary, setComplementary] = useState<ComplementaryService[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [pkgRes, compRes, banRes] = await Promise.all([
        supabase.from('subscription_packages').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('complementary_services').select('*').order('sort_order', { ascending: true }),
        supabase.from('banners').select('*').eq('is_active', true).eq('placement', 'home_top').order('sort_order', { ascending: true }),
      ]);
      setPackages((pkgRes.data ?? []) as SubscriptionPackage[]);
      setComplementary((compRes.data ?? []) as ComplementaryService[]);
      setBanners((banRes.data ?? []) as Banner[]);
      setLoading(false);
    })();
  }, []);

  return { packages, complementary, banners, loading };
}

export function getComplementaryForService(
  serviceId: string,
  complementary: ComplementaryService[],
): string[] {
  return complementary
    .filter((c) => c.primary_service_id === serviceId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => c.complementary_service_id);
}

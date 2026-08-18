import { createClient } from '@/lib/supabase/server';

export type Features = Record<string, boolean>;

export type Business = {
  id: string;
  name: string;
  trade: string | null;
  services: string[];
  service_area: string | null;
  hours: string | null;
  timezone: string;
  voice: string;
  greeting: string | null;
  logo_url: string | null;
  primary_color: string | null;
  owner_alert_email: string | null;
  owner_alert_phone: string | null;
  plan: string;
  features: Features;
  review_url?: string | null;
  quote_followups_enabled?: boolean;
  review_requests_enabled?: boolean;
};

export type Role = 'owner' | 'admin' | 'staff';

// Returns the logged-in user, their (first) business, and role.
export async function getUserAndBusiness(): Promise<{
  user: { id: string; email?: string } | null;
  business: Business | null;
  role: Role | null;
  isSuperAdmin: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, business: null, role: null, isSuperAdmin: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from('memberships')
    .select('role, business:businesses(*)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  // The nested "business" join comes back as an object (many-to-one).
  const businessRaw = membership?.business as unknown;
  const business = (Array.isArray(businessRaw) ? businessRaw[0] : businessRaw) as Business | null;

  return {
    user: { id: user.id, email: user.email ?? undefined },
    business: business ?? null,
    role: (membership?.role as Role) ?? null,
    isSuperAdmin: Boolean(profile?.is_super_admin),
  };
}

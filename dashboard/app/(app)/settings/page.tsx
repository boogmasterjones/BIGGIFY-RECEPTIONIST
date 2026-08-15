import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';
import SettingsForm from './settings-form';
import StagesManager, { type Stage } from './stages-manager';

export default async function SettingsPage() {
  const { business } = await getUserAndBusiness();
  if (!business) return null;

  let stages: Stage[] = [];
  if (business.features.jobs) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('job_stages')
      .select('id, name, color, position')
      .eq('business_id', business.id)
      .order('position');
    stages = (data as Stage[]) || [];
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Settings</h1>
      <p className="text-neutral-500 mb-6">
        Edit your business, what the AI books, and how you get alerts. Changes take effect on the
        next call.
      </p>
      <div className="space-y-6 max-w-2xl">
        <SettingsForm business={business} />
        {business.features.jobs && <StagesManager businessId={business.id} stages={stages} />}
      </div>
    </div>
  );
}

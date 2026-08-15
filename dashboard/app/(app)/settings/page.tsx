import { getUserAndBusiness } from '@/lib/data';
import SettingsForm from './settings-form';

export default async function SettingsPage() {
  const { business } = await getUserAndBusiness();
  if (!business) return null;

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Settings</h1>
      <p className="text-neutral-500 mb-6">
        Edit your business, what the AI books, and how you get alerts. Changes take effect on the
        next call.
      </p>
      <SettingsForm business={business} />
    </div>
  );
}

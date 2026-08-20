'use client';

import { useRouter } from 'next/navigation';
import ConfirmButton from '@/components/confirm-button';
import { deleteCall } from '../actions';

export default function DeleteCallButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      onConfirm={async () => {
        await deleteCall(id);
        router.push('/calls');
      }}
      label="Delete call"
      confirmLabel="Delete for good"
      className="text-xs text-neutral-300 hover:text-[#CF0000] font-semibold"
    />
  );
}

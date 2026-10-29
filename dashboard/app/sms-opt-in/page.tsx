import Link from 'next/link';
import { OptInForm } from './form';

export const metadata = {
  title: 'Text Message Opt-In — Biggify',
  description: 'Opt in to customer care text messages from BIGGIFY LLC. Message frequency varies, reply STOP to opt out.',
};

// The public SMS opt-in form the 10DLC campaign points at. Everything Telnyx asks for is on this one page: a labeled phone
// number field, a consent checkbox that is unchecked by default and separate from any terms agreement, the full disclosure
// next to it naming the brand and the message types, links to the Privacy Policy and Terms, and a submit that records the
// consent (app/sms-opt-in/actions.ts writes to sms_consents). Opting in is optional: the form submits without the box.
export default function SmsOptInPage() {
  return (
    <div className="min-h-screen bg-[#FFF6E1]">
      <header className="sticky top-0 border-b border-[#ece3ca] bg-[#FFF6E1]">
        <div className="w-full max-w-[820px] mx-auto px-6 py-3">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            <span className="text-[#CF0000]">BIGG</span>
            <span className="text-neutral-900">ify</span>
          </Link>
        </div>
      </header>
      <div className="w-full max-w-[820px] mx-auto px-6 pb-20 text-[#0d1224]">
        <h1 className="text-[34px] tracking-tight mt-11 mb-1.5 font-extrabold">Text message opt-in</h1>
        <p className="text-[#4a5372] mb-8">
          Biggify, a service of BIGGIFY LLC, sends customer care texts: callback confirmations, follow-ups on a request you made,
          appointment reminders and a short intake survey, and a review request after a completed job. Use this form to opt in, or
          to give us your number without texts. See the <Link href="/sms" className="text-[#CF0000] underline">Text Messaging Program</Link> page for the full details.
        </p>
        <OptInForm />
        <p className="text-[14px] text-[#6b7390] mt-8">
          Questions? Email <a href="mailto:gobiggify@gmail.com" className="text-[#CF0000]">gobiggify@gmail.com</a>. Read our{' '}
          <Link href="/privacy" className="text-[#CF0000]">Privacy Policy</Link> and <Link href="/terms" className="text-[#CF0000]">Terms of Service</Link>.
        </p>
      </div>
    </div>
  );
}

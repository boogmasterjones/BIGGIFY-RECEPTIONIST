import Link from 'next/link';

export const metadata = {
  title: 'Text Messaging Program — Biggify',
  description: 'How Biggify text messaging works: who receives messages, how people opt in, and how to opt out.',
};

const P = 'text-[16px] text-[#2a3049] mb-3 leading-relaxed';
const H = 'text-[21px] tracking-tight mt-9 mb-2.5 font-bold';
const LI = 'text-[16px] text-[#2a3049]';

export default function SmsPage() {
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
        <h1 className="text-[34px] tracking-tight mt-11 mb-1.5 font-extrabold">Text Messaging Program</h1>
        <p className="text-[#4a5372] mb-8">Last updated: October 2026</p>

        <p className={P}>
          Biggify, a service of BIGGIFY LLC, sends customer care text messages on behalf of local home-service businesses. This page
          explains who receives messages, how people opt in, and how to stop.
        </p>

        <h2 className={H}>What we send</h2>
        <ul className="pl-5 mb-3 space-y-1.5">
          <li className={LI}>Callback confirmations after you asked a business to call you back.</li>
          <li className={LI}>Follow-ups on an estimate you requested.</li>
          <li className={LI}>Appointment reminders and a short intake survey.</li>
          <li className={LI}>A review request after a completed job.</li>
        </ul>

        <h2 className={H}>How people opt in</h2>
        <p className={P}>
          <strong>1. Website form.</strong> The contact or estimate form on a business&apos;s website has a required checkbox, unchecked by
          default:
        </p>
        <div className="bg-[#fdf2f2] border border-[#f3d6d6] border-l-4 border-l-[#CF0000] rounded-[10px] px-[22px] py-[18px] my-5">
          <p className="text-[16px] text-[#2a3049] m-0">
            ☐ I agree to receive text messages from Biggify on behalf of [business name] about my request, including callbacks, follow-ups
            and review requests. Message frequency varies. Msg and data rates may apply. Reply STOP to opt out, HELP for help. Consent is not
            a condition of purchase. <Link href="/privacy" className="text-[#CF0000]">Privacy Policy</Link> and{' '}
            <Link href="/terms" className="text-[#CF0000]">Terms</Link>.
          </p>
        </div>
        <p className={P}>
          <strong>2. Phone call.</strong> When you call a business and ask to be called or texted back, you can give your number. We then
          send one text asking you to reply YES to receive further messages. We send nothing more unless you reply YES.
        </p>

        <h2 className={H}>Opting out and help</h2>
        <ul className="pl-5 mb-3 space-y-1.5">
          <li className={LI}>
            Reply <strong>STOP</strong> (or UNSUBSCRIBE) at any time. You will get one confirmation and no further messages.
          </li>
          <li className={LI}>
            Reply <strong>HELP</strong>, or email{' '}
            <a href="mailto:gobiggify@gmail.com" className="text-[#CF0000]">gobiggify@gmail.com</a>.
          </li>
          <li className={LI}>Message frequency varies. Message and data rates may apply. Consent is not a condition of any purchase.</li>
        </ul>

        <h2 className={H}>Your information</h2>
        <p className={P}>
          Mobile information is never sold or shared with third parties or affiliates for marketing or promotional purposes. Opt-in data
          and consent are not shared with any third parties. Read our <Link href="/privacy" className="text-[#CF0000]">Privacy Policy</Link>{' '}
          and <Link href="/terms" className="text-[#CF0000]">Terms</Link>.
        </p>

        <Link href="/" className="inline-block mt-8 text-[#CF0000] font-bold">← Back to Biggify</Link>
      </div>

      <footer className="border-t border-[#e7e9f2] py-6 text-center text-sm text-[#4a5372]">
        © {new Date().getFullYear()} Biggify — a service of BIGGIFY LLC.
      </footer>
    </div>
  );
}

import Link from 'next/link';

export const metadata = {
  title: 'Terms & Conditions — Biggify',
  description: 'Biggify terms and conditions, including our text messaging program.',
};

const P = 'text-[16px] text-[#2a3049] mb-3 leading-relaxed';
const H = 'text-[21px] tracking-tight mt-9 mb-2.5 font-bold';
const LI = 'text-[16px] text-[#2a3049]';

export default function TermsPage() {
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
        <h1 className="text-[34px] tracking-tight mt-11 mb-1.5 font-extrabold">Terms &amp; Conditions</h1>
        <p className="text-[#4a5372] mb-8">Last updated: October 2026</p>

        <p className={P}>
          These terms apply to Biggify, a service of BIGGIFY LLC (&quot;Biggify&quot;, &quot;we&quot;, &quot;us&quot;), including our website, our
          virtual receptionist, and the text messages we send on behalf of the local businesses we work with.
        </p>

        <h2 className={H}>Text messaging program</h2>
        <p className={P}>
          Biggify sends customer care text messages on behalf of local home-service businesses to people who contacted them by phone or
          website form: callback confirmations, follow-ups on a requested estimate, short intake surveys, appointment reminders, and review
          requests after a completed job. By giving your phone number to one of these businesses and agreeing to texts, you consent to
          receive these messages from Biggify. Consent is not a condition of any purchase.
        </p>
        <ul className="pl-5 mb-3 space-y-1.5">
          <li className={LI}>Message frequency varies with your request.</li>
          <li className={LI}>Message and data rates may apply.</li>
          <li className={LI}>
            Reply <strong>STOP</strong> at any time to opt out. You will get one confirmation and no further messages.
          </li>
          <li className={LI}>
            Reply <strong>HELP</strong> for help, or email{' '}
            <a href="mailto:gobiggify@gmail.com" className="text-[#CF0000]">gobiggify@gmail.com</a>.
          </li>
          <li className={LI}>Carriers are not liable for delayed or undelivered messages.</li>
        </ul>
        <p className={P}>
          Details of how people opt in are on our{' '}
          <Link href="/sms" className="text-[#CF0000]">text messaging page</Link>. How we handle your information is in our{' '}
          <Link href="/privacy" className="text-[#CF0000]">Privacy Policy</Link>. Mobile information is not shared with third parties or
          affiliates for marketing or promotional purposes.
        </p>

        <h2 className={H}>Using our service</h2>
        <p className={P}>
          Our virtual receptionist is an automated answering service. It takes a callback time and the kind of work needed; it does not give
          quotes, advice or commitments. The business you called will follow up with you directly.
        </p>

        <h2 className={H}>No warranty; limits</h2>
        <p className={P}>
          The service is provided as is. To the extent the law allows, Biggify is not liable for indirect or consequential losses, or for
          missed, delayed or incorrect messages or calls.
        </p>

        <h2 className={H}>Changes</h2>
        <p className={P}>We may update these terms. The date at the top shows the latest version.</p>

        <h2 className={H}>Contact</h2>
        <p className={P}>
          BIGGIFY LLC (Biggify)
          <br />
          Email: <a href="mailto:gobiggify@gmail.com" className="text-[#CF0000]">gobiggify@gmail.com</a>
        </p>

        <Link href="/" className="inline-block mt-8 text-[#CF0000] font-bold">← Back to Biggify</Link>
      </div>

      <footer className="border-t border-[#e7e9f2] py-6 text-center text-sm text-[#4a5372]">
        © {new Date().getFullYear()} Biggify — a service of BIGGIFY LLC.
      </footer>
    </div>
  );
}

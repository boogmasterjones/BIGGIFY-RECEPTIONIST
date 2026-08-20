import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy & SMS Terms — Biggify',
  description: 'Biggify privacy policy and SMS messaging terms.',
};

export default function PrivacyPage() {
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
        <h1 className="text-[34px] tracking-tight mt-11 mb-1.5 font-extrabold">Privacy Policy &amp; SMS Terms</h1>
        <p className="text-[#4a5372] mb-8">Last updated: August 2026</p>

        <p className="text-[16px] text-[#2a3049] mb-3 leading-relaxed">
          Biggify (&quot;Biggify&quot;, &quot;we&quot;, &quot;us&quot;) is a service of <strong>Rock Solid Tile</strong>. This policy explains what
          information we collect, how we use it, and your choices — including how our text messaging works.
        </p>

        <h2 className="text-[21px] tracking-tight mt-9 mb-2.5 font-bold">Who we are</h2>
        <p className="text-[16px] text-[#2a3049] mb-3 leading-relaxed">
          Biggify provides an AI-powered virtual receptionist that answers calls, books appointments, and follows up by text message for
          home-service businesses. If you called a business that uses Biggify, we process your information on that business&apos;s behalf
          to schedule and prepare for your service.
        </p>

        <h2 className="text-[21px] tracking-tight mt-9 mb-2.5 font-bold">Information we collect</h2>
        <ul className="pl-5 mb-3 space-y-1.5">
          <li className="text-[16px] text-[#2a3049]"><strong>Contact details</strong> you provide on a call or by text — such as your name and phone number.</li>
          <li className="text-[16px] text-[#2a3049]"><strong>Service details</strong> — the reason for your call, your address, and your preferred appointment time.</li>
          <li className="text-[16px] text-[#2a3049]"><strong>Communication records</strong> — call and message logs used to book and fulfill your request.</li>
        </ul>

        <h2 className="text-[21px] tracking-tight mt-9 mb-2.5 font-bold">How we use your information</h2>
        <ul className="pl-5 mb-3 space-y-1.5">
          <li className="text-[16px] text-[#2a3049]">To answer your call, schedule your appointment, and confirm the details.</li>
          <li className="text-[16px] text-[#2a3049]">To send you a short follow-up text so the business can prepare for your visit.</li>
          <li className="text-[16px] text-[#2a3049]">To notify the business of your request and maintain a record of it.</li>
        </ul>

        <h2 className="text-[21px] tracking-tight mt-9 mb-2.5 font-bold">SMS / Text Messaging Terms</h2>
        <p className="text-[16px] text-[#2a3049] mb-3 leading-relaxed">
          When you call a Biggify-powered business and provide your phone number, you consent to receive text messages related to your
          service request (appointment confirmations, a short intake survey, and reminders) at the number you called from. Message
          frequency varies. <strong>Message and data rates may apply.</strong>
        </p>
        <ul className="pl-5 mb-3 space-y-1.5">
          <li className="text-[16px] text-[#2a3049]">Reply <strong>STOP</strong> at any time to opt out and stop receiving messages.</li>
          <li className="text-[16px] text-[#2a3049]">Reply <strong>HELP</strong> for assistance, or contact us at <a href="mailto:gobiggify@gmail.com" className="text-[#CF0000]">gobiggify@gmail.com</a>.</li>
          <li className="text-[16px] text-[#2a3049]">Carriers are not liable for delayed or undelivered messages.</li>
        </ul>

        <div className="bg-[#fdf2f2] border border-[#f3d6d6] border-l-4 border-l-[#CF0000] rounded-[10px] px-[22px] py-[18px] my-5">
          <p className="text-[16px] text-[#2a3049] m-0">
            <strong>Your mobile information is never sold or shared.</strong> No mobile information will be shared with third parties or
            affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent are not shared with any
            third parties.
          </p>
        </div>

        <h2 className="text-[21px] tracking-tight mt-9 mb-2.5 font-bold">How we share information</h2>
        <p className="text-[16px] text-[#2a3049] mb-3 leading-relaxed">
          We share your information only with the specific business you contacted, and with service providers that help us operate (such
          as our telephony and scheduling providers) under confidentiality obligations. We do not sell your personal information.
        </p>

        <h2 className="text-[21px] tracking-tight mt-9 mb-2.5 font-bold">Data retention &amp; security</h2>
        <p className="text-[16px] text-[#2a3049] mb-3 leading-relaxed">
          We keep information only as long as needed to provide the service and meet legal obligations, and we use reasonable safeguards
          to protect it.
        </p>

        <h2 className="text-[21px] tracking-tight mt-9 mb-2.5 font-bold">Your choices</h2>
        <p className="text-[16px] text-[#2a3049] mb-3 leading-relaxed">
          You may opt out of texts at any time (reply STOP), and you may request access to or deletion of your information by emailing{' '}
          <a href="mailto:gobiggify@gmail.com" className="text-[#CF0000]">gobiggify@gmail.com</a>.
        </p>

        <h2 className="text-[21px] tracking-tight mt-9 mb-2.5 font-bold">Contact us</h2>
        <p className="text-[16px] text-[#2a3049] mb-3 leading-relaxed">
          Biggify — a service of Rock Solid Tile
          <br />
          Email: <a href="mailto:gobiggify@gmail.com" className="text-[#CF0000]">gobiggify@gmail.com</a>
        </p>

        <Link href="/" className="inline-block mt-8 text-[#CF0000] font-bold">← Back to Biggify</Link>
      </div>

      <footer className="border-t border-[#e7e9f2] py-6 text-center text-sm text-[#4a5372]">
        © {new Date().getFullYear()} Biggify — a service of Rock Solid Tile.
      </footer>
    </div>
  );
}

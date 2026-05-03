import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Aleo Chess Royale",
  description: "Terms and conditions for using Aleo Chess Royale.",
};

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/play" className="text-sm font-extrabold text-cobalt hover:underline">
        ← Back to Home
      </Link>

      <h1 className="mt-6 text-3xl font-extrabold text-navy">Terms of Service</h1>
      <p className="mt-2 text-sm font-bold text-muted">Last updated: May 3, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-navy/80">
        <section>
          <h2 className="text-lg font-extrabold text-navy">1. Acceptance of Terms</h2>
          <p className="mt-2">
            By accessing or using Aleo Chess Royale (&quot;the Service&quot;), you agree to be bound 
            by these Terms of Service. If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">2. Account Registration</h2>
          <p className="mt-2">
            You may use the Service anonymously or create an account. You are responsible for 
            maintaining the security of your account credentials. You must not share your account 
            or use another person&apos;s account without permission.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">3. Subscriptions & Payments</h2>
          <p className="mt-2">
            <strong>Aleo Pro</strong> is available as a monthly ($4.99/month) or annual ($39.99/year) 
            subscription. All prices are in USD. For users in the CIS region, equivalent RUB pricing 
            is displayed.
          </p>
          <p className="mt-2">
            <strong>Auto-Renewal:</strong> Subscriptions automatically renew at the end of each 
            billing period unless you cancel before the renewal date. You can cancel your subscription 
            at any time through the subscription management portal in your Profile settings.
          </p>
          <p className="mt-2">
            <strong>Cancellation:</strong> When you cancel, your Pro benefits remain active until 
            the end of the current billing period. No partial refunds are issued for unused time.
          </p>
          <p className="mt-2">
            <strong>Coin Purchases:</strong> In-app coins are purchased with real currency and are 
            non-refundable except where required by law. Coins have no real-world monetary value 
            and cannot be exchanged for cash.
          </p>
          <p className="mt-2">
            <strong>Payment Providers:</strong> Payments are processed by Stripe (global) and 
            YooKassa (CIS region). By making a purchase, you also agree to the respective 
            provider&apos;s terms of service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">4. Code of Conduct</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>No cheating: use of chess engines, bots, or external assistance during games is prohibited</li>
            <li>No harassment: abusive, threatening, or discriminatory behavior is not tolerated</li>
            <li>No exploitation: exploiting bugs or vulnerabilities must be reported, not abused</li>
            <li>No account manipulation: sandbagging, rating manipulation, or multi-accounting is prohibited</li>
          </ul>
          <p className="mt-2">
            Violations may result in temporary or permanent suspension of your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">5. Intellectual Property</h2>
          <p className="mt-2">
            All content, graphics, code, and branding of Aleo Chess Royale are owned by the 
            Aleo Chess team. You may not copy, reproduce, or distribute any part of the Service 
            without written permission. Your game data and moves are your property.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">6. Virtual Items</h2>
          <p className="mt-2">
            Virtual items (coins, skins, battle pass rewards) are licensed, not sold. We reserve 
            the right to modify, suspend, or remove virtual items. Virtual items have no cash value 
            and are non-transferable between accounts.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">7. Disclaimer of Warranties</h2>
          <p className="mt-2">
            The Service is provided &quot;as is&quot; without warranties of any kind. We do not 
            guarantee uninterrupted or error-free operation.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">8. Limitation of Liability</h2>
          <p className="mt-2">
            To the maximum extent permitted by law, Aleo Chess shall not be liable for any 
            indirect, incidental, special, or consequential damages arising from your use of 
            the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">9. Changes to Terms</h2>
          <p className="mt-2">
            We may update these Terms from time to time. Continued use of the Service after 
            changes constitutes acceptance. We will notify users of material changes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">10. Contact</h2>
          <p className="mt-2">
            For questions about these Terms, contact us at{" "}
            <strong>support@aleochess.com</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}

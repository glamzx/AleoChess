import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Aleo Chess Royale",
  description: "How Aleo Chess Royale collects, uses, and protects your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/play" className="text-sm font-extrabold text-cobalt hover:underline">
        ← Back to Home
      </Link>

      <h1 className="mt-6 text-3xl font-extrabold text-navy">Privacy Policy</h1>
      <p className="mt-2 text-sm font-bold text-muted">Last updated: May 3, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-navy/80">
        <section>
          <h2 className="text-lg font-extrabold text-navy">1. Information We Collect</h2>
          <p className="mt-2">
            <strong>Account Data:</strong> When you create an account, we collect your email address 
            (if provided), display name, and authentication credentials. Anonymous users receive a 
            temporary session identifier.
          </p>
          <p className="mt-2">
            <strong>Game Data:</strong> We store your game history, moves, ratings, puzzle progress, 
            and match results to provide our core service.
          </p>
          <p className="mt-2">
            <strong>Payment Data:</strong> Payment processing is handled by Stripe (for global users) 
            and YooKassa (for CIS region users). We do not store credit card numbers. We receive 
            transaction confirmations, subscription status, and customer IDs from these providers.
          </p>
          <p className="mt-2">
            <strong>Usage Data:</strong> We collect anonymized analytics including pages visited, 
            features used, and performance metrics to improve the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">2. How We Use Your Data</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Provide, maintain, and improve our chess platform</li>
            <li>Match you with opponents of similar skill level</li>
            <li>Process payments and manage subscriptions</li>
            <li>Send service-related notifications (password resets, billing alerts)</li>
            <li>Analyze usage patterns to improve features and performance</li>
            <li>Prevent fraud, abuse, and cheating</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">3. Data Sharing</h2>
          <p className="mt-2">
            We do not sell your personal data. We share data only with:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Payment providers</strong> (Stripe, YooKassa) to process transactions</li>
            <li><strong>Hosting providers</strong> (Supabase, Vercel) to run our infrastructure</li>
            <li><strong>Law enforcement</strong> when legally required</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">4. Data Retention</h2>
          <p className="mt-2">
            Game history and account data are retained for as long as your account is active. 
            You may request deletion of your account and associated data at any time by contacting 
            support at <strong>support@aleochess.com</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">5. Cookies</h2>
          <p className="mt-2">
            We use essential cookies for authentication and session management. We do not use 
            third-party advertising cookies. Analytics cookies are anonymized and used only to 
            improve the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">6. Children&apos;s Privacy</h2>
          <p className="mt-2">
            Our service is not directed to children under 13. If we learn that we have collected 
            personal data from a child under 13, we will delete that information promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">7. Your Rights</h2>
          <p className="mt-2">
            Depending on your jurisdiction, you may have rights to access, correct, delete, or 
            export your personal data. Contact us at <strong>support@aleochess.com</strong> to 
            exercise these rights.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">8. Changes to This Policy</h2>
          <p className="mt-2">
            We may update this Privacy Policy from time to time. We will notify you of material 
            changes by posting a notice on the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">9. Contact Us</h2>
          <p className="mt-2">
            For questions about this Privacy Policy, contact us at{" "}
            <strong>support@aleochess.com</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}

import { LegalLayout } from '@/components/layout/LegalLayout';

export const metadata = { title: 'Privacy Policy | Maningo Method' };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="May 5, 2026">
      <p>This Privacy Policy describes how Maningo Method (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, and shares information about you when you visit www.maningomethod.com (the &ldquo;Site&rdquo;), book classes, purchase class packs, or otherwise interact with our services (collectively, the &ldquo;Services&rdquo;). Maningo Method is operated by Chelsea Maningo, with classes held at Host Hampton, 295 Montauk Highway, Suite 7, Speonk, NY 11972.</p>

      <p>By using the Services, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use the Services.</p>

      <h2>1. Information We Collect</h2>
      <h3>Information You Provide</h3>
      <ul>
        <li><strong>Account information:</strong> name, email, phone number, password (stored hashed).</li>
        <li><strong>Booking and purchase information:</strong> classes booked, packs purchased, transaction history.</li>
        <li><strong>Payment information:</strong> processed by Stripe. We do not store full card numbers; Stripe provides us a token and the last four digits.</li>
        <li><strong>Health and emergency contact information</strong> you voluntarily provide on the liability waiver.</li>
        <li><strong>Communications:</strong> messages sent through inquiry forms or email.</li>
        <li><strong>Marketing consent:</strong> if you opt in to email or SMS marketing, we record your consent timestamp, the IP address from which you opted in, and the disclosure text shown to you.</li>
      </ul>

      <h3>Information Collected Automatically</h3>
      <ul>
        <li><strong>Log data:</strong> IP address, browser type, pages visited, timestamps.</li>
        <li><strong>Cookies and similar technologies:</strong> session cookies for authentication. We do not use third-party advertising or cross-site tracking cookies.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To create and maintain your account.</li>
        <li>To process bookings, payments, refunds, and credits.</li>
        <li>To send transactional messages (booking confirmations, cancellations, password resets, receipts).</li>
        <li>To send marketing emails or SMS messages, but only if you have explicitly opted in.</li>
        <li>To respond to inquiries and provide customer support.</li>
        <li>To comply with legal obligations and enforce our Terms of Service.</li>
      </ul>

      <h2>3. SMS Messaging Disclosure</h2>
      <p>If you provide your phone number and check the SMS opt-in box, you consent to receive text messages from Maningo Method, which may include class reminders, schedule changes, account alerts, and (only if separately opted in) promotional offers. Message frequency varies. Message and data rates may apply. Reply <strong>STOP</strong> to opt out of further messages, or <strong>HELP</strong> for assistance. You can also revoke consent any time in your account settings.</p>
      <p><strong>We do not share, sell, rent, or otherwise transfer your phone number, mobile opt-in data, or SMS consent to any third parties or affiliates for their marketing purposes.</strong> We may share your phone number with our SMS infrastructure provider (e.g., Twilio) solely to deliver messages you have requested.</p>

      <h2>4. How We Share Your Information</h2>
      <p>We share information only with the following categories of recipients, and only as necessary:</p>
      <ul>
        <li><strong>Service providers</strong> who help us operate the Services, such as: Stripe (payment processing), Supabase (database hosting and authentication), Resend (transactional email delivery), Cloudflare (DNS and DDoS protection), and our SMS provider if you opt in to SMS.</li>
        <li><strong>Legal authorities</strong> when required by law, subpoena, court order, or to protect our rights or the safety of others.</li>
        <li><strong>Business successors</strong> in the event of a merger, acquisition, or asset sale, in which case we will provide notice before your information is transferred.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>5. Data Retention</h2>
      <p>We retain your account, booking, and transaction records for as long as your account is active and for up to seven (7) years thereafter for tax, accounting, and legal compliance purposes. Marketing consent records are retained for as long as the consent is active and at least four (4) years after revocation, as required for SMS compliance audits.</p>

      <h2>6. Your Rights</h2>
      <p>Depending on where you live, you may have rights regarding your personal information, including the right to access, correct, delete, or export your data, and the right to opt out of marketing communications at any time. To exercise these rights, email us at <a href="mailto:chelsea@maningomethod.com">chelsea@maningomethod.com</a>.</p>
      <p><strong>California residents</strong> have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what categories of personal information we collect and the right to non-discrimination for exercising privacy rights.</p>

      <h2>7. Children&rsquo;s Privacy</h2>
      <p>The Services are not directed to children under 13, and we do not knowingly collect personal information from children under 13. Minors aged 13&ndash;17 may use the Services only with the consent of a parent or legal guardian, including a signed liability waiver. If you believe we have collected information from a child under 13, please contact us and we will promptly delete it.</p>

      <h2>8. Security</h2>
      <p>We use commercially reasonable technical and organizational measures to protect your information, including encryption in transit (TLS), hashed passwords, and access controls. However, no system is perfectly secure, and we cannot guarantee absolute security.</p>

      <h2>9. Third-Party Links</h2>
      <p>The Site may contain links to third-party websites (e.g., Google Maps, Stripe checkout). We are not responsible for the privacy practices of those sites. Please review their policies before providing information.</p>

      <h2>10. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. The &ldquo;Last updated&rdquo; date at the top reflects the latest revision. Material changes will be communicated via email or a notice on the Site.</p>

      <h2>11. Contact</h2>
      <p>Questions about this Privacy Policy? Email <a href="mailto:chelsea@maningomethod.com">chelsea@maningomethod.com</a> or write to us at:</p>
      <p>Maningo Method<br />c/o Host Hampton<br />295 Montauk Highway, Suite 7<br />Speonk, NY 11972</p>
    </LegalLayout>
  );
}

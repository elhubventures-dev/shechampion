import PageMeta from '../../components/PageMeta';
import '../EventChallenge2026.css';

export default function EventPrivacyNotice() {
  return (
    <div className="event-page">
      <PageMeta
        title="Event privacy notice (draft) | SHE CHAMPIONS"
        description="Draft privacy notice for SHE CHAMPIONS Business Empowerment Challenge 2026 registration."
        noIndex
      />
      <section className="py-section">
        <div className="container prose-block legal-doc">
          <p className="section-eyebrow">Draft — owner review required</p>
          <h1 className="section-title">
            Event registration privacy notice
          </h1>
          <p>
            This draft explains how SHE CHAMPIONS intends to handle information
            collected for the SHE CHAMPIONS Business Empowerment Challenge 2026
            registration workflow. It is not approved legal text until SHE
            CHAMPIONS reviews and explicitly approves it.
          </p>

          <h2>What we collect</h2>
          <p>At the initial registration step we collect:</p>
          <ul>
            <li>Full name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>State of residence</li>
            <li>Applicant category</li>
            <li>Optional business name</li>
            <li>Brief description of your business, skill, or idea</li>
            <li>Records of privacy and participation-terms acceptance</li>
            <li>Payment verification metadata from Paystack (not card numbers)</li>
          </ul>

          <h2>Why we collect it</h2>
          <p>
            We use this information to process event registration, verify the
            participation fee payment, communicate confirmation and next steps,
            and administer assessment of applications.
          </p>

          <h2>How payment verification works</h2>
          <p>
            Payments are processed by Paystack on their hosted checkout. SHE
            CHAMPIONS does not receive or store card numbers, CVVs, or PIN data.
            Our systems store a payment reference and verification result so we
            can confirm whether the required fee was paid.
          </p>

          <h2>Service providers</h2>
          <p>Depending on configuration, information may be processed by:</p>
          <ul>
            <li>Hosting and serverless infrastructure (Vercel)</li>
            <li>Database hosting (Neon PostgreSQL)</li>
            <li>Payment processing (Paystack)</li>
            <li>Transactional email delivery (Resend, when configured)</li>
          </ul>

          <h2>Contact</h2>
          <p>
            To ask about your registration information, contact SHE CHAMPIONS
            using the website contact page or{' '}
            <a href="mailto:info@shechampion-bbf.org">info@shechampion-bbf.org</a>
            .
          </p>

          <h2>Outstanding items for owner review</h2>
          <ul>
            <li>Formal legal entity / data-controller wording</li>
            <li>Retention period for applicant records</li>
            <li>Any additional local legal disclosures required</li>
            <li>Final approval before public registration opens</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

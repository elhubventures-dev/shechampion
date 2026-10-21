import PageMeta from '../../components/PageMeta';
import '../EventChallenge2026.css';

export default function EventParticipationTerms() {
  return (
    <div className="event-page">
      <PageMeta
        title="Participation terms (draft) | SHE CHAMPIONS"
        description="Draft participation terms for SHE CHAMPIONS Business Empowerment Challenge 2026."
        noIndex
      />
      <section className="py-section">
        <div className="container prose-block legal-doc">
          <p className="section-eyebrow">Draft — owner review required</p>
          <h1 className="section-title">Event participation terms</h1>
          <p>
            These draft terms describe participation in the SHE CHAMPIONS
            Business Empowerment Challenge 2026. They are not approved legal
            terms until SHE CHAMPIONS reviews and explicitly approves them.
          </p>

          <h2>Participation fee</h2>
          <p>
            The participation fee is ₦5,000. Paying the fee enables you to take
            part in the programme registration process. It does not guarantee a
            grant award.
          </p>

          <h2>Application process</h2>
          <p>
            The initial application is short. Detailed business proposals may be
            requested later from shortlisted applicants only.
          </p>

          <h2>Grants</h2>
          <p>
            Participants may compete for grants in the ₦1 million–₦5 million
            range, subject to eligibility, assessment, final award arrangements,
            and available funding. Not every participant will receive a grant.
          </p>

          <h2>Ambassador recognition</h2>
          <p>
            The event winner becomes the first SHE CHAMPIONS Ambassador, subject
            to the organisation&apos;s final selection and award arrangements.
          </p>

          <h2>Accurate information</h2>
          <p>
            Applicants must provide accurate information. SHE CHAMPIONS may
            withdraw a registration if information is found to be materially
            false.
          </p>

          <h2>Outstanding items for owner review</h2>
          <ul>
            <li>Refund and cancellation policy</li>
            <li>Exact venue and start time once confirmed</li>
            <li>Detailed eligibility criteria if any beyond this draft</li>
            <li>Final legal approval before public registration opens</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

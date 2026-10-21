import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowDown,
    ArrowRight,
    Award,
    Briefcase,
    CalendarDays,
    CheckCircle2,
    Lightbulb,
    MapPin,
    Presentation,
    Sparkles,
    Users,
    Wrench,
} from 'lucide-react';
import PageMeta from '../components/PageMeta';
import RegistrationForm from '../components/RegistrationForm';
import { EVENT_2026 } from '../lib/event2026';
import { fetchRegistrationStatus } from '../lib/eventApi';
import './EventChallenge2026.css';

const categories = [
    {
        icon: Briefcase,
        title: 'Women who own businesses',
        description:
            'Entrepreneurs ready to showcase their enterprises, refine their positioning, and compete for recognition and grant opportunities.',
    },
    {
        icon: Wrench,
        title: 'Women with vocational or professional skills',
        description:
            'Skilled professionals and craftswomen seeking visibility, market connections, and structured business development support.',
    },
    {
        icon: Lightbulb,
        title: 'Women with business ideas',
        description:
            'Aspiring founders with viable concepts who want feedback, mentorship exposure, and a platform to present their ideas.',
    },
];

const activities = [
    { icon: Sparkles, title: 'Skills demonstrations', text: 'Participants demonstrate practical capabilities and craft excellence.' },
    { icon: Presentation, title: 'Product and service exhibitions', text: 'Showcase offerings to visitors, peers, and institutional guests.' },
    { icon: Users, title: 'Business presentations and pitching', text: 'Present business ideas and growth plans before assessors.' },
    { icon: CheckCircle2, title: 'Business training and mentorship', text: 'Engage in development sessions designed to strengthen enterprise readiness.' },
    { icon: Award, title: 'Competition and judging', text: 'Compete through a structured assessment process aligned with programme goals.' },
    { icon: CalendarDays, title: 'Awards and recognition', text: 'Celebrate outstanding participants, including ambassador recognition for the winner.' },
];

const processSteps = [
    {
        step: '01',
        title: 'Short initial registration',
        text: 'When registration opens, interested women will complete a brief application. Detailed proposals are not required at the first step.',
    },
    {
        step: '02',
        title: 'Shortlisting',
        text: 'Applications will be reviewed. Shortlisted applicants will be invited to provide the business proposals and supporting information needed for assessment.',
    },
    {
        step: '03',
        title: 'Assessment and event participation',
        text: 'Shortlisted participants take part in the physical programme in Abuja, including presentations, exhibitions, and judging as applicable.',
    },
    {
        step: '04',
        title: 'Awards and ambassador recognition',
        text: 'Outstanding participants may be recognised, including the opportunity for the winner to become the first SHE CHAMPIONS Ambassador.',
    },
];

const faqs = [
    {
        q: 'What is the SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE?',
        a: 'It is a physical SHE CHAMPIONS programme in Abuja on 12 December 2026 that brings together women with businesses, skills, or ideas for demonstrations, exhibitions, pitching, training, competition, and recognition — including an opportunity to compete for business grants.',
    },
    {
        q: 'Who can participate?',
        a: 'Women who own businesses, women with vocational or professional skills, and women with business ideas. No additional age, education, residency, or company-registration restrictions have been confirmed.',
    },
    {
        q: 'What is the participation fee?',
        a: 'The participation fee is ₦5,000. Payment processing will be enabled when the official registration workflow is launched.',
    },
    {
        q: 'When and where will the event take place?',
        a: 'The event will take place on 12 December 2026 in Abuja, Nigeria, as a physical event. The exact venue will be announced by SHE CHAMPIONS.',
    },
    {
        q: 'What activities are planned?',
        a: 'Planned activities include skills demonstrations, product and service exhibitions, business presentations and pitching, business training and mentorship, competition and judging, and awards and recognition.',
    },
    {
        q: 'How does the grant opportunity work?',
        a: `Participants may compete for business grants within the ${EVENT_2026.grantRangeDisplay} range. Actual awards depend on eligibility, assessment, the final award structure, and available funding.`,
    },
    {
        q: 'Will every participant receive a grant?',
        a: 'No. Registration enables participation in the programme. Grant awards are competitive and not guaranteed for every participant.',
    },
    {
        q: 'How are participants assessed?',
        a: 'Business proposals will be assessed after shortlisting. Detailed scoring criteria, panel composition, and finalist numbers will be confirmed by SHE CHAMPIONS.',
    },
    {
        q: 'When does registration close?',
        a: `Registration closes ${EVENT_2026.cutoffRule}. The expected cutoff date is ${EVENT_2026.cutoffDateDisplay}. ${EVENT_2026.cutoffTimeNote}`,
    },
    {
        q: 'When will the venue be announced?',
        a: EVENT_2026.venueNote,
    },
    {
        q: 'What does the SHE CHAMPIONS Ambassador do?',
        a: 'The winner becomes the first SHE CHAMPIONS Ambassador and is expected to represent SHE CHAMPIONS, promote its initiatives, and participate in outreach activities.',
    },
    {
        q: 'How can interested participants contact the organisation?',
        a: 'Use the Contact page on this website, email info@shechampion-bbf.org, or call (+234) 703 631 6083.',
    },
];

const scrollToId = (id) => (event) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
};

const EventChallenge2026 = () => {
    const [regStatus, setRegStatus] = useState({
        loading: true,
        registrationOpen: false,
        status: 'closed',
        message: 'Checking registration availability…',
    });

    useEffect(() => {
        let cancelled = false;
        fetchRegistrationStatus()
            .then((data) => {
                if (cancelled) return;
                setRegStatus({
                    loading: false,
                    registrationOpen: Boolean(data.registrationOpen),
                    status: data.status || 'unavailable',
                    message:
                        data.message ||
                        'Official online registration is not yet open.',
                });
            })
            .catch(() => {
                if (cancelled) return;
                setRegStatus({
                    loading: false,
                    registrationOpen: false,
                    status: 'unavailable',
                    message:
                        'Registration status could not be loaded. Online registration remains closed until the service is available.',
                });
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const overlay =
        'linear-gradient(105deg, rgba(6, 21, 37, 0.9) 0%, rgba(11, 31, 58, 0.78) 50%, rgba(11, 31, 58, 0.62) 100%)';
    const heroStyle = {
        backgroundImage: `${overlay}, image-set(url("${EVENT_2026.heroImage}") type("image/webp"), url("/assets/challenge_hero.png") type("image/png"))`,
    };

    return (
        <div className="event-2026 page-shell animate-fade-in">
            <PageMeta
                title="SHE CHAMPIONS Business Empowerment Challenge 2026"
                description="Join the SHE CHAMPIONS Business Empowerment Challenge 2026 in Abuja on 12 December 2026. A physical programme for women entrepreneurs, skilled professionals, and idea founders — with a ₦5,000 fee and a competitive opportunity for business grants from ₦1 million to ₦5 million, subject to assessment and available funding."
            />

            <section className="event-hero" style={heroStyle} aria-labelledby="event-hero-heading">
                <div className="container event-hero__inner">
                    <p className="event-hero__eyebrow">Flagship programme</p>
                    <h1 id="event-hero-heading">{EVENT_2026.officialName}</h1>
                    <p className="event-hero__tagline">{EVENT_2026.tagline}</p>
                    <p className="event-hero__tagline-note">Proposed campaign tagline — subject to organisational approval.</p>

                    <dl className="event-hero__facts">
                        <div>
                            <dt>Date</dt>
                            <dd>{EVENT_2026.dateDisplay}</dd>
                        </div>
                        <div>
                            <dt>Location</dt>
                            <dd>{EVENT_2026.locationDisplay}</dd>
                        </div>
                        <div>
                            <dt>Format</dt>
                            <dd>{EVENT_2026.format}</dd>
                        </div>
                        <div>
                            <dt>Participation fee</dt>
                            <dd>{EVENT_2026.feeDisplay}</dd>
                        </div>
                    </dl>

                    <p className="event-hero__grant">
                        Opportunity to compete for business grants ranging from{' '}
                        <strong>{EVENT_2026.grantRangeDisplay}</strong>, subject to eligibility, assessment, the
                        final award structure, and available funding.
                    </p>

                    <div className="event-hero__actions">
                        <a
                            href="#participation"
                            className="btn btn-light"
                            onClick={scrollToId('participation')}
                        >
                            Explore Participation <ArrowDown size={18} aria-hidden="true" />
                        </a>
                        <Link to="/contact" className="btn event-btn-ghost">
                            Contact SHE CHAMPIONS
                        </Link>
                    </div>
                </div>
            </section>

            <section className="py-section" aria-labelledby="about-heading">
                <div className="container split-layout">
                    <div>
                        <p className="section-eyebrow">About the challenge</p>
                        <h2 className="section-title" id="about-heading">
                            A platform for skills, visibility, and enterprise growth
                        </h2>
                        <div className="prose-block">
                            <p>
                                The {EVENT_2026.officialName} is designed to elevate women&apos;s skills and
                                entrepreneurship through a focused physical programme in Abuja. Participants will
                                showcase capabilities, present products and services, engage in business development
                                activity, and compete for recognition.
                            </p>
                            <p>
                                The initiative creates space for visibility, mentorship-oriented learning, and a
                                competitive pathway to business grant opportunities — while making clear that funding
                                is awarded through assessment, not simply by registering.
                            </p>
                        </div>
                    </div>
                    <aside className="callout-panel">
                        <h3>What this programme offers</h3>
                        <ul className="event-check">
                            <li>Visibility for women-led skills and enterprises</li>
                            <li>Opportunities to exhibit products and services</li>
                            <li>Business presentation and pitching experience</li>
                            <li>Training and mentorship elements within the programme</li>
                            <li>Competitive grant opportunity ({EVENT_2026.grantRangeDisplay})</li>
                            <li>Ambassador recognition for the winner</li>
                        </ul>
                    </aside>
                </div>
            </section>

            <section className="py-section band-muted" id="who-can-participate" aria-labelledby="who-heading">
                <div className="container">
                    <div className="section-header centered">
                        <p className="section-eyebrow">Eligibility</p>
                        <h2 className="section-title" id="who-heading">
                            Who can participate?
                        </h2>
                        <p className="section-lead mx-auto">
                            The initiative is open to women across three confirmed categories. It is intended to help
                            participants showcase their capabilities and business potential.
                        </p>
                    </div>
                    <div className="event-category-grid">
                        {categories.map((category) => {
                            const CategoryIcon = category.icon;
                            return (
                                <article key={category.title}>
                                    <div className="event-icon" aria-hidden="true">
                                        <CategoryIcon size={22} />
                                    </div>
                                    <h3>{category.title}</h3>
                                    <p>{category.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="py-section" aria-labelledby="experience-heading">
                <div className="container">
                    <div className="section-header">
                        <p className="section-eyebrow">Programme experience</p>
                        <h2 className="section-title" id="experience-heading">
                            What participants can expect
                        </h2>
                        <p className="section-lead">
                            A structured overview of planned activities. A detailed running order and speaker lineup
                            will be shared by SHE CHAMPIONS when confirmed.
                        </p>
                    </div>
                    <div className="event-activity-grid">
                        {activities.map((activity) => {
                            const ActivityIcon = activity.icon;
                            return (
                                <article key={activity.title}>
                                    <div className="event-icon" aria-hidden="true">
                                        <ActivityIcon size={20} />
                                    </div>
                                    <h3>{activity.title}</h3>
                                    <p>{activity.text}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="py-section band-navy" aria-labelledby="grant-heading">
                <div className="container event-grant">
                    <p className="section-eyebrow">Grant opportunity</p>
                    <h2 className="section-title" id="grant-heading">
                        Compete for business grants of {EVENT_2026.grantRangeDisplay}
                    </h2>
                    <p className="section-lead">
                        Participants may compete for business grants within the {EVENT_2026.grantRangeDisplay} range.
                        Actual awards depend on eligibility, assessment, the final award structure, and available
                        funding.
                    </p>
                    <div className="event-grant__points">
                        <p>
                            <strong>Registration is not a grant award.</strong> Paying the participation fee enables
                            you to take part in the programme. It does not guarantee funding.
                        </p>
                        <p>
                            <strong>Awards are competitive.</strong> Not every participant will receive a grant. The
                            maximum amount is not guaranteed for any individual applicant.
                        </p>
                    </div>
                </div>
            </section>

            <section className="py-section" aria-labelledby="process-heading">
                <div className="container">
                    <div className="section-header centered">
                        <p className="section-eyebrow">Selection process</p>
                        <h2 className="section-title" id="process-heading">
                            How participation and assessment will work
                        </h2>
                    </div>
                    <ol className="event-process">
                        {processSteps.map((item) => (
                            <li key={item.step}>
                                <span aria-hidden="true">{item.step}</span>
                                <div>
                                    <h3>{item.title}</h3>
                                    <p>{item.text}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="py-section band-warm" aria-labelledby="ambassador-heading">
                <div className="container split-layout">
                    <div>
                        <p className="section-eyebrow">Ambassador recognition</p>
                        <h2 className="section-title" id="ambassador-heading">
                            The winner becomes the first SHE CHAMPIONS Ambassador
                        </h2>
                        <div className="prose-block">
                            <p>
                                Beyond programme awards, the winner will be recognised as the first SHE CHAMPIONS
                                Ambassador — a role focused on representation, advocacy, and outreach for the
                                organisation&apos;s initiatives.
                            </p>
                        </div>
                    </div>
                    <aside className="event-ambassador-card">
                        <h3>Ambassador responsibilities</h3>
                        <ul className="event-check event-check--light">
                            <li>Represent SHE CHAMPIONS</li>
                            <li>Promote the organisation&apos;s initiatives</li>
                            <li>Participate in outreach activities</li>
                        </ul>
                    </aside>
                </div>
            </section>

            <section className="py-section" id="event-details" aria-labelledby="details-heading">
                <div className="container">
                    <div className="section-header centered">
                        <p className="section-eyebrow">Event details</p>
                        <h2 className="section-title" id="details-heading">
                            Key facts at a glance
                        </h2>
                    </div>
                    <dl className="event-details-grid">
                        <div>
                            <dt>
                                <CalendarDays size={18} aria-hidden="true" /> Date
                            </dt>
                            <dd>{EVENT_2026.dateDisplay}</dd>
                        </div>
                        <div>
                            <dt>
                                <MapPin size={18} aria-hidden="true" /> Location
                            </dt>
                            <dd>{EVENT_2026.locationDisplay}</dd>
                        </div>
                        <div>
                            <dt>
                                <Users size={18} aria-hidden="true" /> Format
                            </dt>
                            <dd>{EVENT_2026.format}</dd>
                        </div>
                        <div>
                            <dt>
                                <Award size={18} aria-hidden="true" /> Participation fee
                            </dt>
                            <dd>{EVENT_2026.feeDisplay}</dd>
                        </div>
                    </dl>
                    <p className="notice-banner event-venue-note">{EVENT_2026.venueNote}</p>
                </div>
            </section>

            <section className="py-section band-muted" id="participation" tabIndex={-1} aria-labelledby="participation-heading">
                <div className="container event-participation">
                    <p className="section-eyebrow">Registration information</p>
                    <h2 className="section-title" id="participation-heading">
                        How to participate
                    </h2>
                    <div className="prose-block">
                        <p>
                            The participation fee is <strong>{EVENT_2026.feeDisplay}</strong>. The initial
                            application is short. Shortlisted applicants may later be asked for detailed business
                            proposals and supporting documents.
                        </p>
                        <p>
                            Registration closes <strong>{EVENT_2026.cutoffRule}</strong>. The expected cutoff date is{' '}
                            <strong>{EVENT_2026.cutoffDateDisplay}</strong>. {EVENT_2026.cutoffTimeNote}
                        </p>
                        <p>
                            Online registration stays closed until SHE CHAMPIONS completes required approvals and
                            environment configuration. Payment is confirmed only after server-side verification with
                            Paystack.
                        </p>
                    </div>
                    <div
                        className={`event-participation__status event-participation__status--${regStatus.status}`}
                        role="status"
                    >
                        {regStatus.loading
                            ? 'Checking registration availability…'
                            : regStatus.message}
                    </div>
                    {regStatus.registrationOpen ? (
                        <RegistrationForm registrationOpen />
                    ) : (
                        <div className="cta-actions" style={{ justifyContent: 'flex-start' }}>
                            <Link to="/contact" className="btn btn-primary">
                                Contact SHE CHAMPIONS <ArrowRight size={18} aria-hidden="true" />
                            </Link>
                            <a
                                href="#event-details"
                                className="btn btn-outline-primary"
                                onClick={scrollToId('event-details')}
                            >
                                Review event details
                            </a>
                        </div>
                    )}
                </div>
            </section>

            <section className="py-section" aria-labelledby="faq-heading">
                <div className="container">
                    <div className="section-header centered">
                        <p className="section-eyebrow">FAQ</p>
                        <h2 className="section-title" id="faq-heading">
                            Frequently asked questions
                        </h2>
                    </div>
                    <div className="event-faq">
                        {faqs.map((item) => (
                            <details key={item.q} className="event-faq__item">
                                <summary>{item.q}</summary>
                                <p>{item.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section className="cta-band" aria-labelledby="final-cta-heading">
                <div className="container">
                    <h2 id="final-cta-heading">Ready to explore participation?</h2>
                    <p>
                        Learn how the {EVENT_2026.shortName} will work, prepare for the short application when
                        registration opens, and contact SHE CHAMPIONS with questions.
                    </p>
                    <div className="cta-actions">
                        <a href="#participation" className="btn btn-light" onClick={scrollToId('participation')}>
                            Explore Participation
                        </a>
                        <Link to="/contact" className="btn event-btn-ghost">
                            Contact SHE CHAMPIONS
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default EventChallenge2026;

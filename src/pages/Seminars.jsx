import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import PageMeta from '../components/PageMeta';
import ChallengePromo from '../components/ChallengePromo';
import Reveal from '../components/Reveal';
import './Seminars.css';

const scheduleData = [
    { month: 'January', topic: 'Understanding Markets & Customer Demand', focus: 'Market research; customer profiling; demand analysis', outcome: 'Clear market positioning' },
    { month: 'February', topic: 'Pricing, Costing & Profitability for Growth', focus: 'Pricing strategies; cost structures; margins', outcome: 'Profitable pricing models' },
    { month: 'March', topic: 'Sales Channels & Distribution Strategies', focus: 'Wholesale vs retail; distributors; online channels', outcome: 'Expanded sales channels' },
    { month: 'April', topic: 'Branding, Packaging & Product Presentation', focus: 'Brand identity; packaging standards; labeling', outcome: 'Market ready products' },
    { month: 'May', topic: 'Digital Marketplaces & E-Commerce', focus: 'Online sales platforms; social commerce; logistics', outcome: 'Digital market access' },
    { month: 'June', topic: 'Business Compliance & Regulatory Requirements', focus: 'Business registration; standards; certifications', outcome: 'Compliance readiness' },
    { month: 'July', topic: 'Export Readiness & Cross-Border Trade', focus: 'Export documentation; quality standards; trade rules', outcome: 'Export-ready enterprises' },
    { month: 'August', topic: 'Accessing Buyers, Off-Takers & Aggregators', focus: 'Buyer engagement; contracts; aggregation models', outcome: 'Buyer linkages' },
    { month: 'September', topic: 'Negotiation, Contracts & Deal Structuring', focus: 'Contract basics; negotiation skills; MoUs', outcome: 'Better deal outcomes' },
    { month: 'October', topic: 'Showcasing at Expos & Trade Fairs', focus: 'Exhibition readiness; pitching at expos', outcome: 'Strong Expo performance' },
    { month: 'November', topic: 'Scaling Market Reach & Growth Planning', focus: 'Market expansion; partnerships; franchising', outcome: 'Growth strategies' },
    { month: 'December', topic: 'Market Review, Lessons & Opportunities Ahead', focus: 'Market trends; reflections; planning', outcome: 'Informed next-year planning' },
];

const masterclasses = [
    { title: 'Winning Customers & Building Sales Pipelines', q: 'Q1 Masterclass (March)', focus: 'Customer acquisition, sales funnels, conversion strategies' },
    { title: 'Compliance, Standards & Market Trust', q: 'Q2 Masterclass (June)', focus: 'Certifications, regulatory readiness, quality assurance' },
    { title: 'Negotiating Deals & Securing Buyers', q: 'Q3 Masterclass (September)', focus: 'Contract negotiation, pricing power, deal management' },
    { title: 'Scaling into New Markets', q: 'Q4 Masterclass (November)', focus: 'Regional expansion, partnerships, long-term growth' },
];

const structure = [
    { title: 'Frequency', body: 'Monthly (aligned with the SheChampions Women Network calendar)' },
    { title: 'Format', body: 'Hybrid (Physical & Virtual)' },
    { title: 'Delivery style', body: 'Seminars, masterclasses, clinics, and interactive sessions' },
    { title: 'Participants', body: 'SheChampions participants, Network members, invited women-led MSMEs' },
];

const outputs = [
    'Market-ready women-led enterprises',
    'Improved sales and buyer engagement',
    'Export-ready products and services',
    'Stronger negotiation and deal-making capacity',
    'Increased participation in expos, trade fairs, and B2B platforms',
];

const Seminars = () => {
    return (
        <div className="seminars-page page-shell animate-fade-in">
            <PageMeta
                title="Access-to-Market Seminars"
                description="Monthly Access-to-Market Seminars and quarterly masterclasses helping women-led enterprises reach local, regional, and international markets."
            />

            <Hero
                title="Access-to-Market Seminars"
                subtitle="Practical knowledge, tools, and networks required to access local, regional, and international markets."
                bgImage="/assets/seminars_hero.webp"
                secondary={true}
            />

            <Reveal>
                <ChallengePromo />
            </Reveal>

            <Reveal as="section" className="py-section" aria-labelledby="seminars-overview-heading">
                <div className="container seminars-intro">
                    <p className="section-eyebrow">Overview</p>
                    <h2 className="section-title" id="seminars-overview-heading">
                        A core pillar of the Challenge
                    </h2>
                    <p className="section-lead">
                        The Access to Market Seminars & Masterclasses are a core pillar of the SheChampions Challenge.
                        Sessions are delivered as high-impact monthly seminars and masterclasses, combining expert
                        instruction, real-life case studies, and direct engagement with buyers, investors, regulators,
                        and market enablers.
                    </p>
                    <p className="seminars-note">
                        The calendar below describes the planned annual topic sequence. Specific session dates and
                        registration details should be confirmed with the organisation.
                    </p>
                </div>
            </Reveal>

            <Reveal as="section" className="py-section band-muted" aria-labelledby="structure-heading">
                <div className="container">
                    <div className="section-header centered">
                        <p className="section-eyebrow">Structure</p>
                        <h2 className="section-title" id="structure-heading">
                            Programme structure
                        </h2>
                    </div>
                    <div className="structure-grid">
                        {structure.map((item) => (
                            <article key={item.title}>
                                <h3>{item.title}</h3>
                                <p>{item.body}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </Reveal>

            <Reveal as="section" className="py-section band-navy" aria-labelledby="topics-heading">
                <div className="container">
                    <div className="section-header centered">
                        <p className="section-eyebrow">Annual topics</p>
                        <h2 className="section-title" id="topics-heading">
                            Topics & schedule
                        </h2>
                    </div>
                    <div className="data-table-wrap">
                        <table className="data-table">
                            <caption className="visually-hidden">
                                Monthly seminar topics, focus areas, and target outcomes
                            </caption>
                            <thead>
                                <tr>
                                    <th scope="col">Month</th>
                                    <th scope="col">Topic</th>
                                    <th scope="col">Key focus areas</th>
                                    <th scope="col">Target outcomes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scheduleData.map((row) => (
                                    <tr key={row.month}>
                                        <td className="col-period">{row.month}</td>
                                        <td>{row.topic}</td>
                                        <td>{row.focus}</td>
                                        <td>{row.outcome}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Reveal>

            <Reveal as="section" className="py-section" aria-labelledby="masterclass-heading">
                <div className="container">
                    <div className="section-header">
                        <p className="section-eyebrow">Quarterly</p>
                        <h2 className="section-title" id="masterclass-heading">
                            Masterclass deep-dive sessions
                        </h2>
                        <p className="section-lead">
                            In addition to monthly seminars, high-level masterclasses will be organised quarterly.
                        </p>
                    </div>
                    <div className="masterclass-grid">
                        {masterclasses.map((mc) => (
                            <article key={mc.title} className="masterclass-card">
                                <p className="masterclass-q">{mc.q}</p>
                                <h3>{mc.title}</h3>
                                <p>
                                    <strong>Focus:</strong> {mc.focus}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </Reveal>

            <Reveal as="section" className="py-section band-warm" aria-labelledby="outputs-heading">
                <div className="container">
                    <div className="section-header centered">
                        <p className="section-eyebrow">Outcomes</p>
                        <h2 className="section-title" id="outputs-heading">
                            Expected outputs
                        </h2>
                    </div>
                    <ul className="outputs-grid">
                        {outputs.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                    <div className="home-center-action">
                        <Link to="/contact" className="btn btn-primary">
                            Enquire about seminars
                        </Link>
                    </div>
                </div>
            </Reveal>
        </div>
    );
};

export default Seminars;

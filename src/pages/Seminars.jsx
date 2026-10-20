import Hero from '../components/Hero';
import Card from '../components/Card';
import './Seminars.css';

const Seminars = () => {
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
        { title: 'Winning Customers & Building Sales Pipelines', q: 'Q1 MASTERCLASS (MARCH)', focus: 'Customer acquisition, sales funnels, conversion strategies' },
        { title: 'Compliance, Standards & Market Trust', q: 'Q2 MASTERCLASS (JUNE)', focus: 'Certifications, regulatory readiness, quality assurance' },
        { title: 'Negotiating Deals & Securing Buyers', q: 'Q3 MASTERCLASS (SEPTEMBER)', focus: 'Contract negotiation, pricing power, deal management' },
        { title: 'Scaling into New Markets', q: 'Q4 MASTERCLASS (NOVEMBER)', focus: 'Regional expansion, partnerships, long-term growth' }
    ];

    return (
        <div className="seminars-page animate-fade-in">
            <Hero
                title="Access-to-Market Seminars"
                subtitle="Practical knowledge, tools, and networks required to access local, regional, and international markets."
                bgImage="/assets/seminars_hero.webp"
                secondary={true}
            />

            <section className="py-section overview-section">
                <div className="container">
                    <div className="text-center mb-4">
                        <h2 className="section-title">Overview</h2>
                        <p className="section-lead max-w-3xl mx-auto">
                            The Access to Market Seminars & Masterclasses are a core pillar of the SheChampions Challenge.
                            Sessions are delivered as high-impact monthly seminars and masterclasses, combining expert
                            instruction, real-life case studies, and direct engagement wih buyers, investors,
                            regulators, and market enablers.
                        </p>
                    </div>
                </div>
            </section>

            <section className="py-section structure-section bg-secondary">
                <div className="container">
                    <div className="text-center mb-4">
                        <h2 className="section-title">Program Structure</h2>
                    </div>
                    <div className="structure-grid">
                        <Card title="Frequency">
                            <p>Monthly (aligned with the SheChampions Women Network calendar)</p>
                        </Card>
                        <Card title="Format">
                            <p>Hybrid (Physical & Virtual)</p>
                        </Card>
                        <Card title="Delivery Style">
                            <p>Seminars, masterclasses, clinics, and interactive sessions</p>
                        </Card>
                        <Card title="Participants">
                            <p>SheChampions participants, Network members, invited women-led MSMEs</p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Topics & Schedule */}
            <section className="py-section schedule-section bg-primary text-light">
                <div className="container">
                    <div className="text-center mb-4">
                        <h2 className="section-title text-light">Topics & Schedule</h2>
                    </div>
                    <div className="table-responsive">
                        <table className="schedule-table">
                            <thead>
                                <tr>
                                    <th>Month</th>
                                    <th>Seminar / Masterclass Topic</th>
                                    <th>Key Focus Areas</th>
                                    <th>Target Outcomes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scheduleData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="font-medium text-secondary">{row.month}</td>
                                        <td>{row.topic}</td>
                                        <td>{row.focus}</td>
                                        <td>{row.outcome}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Masterclass Deep-Dive Sessions */}
            <section className="py-section masterclass-section">
                <div className="container">
                    <div className="text-center mb-4">
                        <h2 className="section-title">Masterclass Deep-Dive Sessions (Quarterly)</h2>
                        <p className="section-subtitle">In addition to monthly seminars, high-level masterclasses will be organised quarterly:</p>
                    </div>
                    <div className="masterclass-grid">
                        {masterclasses.map((mc, idx) => (
                            <div key={idx} className="mc-card">
                                <span className="mc-q text-dark">{mc.q}</span>
                                <h3 className="mc-title">{mc.title}</h3>
                                <p><strong>Focus:</strong> {mc.focus}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Expected Outputs */}
            <section className="py-section outputs-section bg-secondary">
                <div className="container">
                    <h2 className="section-title text-center mb-4">Expected Outputs</h2>
                    <div className="outputs-content">
                        <ul className="outputs-list">
                            <li>Market-ready women-led enterprises</li>
                            <li>Improved sales and buyer engagement</li>
                            <li>Export-ready products and services</li>
                            <li>Stronger negotiation and deal-making capacity</li>
                            <li>Increased participation in expos, trade fairs, and B2B platforms</li>
                        </ul>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default Seminars;

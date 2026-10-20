import Hero from '../components/Hero';
import Card from '../components/Card';
import { Target, Trophy, TrendingUp, Users, Globe } from 'lucide-react';
import './Programs.css';

const Programs = () => {
    const scheduleData = [
        { period: 'January - February', focus: 'Competition Mapping & Readiness', named: 'Tony Elumelu Foundation; She Leads Africa Accelerator Pitch', support: 'Competition orientation; eligibility screening; business diagnostics', outcome: 'Shortlisted SheChampions candidates' },
        { period: 'March', focus: 'Africa-Wide Early-Stage Competitions', named: 'Anzisha Prize; Pitch AgriHack', support: 'Application clinics; storytelling & impact framing', outcome: 'Competitive Africa-focused applications' },
        { period: 'April', focus: 'Pan-African Flagship Competitions', named: "Africa's Business Heroes; AWIEF Awards", support: 'Pitch deck refinement; mock pitching; ambassador mentoring', outcome: 'Pan-African visibility' },
        { period: 'May', focus: 'Sector & Impact-Focused Competitions', named: 'Orange Social Venture; SheTrades Global', support: 'Compliance checks; export readiness support', outcome: 'Market & trade exposure' },
        { period: 'June - July', focus: 'Global Student & Youth Platforms', named: 'Global Student Entrepreneur Awards; Hult Prize', support: 'Advanced pitching; mentorship; application reviews', outcome: 'Global youth-stage participation' },
        { period: 'August', focus: 'Global Women-Focused Competitions', named: "Cartier Women's Initiative; WeXchange", support: 'Executive summaries; leadership storytelling; ambassador endorsements', outcome: 'High-level global submissions' },
        { period: 'September', focus: 'Innovation & Tech Platforms', named: 'MIT Solve; Hello Tomorrow Global Challenge', support: 'Innovation framing; technical validation; pitch rehearsals', outcome: 'Global innovation exposure' },
        { period: 'October', focus: 'Global Pitch & Visibility Platforms', named: 'Seedstars World; Startup World Cup', support: 'Pitch coaching; investor readiness; AICL Expo showcase', outcome: 'Investor interest & partnerships' },
        { period: 'November', focus: 'Learning, Scaling & Deal Follow-Up', named: 'Multiple competitions', support: 'Post-competition reviews; investor follow-ups; deal structuring', outcome: 'Improved growth strategies' },
        { period: 'December', focus: 'Recognition & Knowledge Sharing', named: 'All competitions', support: 'Recognition at SheChampions Awards Night; peer learning', outcome: 'Motivation & ecosystem learning' }
    ];

    return (
        <div className="programs-page animate-fade-in">
            <Hero
                title="Core Programme Components"
                subtitle="Identifying innovative, scalable businesses and providing international exposure."
                bgImage="/assets/programs_hero.webp"
                secondary={true}
            />

            <section className="py-section competition-section">
                <div className="container">
                    <div className="text-center mb-4">
                        <h2 className="section-title">Business Plan Competition</h2>
                    </div>
                    <div className="competition-content">
                        <p className="section-lead text-center">
                            The SheChampions Business Plan Competition identifies innovative and scalable
                            women-led businesses and supports them through training, mentorship, and access
                            to finance. Selected participants are further supported to participate in African
                            and global business plan competitions to enhance visibility and benchmark their solutions.
                        </p>
                    </div>
                </div>
            </section>

            <section className="py-section exposure-section bg-secondary">
                <div className="container">
                    <div className="text-center mb-4">
                        <h2 className="section-title">International & Africa-Based Exposure</h2>
                    </div>

                    <div className="exposure-grid">
                        <Card title="Overview" icon={Globe}>
                            <p>
                                Selected participants will be strategically exposed and supported to participate
                                in reputable African and international business plan competitions. This expands
                                global outlook, competitiveness, visibility, and access to funding and markets.
                            </p>
                        </Card>

                        <Card title="Objectives" icon={Target}>
                            <ul className="custom-list">
                                <li>Expose women entrepreneurs to global best practices.</li>
                                <li>Increase participation in African and international competitions.</li>
                                <li>Enhance visibility of Nigerian women entrepreneurs on global platforms.</li>
                                <li>Facilitate access to international grants, accelerators, investors.</li>
                                <li>Strengthen business plans through global feedback.</li>
                            </ul>
                        </Card>

                        <Card title="Eligible Participants" icon={Users}>
                            <ul className="custom-list">
                                <li>Top-performing participants from SheChampions Competition.</li>
                                <li>High-potential members of the SheChampions Women Network.</li>
                                <li>Women-led startups with scalable, innovation-driven business models.</li>
                            </ul>
                        </Card>

                        <Card title="Support Provided" icon={Trophy}>
                            <ul className="custom-list">
                                <li>Guidance on identifying suitable competitions.</li>
                                <li>Support with application processes and documentation.</li>
                                <li>Pitch deck and executive summary refinement.</li>
                                <li>Mock pitching and feedback sessions.</li>
                                <li>Recommendation letters and institutional endorsements.</li>
                            </ul>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Participation Schedule Table */}
            <section className="py-section schedule-table-section bg-primary text-light">
                <div className="container">
                    <div className="text-center mb-4">
                        <h2 className="section-title text-light">Annual Competition Preparation & Participation Schedule</h2>
                    </div>
                    <div className="table-responsive">
                        <table className="schedule-table">
                            <thead>
                                <tr>
                                    <th>Period</th>
                                    <th>Competition Focus</th>
                                    <th>Named Competitions</th>
                                    <th>Key Support Activities</th>
                                    <th>Expected Outcomes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scheduleData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="font-medium text-secondary">{row.period}</td>
                                        <td>{row.focus}</td>
                                        <td>{row.named}</td>
                                        <td>{row.support}</td>
                                        <td>{row.outcome}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="strategic-how mt-4 bg-primary-light p-4 rounded-lg border border-opacity-20 glass-dark">
                        <h3 className="text-secondary mb-3">How This Schedule Works Strategically</h3>
                        <ul className="custom-list list-light">
                            <li>Early months focus on African and early-stage competitions</li>
                            <li>Mid-year targets pan-African and sector-specific platforms</li>
                            <li>Late year prioritises elite global competitions and investor exposure</li>
                            <li>Learning is recycled into mentoring, Expo showcases, and Awards Night</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Roles & KPIs */}
            <section className="py-section roles-kpi-section">
                <div className="container">
                    <div className="roles-kpi-grid">
                        <div className="role-card glass">
                            <h3 className="text-primary mb-3">Role of SheChampions Ambassadors</h3>
                            <ul className="custom-list">
                                <li>Support application reviews and storytelling</li>
                                <li>Participate in mock pitch sessions</li>
                                <li>Provide endorsements and recommendation letters</li>
                                <li>Represent SheChampions at selected international platforms</li>
                                <li>Mentor women returning from competitions to share learnings</li>
                            </ul>
                        </div>
                        <div className="kpi-card glass">
                            <h3 className="text-primary mb-3">Key Performance Indicators</h3>
                            <ul className="custom-list">
                                <li>Number of women supported to apply internationally</li>
                                <li>Number of African vs global competitions entered</li>
                                <li>Number of women shortlisted / selected</li>
                                <li>Grants, prizes, or investments secured</li>
                                <li>Partnerships or market opportunities generated</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Programs;

import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import PageMeta from '../components/PageMeta';
import ChallengePromo from '../components/ChallengePromo';
import Reveal from '../components/Reveal';
import './Programs.css';

const scheduleData = [
    { period: 'January – February', focus: 'Competition Mapping & Readiness', named: 'Tony Elumelu Foundation; She Leads Africa Accelerator Pitch', support: 'Competition orientation; eligibility screening; business diagnostics', outcome: 'Shortlisted SheChampions candidates' },
    { period: 'March', focus: 'Africa-Wide Early-Stage Competitions', named: 'Anzisha Prize; Pitch AgriHack', support: 'Application clinics; storytelling & impact framing', outcome: 'Competitive Africa-focused applications' },
    { period: 'April', focus: 'Pan-African Flagship Competitions', named: "Africa's Business Heroes; AWIEF Awards", support: 'Pitch deck refinement; mock pitching; ambassador mentoring', outcome: 'Pan-African visibility' },
    { period: 'May', focus: 'Sector & Impact-Focused Competitions', named: 'Orange Social Venture; SheTrades Global', support: 'Compliance checks; export readiness support', outcome: 'Market & trade exposure' },
    { period: 'June – July', focus: 'Global Student & Youth Platforms', named: 'Global Student Entrepreneur Awards; Hult Prize', support: 'Advanced pitching; mentorship; application reviews', outcome: 'Global youth-stage participation' },
    { period: 'August', focus: 'Global Women-Focused Competitions', named: "Cartier Women's Initiative; WeXchange", support: 'Executive summaries; leadership storytelling; ambassador endorsements', outcome: 'High-level global submissions' },
    { period: 'September', focus: 'Innovation & Tech Platforms', named: 'MIT Solve; Hello Tomorrow Global Challenge', support: 'Innovation framing; technical validation; pitch rehearsals', outcome: 'Global innovation exposure' },
    { period: 'October', focus: 'Global Pitch & Visibility Platforms', named: 'Seedstars World; Startup World Cup', support: 'Pitch coaching; investor readiness; AICL Expo showcase', outcome: 'Investor interest & partnerships' },
    { period: 'November', focus: 'Learning, Scaling & Deal Follow-Up', named: 'Multiple competitions', support: 'Post-competition reviews; investor follow-ups; deal structuring', outcome: 'Improved growth strategies' },
    { period: 'December', focus: 'Recognition & Knowledge Sharing', named: 'All competitions', support: 'Recognition at SheChampions Awards Night; peer learning', outcome: 'Motivation & ecosystem learning' },
];

const exposureBlocks = [
    {
        title: 'Overview',
        body: 'Selected participants will be strategically exposed and supported to participate in reputable African and international business plan competitions. This expands global outlook, competitiveness, visibility, and access to funding and markets.',
    },
    {
        title: 'Objectives',
        items: [
            'Expose women entrepreneurs to global best practices.',
            'Increase participation in African and international competitions.',
            'Enhance visibility of Nigerian women entrepreneurs on global platforms.',
            'Facilitate access to international grants, accelerators, investors.',
            'Strengthen business plans through global feedback.',
        ],
    },
    {
        title: 'Eligible participants',
        items: [
            'Top-performing participants from SheChampions Competition.',
            'High-potential members of the SheChampions Women Network.',
            'Women-led startups with scalable, innovation-driven business models.',
        ],
    },
    {
        title: 'Support provided',
        items: [
            'Guidance on identifying suitable competitions.',
            'Support with application processes and documentation.',
            'Pitch deck and executive summary refinement.',
            'Mock pitching and feedback sessions.',
            'Recommendation letters and institutional endorsements.',
        ],
    },
];

const strategicNotes = [
    'Early months focus on African and early-stage competitions',
    'Mid-year targets pan-African and sector-specific platforms',
    'Late year prioritises elite global competitions and investor exposure',
    'Learning is recycled into mentoring, Expo showcases, and Awards Night',
];

const ambassadorRoles = [
    'Support application reviews and storytelling',
    'Participate in mock pitch sessions',
    'Provide endorsements and recommendation letters',
    'Represent SheChampions at selected international platforms',
    'Mentor women returning from competitions to share learnings',
];

const kpis = [
    'Number of women supported to apply internationally',
    'Number of African vs global competitions entered',
    'Number of women shortlisted / selected',
    'Grants, prizes, or investments secured',
    'Partnerships or market opportunities generated',
];

const Programs = () => {
    return (
        <div className="programs-page page-shell animate-fade-in">
            <PageMeta
                title="Programmes"
                description="Core SHE CHAMPIONS programme components: business plan competition support, international exposure pathways, and annual preparation schedules."
            />

            <Hero
                title="Core Programme Components"
                subtitle="Identifying innovative, scalable businesses and providing international exposure."
                bgImage="/assets/programs_hero.webp"
                secondary={true}
            />

            <Reveal>
                <ChallengePromo />
            </Reveal>

            <Reveal as="section" className="py-section" aria-labelledby="competition-heading">
                <div className="container programs-intro">
                    <p className="section-eyebrow">Flagship competition</p>
                    <h2 className="section-title" id="competition-heading">
                        Business Plan Competition
                    </h2>
                    <p className="section-lead">
                        The SheChampions Business Plan Competition identifies innovative and scalable women-led
                        businesses and supports them through training, mentorship, and access to finance. Selected
                        participants are further supported to participate in African and global business plan
                        competitions to enhance visibility and benchmark their solutions.
                    </p>
                    <Link to="/challenge" className="btn btn-outline-primary">
                        About the Challenge
                    </Link>
                </div>
            </Reveal>

            <Reveal as="section" className="py-section band-muted" aria-labelledby="exposure-heading">
                <div className="container">
                    <div className="section-header">
                        <p className="section-eyebrow">Exposure pathway</p>
                        <h2 className="section-title" id="exposure-heading">
                            International & Africa-based exposure
                        </h2>
                    </div>
                    <div className="programs-blocks">
                        {exposureBlocks.map((block) => (
                            <article key={block.title} className="programs-block">
                                <h3>{block.title}</h3>
                                {block.body && <p>{block.body}</p>}
                                {block.items && (
                                    <ul className="checklist">
                                        {block.items.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                )}
                            </article>
                        ))}
                    </div>
                </div>
            </Reveal>

            <Reveal as="section" className="py-section band-navy" aria-labelledby="schedule-heading">
                <div className="container">
                    <div className="section-header centered">
                        <p className="section-eyebrow">Annual calendar</p>
                        <h2 className="section-title" id="schedule-heading">
                            Competition preparation & participation schedule
                        </h2>
                        <p className="section-lead mx-auto">
                            Named competitions are examples of platforms participants may be prepared for; inclusion
                            does not imply sponsorship or guaranteed placement.
                        </p>
                    </div>
                    <div className="data-table-wrap">
                        <table className="data-table">
                            <caption className="visually-hidden">
                                Annual competition preparation and participation schedule by period
                            </caption>
                            <thead>
                                <tr>
                                    <th scope="col">Period</th>
                                    <th scope="col">Focus</th>
                                    <th scope="col">Named competitions</th>
                                    <th scope="col">Key support</th>
                                    <th scope="col">Expected outcomes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scheduleData.map((row) => (
                                    <tr key={row.period}>
                                        <td className="col-period">{row.period}</td>
                                        <td>{row.focus}</td>
                                        <td>{row.named}</td>
                                        <td>{row.support}</td>
                                        <td>{row.outcome}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="programs-strategy">
                        <h3>How this schedule works strategically</h3>
                        <ul className="checklist checklist-on-dark">
                            {strategicNotes.map((note) => (
                                <li key={note}>{note}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Reveal>

            <Reveal as="section" className="py-section" aria-labelledby="roles-heading">
                <div className="container">
                    <div className="section-header">
                        <p className="section-eyebrow">Delivery & measurement</p>
                        <h2 className="section-title" id="roles-heading">
                            Ambassador roles and indicators
                        </h2>
                    </div>
                    <div className="programs-two-col">
                        <article>
                            <h3>Role of SheChampions Ambassadors</h3>
                            <ul className="checklist">
                                {ambassadorRoles.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </article>
                        <article>
                            <h3>Key performance indicators</h3>
                            <ul className="checklist">
                                {kpis.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </article>
                    </div>
                    <div className="home-inline-actions" style={{ marginTop: '2rem' }}>
                        <Link to="/network" className="btn btn-primary">
                            Explore the Network
                        </Link>
                        <Link to="/seminars" className="btn btn-outline-primary">
                            View seminars
                        </Link>
                    </div>
                </div>
            </Reveal>
        </div>
    );
};

export default Programs;

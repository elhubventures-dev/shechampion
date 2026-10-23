import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import PageMeta from '../components/PageMeta';
import ChallengePromo from '../components/ChallengePromo';
import Reveal from '../components/Reveal';
import './Challenge.css';

const objectives = [
    { id: '01', text: 'Identify innovative and scalable women-led business ideas and early-stage enterprises.' },
    { id: '02', text: "Strengthen participants' business planning, leadership, and investment readiness." },
    { id: '03', text: 'Provide structured access-to-market support through trainings, seminars, and masterclasses.' },
    { id: '04', text: 'Facilitate access to finance through grants, loans, venture capital, and impact investment linkages.' },
    { id: '05', text: 'Connect women entrepreneurs to high-level mentors, ambassadors, and role models.' },
    { id: '06', text: 'Support participation in regional and international business competitions and platforms.' },
    { id: '07', text: 'Establish a strong SheChampions Women Network that sustains learning, deal flow, and brand growth.' },
    { id: '08', text: 'Integrate a focused girl-child sensitization, health, and safety initiative promoting education, protection, and empowerment.' },
];

const barriers = [
    'Limited access to finance and credit',
    'Weak market and buyer linkages',
    'Low exposure to investors and structured funding platforms',
    'Inadequate access to high-level mentorship and networks',
    'Absence of long-term enterprise ecosystems that extend beyond one-off programmes',
];

const Challenge = () => {
    return (
        <div className="challenge-page page-shell animate-fade-in">
            <PageMeta
                title="The SheChampions Challenge"
                description="A national business plan competition and ecosystem support platform designed to identify, prepare, and elevate women entrepreneurs."
            />

            <Hero
                title="The SheChampions Challenge"
                subtitle="A national business plan competition and ecosystem support platform designed to identify, prepare, and elevate women entrepreneurs."
                bgImage="/assets/challenge_hero.webp"
                secondary={true}
            />

            <Reveal>
                <ChallengePromo />
            </Reveal>

            <Reveal as="section" className="py-section" aria-labelledby="rationale-heading">
                <div className="container">
                    <div className="split-layout">
                        <div className="prose-block">
                            <p className="section-eyebrow">Strategic rationale</p>
                            <h2 className="section-title" id="rationale-heading">
                                Why this platform exists
                            </h2>
                            <p>
                                Despite women&apos;s increasing participation in entrepreneurship, many women-led
                                enterprises remain excluded from formal investment and market ecosystems due to:
                            </p>
                            <ul className="checklist">
                                {barriers.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                        <aside className="callout-panel">
                            <h3>Our goal</h3>
                            <p>
                                To identify, prepare, and elevate women entrepreneurs through a structured business
                                plan competition and enterprise development platform.
                            </p>
                        </aside>
                    </div>
                </div>
            </Reveal>

            <Reveal as="section" className="py-section band-muted" aria-labelledby="objectives-heading">
                <div className="container">
                    <div className="section-header centered">
                        <p className="section-eyebrow">Programme objectives</p>
                        <h2 className="section-title" id="objectives-heading">
                            What the Challenge aims to accomplish
                        </h2>
                    </div>
                    <ol className="objectives-list">
                        {objectives.map((obj) => (
                            <li key={obj.id}>
                                <span className="objectives-list__num" aria-hidden="true">
                                    {obj.id}
                                </span>
                                <p>{obj.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </Reveal>

            <Reveal as="section" className="py-section" aria-labelledby="beneficiaries-heading">
                <div className="container beneficiaries-panel">
                    <p className="section-eyebrow">Who it serves</p>
                    <h2 className="section-title" id="beneficiaries-heading">
                        Target beneficiaries
                    </h2>
                    <p className="section-lead">
                        The programme targets young female entrepreneurs aged 18–50, female students and graduates,
                        early-stage women entrepreneurs, and women with innovative business ideas across priority
                        sectors.
                    </p>
                    <div className="cta-actions" style={{ justifyContent: 'flex-start' }}>
                        <Link to="/programs" className="btn btn-primary">
                            Explore programmes
                        </Link>
                        <Link to="/contact" className="btn btn-outline-primary">
                            Contact us
                        </Link>
                    </div>
                </div>
            </Reveal>
        </div>
    );
};

export default Challenge;

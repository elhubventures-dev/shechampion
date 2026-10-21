import { Link } from 'react-router-dom';
import { ArrowRight, Target, TrendingUp, Globe, Users, BookOpen, UserCheck } from 'lucide-react';
import Hero from '../components/Hero';
import PageMeta from '../components/PageMeta';
import ChallengePromo from '../components/ChallengePromo';
import { EVENT_2026 } from '../lib/event2026';
import './Home.css';

const pathways = [
    {
        index: '01',
        title: 'The SheChampions Challenge',
        description:
            'A national business plan competition and ecosystem support platform for women entrepreneurs.',
        to: '/challenge',
    },
    {
        index: '02',
        title: 'Core Programmes',
        description:
            'Competition preparation, mentorship, and structured pathways to African and global platforms.',
        to: '/programs',
    },
    {
        index: '03',
        title: 'Access-to-Market Seminars',
        description:
            'Monthly seminars and quarterly masterclasses focused on markets, compliance, and growth.',
        to: '/seminars',
    },
    {
        index: '04',
        title: 'Women Network',
        description:
            'A platform for mentorship, advocacy, partnerships, and long-term enterprise support.',
        to: '/network',
    },
];

const pillars = [
    {
        icon: Target,
        title: 'Business Plan Competition',
        description:
            'National competition identifying innovative women-led businesses across priority sectors.',
    },
    {
        icon: TrendingUp,
        title: 'Enterprise Development',
        description:
            'Continuous capacity building, structural access-to-market support, and high-level mentorship.',
    },
    {
        icon: Globe,
        title: 'Global Exposure',
        description:
            'International competition participation, strengthening global outlook, competitiveness, and visibility.',
    },
    {
        icon: Users,
        title: 'Sustainable Network',
        description:
            'Long-term women-led enterprise ecosystem for learning, deal flow, and brand growth.',
    },
];

const commitments = [
    'Personalized Growth Pathways',
    'Strategic Resource Mobilization',
    'Advocacy for Inclusive Policies',
];

const Home = () => {
    return (
        <div className="home-page page-shell animate-fade-in">
            <PageMeta
                title="Elevating Women Entrepreneurs"
                description="SHE CHAMPIONS is a Women-Led Entrepreneurship, Market Access & Investment Platform. We identify, prepare, and position high-potential women-led businesses for long-term growth."
            />

            <Hero
                title="Elevating Women Entrepreneurs"
                subtitle="A Women-Led Entrepreneurship, Market Access & Investment Platform. We identify, prepare, and position high-potential women-led businesses for long-term growth."
                bgImage="/assets/home_hero.webp"
            >
                <Link to={EVENT_2026.path} className="btn btn-light">
                    Join Challenge 2026
                </Link>
                <Link to="/programs" className="btn btn-outline-primary hero-btn-ghost">
                    Explore Programmes
                </Link>
            </Hero>

            <ChallengePromo variant="featured" />

            <section className="py-section" aria-labelledby="intro-heading">
                <div className="container">
                    <div className="split-layout">
                        <div>
                            <p className="section-eyebrow">Who we are</p>
                            <h2 className="section-title" id="intro-heading">
                                Why SHE CHAMPIONS?
                            </h2>
                            <div className="prose-block">
                                <p>
                                    Women entrepreneurs contribute significantly to economic growth, innovation,
                                    and job creation. However, structural barriers such as limited access to
                                    finance, weak market linkages, and low investor visibility continue to
                                    constrain the growth of women-led enterprises.
                                </p>
                                <p>
                                    The SheChampions Network responds to these gaps through a structured,
                                    inclusive, and partnership-driven approach.
                                </p>
                            </div>
                            <div className="home-inline-actions">
                                <Link to="/challenge" className="btn btn-primary">
                                    Our strategy <ArrowRight size={18} aria-hidden="true" />
                                </Link>
                            </div>
                        </div>
                        <aside className="callout-panel" aria-labelledby="commitment-heading">
                            <h3 id="commitment-heading">Our commitment</h3>
                            <p>
                                At SheChampion, we do not just provide resources; we walk the journey with you.
                                We are committed to fostering an ecosystem where African women-led businesses are
                                not just participants but leaders in the global market.
                            </p>
                            <ul className="commitment-list">
                                {commitments.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </aside>
                    </div>
                </div>
            </section>

            <section className="py-section band-muted" aria-labelledby="pathways-heading">
                <div className="container">
                    <div className="section-header">
                        <p className="section-eyebrow">How we work</p>
                        <h2 className="section-title" id="pathways-heading">
                            Programmes and platforms
                        </h2>
                        <p className="section-lead">
                            Explore the core pathways through which SHE CHAMPIONS prepares and positions
                            women-led enterprises.
                        </p>
                    </div>
                    <div className="pathway-list">
                        {pathways.map((item) => (
                            <Link key={item.to} to={item.to} className="pathway-item">
                                <span className="pathway-index" aria-hidden="true">
                                    {item.index}
                                </span>
                                <span className="pathway-copy">
                                    <h3>{item.title}</h3>
                                    <p>{item.description}</p>
                                </span>
                                <ArrowRight className="pathway-arrow" size={20} aria-hidden="true" />
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-section" aria-labelledby="challenge-overview-heading">
                <div className="container">
                    <div className="section-header centered">
                        <p className="section-eyebrow">The Challenge</p>
                        <h2 className="section-title" id="challenge-overview-heading">
                            Overview of the SheChampions Challenge
                        </h2>
                        <p className="section-lead mx-auto">
                            A comprehensive platform combining competition with continuous support.
                        </p>
                    </div>
                    <div className="pillars-editorial">
                        {pillars.map((pillar) => {
                            const PillarIcon = pillar.icon;
                            return (
                                <article key={pillar.title} className="pillar-item">
                                    <div className="pillar-icon" aria-hidden="true">
                                        <PillarIcon size={22} />
                                    </div>
                                    <h3>{pillar.title}</h3>
                                    <p>{pillar.description}</p>
                                </article>
                            );
                        })}
                    </div>
                    <div className="home-center-action">
                        <Link to="/challenge" className="btn btn-primary">
                            Learn about the Challenge
                        </Link>
                    </div>
                </div>
            </section>

            <section className="py-section band-warm" aria-labelledby="seminars-heading">
                <div className="container home-feature-row">
                    <div>
                        <p className="section-eyebrow">Capacity building</p>
                        <h2 className="section-title" id="seminars-heading">
                            Access-to-Market Seminars
                        </h2>
                        <p className="section-lead">
                            We equip you with practical knowledge, tools, and networks required to access
                            local, regional, and international markets. Join our masterclasses and interactive
                            sessions.
                        </p>
                        <Link to="/seminars" className="btn btn-outline-primary">
                            View schedule & topics <ArrowRight size={18} aria-hidden="true" />
                        </Link>
                    </div>
                    <div className="home-feature-aside" aria-hidden="true">
                        <BookOpen size={40} />
                    </div>
                </div>
            </section>

            <section className="py-section" aria-labelledby="services-heading">
                <div className="container">
                    <div className="section-header centered">
                        <p className="section-eyebrow">Market readiness</p>
                        <h2 className="section-title" id="services-heading">
                            Market Ready Services
                        </h2>
                    </div>
                    <div className="services-editorial">
                        <article>
                            <Globe size={28} aria-hidden="true" />
                            <h3>Global Reach</h3>
                            <p>Expanding your footprint beyond local borders to international arenas.</p>
                        </article>
                        <article>
                            <TrendingUp size={28} aria-hidden="true" />
                            <h3>Market Analytics</h3>
                            <p>Data-driven insights to help you position your products effectively.</p>
                        </article>
                        <article>
                            <Users size={28} aria-hidden="true" />
                            <h3>B2B Connections</h3>
                            <p>Structured linkages to corporate partners and high-growth distributors.</p>
                        </article>
                    </div>
                </div>
            </section>

            <section className="py-section band-muted" aria-labelledby="network-heading">
                <div className="container home-feature-row">
                    <div className="home-feature-aside" aria-hidden="true">
                        <UserCheck size={40} />
                    </div>
                    <div>
                        <p className="section-eyebrow">Community</p>
                        <h2 className="section-title" id="network-heading">
                            The Ambassadors Network
                        </h2>
                        <p className="section-lead">
                            A pan-African community combining peer-learning with structural market links,
                            policy advocacy, and deal-making. Learn how the network is structured and the roles
                            ambassadors are intended to play.
                        </p>
                        <Link to="/network" className="btn btn-primary">
                            Explore the Network <ArrowRight size={18} aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </section>

            <section className="cta-band" aria-labelledby="home-cta-heading">
                <div className="container">
                    <h2 id="home-cta-heading">Ready for Challenge 2026?</h2>
                    <p>
                        Join the Business Empowerment Challenge in Abuja on {EVENT_2026.dateDisplay}.
                        Participate for {EVENT_2026.feeDisplay} and compete for business grants.
                    </p>
                    <div className="cta-actions">
                        <Link to={EVENT_2026.path} className="btn btn-light">
                            Join Challenge 2026
                        </Link>
                        <Link to="/contact" className="btn btn-outline-primary hero-btn-ghost">
                            Get in touch
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;

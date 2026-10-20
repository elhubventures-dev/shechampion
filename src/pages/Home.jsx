import { Link } from 'react-router-dom';
import { Target, TrendingUp, Globe, Users, ArrowRight, BookOpen, UserCheck } from 'lucide-react';
import Hero from '../components/Hero';
import Card from '../components/Card';
import AdUnit from '../components/AdUnit';
import './Home.css';

const Home = () => {
    return (
        <div className="home-page animate-fade-in">
            <Hero
                title="Elevating Women Entrepreneurs"
                subtitle="A Women-Led Entrepreneurship, Market Access & Investment Platform. We identify, prepare, and position high-potential women-led businesses for long-term growth."
                bgImage="/assets/home_hero.webp"
            >
                <Link to="/challenge" className="btn btn-primary">
                    Discover The Challenge
                </Link>
                <Link to="/programs" className="btn btn-light">
                    Our Programs
                </Link>
            </Hero>

            {/* Combined Intro & Commitment Section */}
            <section className="py-section combined-intro-section">
                <div className="container">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Why SheChampion Card */}
                        <div className="info-card">
                            <h2 className="section-title text-left">Why SheChampion?</h2>
                            <p className="text-content">
                                Women entrepreneurs contribute significantly to economic growth, innovation, and job creation.
                                However, structural barriers such as limited access to finance, weak market linkages, and low
                                investor visibility continue to constrain the growth of women-led enterprises.
                            </p>
                            <p className="text-content">
                                The SheChampions Network responds to these gaps through a structured, inclusive, and partnership-driven approach.
                            </p>
                            <div className="mt-6">
                                <Link to="/challenge" className="btn btn-outline-primary">
                                    Our Strategy <ArrowRight size={20} className="ml-2 inline" />
                                </Link>
                            </div>
                        </div>

                        {/* Our Commitment Card */}
                        <div className="info-card commitment-card">
                            <h2 className="section-title text-left">Our Commitment</h2>
                            <p className="text-content">
                                At SheChampion, we don't just provide resources; we walk the journey with you. We are committed to fostering an ecosystem where African women-led businesses are not just participants but leaders in the global market.
                            </p>
                            <ul className="feature-list mt-4">
                                <li><TrendingUp size={18} className="text-primary mr-2" /> Personalized Growth Pathways</li>
                                <li><Users size={18} className="text-primary mr-2" /> Strategic Resource Mobilization</li>
                                <li><Globe size={18} className="text-primary mr-2" /> Advocacy for Inclusive Policies</li>
                            </ul>
                            <div className="mt-6">
                                <Link to="/programs" className="btn btn-primary">
                                    Our Programs
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Ad Unit - Between Intro and Pillars */}
            <div className="ad-between-sections">
                <AdUnit format="horizontal" />
            </div>

            {/* Pillars Section */}
            <section className="py-section pillars-section bg-light">
                <div className="container">
                    <div className="text-center mb-4">
                        <h2 className="section-title">Overview of the SheChampions Challenge</h2>
                        <p className="section-subtitle">A comprehensive platform combining competition with continuous support.</p>
                    </div>

                    <div className="pillars-grid">
                        <Card
                            icon={Target}
                            title="Business Plan Competition"
                            description="National competition identifying innovative women-led businesses across priority sectors."
                        />
                        <Card
                            icon={TrendingUp}
                            title="Enterprise Development"
                            description="Continuous capacity building, structural access-to-market support, and high-level mentorship."
                        />
                        <Card
                            icon={Globe}
                            title="Global Exposure"
                            description="International competition participation, strengthening global outlook, competitiveness, and visibility."
                        />
                        <Card
                            icon={Users}
                            title="Sustainable Network"
                            description="Long-term women-led enterprise ecosystem for learning, deal flow, and brand growth."
                        />
                    </div>
                    <div className="text-center mt-12">
                        <Link to="/challenge" className="btn btn-primary">
                            Participate In The Challenge
                        </Link>
                    </div>
                </div>
            </section>

            {/* Ad Unit - Between Pillars and Seminars */}
            <div className="ad-between-sections">
                <AdUnit format="in-article" />
            </div>

            {/* Seminars Info */}
            <section className="py-section bg-secondary text-center">
                <div className="container max-w-4xl mx-auto">
                    <BookOpen size={48} className="mx-auto text-primary mb-4" />
                    <h2 className="section-title">Access-to-Market Seminars</h2>
                    <p className="section-lead mb-6">
                        We equip you with practical knowledge, tools, and networks required to access local, regional, and international markets. Join our masterclasses and interactive sessions.
                    </p>
                    <Link to="/seminars" className="btn btn-primary mt-4">
                        View Schedule & Topics <ArrowRight size={20} className="ml-2 inline" />
                    </Link>
                </div>
            </section>

            {/* Market Ready Services */}
            <section className="py-section market-services bg-white">
                <div className="container">
                    <h2 className="section-title text-center">Market Ready Services</h2>
                    <div className="services-grid mt-12">
                        <div className="service-item card">
                            <Globe size={40} className="text-primary mb-4" />
                            <h3>Global Reach</h3>
                            <p>Expanding your footprint beyond local borders to international arenas.</p>
                        </div>
                        <div className="service-item card">
                            <TrendingUp size={40} className="text-primary mb-4" />
                            <h3>Market Analytics</h3>
                            <p>Data-driven insights to help you position your products effectively.</p>
                        </div>
                        <div className="service-item card">
                            <Users size={40} className="text-primary mb-4" />
                            <h3>B2B Connections</h3>
                            <p>Structured linkages to corporate partners and high-growth distributors.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Network Info */}
            <section className="py-section">
                <div className="container text-center max-w-4xl mx-auto">
                    <UserCheck size={48} className="mx-auto text-primary mb-4" />
                    <h2 className="section-title">The Ambassadors Network</h2>
                    <p className="section-lead mb-6">
                        A robust, pan-African community combining peer-learning with structural market links, policy advocacy, and deal-making. Let our Ambassadors open new doors for your business.
                    </p>
                    <Link to="/network" className="btn btn-primary mt-4">
                        Meet the Ambassadors <ArrowRight size={20} className="ml-2 inline" />
                    </Link>
                </div>
            </section>

            {/* Ad Unit - Before CTA */}
            <div className="ad-between-sections">
                <AdUnit format="horizontal" />
            </div>

            {/* CTA Section */}
            <section className="py-section cta-section bg-primary text-center text-light">
                <div className="container">
                    <h2 className="text-white mb-4">Ready to Take the Next Step?</h2>
                    <p className="text-light mb-6">Join a collaborative ecosystem of mentors, investors, and fellow entrepreneurs.</p>
                    <Link to="/contact" className="btn btn-light mt-4 cta-btn">
                        Get in Touch <ArrowRight size={20} className="ml-2" />
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default Home;

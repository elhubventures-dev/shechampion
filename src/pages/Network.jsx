import Hero from '../components/Hero';
import Card from '../components/Card';
import './Network.css';

const Network = () => {
    const ambassadorsList1 = [
        { name: 'Ngozi Okonjo-Iweala', role: 'Global economic leader and policy icon' },
        { name: 'Amina J. Mohammed', role: 'International development and SDG champion' },
        { name: 'Obiageli Ezekwesili', role: 'Governance, leadership, and advocacy leader' },
        { name: 'Ibukun Awosika', role: 'Corporate governance and entrepreneurship mentor' },
        { name: 'Mo Abudu', role: 'Creative economy and global brand builder' },
        { name: 'Aisha Maina', role: 'Women-focused enterprise development leader' },
        { name: 'Tara Fela-Durotoye', role: 'SME growth and women-led enterprise icon' },
        { name: 'Ndidi Okonkwo Nwuneli', role: 'Agribusiness, nutrition, and impact investing' },
        { name: 'Nike Ogunlesi', role: 'Education, childcare, and women\'s workforce participation' },
        { name: 'Ifunanya Igwe', role: 'STEM, innovation, and digital inclusion' },
        { name: 'Owen Omogiafo', role: 'Investment, infrastructure, and corporate leadership' }
    ];

    const ambassadorsList2 = [
        { name: 'Funke Opeke', role: 'Technology infrastructure and global markets' },
        { name: 'Betty Irabor', role: 'Media, branding, and women leadership advocacy' },
        { name: 'Maryam Uwais', role: 'Social inclusion and institutional reform' },
        { name: 'Zainab Salbi', role: 'Global women advocacy and humanitarian leadership' },
        { name: 'Folorunsho Alakija', role: 'Energy, philanthropy, and enterprise leadership' },
        { name: 'Lola Aworanti', role: 'Trade policy and export development' },
        { name: 'Arunma Oteh', role: 'Finance, capital markets, and governance' },
        { name: 'Sola David-Borha', role: 'Financial inclusion and corporate leadership' },
        { name: 'Hauwa Liman', role: 'Advocacy, social impact, and resilience' },
        { name: 'Peace Hyde', role: 'Youth, innovation, and entrepreneurship development' },
        { name: 'Oluwaseun Ayodeji Osowobi', role: 'Gender rights and advocacy leadership' }
    ];

    return (
        <div className="network-page animate-fade-in">
            <Hero
                title="The SheChampions Women Network"
                subtitle="A robust, pan-African community of women business leaders, ambassadors, and enablers."
                bgImage="/assets/network_hero.webp"
                secondary={true}
            />

            <section className="py-section pt-0">
                <div className="container">
                    <div className="overview-card glass-dark">
                        <h2 className="section-title text-light">Overview</h2>
                        <p className="section-lead text-light mb-0">
                            Unlike a ceremonial programme, the SheChampions Ambassadors Network is structured as an
                            active engagement platform, where ambassadors play hands-on roles in mentoring women
                            entrepreneurs, advocating for the girl child, strengthening partnerships, and
                            amplifying the SheChampions brand locally and internationally.
                        </p>
                    </div>
                </div>
            </section>

            <section className="py-section bg-secondary">
                <div className="container">
                    <div className="text-center mb-4">
                        <h2 className="section-title">Purpose of the Network</h2>
                    </div>
                    <div className="purpose-grid">
                        <Card title="Mentorship & Inspiration">
                            <p>Provide high-level mentorship and inspiration to women entrepreneurs.</p>
                        </Card>
                        <Card title="Visibility & Credibility">
                            <p>Elevate the visibility and credibility of the SheChampions Challenge.</p>
                        </Card>
                        <Card title="Advocacy">
                            <p>Advocate for women's economic empowerment and girl-child protection.</p>
                        </Card>
                        <Card title="Partnerships">
                            <p>Support partnerships with investors, donors, diplomatic missions, and institutions.</p>
                        </Card>
                        <Card title="Trusted Movement">
                            <p>Position SheChampions as a trusted, elite women-led enterprise movement.</p>
                        </Card>
                    </div>
                </div>
            </section>

            <section className="py-section roles-section">
                <div className="container">
                    <div className="text-center mb-4">
                        <h2 className="section-title">Roles & Responsibilities</h2>
                        <p className="max-w-3xl mx-auto text-dark">Ambassadors will play active and visible roles across 5 key pillars.</p>
                    </div>

                    <div className="roles-grid mt-4">
                        <div className="role-box">
                            <h3>Mentorship & Leadership Engagement</h3>
                            <p>Participating in high-level mentoring sessions and masterclasses, providing strategic guidance, and sharing world experiences.</p>
                        </div>
                        <div className="role-box">
                            <h3>Inspiration & Visibility</h3>
                            <p>Delivering keynote addresses, featuring in media and thought leadership content, and serving as role models.</p>
                        </div>
                        <div className="role-box">
                            <h3>Girl Child Advocacy</h3>
                            <p>Supporting and participating in girl-child sensitization and advocacy programs to improve child safety and education.</p>
                        </div>
                        <div className="role-box">
                            <h3>Partnership & Resource Mobilization</h3>
                            <p>Supporting access to investor networks, corporate partners, and facilitating strategic alliances for scaling businesses.</p>
                        </div>
                        <div className="role-box">
                            <h3>Brand Ambassadorship</h3>
                            <p>Representing SheChampions at national and international forums and contributing to positioning the initiative as a premier platform.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-section ambassadors-list-section bg-primary text-light">
                <div className="container">
                    <div className="text-center mb-4">
                        <h2 className="section-title text-light">Proposed Composition</h2>
                        <p className="section-subtitle">Renowned and established women such as:</p>
                    </div>

                    <div className="ambassadors-wrapper">
                        <div className="ambassadors-column">
                            <ol className="ambassadors-list">
                                {ambassadorsList1.map((amb, idx) => (
                                    <li key={idx}>
                                        <strong>{amb.name}</strong> – {amb.role}
                                    </li>
                                ))}
                            </ol>
                        </div>
                        <div className="ambassadors-column">
                            <ol className="ambassadors-list" start={12}>
                                {ambassadorsList2.map((amb, idx) => (
                                    <li key={idx + 11}>
                                        <strong>{amb.name}</strong> – {amb.role}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                    <p className="mt-4 text-center italic-text opacity-70 border-t pt-2">
                        *Note: The Network will be dynamic, with ambassadors joining based on availability, alignment, and sector relevance.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default Network;

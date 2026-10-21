import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import PageMeta from '../components/PageMeta';
import ChallengePromo from '../components/ChallengePromo';
import './Network.css';

const purposes = [
    {
        title: 'Mentorship & Inspiration',
        description: 'Provide high-level mentorship and inspiration to women entrepreneurs.',
    },
    {
        title: 'Visibility & Credibility',
        description: 'Elevate the visibility and credibility of the SheChampions Challenge.',
    },
    {
        title: 'Advocacy',
        description: "Advocate for women's economic empowerment and girl-child protection.",
    },
    {
        title: 'Partnerships',
        description: 'Support partnerships with investors, donors, diplomatic missions, and institutions.',
    },
    {
        title: 'Trusted Movement',
        description: 'Position SheChampions as a trusted, elite women-led enterprise movement.',
    },
];

const roles = [
    {
        title: 'Mentorship & Leadership Engagement',
        description:
            'Participating in high-level mentoring sessions and masterclasses, providing strategic guidance, and sharing world experiences.',
    },
    {
        title: 'Inspiration & Visibility',
        description:
            'Delivering keynote addresses, featuring in media and thought leadership content, and serving as role models.',
    },
    {
        title: 'Girl Child Advocacy',
        description:
            'Supporting and participating in girl-child sensitization and advocacy programs to improve child safety and education.',
    },
    {
        title: 'Partnership & Resource Mobilization',
        description:
            'Supporting access to investor networks, corporate partners, and facilitating strategic alliances for scaling businesses.',
    },
    {
        title: 'Brand Ambassadorship',
        description:
            'Representing SheChampions at national and international forums and contributing to positioning the initiative as a premier platform.',
    },
];

const proposedAmbassadors = [
    { name: 'Ngozi Okonjo-Iweala', role: 'Global economic leader and policy icon' },
    { name: 'Amina J. Mohammed', role: 'International development and SDG champion' },
    { name: 'Obiageli Ezekwesili', role: 'Governance, leadership, and advocacy leader' },
    { name: 'Ibukun Awosika', role: 'Corporate governance and entrepreneurship mentor' },
    { name: 'Mo Abudu', role: 'Creative economy and global brand builder' },
    { name: 'Aisha Maina', role: 'Women-focused enterprise development leader' },
    { name: 'Tara Fela-Durotoye', role: 'SME growth and women-led enterprise icon' },
    { name: 'Ndidi Okonkwo Nwuneli', role: 'Agribusiness, nutrition, and impact investing' },
    { name: 'Nike Ogunlesi', role: "Education, childcare, and women's workforce participation" },
    { name: 'Ifunanya Igwe', role: 'STEM, innovation, and digital inclusion' },
    { name: 'Owen Omogiafo', role: 'Investment, infrastructure, and corporate leadership' },
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
    { name: 'Oluwaseun Ayodeji Osowobi', role: 'Gender rights and advocacy leadership' },
];

const Network = () => {
    return (
        <div className="network-page page-shell animate-fade-in">
            <PageMeta
                title="Women Network"
                description="Learn about the SheChampions Women Network structure, intended ambassador roles, and proposed composition. Confirm active appointments with the organisation."
            />

            <Hero
                title="The SheChampions Women Network"
                subtitle="A pan-African community of women business leaders, ambassadors, and enablers — structured for active engagement, not ceremony alone."
                bgImage="/assets/network_hero.webp"
                secondary={true}
            />

            <ChallengePromo />

            <section className="py-section" aria-labelledby="network-overview-heading">
                <div className="container">
                    <div className="callout-panel network-overview">
                        <p className="section-eyebrow">Overview</p>
                        <h2 className="section-title text-white" id="network-overview-heading">
                            An engagement platform, not a ceremonial list
                        </h2>
                        <p>
                            Unlike a ceremonial programme, the SheChampions Ambassadors Network is structured as an
                            active engagement platform, where ambassadors play hands-on roles in mentoring women
                            entrepreneurs, advocating for the girl child, strengthening partnerships, and amplifying
                            the SheChampions brand locally and internationally.
                        </p>
                    </div>
                </div>
            </section>

            <section className="py-section band-muted" aria-labelledby="purpose-heading">
                <div className="container">
                    <div className="section-header centered">
                        <p className="section-eyebrow">Purpose</p>
                        <h2 className="section-title" id="purpose-heading">
                            Purpose of the Network
                        </h2>
                    </div>
                    <div className="network-purpose-grid">
                        {purposes.map((item) => (
                            <article key={item.title}>
                                <h3>{item.title}</h3>
                                <p>{item.description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-section" aria-labelledby="roles-heading">
                <div className="container">
                    <div className="section-header">
                        <p className="section-eyebrow">Responsibilities</p>
                        <h2 className="section-title" id="roles-heading">
                            Roles & responsibilities
                        </h2>
                        <p className="section-lead">
                            Ambassadors will play active and visible roles across five key pillars.
                        </p>
                    </div>
                    <div className="network-roles">
                        {roles.map((role, index) => (
                            <article key={role.title}>
                                <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                                <div>
                                    <h3>{role.title}</h3>
                                    <p>{role.description}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-section band-navy" aria-labelledby="proposed-heading">
                <div className="container">
                    <div className="section-header centered">
                        <p className="section-eyebrow">Composition</p>
                        <h2 className="section-title" id="proposed-heading">
                            Proposed composition
                        </h2>
                        <p className="section-lead mx-auto">
                            The following names are presented as a proposed composition of renowned and established
                            women. This list does not confirm current appointments.
                        </p>
                    </div>

                    <div className="notice-banner network-notice">
                        Proposed only: ambassadors join based on availability, alignment, and sector relevance. For
                        confirmed partnerships or membership, please contact the organisation.
                    </div>

                    <ol className="proposed-list">
                        {proposedAmbassadors.map((amb) => (
                            <li key={amb.name}>
                                <strong>{amb.name}</strong>
                                <span>{amb.role}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="cta-band" aria-labelledby="network-cta-heading">
                <div className="container">
                    <h2 id="network-cta-heading">Interested in the Network?</h2>
                    <p>
                        Reach out to discuss membership interest, partnerships, or how the Network relates to the
                        Challenge and seminars.
                    </p>
                    <div className="cta-actions">
                        <Link to="/contact" className="btn btn-light">
                            Contact us
                        </Link>
                        <Link to="/challenge" className="btn btn-outline-primary hero-btn-ghost">
                            About the Challenge
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Network;

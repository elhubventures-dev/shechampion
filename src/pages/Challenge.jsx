import Hero from '../components/Hero';
import './Challenge.css';

const Challenge = () => {
    const objectives = [
        { id: '01', text: "Identify innovative and scalable women-led business ideas and early-stage enterprises." },
        { id: '02', text: "Strengthen participants' business planning, leadership, and investment readiness." },
        { id: '03', text: "Provide structured access-to-market support through trainings, seminars, and masterclasses." },
        { id: '04', text: "Facilitate access to finance through grants, loans, venture capital, and impact investment linkages." },
        { id: '05', text: "Connect women entrepreneurs to high-level mentors, ambassadors, and role models." },
        { id: '06', text: "Support participation in regional and international business competitions and platforms." },
        { id: '07', text: "Establish a strong SheChampions Women Network that sustains learning, deal flow, and brand growth." },
        { id: '08', text: "Integrate a focused girl-child sensitization, health, and safety initiative promoting education, protection, and empowerment." }
    ];

    return (
        <div className="challenge-page animate-fade-in">
            <Hero
                title="The SheChampions Challenge"
                subtitle="A national business plan competition and ecosystem support platform designed to identify, prepare, and elevate women entrepreneurs."
                bgImage="/assets/challenge_hero.webp"
                secondary={true}
            />

            {/* Rationale Section */}
            <section className="py-section rationale-section">
                <div className="container">
                    <div className="content-wrapper">
                        <div className="text-content">
                            <h2 className="section-title">Strategic Rationale</h2>
                            <p>
                                Despite women's increasing participation in entrepreneurship, many women-led
                                enterprises remain excluded from formal investment and market ecosystems due to:
                            </p>
                            <ul className="gap-list mt-4">
                                <li>Limited access to finance and credit</li>
                                <li>Weak market and buyer linkages</li>
                                <li>Low exposure to investors and structured funding platforms</li>
                                <li>Inadequate access to high-level mentorship and networks</li>
                                <li>Absence of long-term enterprise ecosystems that extend beyond one-off programmes</li>
                            </ul>
                        </div>
                        <div className="image-content glass-dark">
                            <h3>Our Goal</h3>
                            <p className="goal-text">
                                To identify, prepare, and elevate women entrepreneurs through a structured business plan
                                competition and enterprise development platform.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Objectives Section */}
            <section className="py-section objectives-section bg-secondary">
                <div className="container">
                    <div className="text-center mb-4">
                        <h2 className="section-title text-center">Program Objectives</h2>
                        <p className="max-w-3xl mx-auto">The SheChampions Challenge aims to accomplish the following:</p>
                    </div>

                    <div className="objectives-grid mt-4">
                        {objectives.map((obj) => (
                            <div key={obj.id} className="objective-item">
                                <span className="objective-number">{obj.id}</span>
                                <p>{obj.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Beneficiaries Section */}
            <section className="py-section beneficiaries-section">
                <div className="container text-center">
                    <h2 className="section-title">Target Beneficiaries</h2>
                    <p className="section-lead mx-auto">
                        The programme targets young female entrepreneurs aged 18-50, female students and graduates,
                        early-stage women entrepreneurs, and women with innovative business ideas across priority sectors.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default Challenge;

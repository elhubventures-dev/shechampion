import './Hero.css';

const Hero = ({ title, subtitle, bgImage, secondary, children }) => {
    const heroClass = [
        'hero',
        secondary ? 'secondary-hero' : 'primary-hero',
        bgImage ? 'hero-has-media' : '',
    ]
        .filter(Boolean)
        .join(' ');

    let customStyles = {};
    if (bgImage) {
        // Navy overlay for readable type over photography (replaces prior brown tint)
        const overlay =
            'linear-gradient(105deg, rgba(6, 21, 37, 0.88) 0%, rgba(11, 31, 58, 0.72) 55%, rgba(11, 31, 58, 0.55) 100%)';
        const pngFallback = bgImage.endsWith('.webp')
            ? bgImage.replace(/\.webp$/i, '.png')
            : null;

        customStyles = {
            backgroundImage: pngFallback
                ? `${overlay}, image-set(url("${bgImage}") type("image/webp"), url("${pngFallback}") type("image/png"))`
                : `${overlay}, url("${bgImage}")`,
        };
    }

    return (
        <section className={heroClass} style={customStyles}>
            <div className="container hero-content animate-fade-in">
                <h1>{title}</h1>
                {subtitle && <p className="hero-subtitle">{subtitle}</p>}
                {children && <div className="hero-actions">{children}</div>}
            </div>
        </section>
    );
};

export default Hero;

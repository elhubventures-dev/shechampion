import './Hero.css';

const Hero = ({
    title,
    subtitle,
    eyebrow,
    bgImage,
    secondary,
    children,
}) => {
    const heroClass = [
        'hero',
        secondary ? 'secondary-hero' : 'primary-hero',
        bgImage ? 'hero-has-media' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const pngFallback =
        bgImage && bgImage.endsWith('.webp')
            ? bgImage.replace(/\.webp$/i, '.png')
            : null;

    return (
        <section className={heroClass} aria-labelledby="hero-heading">
            {bgImage && (
                <div className="hero-media" aria-hidden="true">
                    <div
                        className="hero-media__image"
                        style={{
                            backgroundImage: pngFallback
                                ? `image-set(url("${bgImage}") type("image/webp"), url("${pngFallback}") type("image/png"))`
                                : `url("${bgImage}")`,
                        }}
                    />
                    <div className="hero-media__overlay" />
                    <div className="hero-media__glow" />
                </div>
            )}

            <div className="container hero-content">
                {eyebrow && (
                    <p className="hero-eyebrow hero-reveal hero-reveal--1">{eyebrow}</p>
                )}
                <h1 id="hero-heading" className="hero-reveal hero-reveal--2">
                    {title}
                </h1>
                {subtitle && (
                    <p className="hero-subtitle hero-reveal hero-reveal--3">{subtitle}</p>
                )}
                {children && (
                    <div className="hero-actions hero-reveal hero-reveal--4">{children}</div>
                )}
            </div>
        </section>
    );
};

export default Hero;

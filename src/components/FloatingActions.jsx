import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { PRIMARY_WHATSAPP_HREF } from '../lib/contacts';
import WhatsAppIcon from './WhatsAppIcon';
import './FloatingActions.css';

const FloatingActions = () => {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 360);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <div className="floating-actions" role="group" aria-label="Quick actions">
      <a
        className="floating-actions__btn floating-actions__btn--whatsapp"
        href={PRIMARY_WHATSAPP_HREF}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with SHE CHAMPIONS on WhatsApp"
      >
        <WhatsAppIcon size={26} />
      </a>

      <button
        type="button"
        className={`floating-actions__btn floating-actions__btn--top${showTop ? ' is-visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Back to top"
        tabIndex={showTop ? 0 : -1}
        aria-hidden={!showTop}
      >
        <ArrowUp size={22} aria-hidden="true" />
      </button>
    </div>
  );
};

export default FloatingActions;

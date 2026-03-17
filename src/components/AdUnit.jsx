import { useEffect, useRef } from 'react';
import './AdUnit.css';

/**
 * Reusable Google AdSense Ad Unit component.
 * 
 * Usage:
 *   <AdUnit format="auto" />                    — responsive auto ad (default)
 *   <AdUnit format="horizontal" />              — horizontal banner ad
 *   <AdUnit format="in-article" />              — in-article native ad
 *   <AdUnit slot="1234567890" />                — specific ad slot
 * 
 * Once your AdSense account is approved, replace the slot values
 * with your actual ad unit slot IDs from AdSense dashboard.
 */
const AdUnit = ({ 
  className = '', 
  format = 'auto', 
  slot = '',           // Replace with real Ad Slot ID once approved
  responsive = true,
  style = {} 
}) => {
  const adRef = useRef(null);
  const isAdPushed = useRef(false);

  useEffect(() => {
    // Only push ads once per component instance
    if (isAdPushed.current) return;

    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({});
        isAdPushed.current = true;
      }
    } catch (err) {
      console.log('AdSense error:', err.message);
    }
  }, []);

  const getFormatClass = () => {
    switch (format) {
      case 'horizontal':
        return 'ad-unit--horizontal';
      case 'in-article':
        return 'ad-unit--in-article';
      case 'vertical':
        return 'ad-unit--vertical';
      default:
        return 'ad-unit--auto';
    }
  };

  // Layout format for adsbygoogle data attribute
  const getAdLayout = () => {
    if (format === 'in-article') return 'in-article';
    return undefined;
  };

  const getAdFormat = () => {
    if (format === 'in-article') return 'fluid';
    if (responsive) return 'auto';
    return undefined;
  };

  return (
    <div className={`ad-unit-wrapper ${getFormatClass()} ${className}`}>
      <div className="ad-unit-label">Advertisement</div>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: 'block',
          textAlign: 'center',
          ...style,
        }}
        data-ad-client="ca-pub-8032670705959771"
        data-ad-slot={slot || undefined}
        data-ad-format={getAdFormat()}
        data-ad-layout={getAdLayout()}
        data-full-width-responsive={responsive ? 'true' : undefined}
      />
    </div>
  );
};

export default AdUnit;

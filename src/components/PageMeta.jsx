import { useEffect } from 'react';

const SITE_NAME = 'SHE CHAMPIONS';
const DEFAULT_DESCRIPTION =
  'SHE CHAMPIONS is a Women-Led Entrepreneurship, Market Access & Investment Platform that identifies, prepares, and positions high-potential women-led businesses for long-term growth.';

/**
 * Client-side document title + meta description updates for the Vite SPA.
 * Does not provide SSR; crawlers that execute JS will see the updated values.
 */
const PageMeta = ({
  title,
  description = DEFAULT_DESCRIPTION,
  noIndex = false,
}) => {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);

    let robots = document.querySelector('meta[name="robots"]');
    if (noIndex) {
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'noindex, nofollow');
    } else if (robots) {
      robots.setAttribute('content', 'index, follow');
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', fullTitle);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);

    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', fullTitle);

    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', description);
  }, [title, description, noIndex]);

  return null;
};

export default PageMeta;

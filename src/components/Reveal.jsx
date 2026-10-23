import { useRef } from 'react';
import { useInViewReveal } from '../hooks/useInViewReveal';

/**
 * Scroll-reveal wrapper. Adds `.reveal` (+ optional variants) and toggles `.is-visible`.
 */
export default function Reveal({
  as = 'div',
  className = '',
  variant = 'up',
  stagger = false,
  children,
  ...rest
}) {
  const ref = useRef(null);
  useInViewReveal(ref);
  const Tag = as;

  const classes = [
    'reveal',
    variant === 'fade' ? 'reveal-fade' : null,
    stagger ? 'reveal-stagger' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag ref={ref} className={classes} {...rest}>
      {children}
    </Tag>
  );
}

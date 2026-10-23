import { useEffect, useState } from 'react';
import { EVENT_2026 } from '../lib/event2026';
import { getCountdownParts, pad2 } from '../lib/eventCountdown';
import './EventCountdown.css';

/**
 * Live countdown to Challenge 2026 event day (Lagos).
 * @param {'hero' | 'promo' | 'section' | 'compact'} [variant='hero']
 * @param {string} [className]
 */
const EventCountdown = ({ variant = 'hero', className = '' }) => {
  const [parts, setParts] = useState(() => getCountdownParts());

  useEffect(() => {
    const tick = () => setParts(getCountdownParts());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const units = [
    { key: 'days', label: 'Days', value: parts.days, wide: true },
    { key: 'hours', label: 'Hours', value: pad2(parts.hours) },
    { key: 'minutes', label: 'Mins', value: pad2(parts.minutes) },
    { key: 'seconds', label: 'Secs', value: pad2(parts.seconds) },
  ];

  const rootClass = [
    'event-countdown',
    `event-countdown--${variant}`,
    parts.isComplete ? 'is-complete' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootClass}
      role="timer"
      aria-label={
        parts.isComplete
          ? `${EVENT_2026.shortName} event day has begun`
          : `${EVENT_2026.shortName} countdown: ${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds remaining until ${EVENT_2026.dateDisplay}`
      }
    >
      <p className="event-countdown__eyebrow">
        {parts.isComplete ? 'Event day' : 'Live countdown'}
      </p>

      {parts.isComplete ? (
        <p className="event-countdown__complete">
          {EVENT_2026.dateDisplay} is here — follow SHE CHAMPIONS for programme timing.
        </p>
      ) : (
        <ul className="event-countdown__grid" aria-hidden="true">
          {units.map((unit) => (
            <li
              key={unit.key}
              className={`event-countdown__unit${unit.wide ? ' event-countdown__unit--days' : ''}`}
            >
              <span className="event-countdown__value">{unit.value}</span>
              <span className="event-countdown__label">{unit.label}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="event-countdown__note">{EVENT_2026.countdownNote}</p>
    </div>
  );
};

export default EventCountdown;

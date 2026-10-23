import { EVENT_2026 } from './event2026';

/** @typedef {{ days: number, hours: number, minutes: number, seconds: number, totalMs: number, isComplete: boolean }} CountdownParts */

/**
 * @param {number} [nowMs]
 * @param {string} [isoTarget]
 * @returns {CountdownParts}
 */
export function getCountdownParts(
  nowMs = Date.now(),
  isoTarget = EVENT_2026.countdownAt
) {
  const targetMs = new Date(isoTarget).getTime();
  if (Number.isNaN(targetMs)) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      isComplete: true,
    };
  }

  const totalMs = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs,
    isComplete: totalMs <= 0,
  };
}

/** @param {number} value */
export function pad2(value) {
  return String(Math.max(0, value)).padStart(2, '0');
}

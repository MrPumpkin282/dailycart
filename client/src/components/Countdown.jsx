import { useEffect, useState } from 'react';

/** mm:ss until `until`; calls onDone once when it reaches zero. */
export default function Countdown({ until, onDone, className = '' }) {
  const target = new Date(until).getTime();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, target - now);
  useEffect(() => {
    if (left === 0 && onDone) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left === 0]);

  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const urgent = left < 5 * 60000;
  return (
    <span className={`font-mono font-bold tabular-nums ${urgent ? 'text-red-600' : ''} ${className}`}>
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

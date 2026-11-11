import { createContext, useContext, useState } from 'react';

const LocCtx = createContext(null);
const KEY = 'dailycart.location';

// Demo area: Koramangala, Bengaluru (the seeded shops are around here).
export const DEMO_AREA = { lat: 12.9352, lng: 77.6245, label: 'Koramangala, Bengaluru (demo)', demo: true };

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}

export function LocationProvider({ children }) {
  const [loc, setLocState] = useState(load);
  const [radius, setRadius] = useState(750);
  const [status, setStatus] = useState('idle'); // idle | locating | error
  const [error, setError] = useState('');

  const setLoc = (l) => {
    setLocState(l);
    try { l ? localStorage.setItem(KEY, JSON.stringify(l)) : localStorage.removeItem(KEY); } catch {}
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setError("This browser can't share location. Use the demo area instead.");
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus('idle');
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Your current location', demo: false });
      },
      () => {
        setStatus('error');
        setError('Location permission was denied. You can use the demo area instead.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const useDemo = () => {
    setStatus('idle');
    setLoc(DEMO_AREA);
  };

  return (
    <LocCtx.Provider value={{ loc, setLoc, radius, setRadius, locate, useDemo, status, error }}>
      {children}
    </LocCtx.Provider>
  );
}

export const useLocation2 = () => useContext(LocCtx);

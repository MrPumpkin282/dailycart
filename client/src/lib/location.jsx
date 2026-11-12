import { createContext, useContext, useState } from 'react';

const LocCtx = createContext(null);
const KEY = 'dailycart.location';
const RECENT_KEY = 'dailycart.recentLocations';

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/**
 * Look up an area, street or PIN code in India with OpenStreetMap (free, no key).
 * Returns [{ lat, lng, label, detail }].
 */
export async function searchPlaces(text) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ format: 'jsonv2', q: text, countrycodes: 'in', limit: '6', addressdetails: '1' });
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Location search is busy, try again in a moment');
  const rows = await res.json();
  return rows.map((r) => {
    const a = r.address || {};
    const main = a.suburb || a.neighbourhood || a.road || a.village || a.town || a.city || r.name || r.display_name.split(',')[0];
    const city = a.city || a.town || a.state_district || a.state || '';
    return {
      lat: Number(r.lat),
      lng: Number(r.lon),
      label: [main, city].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(', '),
      detail: r.display_name,
      city,
      pincode: a.postcode || '',
    };
  });
}

export function LocationProvider({ children }) {
  const [loc, setLocState] = useState(() => read(KEY, null));
  const [recent, setRecent] = useState(() => read(RECENT_KEY, []));
  const [radius, setRadius] = useState(750);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | locating | error
  const [error, setError] = useState('');

  const setLoc = (l) => {
    setLocState(l);
    write(KEY, l);
    if (l) {
      const next = [l, ...recent.filter((r) => r.label !== l.label)].slice(0, 3);
      setRecent(next);
      write(RECENT_KEY, next);
    }
  };

  /** Ask the browser for GPS. Resolves true on success. */
  const locate = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        setStatus('error');
        setError("This browser can't share location. Search your area instead.");
        return resolve(false);
      }
      setStatus('locating');
      setError('');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setStatus('idle');
          setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Current location' });
          resolve(true);
        },
        (err) => {
          setStatus('error');
          setError(
            err.code === 1
              ? 'Location is blocked on this device. Search your area or PIN code instead.'
              : "Couldn't find your location. Search your area or PIN code instead."
          );
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

  return (
    <LocCtx.Provider value={{ loc, setLoc, recent, radius, setRadius, locate, status, error, pickerOpen, setPickerOpen }}>
      {children}
    </LocCtx.Provider>
  );
}

export const useLocation2 = () => useContext(LocCtx);

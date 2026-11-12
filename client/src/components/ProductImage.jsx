import { useState } from 'react';
import { CATEGORY_EMOJI } from '../lib/api.js';

export const imageUrl = (id) => (id ? `/api/images/${id}` : null);

/** Product photo if the shop uploaded one, otherwise the category emoji. */
export default function ProductImage({ product, className = '', emojiSize = 'text-5xl' }) {
  const [broken, setBroken] = useState(false);
  const src = imageUrl(product.image_id);
  if (src && !broken) {
    return <img src={src} alt={product.name} loading="lazy" onError={() => setBroken(true)} className={`h-full w-full object-contain ${className}`} />;
  }
  return <span aria-hidden="true" className={emojiSize}>{CATEGORY_EMOJI[product.category] || '🛍️'}</span>;
}

/**
 * Shrink a photo in the browser before upload: max 800 px on the long side,
 * WebP (or JPEG if the browser can't make WebP), aiming for ~100 KB.
 * Returns a data: URL.
 */
export async function shrinkImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Please choose a JPG, PNG or WebP photo');
  if (file.size > 5 * 1024 * 1024) throw new Error('Photo is larger than 5 MB');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("Couldn't read that photo"); });
  const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // transparent PNGs get a white background
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  let type = 'image/webp';
  let out = canvas.toDataURL(type, 0.82);
  if (!out.startsWith('data:image/webp')) { type = 'image/jpeg'; out = canvas.toDataURL(type, 0.82); }
  for (let q = 0.7; out.length > 600 * 1024 * 1.37 && q >= 0.4; q -= 0.15) out = canvas.toDataURL(type, q);
  return out;
}

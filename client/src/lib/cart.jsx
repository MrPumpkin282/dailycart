import { createContext, useContext, useEffect, useState } from 'react';

const CartCtx = createContext(null);
const KEY = 'dailycart.cart';

/**
 * Cart grouped by shop, because each shop's items are frozen and picked up separately:
 * { [shopId]: { shopId, shopName, items: { [productId]: { id, name, unit, price, qty, stock, category } } } }
 */
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {}
  }, [cart]);

  const setQty = (shop, product, qty) =>
    setCart((prev) => {
      const next = structuredClone(prev);
      const group = next[shop.id] || { shopId: shop.id, shopName: shop.name, items: {} };
      if (qty <= 0) delete group.items[product.id];
      else group.items[product.id] = {
        id: product.id, name: product.name, unit: product.unit, price: product.price,
        category: product.category, stock: product.stock, image_id: product.image_id ?? null, qty: Math.min(qty, product.stock, 5),
      };
      if (Object.keys(group.items).length) next[shop.id] = group;
      else delete next[shop.id];
      return next;
    });

  const qtyOf = (productId) => {
    for (const g of Object.values(cart)) if (g.items[productId]) return g.items[productId].qty;
    return 0;
  };

  const clearShop = (shopId) => setCart((prev) => { const n = { ...prev }; delete n[shopId]; return n; });

  /** Apply the server's latest stock numbers after a failed freeze. */
  const applyStock = (shopId, stock) =>
    setCart((prev) => {
      const next = structuredClone(prev);
      const g = next[shopId];
      if (!g) return prev;
      for (const [pid, left] of Object.entries(stock)) {
        if (!g.items[pid]) continue;
        if (left <= 0) delete g.items[pid];
        else { g.items[pid].stock = left; g.items[pid].qty = Math.min(g.items[pid].qty, left); }
      }
      if (!Object.keys(g.items).length) delete next[shopId];
      return next;
    });

  const count = Object.values(cart).reduce((n, g) => n + Object.values(g.items).reduce((m, i) => m + i.qty, 0), 0);

  return (
    <CartCtx.Provider value={{ cart, setQty, qtyOf, clearShop, applyStock, count }}>{children}</CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = { key: string; productId: string; productSlug: string; name: string; brand: string | null; image: string | null; variantId: string | null; variantLabel: string | null; price: number; quantity: number; maxQuantity: number | null };
type CartContextValue = { items: CartItem[]; count: number; subtotal: number; ready: boolean; addItem: (item: Omit<CartItem, "key">) => void; updateQuantity: (key: string, quantity: number) => void; removeItem: (key: string) => void; clear: () => void };
const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "scentlyn-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) setItems(JSON.parse(saved) as CartItem[]); } catch { localStorage.removeItem(STORAGE_KEY); } finally { setReady(true); } }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }, [items, ready]);
  const value = useMemo<CartContextValue>(() => ({
    items, ready,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    addItem: (item) => setItems((current) => {
      const key = `${item.productId}:${item.variantId ?? "base"}`;
      const found = current.find((entry) => entry.key === key);
      if (!found) return [...current, { ...item, key }];
      return current.map((entry) => entry.key === key ? { ...entry, quantity: Math.min(entry.quantity + item.quantity, entry.maxQuantity ?? 50) } : entry);
    }),
    updateQuantity: (key, quantity) => setItems((current) => current.map((item) => item.key === key ? { ...item, quantity: Math.max(1, Math.min(quantity, item.maxQuantity ?? 50)) } : item)),
    removeItem: (key) => setItems((current) => current.filter((item) => item.key !== key)),
    clear: () => setItems([]),
  }), [items, ready]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { const value = useContext(CartContext); if (!value) throw new Error("useCart must be used inside CartProvider"); return value; }

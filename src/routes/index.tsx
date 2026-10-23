import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import hero from "@/assets/hero.jpg";
import { ITEMS, cartTotal, formatRand, type CartLine, type Item } from "@/lib/shop";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pastimes | Second-hand branded clothing" },
      { name: "description", content: "Browse, buy and sell pre-loved branded clothing in great condition." },
      { property: "og:title", content: "Pastimes | Second-hand branded clothing" },
      { property: "og:description", content: "Browse, buy and sell pre-loved branded clothing in great condition." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const btn = "rounded-md px-4 py-2 text-sm font-medium transition-colors";
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:bg-primary/90`;
const btnAccent = `${btn} bg-accent text-accent-foreground hover:bg-accent/90`;
const btnGhost = `${btn} border border-border hover:bg-secondary`;
const field = "w-full rounded-md border border-input bg-card px-3 py-2 text-sm";

function Index() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [messageFor, setMessageFor] = useState<Item | null>(null);
  const [notice, setNotice] = useState("");

  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 2500);
  };

  const add = (item: Item) => {
    setCart((lines) =>
      lines.some((l) => l.item.id === item.id)
        ? lines.map((l) => (l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l))
        : [...lines, { item, qty: 1 }],
    );
    flash(`${item.name} added to cart`);
  };

  const setQty = (id: string, qty: number) =>
    setCart((lines) =>
      qty <= 0 ? lines.filter((l) => l.item.id !== id) : lines.map((l) => (l.item.id === id ? { ...l, qty } : l)),
    );

  const count = cart.reduce((n, l) => n + l.qty, 0);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-2xl font-semibold text-primary">Pastimes</span>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#shop" className="hover:text-accent">Shop</a>
            <a href="#sell" className="hover:text-accent">Sell</a>
            <button className={btnPrimary} onClick={() => setCartOpen(true)}>
              Cart ({count})
            </button>
          </nav>
        </div>
      </header>

      <section className="relative">
        <img src={hero} alt="Rail of pre-loved clothing" width={1600} height={912} className="h-[70vh] w-full object-cover" />
        <div className="absolute inset-0 bg-overlay" />
        <div className="absolute inset-0 mx-auto flex max-w-6xl flex-col justify-end px-6 pb-16 text-primary-foreground">
          <h1 className="max-w-2xl text-5xl leading-tight md:text-6xl">Good clothes deserve a second story.</h1>
          <p className="mt-4 max-w-lg text-lg opacity-90">Buy and sell branded second-hand clothing, checked for quality.</p>
          <a href="#shop" className={`${btnAccent} mt-8 w-fit px-6 py-3`}>Browse the rail</a>
        </div>
      </section>

      <section id="shop" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-4xl">Just in</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-lg bg-card shadow-soft">
              <img src={item.image} alt={item.name} loading="lazy" width={800} height={1008} className="aspect-[4/5] w-full object-cover" />
              <div className="p-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{item.brand}</p>
                <h3 className="mt-1 text-xl">{item.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Size {item.size} · {item.condition} · by @{item.seller}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-semibold">{formatRand(item.price)}</span>
                  <div className="flex gap-2">
                    <button className={btnGhost} onClick={() => setMessageFor(item)}>Message</button>
                    <button className={btnPrimary} onClick={() => add(item)}>Add</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="sell" className="bg-secondary">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2">
          <div>
            <h2 className="text-4xl">Sell with Pastimes</h2>
            <p className="mt-4 text-muted-foreground">
              Register as a seller, tell us about your item, and our team checks it and lists it for you.
            </p>
          </div>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              e.currentTarget.reset();
              flash("Thanks! Our team will review your item.");
            }}
          >
            <input required placeholder="Your name" className={field} />
            <input required type="email" placeholder="Email address" className={field} />
            <input required placeholder="Item and brand" className={field} />
            <textarea required placeholder="Size, condition and any flaws" rows={3} className={field} />
            <button className={btnAccent}>Submit for review</button>
          </form>
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-muted-foreground">Pastimes · Prototype demo</footer>

      {cartOpen && (
        <div className="fixed inset-0 z-30 flex justify-end bg-overlay" onClick={() => setCartOpen(false)}>
          <aside className="flex h-full w-full max-w-md flex-col bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl">Your cart</h2>
              <button className={btnGhost} onClick={() => setCartOpen(false)}>Close</button>
            </div>
            <div className="mt-6 flex-1 space-y-4 overflow-y-auto">
              {cart.length === 0 && <p className="text-muted-foreground">Your cart is empty.</p>}
              {cart.map(({ item, qty }) => (
                <div key={item.id} className="flex gap-4">
                  <img src={item.image} alt={item.name} className="h-20 w-16 rounded object-cover" />
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{formatRand(item.price)}</p>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <button className={btnGhost} onClick={() => setQty(item.id, qty - 1)}>−</button>
                      <span>{qty}</span>
                      <button className={btnGhost} onClick={() => setQty(item.id, qty + 1)}>+</button>
                      <button className="ml-auto text-destructive" onClick={() => setQty(item.id, 0)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatRand(cartTotal(cart))}</span>
              </div>
              <button
                disabled={cart.length === 0}
                className={`${btnAccent} mt-4 w-full disabled:opacity-50`}
                onClick={() => {
                  setCart([]);
                  setCartOpen(false);
                  flash("Order placed! Delivery details will follow by email.");
                }}
              >
                Checkout
              </button>
            </div>
          </aside>
        </div>
      )}

      {messageFor && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-overlay p-4" onClick={() => setMessageFor(null)}>
          <form
            className="w-full max-w-md space-y-3 rounded-lg bg-background p-6"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              flash(`Message sent to @${messageFor.seller}`);
              setMessageFor(null);
            }}
          >
            <h2 className="text-2xl">Message @{messageFor.seller}</h2>
            <p className="text-sm text-muted-foreground">About: {messageFor.name}</p>
            <textarea required rows={4} placeholder="Ask about fit, condition..." className={field} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setMessageFor(null)}>Cancel</button>
              <button className={btnPrimary}>Send</button>
            </div>
          </form>
        </div>
      )}

      {notice && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-md bg-primary px-5 py-3 text-sm text-primary-foreground shadow-soft">
          {notice}
        </div>
      )}
    </div>
  );
}

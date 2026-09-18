import { Link } from "@tanstack/react-router";
import { Menu, Search, ShoppingBag, UserRound, Truck, ShieldCheck, CreditCard, Instagram, Facebook, MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/storefront";

export function StoreHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  return <>
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2 px-4 py-2 text-center text-[10px] font-semibold uppercase sm:text-xs">
        <span className="flex items-center justify-center gap-1.5"><Truck className="size-3.5"/>Delivery across Kenya</span>
        <span className="hidden items-center justify-center gap-1.5 sm:flex"><ShieldCheck className="size-3.5"/>100% original products</span>
        <span className="col-start-3 flex items-center justify-center gap-1.5"><CreditCard className="size-3.5"/>Secure payments</span>
      </div>
    </div>
    <header className="border-b border-border bg-secondary">
      <div className="mx-auto grid h-20 max-w-7xl grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 px-4 lg:grid-cols-[14rem_minmax(0,1fr)_14rem]">
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu/></Button>
        <Link to="/" className="justify-self-center font-display text-4xl italic text-primary lg:justify-self-start">Scentlyn<span className="text-accent">✦</span></Link>
        <nav className="hidden items-center justify-center gap-9 lg:flex" aria-label="Main navigation">
          {CATEGORY_ORDER.map((slug) => <Link key={slug} to="/category/$slug" params={{slug}} className="text-xs font-bold uppercase text-primary transition-colors hover:text-accent" activeProps={{className:"text-accent"}}>{CATEGORY_LABELS[slug]}</Link>)}
        </nav>
        <div className="flex items-center justify-end gap-0.5">
          <Button variant="ghost" size="icon" aria-label="Search products"><Search/></Button>
          <Button variant="ghost" size="icon" aria-label="Account" className="hidden sm:inline-flex"><UserRound/></Button>
          <Button variant="ghost" size="icon" aria-label={`Cart with ${count} items`} asChild className="relative">
            <Link to="/cart"><ShoppingBag/>{count > 0 && <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">{count > 9 ? "9+" : count}</span>}</Link>
          </Button>
        </div>
      </div>
    </header>
    {open && <div className="fixed inset-0 z-50 bg-foreground/30 lg:hidden" onClick={() => setOpen(false)}>
      <aside className="h-full w-[82%] max-w-xs bg-secondary p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between"><span className="font-display text-3xl italic">Scentlyn</span><Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu"><X/></Button></div>
        <nav className="mt-10 grid gap-1" aria-label="Mobile navigation">
          {CATEGORY_ORDER.map((slug) => <Link key={slug} to="/category/$slug" params={{slug}} onClick={() => setOpen(false)} className="border-b border-border py-4 font-display text-2xl">{CATEGORY_LABELS[slug]}</Link>)}
          <Link to="/cart" onClick={() => setOpen(false)} className="border-b border-border py-4 font-display text-2xl">Your cart ({count})</Link>
        </nav>
      </aside>
    </div>}
  </>;
}

export function StoreFooter() {
  return <footer className="bg-primary text-primary-foreground">
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.5fr]">
      <div><div className="font-display text-4xl italic">Scentlyn<span className="text-accent">✦</span></div><p className="mt-3 max-w-xs text-sm text-primary-foreground/75">Where freshness meets quality</p><div className="mt-5 flex gap-3"><Instagram/><span className="font-bold">TikTok</span><Facebook/><MessageCircle/></div></div>
      <FooterLinks title="Shop" links={CATEGORY_ORDER.map((slug) => ({label:CATEGORY_LABELS[slug],slug}))}/>
      <div><h3 className="font-bold">Help</h3><ul className="mt-3 space-y-2 text-sm text-primary-foreground/75"><li>Track order</li><li>FAQs</li><li>Shipping & delivery</li><li>Returns</li></ul></div>
      <div><h3 className="font-bold">About</h3><ul className="mt-3 space-y-2 text-sm text-primary-foreground/75"><li>Our story</li><li>Contact us</li></ul></div>
      <div><h3 className="font-bold">Join our community</h3><form className="mt-3 flex" onSubmit={(event) => event.preventDefault()}><input aria-label="Email address" type="email" placeholder="Your email address" className="min-w-0 flex-1 rounded-l-full bg-card px-4 py-2.5 text-sm text-card-foreground outline-none"/><Button type="submit" className="rounded-l-none rounded-r-full bg-accent text-accent-foreground hover:bg-accent/90">Join</Button></form><p className="mt-2 text-xs text-primary-foreground/65">Special offers, new arrivals and more.</p></div>
    </div>
    <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-primary-foreground/20 px-5 py-5 text-xs text-primary-foreground/65 sm:flex-row sm:justify-between"><span>© 2026 Scentlyn. All rights reserved.</span><span>A fresher, brighter home awaits · Kenya 🇰🇪</span></div>
  </footer>;
}
function FooterLinks({title,links}:{title:string;links:{label:string;slug:string}[]}) { return <div><h3 className="font-bold">{title}</h3><ul className="mt-3 space-y-2 text-sm text-primary-foreground/75">{links.map((item)=><li key={item.slug}><Link to="/category/$slug" params={{slug:item.slug}} className="hover:text-primary-foreground">{item.label}</Link></li>)}</ul></div>; }

export function StoreLayout({children}:{children:React.ReactNode}) { return <div className="min-h-screen bg-background text-foreground"><StoreHeader/><main>{children}</main><StoreFooter/></div>; }

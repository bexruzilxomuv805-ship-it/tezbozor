import { Link } from "react-router-dom";
import { Leaf, Truck, Scale, ArrowRight } from "lucide-react";
import { useApp } from "../context/AppContext";
import { CATEGORIES } from "../data/categories";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const { t, products } = useApp();
  const featured = products.filter((p) => p.stock > 0).slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-12 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <span
            className="inline-block text-[11px] font-bold px-3 py-1 rounded-full mb-4"
            style={{ background: "var(--gc-cream-2)", color: "var(--gc-leaf)" }}
          >
            🥬 {t.tagline}
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight" style={{ color: "var(--gc-charcoal)" }}>
            {t.heroTitle}
          </h1>
          <p className="mt-4 text-base max-w-md" style={{ color: "var(--gc-muted-dark)" }}>
            {t.heroSubtitle}
          </p>
          <Link
            to="/dokon"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full text-sm font-bold text-white transition active:scale-[0.98]"
            style={{ background: "var(--gc-forest)" }}
          >
            {t.heroCta} <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.id}
                to={`/dokon?kategoriya=${c.id}`}
                className="rounded-2xl p-5 flex flex-col gap-3 transition hover:-translate-y-0.5"
                style={{ background: "var(--gc-surface)", border: "1px solid var(--gc-border)" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--gc-cream-2)" }}
                >
                  <Icon size={22} color="var(--gc-leaf)" strokeWidth={1.6} />
                </div>
                <span className="font-display font-semibold text-sm" style={{ color: "var(--gc-charcoal)" }}>
                  {t[c.key]}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Why us */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: "var(--gc-charcoal)" }}>
          {t.whyUs}
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <WhyCard Icon={Leaf} title={t.why1Title} body={t.why1Body} />
          <WhyCard Icon={Truck} title={t.why2Title} body={t.why2Body} />
          <WhyCard Icon={Scale} title={t.why3Title} body={t.why3Body} />
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-semibold" style={{ color: "var(--gc-charcoal)" }}>
            {t.featuredProducts}
          </h2>
          <Link to="/dokon" className="text-xs font-bold" style={{ color: "var(--gc-leaf)" }}>
            {t.viewAll} →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

function WhyCard({ Icon, title, body }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--gc-surface)", border: "1px solid var(--gc-border)" }}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: "var(--gc-cream-2)" }}
      >
        <Icon size={20} color="var(--gc-leaf)" strokeWidth={1.6} />
      </div>
      <p className="font-display font-semibold text-sm mb-1" style={{ color: "var(--gc-charcoal)" }}>{title}</p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--gc-muted)" }}>{body}</p>
    </div>
  );
}

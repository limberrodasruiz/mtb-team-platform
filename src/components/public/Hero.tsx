import { Link } from 'react-router-dom';

export interface HeroCta {
  label: string;
  to: string;
  variant?: 'primary' | 'secondary';
}

interface HeroProps {
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  ctas?: HeroCta[];
  eyebrow?: string;
}

export function Hero({ title, subtitle, imageUrl, ctas = [], eyebrow }: HeroProps) {
  return (
    <section className="hero-gradient text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 md:grid-cols-2 md:py-20">
        <div>
          {eyebrow !== undefined ? (
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-200">{eyebrow}</p>
          ) : null}
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {title}
          </h1>
          {subtitle !== undefined ? (
            <p className="mt-4 max-w-xl text-base text-slate-200 sm:text-lg">{subtitle}</p>
          ) : null}
          {ctas.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {ctas.map((cta) => (
                <Link
                  key={cta.to + cta.label}
                  to={cta.to}
                  className={
                    cta.variant === 'secondary'
                      ? 'rounded-lg border border-white/40 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10'
                      : 'rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100'
                  }
                >
                  {cta.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        {imageUrl ? (
          <div className="overflow-hidden rounded-2xl shadow-2xl">
            <img src={imageUrl} alt={title} className="h-64 w-full object-cover md:h-80" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

import { ExternalLink, Globe2, Handshake } from 'lucide-react';
import type { Sponsor } from '../../types';
import { resolveMediaUrl } from '../../services/storage';
import { cn } from '../../utils/cn';

function normalizeUrl(value: string | null): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function socialEntries(socials: Sponsor['socials']): Array<[string, string]> {
  return Object.entries(socials ?? {}).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === 'string' && Boolean(entry[1].trim()),
  );
}

export function SponsorGrid({
  sponsors,
  compact = false,
}: {
  sponsors: Sponsor[];
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'grid gap-4',
        compact
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      )}
    >
      {sponsors.map((sponsor) => {
        const logo = resolveMediaUrl(sponsor.logo_path, sponsor.logo_url, 'sponsors');
        const website = normalizeUrl(sponsor.website);
        const socials = socialEntries(sponsor.socials);

        if (compact) {
          const card = (
            <div className="flex h-24 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 shadow-sm transition hover:border-[var(--brand-mid)] hover:shadow-md">
              {logo ? (
                <img
                  src={logo}
                  alt={sponsor.name}
                  loading="lazy"
                  className="max-h-12 max-w-full object-contain grayscale transition hover:grayscale-0"
                />
              ) : (
                <span className="text-center font-display text-lg font-bold uppercase tracking-wide text-slate-700">
                  {sponsor.name}
                </span>
              )}
            </div>
          );
          return website ? (
            <a
              key={sponsor.id}
              href={website}
              target="_blank"
              rel="noreferrer"
              aria-label={`${sponsor.name} (sitio externo)`}
              className="block"
            >
              {card}
            </a>
          ) : (
            <div key={sponsor.id}>{card}</div>
          );
        }

        return (
          <article
            key={sponsor.id}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[var(--brand-mid)] hover:shadow-md"
          >
            <div className="flex h-24 items-center justify-start">
              {logo ? (
                <img
                  src={logo}
                  alt={sponsor.name}
                  loading="lazy"
                  className="max-h-20 max-w-[180px] object-contain"
                />
              ) : (
                <span className="font-display text-2xl font-bold uppercase tracking-wide text-slate-800">
                  {sponsor.name}
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl font-bold uppercase leading-tight text-slate-950">
                {sponsor.name}
              </h3>
              {sponsor.featured && (
                <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-dark)]">
                  Principal
                </span>
              )}
            </div>
            {sponsor.support_type && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--brand)]">
                <Handshake className="h-3.5 w-3.5" aria-hidden />
                {sponsor.support_type}
              </p>
            )}
            {sponsor.description && (
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                {sponsor.description}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--brand-dark)] transition hover:text-[var(--brand)]"
                >
                  <Globe2 className="h-3.5 w-3.5" aria-hidden />
                  Sitio web
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              )}
              {socials.map(([label, href]) => (
                <a
                  key={label}
                  href={normalizeUrl(href) ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium capitalize text-slate-500 transition hover:text-slate-900"
                >
                  {label}
                </a>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}

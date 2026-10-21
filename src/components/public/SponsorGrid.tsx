import type { Sponsor } from '../../types';

interface SponsorGridProps {
  sponsors: Sponsor[];
  className?: string;
}

export function SponsorGrid({ sponsors, className = '' }: SponsorGridProps) {
  if (sponsors.length === 0) return null;
  return (
    <ul className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${className}`}>
      {sponsors.map((sponsor) => {
        const content = sponsor.logo_url ? (
          <img
            src={sponsor.logo_url}
            alt={sponsor.name}
            className="h-16 w-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-sm font-semibold text-slate-700">{sponsor.name}</span>
        );
        return (
          <li
            key={sponsor.id}
            className="flex h-28 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white p-4"
          >
            {sponsor.website_url ? (
              <a
                href={sponsor.website_url}
                target="_blank"
                rel="noreferrer"
                aria-label={sponsor.name}
                className="flex h-full w-full items-center justify-center"
              >
                {content}
              </a>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}

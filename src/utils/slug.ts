export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

export function cyclistSlug(fullName: string, idSuffix?: string): string {
  const base = slugify(fullName.trim());
  if (!idSuffix) return base;
  const short = idSuffix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
  if (!short) return base;
  return `${base}-${short.toLowerCase()}`;
}

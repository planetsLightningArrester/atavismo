/**
 * Format `Date` to `yyyy-MM-dd`
 * @param date the `Date` to be formatted
 * @returns the date formatted as `yyyy-MM-dd`
 */
export function formatDate(date: Date): string {
  const day = date.getDate()
  const month = date.getMonth() + 1
  return `${date.getFullYear()}-${month < 10 ? '0' + month.toString() : month.toString()}-${day < 10 ? '0' + day.toString() : day.toString()}`
}

/**
 * Resolve image path for Svelte + Electron integration.
 * Basically resolve "/path" to "./path" when required.
 * @param img the image path
 * @returns the image path resolved to work both in dev and prod
 */
export function resolveImgPath(img: string): string {
  return import.meta.env.MODE === 'development'
    ? img
    : '.' + img
}

/**
 * Strips slashes from GEDCOM standard names, e.g. "CELIO ANTONIO /MANSO/" -> "CELIO ANTONIO MANSO"
 */
export function cleanName(name?: string): string {
  if (name === undefined || name.trim().length === 0) return 'Unknown'
  return name.replace(/\//g, '').trim()
}

/**
 * Formats birth and death dates into a lifespan string, e.g. "(1927 - 1976)"
 */
export function formatLifespan(birth?: EventDetails, death?: EventDetails): string {
  const bYear = birth?.year !== undefined ? String(birth.year) : (birth?.date ?? '')
  const dYear = death?.year !== undefined ? String(death.year) : (death?.date ?? '')

  if (bYear.length === 0 && dYear.length === 0) return ''
  return `(${bYear.length > 0 ? bYear : '?'} — ${dYear.length > 0 ? dYear : '?'})`
}

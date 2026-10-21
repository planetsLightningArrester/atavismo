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
 * Truncates a string to a maximum character length, appending an ellipsis if truncated.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, Math.max(1, maxLength - 1)).trimEnd() + '…'
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

/**
 * Normalizes a string for diacritic-insensitive search comparison.
 */
export function normalizeSearchText(text?: string): string {
  if (typeof text !== 'string' || text.length === 0) return ''
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Checks if two words are within 1 edit operation (insertion, deletion, or substitution).
 */
function isWithinOneEdit(a: string, b: string): boolean {
  const lenDiff = Math.abs(a.length - b.length)
  if (lenDiff > 1) return false

  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
    } else {
      edits++
      if (edits > 1) return false
      if (a.length > b.length) i++
      else if (b.length > a.length) j++
      else {
        i++
        j++
      }
    }
  }
  if (i < a.length || j < b.length) edits++
  return edits <= 1
}

/**
 * Evaluates whether all tokens in `query` match at least one candidate string in `haystacks`
 * using diacritic-insensitive substring matching or 1-edit typo tolerance for tokens >= 4 chars.
 */
export function fuzzyMatchesQuery(haystacks: Array<string | undefined>, query: string): boolean {
  const normQuery = normalizeSearchText(query)
  if (normQuery.length === 0) return true

  const tokens = normQuery.split(/\s+/).filter((t) => t.length > 0)
  const normHaystacks = haystacks
    .map((h) => normalizeSearchText(h))
    .filter((h) => h.length > 0)

  if (normHaystacks.length === 0) return false

  return tokens.every((token) => {
    for (const h of normHaystacks) {
      if (h.includes(token)) return true
      if (token.length >= 4) {
        const words = h.split(/[^a-z0-9]+/)
        if (words.some((w) => w.length >= 3 && isWithinOneEdit(w, token))) return true
      }
    }
    return false
  })
}

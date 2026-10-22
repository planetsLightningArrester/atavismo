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

/**
 * Generates a unique next ID for a record type (e.g. '@I101@' given existing '@I1@'...'@I100@')
 */
export function generateNextId(existingIds: string[], prefix: string = 'I'): string {
  let maxNum = 0
  const re = new RegExp(`^@?${prefix}(\\d+)@?$`, 'i')
  for (const id of existingIds) {
    const m = re.exec(id)
    if (m !== null) {
      const num = parseInt(m[1], 10)
      if (!isNaN(num) && num > maxNum) maxNum = num
    }
  }
  return `@${prefix}${maxNum + 1}@`
}

/**
 * Recalculates GedcomStats from individuals and families.
 */
export function recalculateStats(
  individuals: Individual[],
  families: Family[],
  sources: Record<string, SourceRecord> = {},
  repositories: Record<string, RepositoryRecord> = {},
  media: Record<string, MediaRecord> = {}
): GedcomStats {
  const CURRENT_YEAR = new Date().getFullYear()
  let maleCount = 0
  let femaleCount = 0
  let unknownSexCount = 0
  let livingCount = 0
  let deceasedCount = 0
  let earliestYear: number | undefined
  let latestYear: number | undefined
  let totalEvents = 0
  const surnameCounts = new Map<string, number>()

  for (const indi of individuals) {
    if (indi.sex === 'M') maleCount++
    else if (indi.sex === 'F') femaleCount++
    else unknownSexCount++

    if (typeof indi.surname === 'string' && indi.surname.length > 0) {
      surnameCounts.set(indi.surname, (surnameCounts.get(indi.surname) ?? 0) + 1)
    }

    totalEvents += indi.events?.length ?? 0

    const hasExplicitDeath =
      indi.death !== undefined ||
      (indi.events?.some((e) => e.type === 'DEAT' || e.type === 'BURI' || e.type === 'CREM') ?? false)
    const isPresumedDeceased = hasExplicitDeath || (indi.birth?.year !== undefined && CURRENT_YEAR - indi.birth.year > 115)
    if (isPresumedDeceased) deceasedCount++
    else livingCount++

    if (indi.birth?.year !== undefined) {
      const y = indi.birth.year
      if (earliestYear === undefined || y < earliestYear) earliestYear = y
      if (latestYear === undefined || y > latestYear) latestYear = y
    }
    if (indi.death?.year !== undefined) {
      const y = indi.death.year
      if (earliestYear === undefined || y < earliestYear) earliestYear = y
      if (latestYear === undefined || y > latestYear) latestYear = y
    }
  }

  for (const fam of families) {
    totalEvents += fam.events?.length ?? 0
    if (fam.marriage?.year !== undefined) {
      const y = fam.marriage.year
      if (earliestYear === undefined || y < earliestYear) earliestYear = y
      if (latestYear === undefined || y > latestYear) latestYear = y
    }
  }

  const topSurnames = Array.from(surnameCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([surname, count]) => ({ surname, count }))

  // Estimate generations
  let generationCount = 0
  if (individuals.length > 0) {
    const parentToChildren = new Map<string, string[]>()
    const hasParent = new Set<string>()

    for (const fam of families) {
      const parents: string[] = []
      if (fam.husbandId !== undefined && fam.husbandId.length > 0) parents.push(fam.husbandId)
      if (fam.wifeId !== undefined && fam.wifeId.length > 0) parents.push(fam.wifeId)

      for (const childId of fam.childrenIds) {
        hasParent.add(childId)
        for (const p of parents) {
          const list = parentToChildren.get(p) ?? []
          list.push(childId)
          parentToChildren.set(p, list)
        }
      }
    }

    const roots = individuals.map((i) => i.id).filter((id) => id.length > 0 && !hasParent.has(id))
    if (roots.length === 0) {
      generationCount = 1
    } else {
      const memo = new Map<string, number>()
      const inStack = new Set<string>()

      const getSubtreeDepth = (id: string): number => {
        if (inStack.has(id)) return 0
        const cached = memo.get(id)
        if (cached !== undefined) return cached

        inStack.add(id)
        let maxChild = 0
        const children = parentToChildren.get(id) ?? []
        for (const ch of children) {
          maxChild = Math.max(maxChild, getSubtreeDepth(ch))
        }
        inStack.delete(id)

        const depth = 1 + maxChild
        memo.set(id, depth)
        return depth
      }

      let maxDepth = 1
      for (const r of roots) {
        maxDepth = Math.max(maxDepth, getSubtreeDepth(r))
      }
      generationCount = maxDepth
    }
  }

  return {
    totalIndividuals: individuals.length,
    totalFamilies: families.length,
    maleCount,
    femaleCount,
    unknownSexCount,
    earliestYear,
    latestYear,
    generationCount,
    topSurnames,
    totalSources: Object.keys(sources).length,
    totalRepositories: Object.keys(repositories).length,
    totalMedia: Object.keys(media).length,
    totalEvents,
    livingCount,
    deceasedCount,
  }
}

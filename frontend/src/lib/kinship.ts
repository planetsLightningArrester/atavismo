import { cleanName, formatLifespan } from './common'

export type RelationCategory =
  | 'self'
  | 'parent'
  | 'child'
  | 'grandparent'
  | 'grandchild'
  | 'great_grandparent'
  | 'great_grandchild'
  | 'ancestor'
  | 'descendant'
  | 'sibling'
  | 'half_sibling'
  | 'aunt_uncle'
  | 'niece_nephew'
  | 'great_aunt_uncle'
  | 'great_niece_nephew'
  | 'first_cousin'
  | 'nth_cousin'
  | 'cousin_removed'
  | 'spouse'
  | 'in_law'
  | 'unrelated'

export type StepEdgeType = 'parent' | 'child' | 'spouse'

export interface KinshipStep {
  personId: string
  name: string
  sex?: 'M' | 'F' | 'U'
  lifespan: string
  edgeToNext?: StepEdgeType
  isCommonAncestor?: boolean
}

export interface KinshipResult {
  personAId: string
  personBId: string
  relationType: RelationCategory
  isBloodRelation: boolean
  genA?: number
  genB?: number
  civilDegree?: number
  canonDegree?: number
  sharedDnaPercent: number
  cousinDegree?: number
  removal?: number
  generations?: number
  commonAncestorIds: string[]
  path: KinshipStep[]
}

export interface EraBucket {
  label: string
  births: number
  deaths: number
}

export interface AgeBracket {
  label: string
  count: number
  percent: number
}

export interface PlaceCount {
  place: string
  count: number
}

export interface MigrationRoute {
  origin: string
  destination: string
  count: number
  personIds: string[]
}

export interface LongevityRecord {
  id: string
  name: string
  age: number
  lifespan: string
}

export interface FamilySizeRecord {
  id: string
  parentsLabel: string
  childrenCount: number
}

export interface GenealogyAnalytics {
  averageLifespan: number | null
  maleAverageLifespan: number | null
  femaleAverageLifespan: number | null
  lifespanSampleSize: number
  longestLivedPerson: LongevityRecord | null
  averageMarriageAge: number | null
  marriageAgeSampleSize: number
  averageChildrenPerFamily: number
  largestFamily: FamilySizeRecord | null
  eraBuckets: EraBucket[]
  ageBrackets: AgeBracket[]
  topPlaces: PlaceCount[]
  migrationRoutes: MigrationRoute[]
}

/**
 * Calculates the genealogical relationship, consanguinity degrees, shared DNA percentage,
 * common ancestors, and shortest step-by-step kinship path between Person A and Person B.
 */
export function calculateKinship(
  individuals: Individual[],
  families: Family[],
  personAId: string,
  personBId: string
): KinshipResult {
  const indiMap = new Map<string, Individual>(individuals.map((i) => [i.id, i]))
  const famMap = new Map<string, Family>(families.map((f) => [f.id, f]))

  const makeStep = (
    id: string,
    edgeToNext?: StepEdgeType,
    isCommonAncestor?: boolean
  ): KinshipStep => {
    const p = indiMap.get(id)
    return {
      personId: id,
      name: cleanName(p?.name),
      sex: p?.sex,
      lifespan: formatLifespan(p?.birth, p?.death),
      edgeToNext,
      isCommonAncestor
    }
  }

  if (
    personAId.length === 0 ||
    personBId.length === 0 ||
    !indiMap.has(personAId) ||
    !indiMap.has(personBId)
  ) {
    return {
      personAId,
      personBId,
      relationType: 'unrelated',
      isBloodRelation: false,
      sharedDnaPercent: 0,
      commonAncestorIds: [],
      path: []
    }
  }

  if (personAId === personBId) {
    return {
      personAId,
      personBId,
      relationType: 'self',
      isBloodRelation: true,
      genA: 0,
      genB: 0,
      civilDegree: 0,
      canonDegree: 0,
      sharedDnaPercent: 100,
      commonAncestorIds: [personAId],
      path: [makeStep(personAId, undefined, true)]
    }
  }

  // Build parent, child, and spouse adjacency maps
  const parentsMap = new Map<string, string[]>()
  const childrenMap = new Map<string, string[]>()
  const spousesMap = new Map<string, string[]>()

  for (const indi of individuals) {
    const pList: string[] = []
    for (const famcId of indi.famc) {
      const fam = famMap.get(famcId)
      if (fam !== undefined) {
        if (typeof fam.husbandId === 'string' && fam.husbandId.length > 0 && indiMap.has(fam.husbandId)) {
          pList.push(fam.husbandId)
        }
        if (typeof fam.wifeId === 'string' && fam.wifeId.length > 0 && indiMap.has(fam.wifeId)) {
          pList.push(fam.wifeId)
        }
      }
    }
    parentsMap.set(indi.id, pList)

    const cList: string[] = []
    const sList: string[] = []
    for (const famsId of indi.fams) {
      const fam = famMap.get(famsId)
      if (fam !== undefined) {
        for (const chId of fam.childrenIds) {
          if (indiMap.has(chId)) cList.push(chId)
        }
        const partnerId = fam.husbandId === indi.id ? fam.wifeId : fam.husbandId
        if (typeof partnerId === 'string' && partnerId.length > 0 && indiMap.has(partnerId)) {
          sList.push(partnerId)
        }
      }
    }
    childrenMap.set(indi.id, cList)
    spousesMap.set(indi.id, sList)
  }

  // Upward BFS from a starting person to all ancestors
  const traceAncestors = (
    startId: string
  ): Map<string, { depth: number, nextTowardStart?: string }> => {
    const visited = new Map<string, { depth: number, nextTowardStart?: string }>()
    visited.set(startId, { depth: 0 })
    const queue: string[] = [startId]

    while (queue.length > 0) {
      const curr = queue.shift()
      if (curr === undefined) break
      const currEntry = visited.get(curr)
      if (currEntry === undefined) continue
      const parents = parentsMap.get(curr) ?? []
      for (const pId of parents) {
        if (!visited.has(pId)) {
          visited.set(pId, { depth: currEntry.depth + 1, nextTowardStart: curr })
          queue.push(pId)
        }
      }
    }
    return visited
  }

  const ancA = traceAncestors(personAId)
  const ancB = traceAncestors(personBId)

  // Find lowest common ancestors minimizing dA + dB
  let minTotalDist = Number.POSITIVE_INFINITY
  const candidateCommons: string[] = []

  for (const [ancId, infoA] of ancA.entries()) {
    const infoB = ancB.get(ancId)
    if (infoB !== undefined) {
      const total = infoA.depth + infoB.depth
      if (total < minTotalDist) {
        minTotalDist = total
      }
      candidateCommons.push(ancId)
    }
  }

  if (candidateCommons.length > 0 && Number.isFinite(minTotalDist)) {
    const lcaIds = candidateCommons.filter((id) => {
      const a = ancA.get(id)
      const b = ancB.get(id)
      return a !== undefined && b !== undefined && a.depth + b.depth === minTotalDist
    })

    const primaryLca = lcaIds[0]
    const dA = ancA.get(primaryLca)?.depth ?? 0
    const dB = ancB.get(primaryLca)?.depth ?? 0
    const civilDegree = dA + dB
    const canonDegree = Math.max(dA, dB)

    // Compute shared DNA % using path Wright's coefficient of relationship
    const pathMultiplier = dA === 0 || dB === 0 ? 1 : Math.min(2, lcaIds.length)
    const rawDna = pathMultiplier * Math.pow(0.5, dA + dB) * 100
    const sharedDnaPercent = Math.round(rawDna * 100) / 100

    // Reconstruct path: personA -> ... -> primaryLca -> ... -> personB
    const upChain: string[] = []
    let currUp: string | undefined = primaryLca
    while (currUp !== undefined) {
      upChain.push(currUp)
      currUp = ancA.get(currUp)?.nextTowardStart
    }
    upChain.reverse() // Now starts at personAId and ends at primaryLca

    const downChain: string[] = []
    let currDown = ancB.get(primaryLca)?.nextTowardStart
    while (currDown !== undefined) {
      downChain.push(currDown)
      currDown = ancB.get(currDown)?.nextTowardStart
    }

    const steps: KinshipStep[] = []
    for (let i = 0; i < upChain.length; i++) {
      const id = upChain[i]
      const isLca = id === primaryLca
      let edge: StepEdgeType | undefined
      if (i < upChain.length - 1) {
        edge = 'parent'
      } else if (downChain.length > 0) {
        edge = 'child'
      }
      steps.push(makeStep(id, edge, isLca))
    }

    for (let j = 0; j < downChain.length; j++) {
      const id = downChain[j]
      const edge: StepEdgeType | undefined = j < downChain.length - 1 ? 'child' : undefined
      steps.push(makeStep(id, edge, false))
    }

    // Classify exact relationship of Person B relative to Person A
    let relationType: RelationCategory = 'cousin_removed'
    let cousinDegree: number | undefined
    let removal: number | undefined
    let generations: number | undefined

    if (dA === 1 && dB === 0) {
      relationType = 'parent'
    } else if (dA === 0 && dB === 1) {
      relationType = 'child'
    } else if (dA === 2 && dB === 0) {
      relationType = 'grandparent'
    } else if (dA === 0 && dB === 2) {
      relationType = 'grandchild'
    } else if (dA === 3 && dB === 0) {
      relationType = 'great_grandparent'
    } else if (dA === 0 && dB === 3) {
      relationType = 'great_grandchild'
    } else if (dA > 3 && dB === 0) {
      relationType = 'ancestor'
      generations = dA
    } else if (dA === 0 && dB > 3) {
      relationType = 'descendant'
      generations = dB
    } else if (dA === 1 && dB === 1) {
      relationType = lcaIds.length === 1 ? 'half_sibling' : 'sibling'
    } else if (dA === 2 && dB === 1) {
      relationType = 'aunt_uncle'
    } else if (dA === 1 && dB === 2) {
      relationType = 'niece_nephew'
    } else if (dA >= 3 && dB === 1) {
      relationType = 'great_aunt_uncle'
      generations = dA - 1
    } else if (dA === 1 && dB >= 3) {
      relationType = 'great_niece_nephew'
      generations = dB - 1
    } else {
      cousinDegree = Math.min(dA, dB) - 1
      removal = Math.abs(dA - dB)
      if (cousinDegree === 1 && removal === 0) {
        relationType = 'first_cousin'
      } else if (removal === 0) {
        relationType = 'nth_cousin'
      } else {
        relationType = 'cousin_removed'
      }
    }

    return {
      personAId,
      personBId,
      relationType,
      isBloodRelation: true,
      genA: dA,
      genB: dB,
      civilDegree,
      canonDegree,
      sharedDnaPercent,
      cousinDegree,
      removal,
      generations,
      commonAncestorIds: lcaIds,
      path: steps
    }
  }

  // Fallback: Shortest path across all family links (including marriage/affinity edges)
  const visitedAny = new Map<string, { prevId?: string, edgeFromPrev?: StepEdgeType }>()
  visitedAny.set(personAId, {})
  const bfsQueue: string[] = [personAId]

  while (bfsQueue.length > 0) {
    const curr = bfsQueue.shift()
    if (curr === undefined) break
    if (curr === personBId) break

    const neighbors: Array<{ id: string, edge: StepEdgeType }> = []
    for (const pId of parentsMap.get(curr) ?? []) neighbors.push({ id: pId, edge: 'parent' })
    for (const cId of childrenMap.get(curr) ?? []) neighbors.push({ id: cId, edge: 'child' })
    for (const sId of spousesMap.get(curr) ?? []) neighbors.push({ id: sId, edge: 'spouse' })

    for (const n of neighbors) {
      if (!visitedAny.has(n.id)) {
        visitedAny.set(n.id, { prevId: curr, edgeFromPrev: n.edge })
        bfsQueue.push(n.id)
      }
    }
  }

  if (visitedAny.has(personBId)) {
    const chain: Array<{ id: string, edgeFromPrev?: StepEdgeType }> = []
    let curr: string | undefined = personBId
    while (curr !== undefined) {
      const info = visitedAny.get(curr)
      chain.push({ id: curr, edgeFromPrev: info?.edgeFromPrev })
      curr = info?.prevId
    }
    chain.reverse()

    const steps: KinshipStep[] = []
    for (let i = 0; i < chain.length; i++) {
      const nextEdge = i < chain.length - 1 ? chain[i + 1].edgeFromPrev : undefined
      steps.push(makeStep(chain[i].id, nextEdge, false))
    }

    const isDirectSpouse = steps.length === 2 && steps[0].edgeToNext === 'spouse'
    return {
      personAId,
      personBId,
      relationType: isDirectSpouse ? 'spouse' : 'in_law',
      isBloodRelation: false,
      civilDegree: steps.length - 1,
      sharedDnaPercent: 0,
      commonAncestorIds: [],
      path: steps
    }
  }

  return {
    personAId,
    personBId,
    relationType: 'unrelated',
    isBloodRelation: false,
    sharedDnaPercent: 0,
    commonAncestorIds: [],
    path: []
  }
}

/**
 * Extracts a concise geographic region label from a raw GEDCOM place string.
 * E.g. "Lisboa, Distrito de Lisboa, Portugal" -> "Lisboa, Portugal"
 */
function normalizePlaceRegion(rawPlace?: string): string {
  if (typeof rawPlace !== 'string' || rawPlace.trim().length === 0) return ''
  const parts = rawPlace
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts[0]}, ${parts[parts.length - 1]}`
}

/**
 * Computes comprehensive demographic, longevity, vital, and geographic migration analytics.
 */
export function computeGenealogyAnalytics(
  individuals: Individual[],
  families: Family[]
): GenealogyAnalytics {
  const indiMap = new Map<string, Individual>(individuals.map((i) => [i.id, i]))

  let totalAge = 0
  let totalAgeCount = 0
  let maleAgeSum = 0
  let maleAgeCount = 0
  let femaleAgeSum = 0
  let femaleAgeCount = 0
  let longestLivedPerson: LongevityRecord | null = null

  const bracketCounts = [0, 0, 0, 0, 0] // 0-19, 20-39, 40-59, 60-79, 80+
  const placeTotals = new Map<string, number>()
  const migrationMap = new Map<string, { origin: string, destination: string, personIds: string[] }>()

  const birthYears: number[] = []
  const deathYears: number[] = []

  for (const indi of individuals) {
    const bYear = indi.birth?.year
    const dYear = indi.death?.year

    if (bYear !== undefined) birthYears.push(bYear)
    if (dYear !== undefined) deathYears.push(dYear)

    if (bYear !== undefined && dYear !== undefined) {
      const age = dYear - bYear
      if (age >= 0 && age <= 125) {
        totalAge += age
        totalAgeCount++
        if (indi.sex === 'M') {
          maleAgeSum += age
          maleAgeCount++
        } else if (indi.sex === 'F') {
          femaleAgeSum += age
          femaleAgeCount++
        }

        if (age < 20) bracketCounts[0]++
        else if (age < 40) bracketCounts[1]++
        else if (age < 60) bracketCounts[2]++
        else if (age < 80) bracketCounts[3]++
        else bracketCounts[4]++

        if (longestLivedPerson === null || age > longestLivedPerson.age) {
          longestLivedPerson = {
            id: indi.id,
            name: cleanName(indi.name),
            age,
            lifespan: formatLifespan(indi.birth, indi.death)
          }
        }
      }
    }

    // Aggregate event places
    if (indi.events.length > 0) {
      for (const ev of indi.events) {
        const region = normalizePlaceRegion(ev.place)
        if (region.length > 0) {
          placeTotals.set(region, (placeTotals.get(region) ?? 0) + 1)
        }
      }
    } else {
      const bRegion = normalizePlaceRegion(indi.birth?.place)
      if (bRegion.length > 0) placeTotals.set(bRegion, (placeTotals.get(bRegion) ?? 0) + 1)
      const dRegion = normalizePlaceRegion(indi.death?.place)
      if (dRegion.length > 0) placeTotals.set(dRegion, (placeTotals.get(dRegion) ?? 0) + 1)
    }

    // Detect migration route (birth place -> immigration or death place)
    const originRegion = normalizePlaceRegion(indi.birth?.place)
    const immiEvent = indi.events.find((e) => e.type === 'IMMI' && typeof e.place === 'string' && e.place.length > 0)
    const destRegion = normalizePlaceRegion(addFallbackPlace(indi.death?.place, immiEvent?.place))

    if (originRegion.length > 0 && destRegion.length > 0 && originRegion !== destRegion) {
      const key = `${originRegion}|||${destRegion}`
      const existing = migrationMap.get(key)
      if (existing !== undefined) {
        existing.personIds.push(indi.id)
      } else {
        migrationMap.set(key, {
          origin: originRegion,
          destination: destRegion,
          personIds: [indi.id]
        })
      }
    }
  }

  // Marriage age & family size statistics
  let marriageAgeSum = 0
  let marriageAgeCount = 0
  let totalChildrenInFamilies = 0
  let largestFamily: FamilySizeRecord | null = null

  for (const fam of families) {
    const chCount = fam.childrenIds.length
    totalChildrenInFamilies += chCount

    if (chCount > 0 && (largestFamily === null || chCount > largestFamily.childrenCount)) {
      const h = typeof fam.husbandId === 'string' ? indiMap.get(fam.husbandId) : undefined
      const w = typeof fam.wifeId === 'string' ? indiMap.get(fam.wifeId) : undefined
      const hName = h !== undefined ? cleanName(h.name) : ''
      const wName = w !== undefined ? cleanName(w.name) : ''
      const parentsLabel =
        hName.length > 0 && wName.length > 0
          ? `${hName} & ${wName}`
          : hName.length > 0
            ? hName
            : wName.length > 0
              ? wName
              : fam.id

      largestFamily = {
        id: fam.id,
        parentsLabel,
        childrenCount: chCount
      }
    }

    for (const fev of fam.events) {
      const fRegion = normalizePlaceRegion(fev.place)
      if (fRegion.length > 0) {
        placeTotals.set(fRegion, (placeTotals.get(fRegion) ?? 0) + 1)
      }
    }

    const mYear = fam.marriage?.year ?? fam.events.find((e) => e.type === 'MARR')?.year
    if (mYear !== undefined) {
      if (typeof fam.husbandId === 'string') {
        const hBirth = indiMap.get(fam.husbandId)?.birth?.year
        if (hBirth !== undefined && mYear - hBirth >= 12 && mYear - hBirth <= 85) {
          marriageAgeSum += mYear - hBirth
          marriageAgeCount++
        }
      }
      if (typeof fam.wifeId === 'string') {
        const wBirth = indiMap.get(fam.wifeId)?.birth?.year
        if (wBirth !== undefined && mYear - wBirth >= 12 && mYear - wBirth <= 85) {
          marriageAgeSum += mYear - wBirth
          marriageAgeCount++
        }
      }
    }
  }

  // Build chronological 20-year era buckets
  const allYears = [...birthYears, ...deathYears]
  const eraBuckets: EraBucket[] = []
  if (allYears.length > 0) {
    const minY = Math.min(...allYears)
    const maxY = Math.max(...allYears)
    const step = maxY - minY > 100 ? 20 : 10
    const startBucket = Math.floor(minY / step) * step
    const endBucket = Math.floor(maxY / step) * step

    for (let y = startBucket; y <= endBucket; y += step) {
      const bCount = birthYears.filter((by) => by >= y && by < y + step).length
      const dCount = deathYears.filter((dy) => dy >= y && dy < y + step).length
      if (bCount > 0 || dCount > 0) {
        eraBuckets.push({
          label: `${y}–${y + step - 1}`,
          births: bCount,
          deaths: dCount
        })
      }
    }
  }

  const bracketLabels = ['0–19', '20–39', '40–59', '60–79', '80+']
  const ageBrackets: AgeBracket[] = bracketLabels.map((label, idx) => ({
    label,
    count: bracketCounts[idx],
    percent: totalAgeCount > 0 ? Math.round((bracketCounts[idx] / totalAgeCount) * 100) : 0
  }))

  const topPlaces: PlaceCount[] = Array.from(placeTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([place, count]) => ({ place, count }))

  const migrationRoutes: MigrationRoute[] = Array.from(migrationMap.values())
    .map((m) => ({
      origin: m.origin,
      destination: m.destination,
      count: m.personIds.length,
      personIds: m.personIds
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return {
    averageLifespan: totalAgeCount > 0 ? Math.round((totalAge / totalAgeCount) * 10) / 10 : null,
    maleAverageLifespan: maleAgeCount > 0 ? Math.round((maleAgeSum / maleAgeCount) * 10) / 10 : null,
    femaleAverageLifespan: femaleAgeCount > 0 ? Math.round((femaleAgeSum / femaleAgeCount) * 10) / 10 : null,
    lifespanSampleSize: totalAgeCount,
    longestLivedPerson,
    averageMarriageAge: marriageAgeCount > 0 ? Math.round((marriageAgeSum / marriageAgeCount) * 10) / 10 : null,
    marriageAgeSampleSize: marriageAgeCount,
    averageChildrenPerFamily:
      families.length > 0 ? Math.round((totalChildrenInFamilies / families.length) * 10) / 10 : 0,
    largestFamily,
    eraBuckets,
    ageBrackets,
    topPlaces,
    migrationRoutes
  }
}

function addFallbackPlace(primary?: string, fallback?: string): string | undefined {
  if (typeof primary === 'string' && primary.trim().length > 0) return primary
  return fallback
}

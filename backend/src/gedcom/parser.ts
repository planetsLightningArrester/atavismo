import {
  GedcomData,
  GedcomStats,
  Individual,
  Family,
  EventDetails,
  Metadata
} from './model'

interface GedcomLine {
  level: number
  xref?: string
  tag: string
  value?: string
}

/**
 * Custom zero-dependency GEDCOM parser.
 * Conforms to GEDCOM 5.5.1 line grammar and structure.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GedcomParser {
  /**
   * Parses a raw GEDCOM text string into a structured GedcomData object.
   * @param text Raw content of the .ged file
   * @returns Parsed GedcomData
   */
  static parse(text: string): GedcomData {
    const data = new GedcomData()
    if (typeof text !== 'string' || text.trim().length === 0) {
      return data
    }

    // Strip UTF-8 BOM if present and normalize line breaks
    const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const rawLines = cleanText.split('\n')

    const parsedLines: GedcomLine[] = []
    for (const rawLine of rawLines) {
      const line = rawLine.trim()
      if (line.length === 0) continue

      const parsed = GedcomParser.parseLine(line)
      if (parsed !== undefined) {
        parsedLines.push(parsed)
      }
    }

    // Group lines by Level 0 records
    let currentRecordLines: GedcomLine[] = []
    for (const line of parsedLines) {
      if (line.level === 0) {
        if (currentRecordLines.length > 0) {
          GedcomParser.processRecord(currentRecordLines, data)
        }
        currentRecordLines = [line]
      } else {
        currentRecordLines.push(line)
      }
    }

    if (currentRecordLines.length > 0) {
      GedcomParser.processRecord(currentRecordLines, data)
    }

    // Compute aggregate statistics
    data.stats = GedcomParser.calculateStats(data)

    return data
  }

  /**
   * Parses a single raw GEDCOM line into level, optional xref ID, tag, and value.
   */
  private static parseLine(line: string): GedcomLine | undefined {
    const parts = line.split(' ')
    if (parts.length === 0) return undefined

    const level = parseInt(parts[0], 10)
    if (isNaN(level)) return undefined

    if (parts.length === 1) {
      return { level, tag: '' }
    }

    let xref: string | undefined
    let tag = ''
    let value: string | undefined

    if (parts[1].startsWith('@') && parts[1].endsWith('@')) {
      // Format: 0 @I1@ INDI
      xref = parts[1]
      tag = parts.length > 2 ? parts[2].toUpperCase() : ''
      if (parts.length > 3) {
        value = parts.slice(3).join(' ')
      }
    } else {
      // Format: 1 NAME John /Doe/
      tag = parts[1].toUpperCase()
      if (parts.length > 2) {
        value = parts.slice(2).join(' ')
      }
    }

    return { level, xref, tag, value }
  }

  /**
   * Processes a complete level 0 record and its children.
   */
  private static processRecord(lines: GedcomLine[], data: GedcomData): void {
    if (lines.length === 0) return
    const root = lines[0]

    if (root.tag === 'HEAD') {
      data.metadata = GedcomParser.parseHeader(lines)
    } else if (root.tag === 'INDI') {
      const indi = GedcomParser.parseIndividual(lines)
      data.individuals.push(indi)
    } else if (root.tag === 'FAM') {
      const fam = GedcomParser.parseFamily(lines)
      data.families.push(fam)
    }
  }

  /**
   * Parses HEAD metadata block.
   */
  private static parseHeader(lines: GedcomLine[]): Metadata {
    const meta = new Metadata()
    let inSource = false
    let inGedc = false

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.level === 1) {
        inSource = line.tag === 'SOUR'
        inGedc = line.tag === 'GEDC'
        if (inSource && line.value !== undefined) meta.source = line.value
        if (line.tag === 'CHAR' && line.value !== undefined) meta.encoding = line.value
        if (line.tag === 'SUBM' && line.value !== undefined) meta.submitter = line.value
      } else if (line.level === 2) {
        if (inSource) {
          if (line.tag === 'VERS' && line.value !== undefined) meta.version = line.value
          if (line.tag === 'NAME' && line.value !== undefined) meta.name = line.value
          if (line.tag === 'CORP' && line.value !== undefined) meta.corporation = line.value
        } else if (inGedc) {
          if (line.tag === 'VERS' && line.value !== undefined) meta.atavismVersion = line.value
        }
      }
    }

    return meta
  }

  /**
   * Parses an Individual record.
   */
  private static parseIndividual(lines: GedcomLine[]): Individual {
    const indi = new Individual()
    indi.id = lines[0].xref ?? lines[0].value ?? ''

    let currentEvent: EventDetails | undefined
    let currentEventTag = ''
    let parsingNote = false

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]

      if (line.level === 1) {
        // Finalize previous event
        if (currentEvent !== undefined) {
          if (currentEventTag === 'BIRT') indi.birth = currentEvent
          else if (currentEventTag === 'DEAT') indi.death = currentEvent
          currentEvent = undefined
          currentEventTag = ''
        }
        parsingNote = false

        if (line.tag === 'NAME' && line.value !== undefined) {
          indi.name = line.value
          // Extract surname between slashes e.g. "John /Doe/"
          const surnameMatch = /\/([^/]+)\//.exec(line.value)
          if (surnameMatch?.[1] !== undefined) {
            indi.surname = surnameMatch[1].trim()
            indi.givenName = line.value.replace(/\/[^/]+\//, '').trim()
          } else {
            indi.givenName = line.value.trim()
          }
        } else if (line.tag === 'SEX' && line.value !== undefined) {
          const val = line.value.trim().toUpperCase()
          if (val === 'M' || val === 'F' || val === 'U') {
            indi.sex = val
          }
        } else if (line.tag === 'BIRT' || line.tag === 'DEAT') {
          currentEventTag = line.tag
          currentEvent = new EventDetails()
          currentEvent.type = line.tag
        } else if (line.tag === 'FAMS' && line.value !== undefined) {
          indi.fams.push(line.value.trim())
        } else if (line.tag === 'FAMC' && line.value !== undefined) {
          indi.famc.push(line.value.trim())
        } else if (line.tag === '_LHASH' && line.value !== undefined) {
          indi.lhash = line.value.trim()
        } else if (line.tag === '_HASH' && line.value !== undefined) {
          indi.hash = line.value.trim()
        } else if (line.tag === 'NOTE') {
          parsingNote = true
          indi.notes = line.value ?? ''
        }
      } else if (line.level === 2) {
        if (currentEvent !== undefined) {
          if (line.tag === 'DATE' && line.value !== undefined) {
            currentEvent.date = line.value.trim()
            currentEvent.year = GedcomParser.extractYear(currentEvent.date)
          } else if (line.tag === 'PLAC' && line.value !== undefined) {
            currentEvent.place = line.value.trim()
          }
        } else if (parsingNote && line.value !== undefined) {
          if (line.tag === 'CONT') {
            const prev = indi.notes ?? ''
            indi.notes = (prev.length > 0 ? prev + '\n' : '') + line.value
          } else if (line.tag === 'CONC') {
            indi.notes = (indi.notes ?? '') + line.value
          }
        }
      }
    }

    if (currentEvent !== undefined) {
      if (currentEventTag === 'BIRT') indi.birth = currentEvent
      else if (currentEventTag === 'DEAT') indi.death = currentEvent
    }

    return indi
  }

  /**
   * Parses a Family record.
   */
  private static parseFamily(lines: GedcomLine[]): Family {
    const fam = new Family()
    fam.id = lines[0].xref ?? lines[0].value ?? ''

    let currentEvent: EventDetails | undefined

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]

      if (line.level === 1) {
        if (currentEvent !== undefined) {
          fam.marriage = currentEvent
          currentEvent = undefined
        }

        if (line.tag === 'HUSB' && line.value !== undefined) {
          fam.husbandId = line.value.trim()
        } else if (line.tag === 'WIFE' && line.value !== undefined) {
          fam.wifeId = line.value.trim()
        } else if (line.tag === 'CHIL' && line.value !== undefined) {
          fam.childrenIds.push(line.value.trim())
        } else if (line.tag === 'MARR') {
          currentEvent = new EventDetails()
          currentEvent.type = 'MARR'
        } else if (line.tag === 'DIV') {
          fam.divorced = true
        } else if (line.tag === '_HASH' && line.value !== undefined) {
          fam.hash = line.value.trim()
        }
      } else if (line.level === 2 && currentEvent !== undefined) {
        if (line.tag === 'DATE' && line.value !== undefined) {
          currentEvent.date = line.value.trim()
          currentEvent.year = GedcomParser.extractYear(currentEvent.date)
        } else if (line.tag === 'PLAC' && line.value !== undefined) {
          currentEvent.place = line.value.trim()
        }
      }
    }

    if (currentEvent !== undefined) {
      fam.marriage = currentEvent
    }

    return fam
  }

  /**
   * Extracts a 4-digit year from a GEDCOM date string.
   */
  private static extractYear(dateStr: string): number | undefined {
    const match = /\b(\d{3,4})\b/.exec(dateStr)
    if (match?.[1] !== undefined) {
      const year = parseInt(match[1], 10)
      if (!isNaN(year)) return year
    }
    return undefined
  }

  /**
   * Computes aggregate summary statistics for the dataset.
   */
  private static calculateStats(data: GedcomData): GedcomStats {
    const stats = new GedcomStats()
    stats.totalIndividuals = data.individuals.length
    stats.totalFamilies = data.families.length

    const surnameCounts = new Map<string, number>()
    let minYear: number | undefined
    let maxYear: number | undefined

    for (const indi of data.individuals) {
      if (indi.sex === 'M') stats.maleCount++
      else if (indi.sex === 'F') stats.femaleCount++
      else stats.unknownSexCount++

      if (typeof indi.surname === 'string' && indi.surname.length > 0) {
        const count = surnameCounts.get(indi.surname) ?? 0
        surnameCounts.set(indi.surname, count + 1)
      }

      if (indi.birth?.year !== undefined) {
        const y = indi.birth.year
        if (minYear === undefined || y < minYear) minYear = y
        if (maxYear === undefined || y > maxYear) maxYear = y
      }
      if (indi.death?.year !== undefined) {
        const y = indi.death.year
        if (minYear === undefined || y < minYear) minYear = y
        if (maxYear === undefined || y > maxYear) maxYear = y
      }
    }

    stats.earliestYear = minYear
    stats.latestYear = maxYear

    // Top surnames
    const sortedSurnames = Array.from(surnameCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([surname, count]) => ({ surname, count }))
    stats.topSurnames = sortedSurnames

    // Estimate generation depth
    stats.generationCount = GedcomParser.estimateGenerations(data)

    return stats
  }

  /**
   * Estimates generation depth across the family graph.
   */
  private static estimateGenerations(data: GedcomData): number {
    if (data.individuals.length === 0) return 0

    // Build parent -> child map
    const parentToChildren = new Map<string, string[]>()
    const hasParent = new Set<string>()

    for (const fam of data.families) {
      const parents: string[] = []
      if (typeof fam.husbandId === 'string' && fam.husbandId.length > 0) parents.push(fam.husbandId)
      if (typeof fam.wifeId === 'string' && fam.wifeId.length > 0) parents.push(fam.wifeId)

      for (const childId of fam.childrenIds) {
        hasParent.add(childId)
        for (const p of parents) {
          const list = parentToChildren.get(p) ?? []
          list.push(childId)
          parentToChildren.set(p, list)
        }
      }
    }

    // Root individuals have no parents recorded in the dataset
    const roots = data.individuals
      .map(i => i.id)
      .filter(id => id.length > 0 && !hasParent.has(id))

    if (roots.length === 0) return 1

    let maxDepth = 1
    const visited = new Set<string>()

    const getDepth = (id: string, currentDepth: number): number => {
      if (visited.has(id) || currentDepth > 50) return currentDepth
      visited.add(id)

      const children = parentToChildren.get(id) ?? []
      if (children.length === 0) return currentDepth

      let maxChildDepth = currentDepth
      for (const child of children) {
        const d = getDepth(child, currentDepth + 1)
        if (d > maxChildDepth) maxChildDepth = d
      }
      return maxChildDepth
    }

    for (const root of roots) {
      visited.clear()
      const d = getDepth(root, 1)
      if (d > maxDepth) maxDepth = d
    }

    return maxDepth
  }
}

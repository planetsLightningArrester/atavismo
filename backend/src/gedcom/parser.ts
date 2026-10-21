import {
  GedcomData,
  GedcomStats,
  Individual,
  Family,
  EventDetails,
  LifeEvent,
  Citation,
  SourceRecord,
  RepositoryRecord,
  MediaRecord,
  SubmitterRecord,
  ParserDiagnostic,
  Metadata
} from './model'

interface GedcomLine {
  level: number
  xref?: string
  tag: string
  value?: string
  lineNumber: number
}

/**
 * Standard individual event tags recognized by GEDCOM 5.5.1 / 7.0.
 */
const INDIVIDUAL_EVENT_TAGS = new Set([
  'BIRT', 'CHR', 'DEAT', 'BURI', 'CREM', 'ADOP', 'BAPM', 'BARM', 'BASM',
  'BLES', 'CHRA', 'CONF', 'FCOM', 'ORDN', 'NATU', 'EMIG', 'IMMI', 'CENS',
  'PROB', 'WILL', 'GRAD', 'RETI', 'OCCU', 'RESI', 'EDUC', 'DSCR', 'EVEN'
])

/**
 * Standard family event tags recognized by GEDCOM 5.5.1 / 7.0.
 */
const FAMILY_EVENT_TAGS = new Set([
  'ANUL', 'CENS', 'DIV', 'DIVF', 'ENGA', 'MARB', 'MARC', 'MARR', 'MARL',
  'MARS', 'RESI', 'EVEN', 'SEPR'
])

/**
 * Custom zero-dependency GEDCOM parser engine.
 * Full-featured implementation supporting GEDCOM 5.5.1 / 7.0 AST,
 * top-level entities, events, citations, notes, and diagnostics.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GedcomParser {
  /**
   * Parses raw GEDCOM content into a structured GedcomData AST.
   * @param text Raw string content of the .ged file
   * @returns Fully parsed GedcomData object
   */
  static parse(text: string): GedcomData {
    const data = new GedcomData()
    if (typeof text !== 'string' || text.trim().length === 0) {
      return data
    }

    // Normalize line breaks & strip UTF-8 BOM
    const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const rawLines = cleanText.split('\n')

    const parsedLines: GedcomLine[] = []
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim()
      if (line.length === 0) continue

      const parsed = GedcomParser.parseLine(line, i + 1)
      if (parsed !== undefined) {
        parsedLines.push(parsed)
      }
    }

    // Group lines into Level 0 record chunks
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

    // Validate cross-reference pointers
    GedcomParser.validateCrossReferences(data)

    // Compute aggregate summary statistics
    data.stats = GedcomParser.calculateStats(data)

    return data
  }

  /**
   * Parses a single raw line into level, optional xref, tag, and value.
   */
  private static parseLine(line: string, lineNumber: number): GedcomLine | undefined {
    const parts = line.split(' ')
    if (parts.length === 0) return undefined

    const level = parseInt(parts[0], 10)
    if (isNaN(level) || level < 0) return undefined

    if (parts.length === 1) {
      return { level, tag: '', lineNumber }
    }

    let xref: string | undefined
    let tag = ''
    let value: string | undefined

    if (parts[1].startsWith('@') && parts[1].endsWith('@')) {
      // Format: 0 @I1@ INDI or 1 @S1@ SOUR
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

    return { level, xref, tag, value, lineNumber }
  }

  /**
   * Dispatches a complete Level 0 record to its specialized entity parser.
   */
  private static processRecord(lines: GedcomLine[], data: GedcomData): void {
    if (lines.length === 0) return
    const root = lines[0]

    switch (root.tag) {
      case 'HEAD':
        data.metadata = GedcomParser.parseHeader(lines)
        break
      case 'INDI':
        data.individuals.push(GedcomParser.parseIndividual(lines))
        break
      case 'FAM':
        data.families.push(GedcomParser.parseFamily(lines))
        break
      case 'SOUR':
        if (typeof root.xref === 'string' && root.xref.length > 0) {
          data.sources[root.xref] = GedcomParser.parseSourceRecord(lines)
        }
        break
      case 'REPO':
        if (typeof root.xref === 'string' && root.xref.length > 0) {
          data.repositories[root.xref] = GedcomParser.parseRepositoryRecord(lines)
        }
        break
      case 'OBJE':
        if (typeof root.xref === 'string' && root.xref.length > 0) {
          data.media[root.xref] = GedcomParser.parseMediaRecord(lines)
        }
        break
      case 'SUBM':
        data.submitter = GedcomParser.parseSubmitterRecord(lines)
        break
      case 'TRLR':
        // Trailer record marks EOF
        break
      default:
        GedcomParser.addDiagnostic(data, 'INFO', `Unrecognized Level 0 tag '${root.tag}'`, root.tag, root.lineNumber)
        break
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
        if (line.tag === 'DEST' && line.value !== undefined) meta.destination = line.value
        if (line.tag === 'DATE' && line.value !== undefined) meta.date = line.value
        if (line.tag === 'LANG' && line.value !== undefined) meta.language = line.value
        if (line.tag === 'NOTE' && line.value !== undefined) meta.notes = line.value
      } else if (line.level === 2) {
        if (inSource) {
          if (line.tag === 'VERS' && line.value !== undefined) meta.version = line.value
          if (line.tag === 'NAME' && line.value !== undefined) meta.name = line.value
          if (line.tag === 'CORP' && line.value !== undefined) meta.corporation = line.value
        } else if (inGedc) {
          if (line.tag === 'VERS' && line.value !== undefined) meta.atavismVersion = line.value
        } else if (line.tag === 'TIME' && line.value !== undefined) {
          meta.time = line.value
        }
      }
    }

    return meta
  }

  /**
   * Parses an Individual (INDI) record with all vital and life events,
   * family linkages, citations, and notes.
   */
  private static parseIndividual(lines: GedcomLine[]): Individual {
    const indi = new Individual()
    indi.id = lines[0].xref ?? lines[0].value ?? ''

    let currentEvent: LifeEvent | undefined
    let currentCitation: Citation | undefined
    let currentNoteTarget: { notes?: string } | undefined

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]

      if (line.level === 1) {
        // Finalize previous event or citation
        if (currentEvent !== undefined) {
          indi.events.push(currentEvent)
          currentEvent = undefined
        }
        if (currentCitation !== undefined) {
          indi.citations.push(currentCitation)
          currentCitation = undefined
        }
        currentNoteTarget = undefined

        if (line.tag === 'NAME' && line.value !== undefined) {
          indi.name = line.value
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
        } else if (INDIVIDUAL_EVENT_TAGS.has(line.tag)) {
          currentEvent = new LifeEvent()
          currentEvent.type = line.tag
          if (line.value !== undefined && line.value.length > 0) {
            currentEvent.value = line.value.trim()
          }
        } else if (line.tag === 'SOUR' && line.value !== undefined) {
          currentCitation = new Citation()
          currentCitation.sourceId = line.value.trim()
        } else if (line.tag === 'OBJE' && line.value !== undefined) {
          indi.mediaIds.push(line.value.trim())
        } else if (line.tag === 'FAMS' && line.value !== undefined) {
          indi.fams.push(line.value.trim())
        } else if (line.tag === 'FAMC' && line.value !== undefined) {
          indi.famc.push(line.value.trim())
        } else if (line.tag === '_LHASH' && line.value !== undefined) {
          indi.lhash = line.value.trim()
        } else if (line.tag === '_HASH' && line.value !== undefined) {
          indi.hash = line.value.trim()
        } else if (line.tag === 'NOTE') {
          currentNoteTarget = indi
          indi.notes = line.value ?? ''
        }
      } else if (line.level === 2) {
        if (currentEvent !== undefined) {
          if (line.tag !== 'CONT' && line.tag !== 'CONC') {
            currentNoteTarget = undefined
          }
          if (line.tag === 'DATE' && line.value !== undefined) {
            currentEvent.date = line.value.trim()
            currentEvent.year = GedcomParser.extractYear(currentEvent.date)
          } else if (line.tag === 'PLAC' && line.value !== undefined) {
            currentEvent.place = line.value.trim()
          } else if (line.tag === 'CAUS' && line.value !== undefined) {
            currentEvent.cause = line.value.trim()
          } else if (line.tag === 'SOUR' && line.value !== undefined) {
            const cit = new Citation()
            cit.sourceId = line.value.trim()
            currentEvent.citations.push(cit)
          } else if (line.tag === 'NOTE') {
            currentNoteTarget = currentEvent
            currentEvent.notes = line.value ?? ''
          } else if (currentNoteTarget !== undefined && (line.tag === 'CONT' || line.tag === 'CONC')) {
            const val = line.value ?? ''
            if (line.tag === 'CONT') {
              const prev = currentNoteTarget.notes ?? ''
              currentNoteTarget.notes = (prev.length > 0 ? prev + '\n' : '') + val
            } else if (line.tag === 'CONC') {
              currentNoteTarget.notes = (currentNoteTarget.notes ?? '') + val
            }
          }
        } else if (currentCitation !== undefined) {
          if (line.tag === 'PAGE' && line.value !== undefined) {
            currentCitation.page = line.value.trim()
          } else if (line.tag === 'QUAY' && line.value !== undefined) {
            const q = parseInt(line.value, 10)
            if (!isNaN(q)) currentCitation.quay = q
          } else if (line.tag === 'DATA' && line.value !== undefined) {
            currentCitation.text = line.value.trim()
          }
        } else if (line.tag === 'GIVN' && line.value !== undefined) {
          indi.givenName = line.value.trim()
        } else if (line.tag === 'SURN' && line.value !== undefined) {
          indi.surname = line.value.trim()
        } else if (line.tag === 'NICK' && line.value !== undefined) {
          indi.nick = line.value.trim()
        } else if (line.tag === '_MARNM' && line.value !== undefined) {
          indi.marriedName = line.value.trim()
        } else if (currentNoteTarget !== undefined && (line.tag === 'CONT' || line.tag === 'CONC')) {
          const val = line.value ?? ''
          if (line.tag === 'CONT') {
            const prev = currentNoteTarget.notes ?? ''
            currentNoteTarget.notes = (prev.length > 0 ? prev + '\n' : '') + val
          } else if (line.tag === 'CONC') {
            currentNoteTarget.notes = (currentNoteTarget.notes ?? '') + val
          }
        }
      } else if (line.level === 3) {
        if (currentNoteTarget !== undefined && (line.tag === 'CONT' || line.tag === 'CONC')) {
          const val = line.value ?? ''
          if (line.tag === 'CONT') {
            const prev = currentNoteTarget.notes ?? ''
            currentNoteTarget.notes = (prev.length > 0 ? prev + '\n' : '') + val
          } else if (line.tag === 'CONC') {
            currentNoteTarget.notes = (currentNoteTarget.notes ?? '') + val
          }
        } else if (currentEvent !== undefined && currentEvent.citations.length > 0) {
          const lastCit = currentEvent.citations[currentEvent.citations.length - 1]
          if (line.tag === 'PAGE' && line.value !== undefined) {
            lastCit.page = line.value.trim()
          } else if (line.tag === 'QUAY' && line.value !== undefined) {
            const q = parseInt(line.value, 10)
            if (!isNaN(q)) lastCit.quay = q
          } else if (line.tag === 'DATA') {
            // Container for text
          }
        }
      } else if (line.level === 4) {
        if (currentEvent !== undefined && currentEvent.citations.length > 0) {
          const lastCit = currentEvent.citations[currentEvent.citations.length - 1]
          if (line.tag === 'TEXT' && line.value !== undefined) {
            lastCit.text = line.value.trim()
          }
        }
      }
    }

    if (currentEvent !== undefined) {
      indi.events.push(currentEvent)
    }
    if (currentCitation !== undefined) {
      indi.citations.push(currentCitation)
    }

    // Populate backwards-compatible birth & death EventDetails prioritizing canonical events
    const primaryBirth = indi.events.find(e => e.type === 'BIRT') ??
      indi.events.find(e => e.type === 'CHR' || e.type === 'BAPM')
    if (primaryBirth !== undefined) {
      const details = new EventDetails()
      details.type = primaryBirth.type
      details.date = primaryBirth.date
      details.place = primaryBirth.place
      details.year = primaryBirth.year
      indi.birth = details
    }

    const primaryDeath = indi.events.find(e => e.type === 'DEAT') ??
      indi.events.find(e => e.type === 'BURI' || e.type === 'CREM')
    if (primaryDeath !== undefined) {
      const details = new EventDetails()
      details.type = primaryDeath.type
      details.date = primaryDeath.date
      details.place = primaryDeath.place
      details.year = primaryDeath.year
      indi.death = details
    }

    return indi
  }

  /**
   * Parses a Family (FAM) record with spouses, children, events, and citations.
   */
  private static parseFamily(lines: GedcomLine[]): Family {
    const fam = new Family()
    fam.id = lines[0].xref ?? lines[0].value ?? ''

    let currentEvent: LifeEvent | undefined
    let currentCitation: Citation | undefined
    let currentNoteTarget: { notes?: string } | undefined

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]

      if (line.level === 1) {
        if (currentEvent !== undefined) {
          fam.events.push(currentEvent)
          currentEvent = undefined
        }
        if (currentCitation !== undefined) {
          fam.citations.push(currentCitation)
          currentCitation = undefined
        }
        currentNoteTarget = undefined

        if (line.tag === 'HUSB' && line.value !== undefined) {
          fam.husbandId = line.value.trim()
        } else if (line.tag === 'WIFE' && line.value !== undefined) {
          fam.wifeId = line.value.trim()
        } else if (line.tag === 'CHIL' && line.value !== undefined) {
          fam.childrenIds.push(line.value.trim())
        } else if (FAMILY_EVENT_TAGS.has(line.tag)) {
          currentEvent = new LifeEvent()
          currentEvent.type = line.tag
          if (line.tag === 'DIV' || line.tag === 'DIVF' || line.tag === 'ANUL') {
            fam.divorced = true
          }
        } else if (line.tag === 'SOUR' && line.value !== undefined) {
          currentCitation = new Citation()
          currentCitation.sourceId = line.value.trim()
        } else if (line.tag === 'OBJE' && line.value !== undefined) {
          fam.mediaIds.push(line.value.trim())
        } else if (line.tag === '_HASH' && line.value !== undefined) {
          fam.hash = line.value.trim()
        } else if (line.tag === 'NOTE') {
          currentNoteTarget = fam
          fam.notes = line.value ?? ''
        }
      } else if (line.level === 2) {
        if (currentEvent !== undefined) {
          if (line.tag !== 'CONT' && line.tag !== 'CONC') {
            currentNoteTarget = undefined
          }
          if (line.tag === 'DATE' && line.value !== undefined) {
            currentEvent.date = line.value.trim()
            currentEvent.year = GedcomParser.extractYear(currentEvent.date)
          } else if (line.tag === 'PLAC' && line.value !== undefined) {
            currentEvent.place = line.value.trim()
          } else if (line.tag === 'SOUR' && line.value !== undefined) {
            const cit = new Citation()
            cit.sourceId = line.value.trim()
            currentEvent.citations.push(cit)
          } else if (line.tag === 'NOTE') {
            currentNoteTarget = currentEvent
            currentEvent.notes = line.value ?? ''
          } else if (currentNoteTarget !== undefined && (line.tag === 'CONT' || line.tag === 'CONC')) {
            const val = line.value ?? ''
            if (line.tag === 'CONT') {
              const prev = currentNoteTarget.notes ?? ''
              currentNoteTarget.notes = (prev.length > 0 ? prev + '\n' : '') + val
            } else if (line.tag === 'CONC') {
              currentNoteTarget.notes = (currentNoteTarget.notes ?? '') + val
            }
          }
        } else if (currentCitation !== undefined) {
          if (line.tag === 'PAGE' && line.value !== undefined) {
            currentCitation.page = line.value.trim()
          } else if (line.tag === 'QUAY' && line.value !== undefined) {
            const q = parseInt(line.value, 10)
            if (!isNaN(q)) currentCitation.quay = q
          }
        } else if (currentNoteTarget !== undefined && (line.tag === 'CONT' || line.tag === 'CONC')) {
          const val = line.value ?? ''
          if (line.tag === 'CONT') {
            const prev = currentNoteTarget.notes ?? ''
            currentNoteTarget.notes = (prev.length > 0 ? prev + '\n' : '') + val
          } else if (line.tag === 'CONC') {
            currentNoteTarget.notes = (currentNoteTarget.notes ?? '') + val
          }
        }
      } else if (line.level === 3) {
        if (currentNoteTarget !== undefined && (line.tag === 'CONT' || line.tag === 'CONC')) {
          const val = line.value ?? ''
          if (line.tag === 'CONT') {
            const prev = currentNoteTarget.notes ?? ''
            currentNoteTarget.notes = (prev.length > 0 ? prev + '\n' : '') + val
          } else if (line.tag === 'CONC') {
            currentNoteTarget.notes = (currentNoteTarget.notes ?? '') + val
          }
        } else if (currentEvent !== undefined && currentEvent.citations.length > 0) {
          const lastCit = currentEvent.citations[currentEvent.citations.length - 1]
          if (line.tag === 'PAGE' && line.value !== undefined) {
            lastCit.page = line.value.trim()
          } else if (line.tag === 'QUAY' && line.value !== undefined) {
            const q = parseInt(line.value, 10)
            if (!isNaN(q)) lastCit.quay = q
          }
        }
      }
    }

    if (currentEvent !== undefined) {
      fam.events.push(currentEvent)
    }
    if (currentCitation !== undefined) {
      fam.citations.push(currentCitation)
    }

    // Populate backwards-compatible marriage EventDetails
    for (const ev of fam.events) {
      if (ev.type === 'MARR' && fam.marriage === undefined) {
        const details = new EventDetails()
        details.type = ev.type
        details.date = ev.date
        details.place = ev.place
        details.year = ev.year
        fam.marriage = details
      }
    }

    return fam
  }

  /**
   * Parses a Source (SOUR) record.
   */
  private static parseSourceRecord(lines: GedcomLine[]): SourceRecord {
    const src = new SourceRecord()
    src.id = lines[0].xref ?? lines[0].value ?? ''
    let activeField: 'title' | 'author' | 'publication' | 'notes' | undefined

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.level === 1) {
        activeField = undefined
        if (line.tag === 'TITL' && line.value !== undefined) {
          src.title = line.value.trim()
          activeField = 'title'
        } else if (line.tag === 'AUTH' && line.value !== undefined) {
          src.author = line.value.trim()
          activeField = 'author'
        } else if (line.tag === 'PUBL' && line.value !== undefined) {
          src.publication = line.value.trim()
          activeField = 'publication'
        } else if (line.tag === 'REPO' && line.value !== undefined) {
          src.repositoryId = line.value.trim()
        } else if (line.tag === 'NOTE') {
          src.notes = line.value ?? ''
          activeField = 'notes'
        }
      } else if (line.level === 2 && activeField !== undefined && (line.tag === 'CONT' || line.tag === 'CONC')) {
        const val = line.value ?? ''
        const prev = src[activeField] ?? ''
        if (line.tag === 'CONT') {
          src[activeField] = (prev.length > 0 ? prev + '\n' : '') + val
        } else if (line.tag === 'CONC') {
          src[activeField] = prev + val
        }
      }
    }

    return src
  }

  /**
   * Parses an archival Repository (REPO) record.
   */
  private static parseRepositoryRecord(lines: GedcomLine[]): RepositoryRecord {
    const repo = new RepositoryRecord()
    repo.id = lines[0].xref ?? lines[0].value ?? ''
    let activeField: 'name' | 'address' | 'notes' | undefined

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.level === 1) {
        activeField = undefined
        if (line.tag === 'NAME' && line.value !== undefined) {
          repo.name = line.value.trim()
          activeField = 'name'
        } else if (line.tag === 'ADDR') {
          repo.address = line.value ?? ''
          activeField = 'address'
        } else if (line.tag === 'PHON' && line.value !== undefined) {
          repo.phone = line.value.trim()
        } else if (line.tag === 'EMAIL' && line.value !== undefined) {
          repo.email = line.value.trim()
        } else if (line.tag === 'NOTE') {
          repo.notes = line.value ?? ''
          activeField = 'notes'
        }
      } else if (line.level === 2 && activeField !== undefined && (line.tag === 'CONT' || line.tag === 'CONC')) {
        const val = line.value ?? ''
        const prev = repo[activeField] ?? ''
        if (line.tag === 'CONT') {
          repo[activeField] = (prev.length > 0 ? prev + '\n' : '') + val
        } else if (line.tag === 'CONC') {
          repo[activeField] = prev + val
        }
      }
    }

    return repo
  }

  /**
   * Parses a Multimedia (OBJE) record.
   */
  private static parseMediaRecord(lines: GedcomLine[]): MediaRecord {
    const media = new MediaRecord()
    media.id = lines[0].xref ?? lines[0].value ?? ''
    let activeField: 'title' | 'notes' | undefined

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.level === 1) {
        activeField = undefined
        if (line.tag === 'FORM' && line.value !== undefined) {
          media.format = line.value.trim()
        } else if (line.tag === 'TITL' && line.value !== undefined) {
          media.title = line.value.trim()
          activeField = 'title'
        } else if (line.tag === 'FILE' && line.value !== undefined) {
          media.filePath = line.value.trim()
        } else if (line.tag === 'NOTE') {
          media.notes = line.value ?? ''
          activeField = 'notes'
        }
      } else if (line.level === 2 && activeField !== undefined && (line.tag === 'CONT' || line.tag === 'CONC')) {
        const val = line.value ?? ''
        const prev = media[activeField] ?? ''
        if (line.tag === 'CONT') {
          media[activeField] = (prev.length > 0 ? prev + '\n' : '') + val
        } else if (line.tag === 'CONC') {
          media[activeField] = prev + val
        }
      }
    }

    return media
  }

  /**
   * Parses a Submitter (SUBM) record.
   */
  private static parseSubmitterRecord(lines: GedcomLine[]): SubmitterRecord {
    const subm = new SubmitterRecord()
    subm.id = lines[0].xref ?? lines[0].value ?? ''

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.level === 1) {
        if (line.tag === 'NAME' && line.value !== undefined) subm.name = line.value.trim()
        else if (line.tag === 'ADDR' && line.value !== undefined) subm.address = line.value.trim()
        else if (line.tag === 'EMAIL' && line.value !== undefined) subm.email = line.value.trim()
        else if (line.tag === 'PHON' && line.value !== undefined) subm.phone = line.value.trim()
        else if (line.tag === 'LANG' && line.value !== undefined) subm.language = line.value.trim()
      }
    }

    return subm
  }

  /**
   * Validates cross-references and registers diagnostic warnings for broken pointers.
   */
  private static validateCrossReferences(data: GedcomData): void {
    const indiIds = new Set(data.individuals.map(i => i.id))
    const famIds = new Set(data.families.map(f => f.id))
    const sourceIds = new Set(Object.keys(data.sources))
    const repoIds = new Set(Object.keys(data.repositories))
    const mediaIds = new Set(Object.keys(data.media))

    // Validate family linkages, citations, and media
    for (const fam of data.families) {
      if (typeof fam.husbandId === 'string' && fam.husbandId.length > 0 && !indiIds.has(fam.husbandId)) {
        GedcomParser.addDiagnostic(data, 'WARN', `Family ${fam.id} references non-existent husband ID '${fam.husbandId}'`, 'HUSB')
      }
      if (typeof fam.wifeId === 'string' && fam.wifeId.length > 0 && !indiIds.has(fam.wifeId)) {
        GedcomParser.addDiagnostic(data, 'WARN', `Family ${fam.id} references non-existent wife ID '${fam.wifeId}'`, 'WIFE')
      }
      for (const chId of fam.childrenIds) {
        if (!indiIds.has(chId)) {
          GedcomParser.addDiagnostic(data, 'WARN', `Family ${fam.id} references non-existent child ID '${chId}'`, 'CHIL')
        }
      }
      for (const cit of fam.citations) {
        if (cit.sourceId.length > 0 && !sourceIds.has(cit.sourceId)) {
          GedcomParser.addDiagnostic(data, 'INFO', `Family ${fam.id} references unindexed source '${cit.sourceId}'`, 'SOUR')
        }
      }
      for (const ev of fam.events) {
        for (const cit of ev.citations) {
          if (cit.sourceId.length > 0 && !sourceIds.has(cit.sourceId)) {
            GedcomParser.addDiagnostic(data, 'INFO', `Family ${fam.id} event '${ev.type}' references unindexed source '${cit.sourceId}'`, 'SOUR')
          }
        }
      }
      for (const mId of fam.mediaIds) {
        if (mId.length > 0 && !mediaIds.has(mId)) {
          GedcomParser.addDiagnostic(data, 'INFO', `Family ${fam.id} references unindexed media ID '${mId}'`, 'OBJE')
        }
      }
    }

    // Validate individual linkages, citations, and media
    for (const indi of data.individuals) {
      for (const fId of indi.fams) {
        if (!famIds.has(fId)) {
          GedcomParser.addDiagnostic(data, 'WARN', `Individual ${indi.id} references non-existent spouse family ID '${fId}'`, 'FAMS')
        }
      }
      for (const fId of indi.famc) {
        if (!famIds.has(fId)) {
          GedcomParser.addDiagnostic(data, 'WARN', `Individual ${indi.id} references non-existent parent family ID '${fId}'`, 'FAMC')
        }
      }
      for (const cit of indi.citations) {
        if (cit.sourceId.length > 0 && !sourceIds.has(cit.sourceId)) {
          GedcomParser.addDiagnostic(data, 'INFO', `Individual ${indi.id} references unindexed source '${cit.sourceId}'`, 'SOUR')
        }
      }
      for (const ev of indi.events) {
        for (const cit of ev.citations) {
          if (cit.sourceId.length > 0 && !sourceIds.has(cit.sourceId)) {
            GedcomParser.addDiagnostic(data, 'INFO', `Individual ${indi.id} event '${ev.type}' references unindexed source '${cit.sourceId}'`, 'SOUR')
          }
        }
      }
      for (const mId of indi.mediaIds) {
        if (mId.length > 0 && !mediaIds.has(mId)) {
          GedcomParser.addDiagnostic(data, 'INFO', `Individual ${indi.id} references unindexed media ID '${mId}'`, 'OBJE')
        }
      }
    }

    // Validate source repository references
    for (const src of Object.values(data.sources)) {
      if (typeof src.repositoryId === 'string' && src.repositoryId.length > 0 && !repoIds.has(src.repositoryId)) {
        GedcomParser.addDiagnostic(data, 'WARN', `Source ${src.id} references non-existent repository ID '${src.repositoryId}'`, 'REPO')
      }
    }
  }

  /**
   * Appends a diagnostic message to the dataset.
   */
  private static addDiagnostic(
    data: GedcomData,
    level: 'INFO' | 'WARN' | 'ERROR',
    message: string,
    tag?: string,
    line?: number
  ): void {
    const diag = new ParserDiagnostic()
    diag.level = level
    diag.message = message
    diag.tag = tag
    diag.line = line
    data.diagnostics.push(diag)
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
    stats.totalSources = Object.keys(data.sources).length
    stats.totalRepositories = Object.keys(data.repositories).length
    stats.totalMedia = Object.keys(data.media).length

    const surnameCounts = new Map<string, number>()
    let minYear: number | undefined
    let maxYear: number | undefined
    let totalEventsCount = 0
    const CURRENT_YEAR = new Date().getFullYear()

    for (const indi of data.individuals) {
      if (indi.sex === 'M') stats.maleCount++
      else if (indi.sex === 'F') stats.femaleCount++
      else stats.unknownSexCount++

      if (typeof indi.surname === 'string' && indi.surname.length > 0) {
        const count = surnameCounts.get(indi.surname) ?? 0
        surnameCounts.set(indi.surname, count + 1)
      }

      totalEventsCount += indi.events.length

      const hasExplicitDeath = indi.death !== undefined ||
        indi.events.some(e => e.type === 'DEAT' || e.type === 'BURI' || e.type === 'CREM')
      const isPresumedDeceased = hasExplicitDeath ||
        (indi.birth?.year !== undefined && CURRENT_YEAR - indi.birth.year > 115)

      if (isPresumedDeceased) {
        stats.deceasedCount++
      } else {
        stats.livingCount++
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

    for (const fam of data.families) {
      totalEventsCount += fam.events.length
      if (fam.marriage?.year !== undefined) {
        const y = fam.marriage.year
        if (minYear === undefined || y < minYear) minYear = y
        if (maxYear === undefined || y > maxYear) maxYear = y
      }
    }

    stats.totalEvents = totalEventsCount
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
   * Estimates generation depth across the family graph using DAG dynamic programming.
   */
  private static estimateGenerations(data: GedcomData): number {
    if (data.individuals.length === 0) return 0

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

    const roots = data.individuals
      .map(i => i.id)
      .filter(id => id.length > 0 && !hasParent.has(id))

    if (roots.length === 0) return 1

    const memo = new Map<string, number>()
    const inStack = new Set<string>()

    const getSubtreeDepth = (id: string): number => {
      if (inStack.has(id)) return 0 // Cycle detected
      const cached = memo.get(id)
      if (cached !== undefined) return cached

      inStack.add(id)
      let maxChildDepth = 0
      const children = parentToChildren.get(id) ?? []
      for (const child of children) {
        maxChildDepth = Math.max(maxChildDepth, getSubtreeDepth(child))
      }
      inStack.delete(id)

      const depth = 1 + maxChildDepth
      memo.set(id, depth)
      return depth
    }

    let maxDepth = 1
    for (const root of roots) {
      maxDepth = Math.max(maxDepth, getSubtreeDepth(root))
    }

    return maxDepth
  }
}

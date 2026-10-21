/**
 * Represents event details such as birth, death, or marriage.
 */
export class EventDetails {
  date?: string
  place?: string
  type?: string
  year?: number
}

/**
 * Represents a source citation attached to an individual, family, or event.
 */
export class Citation {
  sourceId: string = ''
  page?: string
  quay?: number
  text?: string
  date?: string
}

/**
 * Represents a vital or secondary life event (e.g. BIRT, DEAT, CHR, BURI, OCCU, RESI, MARR, DIV).
 */
export class LifeEvent {
  type: string = ''
  date?: string
  place?: string
  year?: number
  value?: string
  cause?: string
  notes?: string
  citations: Citation[] = []
}

/**
 * Represents a historical source record (SOUR).
 */
export class SourceRecord {
  id: string = ''
  title?: string
  author?: string
  publication?: string
  repositoryId?: string
  notes?: string
}

/**
 * Represents an archival repository record (REPO).
 */
export class RepositoryRecord {
  id: string = ''
  name?: string
  address?: string
  phone?: string
  email?: string
  notes?: string
}

/**
 * Represents a multimedia asset record (OBJE).
 */
export class MediaRecord {
  id: string = ''
  format?: string
  title?: string
  filePath?: string
  notes?: string
}

/**
 * Represents a file submitter record (SUBM).
 */
export class SubmitterRecord {
  id: string = ''
  name?: string
  address?: string
  email?: string
  phone?: string
  language?: string
}

/**
 * Represents parser diagnostic warnings, notes, or non-fatal errors.
 */
export class ParserDiagnostic {
  level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'
  line?: number
  message: string = ''
  tag?: string
}

/**
 * Represents header metadata of the GEDCOM file.
 */
export class Metadata {
  source?: string
  version?: string
  name?: string
  corporation?: string
  atavismVersion?: string
  encoding?: string
  submitter?: string
  destination?: string
  date?: string
  time?: string
  language?: string
  notes?: string
}

/**
 * Represents an individual (INDI) record in the family tree.
 */
export class Individual {
  id: string = ''
  name?: string
  givenName?: string
  surname?: string
  sex?: 'M' | 'F' | 'U'
  birth?: EventDetails
  death?: EventDetails
  notes?: string
  fams: string[] = []
  famc: string[] = []
  lhash?: string
  hash?: string
  nick?: string
  marriedName?: string
  events: LifeEvent[] = []
  citations: Citation[] = []
  mediaIds: string[] = []
}

/**
 * Represents a family (FAM) record linking individuals together.
 */
export class Family {
  id: string = ''
  husbandId?: string
  wifeId?: string
  childrenIds: string[] = []
  marriage?: EventDetails
  divorced?: boolean
  hash?: string
  events: LifeEvent[] = []
  citations: Citation[] = []
  mediaIds: string[] = []
  notes?: string
}

/**
 * Aggregate summary statistics computed from the GEDCOM tree.
 */
export class GedcomStats {
  totalIndividuals: number = 0
  totalFamilies: number = 0
  maleCount: number = 0
  femaleCount: number = 0
  unknownSexCount: number = 0
  earliestYear?: number
  latestYear?: number
  generationCount: number = 0
  topSurnames: Array<{ surname: string, count: number }> = []
  totalSources: number = 0
  totalRepositories: number = 0
  totalMedia: number = 0
  totalEvents: number = 0
  livingCount: number = 0
  deceasedCount: number = 0
}

/**
 * Root container representing the parsed GEDCOM dataset.
 */
export class GedcomData {
  metadata: Metadata = new Metadata()
  individuals: Individual[] = []
  families: Family[] = []
  sources: Record<string, SourceRecord> = {}
  repositories: Record<string, RepositoryRecord> = {}
  media: Record<string, MediaRecord> = {}
  submitter?: SubmitterRecord
  diagnostics: ParserDiagnostic[] = []
  stats: GedcomStats = new GedcomStats()
}

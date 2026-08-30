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
}

/**
 * Root container representing the parsed GEDCOM dataset.
 */
export class GedcomData {
  metadata: Metadata = new Metadata()
  individuals: Individual[] = []
  families: Family[] = []
  stats: GedcomStats = new GedcomStats()
}

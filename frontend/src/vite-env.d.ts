/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference types="svelte" />
/// <reference types="vite/client" />

/** The info about the new update */
interface Update {
  /** The update version */
  version: string
  /** The update file name */
  name: string
  /** The update URL */
  url: string
}

interface OpenDialogResponse {
  canceled: boolean
  filePath?: string
  data?: DataServerResponse
}

interface SaveDialogResponse {
  canceled: boolean
  filePath?: string
  error?: string
}

interface SaveFileResult {
  success: boolean
  filePath?: string
  error?: string
}

interface SerializeResult {
  success: boolean
  content?: string
  error?: string
}

interface PickMediaResponse {
  canceled: boolean
  filePath?: string
  format?: string
  title?: string
  error?: string
}

/** Represents event details such as birth, death, or marriage. */
interface EventDetails {
  date?: string
  place?: string
  type?: string
  year?: number
}

/** Represents a source citation attached to an individual, family, or event. */
interface Citation {
  sourceId: string
  page?: string
  quay?: number
  text?: string
  date?: string
}

/** Represents a vital or secondary life event. */
interface LifeEvent {
  type: string
  date?: string
  place?: string
  year?: number
  value?: string
  cause?: string
  notes?: string
  citations: Citation[]
  mediaIds?: string[]
}

/** Represents a historical source record (SOUR). */
interface SourceRecord {
  id: string
  title?: string
  author?: string
  publication?: string
  repositoryId?: string
  notes?: string
}

/** Represents an archival repository record (REPO). */
interface RepositoryRecord {
  id: string
  name?: string
  address?: string
  phone?: string
  email?: string
  notes?: string
}

/** Represents a multimedia asset record (OBJE). */
interface MediaRecord {
  id: string
  format?: string
  title?: string
  filePath?: string
  notes?: string
}

/** Represents a file submitter record (SUBM). */
interface SubmitterRecord {
  id: string
  name?: string
  address?: string
  email?: string
  phone?: string
  language?: string
}

/** Represents parser diagnostic warnings, notes, or non-fatal errors. */
interface ParserDiagnostic {
  level: 'INFO' | 'WARN' | 'ERROR'
  line?: number
  message: string
  tag?: string
}

/** Represents header metadata of the GEDCOM file. */
interface Metadata {
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
  rawPreview?: string
}

/** Represents an individual (INDI) record in the family tree. */
interface Individual {
  id: string
  name?: string
  givenName?: string
  surname?: string
  sex?: 'M' | 'F' | 'U'
  birth?: EventDetails
  death?: EventDetails
  notes?: string
  fams: string[]
  famc: string[]
  lhash?: string
  hash?: string
  nick?: string
  marriedName?: string
  events: LifeEvent[]
  citations: Citation[]
  mediaIds: string[]
}

/** Represents a family (FAM) record linking individuals together. */
interface Family {
  id: string
  husbandId?: string
  wifeId?: string
  childrenIds: string[]
  marriage?: EventDetails
  divorced?: boolean
  hash?: string
  events: LifeEvent[]
  citations: Citation[]
  mediaIds: string[]
  notes?: string
}

/** Aggregate summary statistics computed from the GEDCOM tree. */
interface GedcomStats {
  totalIndividuals: number
  totalFamilies: number
  maleCount: number
  femaleCount: number
  unknownSexCount: number
  earliestYear?: number
  latestYear?: number
  generationCount: number
  topSurnames: Array<{ surname: string, count: number }>
  totalSources: number
  totalRepositories: number
  totalMedia: number
  totalEvents: number
  livingCount: number
  deceasedCount: number
}

/** Root container representing the parsed GEDCOM dataset. */
interface GedcomData {
  metadata: Metadata
  individuals: Individual[]
  families: Family[]
  sources: Record<string, SourceRecord>
  repositories: Record<string, RepositoryRecord>
  media: Record<string, MediaRecord>
  notes?: Record<string, string>
  submitter?: SubmitterRecord
  diagnostics: ParserDiagnostic[]
  stats: GedcomStats
}

/** The output result sent from server */
interface DataServerResponse {
  /** Error, if any */
  error: { message: string, name: string } | undefined
  /** The parsed GEDCOM dataset */
  result: GedcomData | undefined
}

interface Window {
  api: {
    /**
     * Send a request to the server with file path or raw text
     */
    sendDataToServer: (input: string) => Promise<DataServerResponse>
    /**
     * Loads the bundled sample GEDCOM dataset
     */
    loadSampleData: () => Promise<DataServerResponse>
    /**
     * Opens native file picker dialog
     */
    openFileDialog: () => Promise<OpenDialogResponse>
    /**
     * Opens native file save dialog
     */
    saveFileDialog: (defaultName?: string) => Promise<SaveDialogResponse>
    /**
     * Opens native file picker to select a multimedia asset
     */
    pickMediaFile: () => Promise<PickMediaResponse>
    /**
     * Saves raw GEDCOM text to file
     */
    saveGedcomFile: (filePath: string, content: string) => Promise<SaveFileResult>
    /**
     * Serializes dataset to GEDCOM text
     */
    serializeGedcom: (data: GedcomData) => Promise<SerializeResult>
    /**
     * Check if there are updates
     */
    checkUpdates: () => Promise<Update | undefined>
    /**
     * Send a request to the server to proceed with the app update
     */
    proceedWithUpdate: (update: Update) => void
  }
}

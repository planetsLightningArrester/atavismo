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

/** Represents event details such as birth, death, or marriage. */
interface EventDetails {
  date?: string
  place?: string
  type?: string
  year?: number
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
}

/** Root container representing the parsed GEDCOM dataset. */
interface GedcomData {
  metadata: Metadata
  individuals: Individual[]
  families: Family[]
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
     * Check if there are updates
     */
    checkUpdates: () => Promise<Update | undefined>
    /**
     * Send a request to the server to proceed with the app update
     */
    proceedWithUpdate: (update: Update) => void
  }
}

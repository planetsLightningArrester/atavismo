import type { GedcomData } from './gedcom/model'

export * from './gedcom/model'
export * from './gedcom/parser'

/** The output result to send to the client via IPC */
export class DataServerResponse {
  /** Error, if any */
  error: { message: string, name: string } | undefined
  /** The parsed GEDCOM dataset */
  result: GedcomData | undefined

  constructor(error: { message: string, name: string } | undefined, result: GedcomData | undefined) {
    this.error = error
    this.result = result
  }
}

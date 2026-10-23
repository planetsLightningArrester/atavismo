import {
  type Citation,
  type Family,
  type GedcomData,
  type Individual,
  type LifeEvent,
  type MediaRecord,
  type RepositoryRecord,
  type SourceRecord,
  type SubmitterRecord
} from './model'

/**
 * Serializes an in-memory GedcomData AST back into valid, standard-compliant
 * GEDCOM 5.5.1 text format without third-party dependencies.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GedcomSerializer {
  /**
   * Serializes a full GedcomData container to standard GEDCOM text.
   */
  public static serialize(data: GedcomData): string {
    const lines: string[] = []

    // 0 HEAD
    GedcomSerializer.serializeHeader(data, lines)

    // 0 @SUBM@ SUBM
    if (data.submitter !== undefined) {
      GedcomSerializer.serializeSubmitter(data.submitter, lines)
    }

    // 0 @R...@ REPO
    if (data.repositories !== undefined) {
      for (const repo of Object.values(data.repositories)) {
        GedcomSerializer.serializeRepository(repo, lines)
      }
    }

    // 0 @S...@ SOUR
    if (data.sources !== undefined) {
      for (const src of Object.values(data.sources)) {
        GedcomSerializer.serializeSource(src, lines)
      }
    }

    // 0 @O...@ OBJE
    if (data.media !== undefined) {
      for (const med of Object.values(data.media)) {
        GedcomSerializer.serializeMedia(med, lines)
      }
    }

    // 0 @N...@ NOTE
    if (data.notes !== undefined) {
      for (const [id, text] of Object.entries(data.notes)) {
        GedcomSerializer.serializeSharedNote(id, text, lines)
      }
    }

    // 0 @I...@ INDI
    for (const indi of data.individuals) {
      GedcomSerializer.serializeIndividual(indi, lines)
    }

    // 0 @F...@ FAM
    for (const fam of data.families) {
      GedcomSerializer.serializeFamily(fam, lines)
    }

    // 0 TRLR
    lines.push('0 TRLR')

    return lines.join('\n') + '\n'
  }

  private static formatId(id: string): string {
    const trimmed = id.trim()
    if (trimmed.startsWith('@') && trimmed.endsWith('@')) {
      return trimmed
    }
    return `@${trimmed}@`
  }

  private static serializeHeader(data: GedcomData, lines: string[]): void {
    const meta = data.metadata
    lines.push('0 HEAD')
    lines.push(`1 SOUR ${meta.source ?? 'ATAVISMO'}`)
    lines.push(`2 VERS ${meta.version ?? '0.0.1'}`)
    lines.push(`2 NAME ${meta.name ?? 'Atavismo Genealogy Suite'}`)
    lines.push(`2 CORP ${meta.corporation ?? "Planet's Lightning Arrester"}`)
    lines.push('1 GEDC')
    lines.push(`2 VERS ${meta.atavismVersion ?? '5.5.1'}`)
    lines.push('2 FORM LINEAGE-LINKED')
    lines.push(`1 CHAR ${meta.encoding ?? 'UTF-8'}`)

    if (data.submitter !== undefined) {
      lines.push(`1 SUBM ${GedcomSerializer.formatId(data.submitter.id)}`)
    } else if (meta.submitter !== undefined && meta.submitter.length > 0) {
      lines.push(`1 SUBM ${GedcomSerializer.formatId(meta.submitter)}`)
    }

    if (meta.date !== undefined && meta.date.length > 0) {
      lines.push(`1 DATE ${meta.date}`)
      if (meta.time !== undefined && meta.time.length > 0) {
        lines.push(`2 TIME ${meta.time}`)
      }
    }

    if (meta.language !== undefined && meta.language.length > 0) {
      lines.push(`1 LANG ${meta.language}`)
    }

    if (meta.destination !== undefined && meta.destination.length > 0) {
      lines.push(`1 DEST ${meta.destination}`)
    }

    if (meta.notes !== undefined && meta.notes.length > 0) {
      GedcomSerializer.serializeNote(meta.notes, 1, lines)
    }
  }

  private static serializeSubmitter(subm: SubmitterRecord, lines: string[]): void {
    const id = GedcomSerializer.formatId(subm.id)
    lines.push(`0 ${id} SUBM`)
    if (subm.name !== undefined && subm.name.length > 0) {
      lines.push(`1 NAME ${subm.name}`)
    }
    if (subm.address !== undefined && subm.address.length > 0) {
      lines.push(`1 ADDR ${subm.address}`)
    }
    if (subm.phone !== undefined && subm.phone.length > 0) {
      lines.push(`1 PHON ${subm.phone}`)
    }
    if (subm.email !== undefined && subm.email.length > 0) {
      lines.push(`1 EMAIL ${subm.email}`)
    }
    if (subm.language !== undefined && subm.language.length > 0) {
      lines.push(`1 LANG ${subm.language}`)
    }
  }

  private static serializeRepository(repo: RepositoryRecord, lines: string[]): void {
    const id = GedcomSerializer.formatId(repo.id)
    lines.push(`0 ${id} REPO`)
    if (repo.name !== undefined && repo.name.length > 0) {
      lines.push(`1 NAME ${repo.name}`)
    }
    if (repo.address !== undefined && repo.address.length > 0) {
      lines.push(`1 ADDR ${repo.address}`)
    }
    if (repo.phone !== undefined && repo.phone.length > 0) {
      lines.push(`1 PHON ${repo.phone}`)
    }
    if (repo.email !== undefined && repo.email.length > 0) {
      lines.push(`1 EMAIL ${repo.email}`)
    }
    if (repo.notes !== undefined && repo.notes.length > 0) {
      GedcomSerializer.serializeNote(repo.notes, 1, lines)
    }
  }

  private static serializeSource(src: SourceRecord, lines: string[]): void {
    const id = GedcomSerializer.formatId(src.id)
    lines.push(`0 ${id} SOUR`)
    if (src.title !== undefined && src.title.length > 0) {
      lines.push(`1 TITL ${src.title}`)
    }
    if (src.author !== undefined && src.author.length > 0) {
      lines.push(`1 AUTH ${src.author}`)
    }
    if (src.publication !== undefined && src.publication.length > 0) {
      lines.push(`1 PUBL ${src.publication}`)
    }
    if (src.repositoryId !== undefined && src.repositoryId.length > 0) {
      lines.push(`1 REPO ${GedcomSerializer.formatId(src.repositoryId)}`)
    }
    if (src.notes !== undefined && src.notes.length > 0) {
      GedcomSerializer.serializeNote(src.notes, 1, lines)
    }
  }

  private static serializeMedia(med: MediaRecord, lines: string[]): void {
    const id = GedcomSerializer.formatId(med.id)
    lines.push(`0 ${id} OBJE`)
    if (med.format !== undefined && med.format.length > 0) {
      lines.push(`1 FORM ${med.format}`)
    }
    if (med.title !== undefined && med.title.length > 0) {
      lines.push(`1 TITL ${med.title}`)
    }
    if (med.filePath !== undefined && med.filePath.length > 0) {
      lines.push(`1 FILE ${med.filePath}`)
    }
    if (med.notes !== undefined && med.notes.length > 0) {
      GedcomSerializer.serializeNote(med.notes, 1, lines)
    }
  }

  private static serializeSharedNote(id: string, text: string, lines: string[]): void {
    const formattedId = GedcomSerializer.formatId(id)
    const noteLines = text.split('\n')
    lines.push(`0 ${formattedId} NOTE ${noteLines[0] ?? ''}`)
    for (let i = 1; i < noteLines.length; i++) {
      lines.push(`1 CONT ${noteLines[i]}`)
    }
  }

  private static serializeIndividual(indi: Individual, lines: string[]): void {
    const id = GedcomSerializer.formatId(indi.id)
    lines.push(`0 ${id} INDI`)

    // Name formatting with standard GEDCOM slashes
    let nameLine = ''
    if (indi.name !== undefined && indi.name.includes('/')) {
      nameLine = indi.name
    } else if (indi.surname !== undefined && indi.surname.length > 0) {
      nameLine = `${indi.givenName ?? ''} /${indi.surname}/`.trim()
    } else if (indi.givenName !== undefined && indi.givenName.length > 0) {
      nameLine = indi.givenName
    } else if (indi.name !== undefined && indi.name.length > 0) {
      nameLine = indi.name
    }

    if (nameLine.length > 0) {
      lines.push(`1 NAME ${nameLine}`)
      if (indi.givenName !== undefined && indi.givenName.length > 0) {
        lines.push(`2 GIVN ${indi.givenName}`)
      }
      if (indi.surname !== undefined && indi.surname.length > 0) {
        lines.push(`2 SURN ${indi.surname}`)
      }
      if (indi.nick !== undefined && indi.nick.length > 0) {
        lines.push(`2 NICK ${indi.nick}`)
      }
      if (indi.marriedName !== undefined && indi.marriedName.length > 0) {
        lines.push(`2 _MARNM ${indi.marriedName}`)
      }
    }

    if (indi.sex !== undefined) {
      lines.push(`1 SEX ${indi.sex}`)
    }

    // Events
    if (indi.events.length > 0) {
      for (const ev of indi.events) {
        GedcomSerializer.serializeEvent(ev, 1, lines)
      }
    } else {
      // Fallback to legacy birth & death objects if events array empty
      if (indi.birth !== undefined) {
        lines.push(`1 ${indi.birth.type ?? 'BIRT'}`)
        if (indi.birth.date !== undefined && indi.birth.date.length > 0) {
          lines.push(`2 DATE ${indi.birth.date}`)
        }
        if (indi.birth.place !== undefined && indi.birth.place.length > 0) {
          lines.push(`2 PLAC ${indi.birth.place}`)
        }
      }
      if (indi.death !== undefined) {
        lines.push(`1 ${indi.death.type ?? 'DEAT'}`)
        if (indi.death.date !== undefined && indi.death.date.length > 0) {
          lines.push(`2 DATE ${indi.death.date}`)
        }
        if (indi.death.place !== undefined && indi.death.place.length > 0) {
          lines.push(`2 PLAC ${indi.death.place}`)
        }
      }
    }

    // Individual-level source citations
    for (const cit of indi.citations) {
      GedcomSerializer.serializeCitation(cit, 1, lines)
    }

    // Media references
    for (const mId of indi.mediaIds) {
      lines.push(`1 OBJE ${GedcomSerializer.formatId(mId)}`)
    }

    // Family links
    for (const famcId of indi.famc) {
      lines.push(`1 FAMC ${GedcomSerializer.formatId(famcId)}`)
    }
    for (const famsId of indi.fams) {
      lines.push(`1 FAMS ${GedcomSerializer.formatId(famssId(famsId))}`)
    }

    // Individual notes
    if (indi.notes !== undefined && indi.notes.length > 0) {
      GedcomSerializer.serializeNote(indi.notes, 1, lines)
    }

    // Hashes / metadata
    if (indi.lhash !== undefined && indi.lhash.length > 0) {
      lines.push(`1 _LHASH ${indi.lhash}`)
    }
    if (indi.hash !== undefined && indi.hash.length > 0) {
      lines.push(`1 _HASH ${indi.hash}`)
    }
  }

  private static serializeFamily(fam: Family, lines: string[]): void {
    const id = GedcomSerializer.formatId(fam.id)
    lines.push(`0 ${id} FAM`)

    if (fam.husbandId !== undefined && fam.husbandId.length > 0) {
      lines.push(`1 HUSB ${GedcomSerializer.formatId(fam.husbandId)}`)
    }
    if (fam.wifeId !== undefined && fam.wifeId.length > 0) {
      lines.push(`1 WIFE ${GedcomSerializer.formatId(fam.wifeId)}`)
    }
    for (const childId of fam.childrenIds) {
      lines.push(`1 CHIL ${GedcomSerializer.formatId(childId)}`)
    }

    // Events
    let hasMarr = false
    let hasDiv = false
    for (const ev of fam.events) {
      if (ev.type === 'MARR') hasMarr = true
      if (ev.type === 'DIV' || ev.type === 'DIVF' || ev.type === 'ANUL') hasDiv = true
      GedcomSerializer.serializeEvent(ev, 1, lines)
    }

    // Fallback if legacy marriage or divorced property set without events array entry
    if (!hasMarr && fam.marriage !== undefined) {
      lines.push('1 MARR')
      if (fam.marriage.date !== undefined && fam.marriage.date.length > 0) {
        lines.push(`2 DATE ${fam.marriage.date}`)
      }
      if (fam.marriage.place !== undefined && fam.marriage.place.length > 0) {
        lines.push(`2 PLAC ${fam.marriage.place}`)
      }
    }

    if (!hasDiv && fam.divorced === true) {
      lines.push('1 DIV')
    }

    // Family-level citations
    for (const cit of fam.citations) {
      GedcomSerializer.serializeCitation(cit, 1, lines)
    }

    // Media
    for (const mId of fam.mediaIds) {
      lines.push(`1 OBJE ${GedcomSerializer.formatId(mId)}`)
    }

    // Notes
    if (fam.notes !== undefined && fam.notes.length > 0) {
      GedcomSerializer.serializeNote(fam.notes, 1, lines)
    }

    if (fam.hash !== undefined && fam.hash.length > 0) {
      lines.push(`1 _HASH ${fam.hash}`)
    }
  }

  private static serializeEvent(ev: LifeEvent, level: number, lines: string[]): void {
    const val = ev.value !== undefined && ev.value.length > 0 ? ` ${ev.value}` : ''
    lines.push(`${level} ${ev.type}${val}`)

    const nextLevel = level + 1
    if (ev.date !== undefined && ev.date.length > 0) {
      lines.push(`${nextLevel} DATE ${ev.date}`)
    }
    if (ev.place !== undefined && ev.place.length > 0) {
      lines.push(`${nextLevel} PLAC ${ev.place}`)
    }
    if (ev.cause !== undefined && ev.cause.length > 0) {
      lines.push(`${nextLevel} CAUS ${ev.cause}`)
    }
    if (ev.type === 'EVEN' && ev.value !== undefined && ev.value.length > 0) {
      lines.push(`${nextLevel} TYPE ${ev.value}`)
    }
    if (ev.notes !== undefined && ev.notes.length > 0) {
      GedcomSerializer.serializeNote(ev.notes, nextLevel, lines)
    }
    for (const cit of ev.citations) {
      GedcomSerializer.serializeCitation(cit, nextLevel, lines)
    }
    for (const mId of ev.mediaIds ?? []) {
      lines.push(`${nextLevel} OBJE ${GedcomSerializer.formatId(mId)}`)
    }
  }

  private static serializeCitation(cit: Citation, level: number, lines: string[]): void {
    lines.push(`${level} SOUR ${GedcomSerializer.formatId(cit.sourceId)}`)
    const nextLevel = level + 1
    if (cit.page !== undefined && cit.page.length > 0) {
      lines.push(`${nextLevel} PAGE ${cit.page}`)
    }
    if (cit.quay !== undefined) {
      lines.push(`${nextLevel} QUAY ${cit.quay}`)
    }
    if (cit.text !== undefined && cit.text.length > 0) {
      lines.push(`${nextLevel} DATA`)
      lines.push(`${nextLevel + 1} TEXT ${cit.text}`)
    }
    if (cit.date !== undefined && cit.date.length > 0) {
      lines.push(`${nextLevel} DATE ${cit.date}`)
    }
  }

  private static serializeNote(text: string, level: number, lines: string[]): void {
    const noteLines = text.split('\n')
    lines.push(`${level} NOTE ${noteLines[0] ?? ''}`)
    for (let i = 1; i < noteLines.length; i++) {
      lines.push(`${level + 1} CONT ${noteLines[i]}`)
    }
  }
}

function famssId(id: string): string {
  return id
}

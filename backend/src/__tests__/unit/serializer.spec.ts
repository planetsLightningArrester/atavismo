import { test, expect } from '@playwright/test'
import { GedcomParser, GedcomSerializer, GedcomData, Individual, Family, LifeEvent, Citation, SourceRecord, RepositoryRecord, MediaRecord, SubmitterRecord } from '../../types'

test.describe('GedcomSerializer Unit Tests', () => {
  test('serializes minimal valid GEDCOM structure with HEAD and TRLR', () => {
    const data = new GedcomData()
    data.metadata.source = 'TEST_SUITE'
    data.metadata.version = '1.0'

    const serialized = GedcomSerializer.serialize(data)
    expect(serialized).toContain('0 HEAD')
    expect(serialized).toContain('1 SOUR TEST_SUITE')
    expect(serialized).toContain('2 VERS 1.0')
    expect(serialized).toContain('1 GEDC')
    expect(serialized).toContain('2 VERS 5.5.1')
    expect(serialized).toContain('1 CHAR UTF-8')
    expect(serialized).toContain('0 TRLR')

    // Re-parse
    const reparsed = GedcomParser.parse(serialized)
    expect(reparsed.metadata.source).toBe('TEST_SUITE')
  })

  test('preserves full individual details, events, citations and notes on round-trip', () => {
    const data = new GedcomData()

    // Add submitter
    const subm = new SubmitterRecord()
    subm.id = '@SUBM1@'
    subm.name = 'Genealogist Jane'
    subm.address = '123 Tree Lane, Boston, MA'
    subm.email = 'jane@example.com'
    data.submitter = subm

    // Add repository
    const repo = new RepositoryRecord()
    repo.id = '@R1@'
    repo.name = 'State Archives'
    repo.address = '100 Main St'
    data.repositories[repo.id] = repo

    // Add source
    const src = new SourceRecord()
    src.id = '@S1@'
    src.title = 'Parish Registry Vol. 4'
    src.author = 'Archdiocese of Canterbury'
    src.repositoryId = '@R1@'
    data.sources[src.id] = src

    // Add media
    const med = new MediaRecord()
    med.id = '@O1@'
    med.title = 'Birth Certificate'
    med.format = 'JPG'
    med.filePath = 'docs/cert.jpg'
    data.media[med.id] = med

    // Add individual
    const indi = new Individual()
    indi.id = '@I1@'
    indi.givenName = 'William'
    indi.surname = 'Shakespeare'
    indi.sex = 'M'
    indi.nick = 'Bard'
    indi.mediaIds = ['@O1@']
    indi.notes = 'Renowned English playwright\nand poet of Stratford.'

    // Birth event with citation
    const birt = new LifeEvent()
    birt.type = 'BIRT'
    birt.date = '23 APR 1564'
    birt.place = 'Stratford-upon-Avon, Warwickshire, England'
    birt.year = 1564
    const cit = new Citation()
    cit.sourceId = '@S1@'
    cit.page = 'Page 15, Entry 3'
    cit.quay = 3
    cit.text = 'Gulielmus filius Johannes Shakspere'
    birt.citations.push(cit)
    indi.events.push(birt)

    // Death event
    const deat = new LifeEvent()
    deat.type = 'DEAT'
    deat.date = '23 APR 1616'
    deat.place = 'Stratford-upon-Avon, Warwickshire, England'
    deat.year = 1616
    indi.events.push(deat)

    // Secondary life event
    const occu = new LifeEvent()
    occu.type = 'OCCU'
    occu.value = 'Playwright and Actor'
    occu.date = 'BET 1590 AND 1613'
    occu.place = 'London, England'
    indi.events.push(occu)

    indi.fams = ['@F1@']
    data.individuals.push(indi)

    // Add spouse
    const spouse = new Individual()
    spouse.id = '@I2@'
    spouse.givenName = 'Anne'
    spouse.surname = 'Hathaway'
    spouse.sex = 'F'
    spouse.fams = ['@F1@']
    data.individuals.push(spouse)

    // Add family
    const fam = new Family()
    fam.id = '@F1@'
    fam.husbandId = '@I1@'
    fam.wifeId = '@I2@'
    const marr = new LifeEvent()
    marr.type = 'MARR'
    marr.date = '28 NOV 1582'
    marr.place = 'Temple Grafton, Warwickshire'
    marr.year = 1582
    fam.events.push(marr)
    data.families.push(fam)

    // Serialize
    const serialized = GedcomSerializer.serialize(data)

    // Verify raw output formatting
    expect(serialized).toContain('0 @SUBM1@ SUBM')
    expect(serialized).toContain('1 NAME Genealogist Jane')
    expect(serialized).toContain('0 @R1@ REPO')
    expect(serialized).toContain('0 @S1@ SOUR')
    expect(serialized).toContain('0 @O1@ OBJE')
    expect(serialized).toContain('0 @I1@ INDI')
    expect(serialized).toContain('1 NAME William /Shakespeare/')
    expect(serialized).toContain('2 GIVN William')
    expect(serialized).toContain('2 SURN Shakespeare')
    expect(serialized).toContain('2 NICK Bard')
    expect(serialized).toContain('1 SEX M')
    expect(serialized).toContain('1 BIRT')
    expect(serialized).toContain('2 DATE 23 APR 1564')
    expect(serialized).toContain('2 PLAC Stratford-upon-Avon, Warwickshire, England')
    expect(serialized).toContain('2 SOUR @S1@')
    expect(serialized).toContain('3 PAGE Page 15, Entry 3')
    expect(serialized).toContain('3 QUAY 3')
    expect(serialized).toContain('3 DATA')
    expect(serialized).toContain('4 TEXT Gulielmus filius Johannes Shakspere')
    expect(serialized).toContain('1 OCCU Playwright and Actor')
    expect(serialized).toContain('1 NOTE Renowned English playwright')
    expect(serialized).toContain('2 CONT and poet of Stratford.')
    expect(serialized).toContain('0 @F1@ FAM')
    expect(serialized).toContain('1 HUSB @I1@')
    expect(serialized).toContain('1 WIFE @I2@')
    expect(serialized).toContain('1 MARR')
    expect(serialized).toContain('2 DATE 28 NOV 1582')

    // Re-parse serialized output and check complete AST integrity
    const reparsed = GedcomParser.parse(serialized)
    expect(reparsed.individuals.length).toBe(2)
    expect(reparsed.families.length).toBe(1)
    expect(reparsed.sources['@S1@']).toBeDefined()
    expect(reparsed.sources['@S1@'].title).toBe('Parish Registry Vol. 4')
    expect(reparsed.repositories['@R1@']).toBeDefined()
    expect(reparsed.repositories['@R1@'].name).toBe('State Archives')
    expect(reparsed.media['@O1@']).toBeDefined()
    expect(reparsed.media['@O1@'].title).toBe('Birth Certificate')

    const rIndi = reparsed.individuals.find(i => i.id === '@I1@')
    expect(rIndi).toBeDefined()
    expect(rIndi?.givenName).toBe('William')
    expect(rIndi?.surname).toBe('Shakespeare')
    expect(rIndi?.sex).toBe('M')
    expect(rIndi?.nick).toBe('Bard')
    expect(rIndi?.birth?.date).toBe('23 APR 1564')
    expect(rIndi?.death?.date).toBe('23 APR 1616')
    expect(rIndi?.notes).toContain('Renowned English playwright')
    expect(rIndi?.notes).toContain('and poet of Stratford.')
    expect(rIndi?.mediaIds).toContain('@O1@')

    // Event citations integrity
    const rBirt = rIndi?.events.find(e => e.type === 'BIRT')
    expect(rBirt?.citations.length).toBe(1)
    expect(rBirt?.citations[0].sourceId).toBe('@S1@')
    expect(rBirt?.citations[0].page).toBe('Page 15, Entry 3')
    expect(rBirt?.citations[0].quay).toBe(3)
    expect(rBirt?.citations[0].text).toBe('Gulielmus filius Johannes Shakspere')

    const rFam = reparsed.families[0]
    expect(rFam.husbandId).toBe('@I1@')
    expect(rFam.wifeId).toBe('@I2@')
    expect(rFam.marriage?.date).toBe('28 NOV 1582')
  })

  test('serializes shared note records cleanly with level 1 CONT', () => {
    const data = new GedcomData()
    data.notes['@N1@'] = 'First line of shared note\nSecond line of shared note\nThird line.'

    const serialized = GedcomSerializer.serialize(data)
    expect(serialized).toContain('0 @N1@ NOTE First line of shared note')
    expect(serialized).toContain('1 CONT Second line of shared note')
    expect(serialized).toContain('1 CONT Third line.')

    const reparsed = GedcomParser.parse(serialized)
    expect(reparsed.notes['@N1@']).toBe('First line of shared note\nSecond line of shared note\nThird line.')
  })

  test('round-trips complex multi-child family structure with divorce and remarriage', () => {
    const data = new GedcomData()

    const father = new Individual()
    father.id = '@I1@'
    father.name = 'Henry /Tudor/'
    father.sex = 'M'
    father.fams = ['@F1@', '@F2@']
    data.individuals.push(father)

    const w1 = new Individual()
    w1.id = '@I2@'
    w1.name = 'Catherine /of Aragon/'
    w1.sex = 'F'
    w1.fams = ['@F1@']
    data.individuals.push(w1)

    const w2 = new Individual()
    w2.id = '@I3@'
    w2.name = 'Anne /Boleyn/'
    w2.sex = 'F'
    w2.fams = ['@F2@']
    data.individuals.push(w2)

    const child1 = new Individual()
    child1.id = '@I4@'
    child1.name = 'Mary /Tudor/'
    child1.sex = 'F'
    child1.famc = ['@F1@']
    data.individuals.push(child1)

    const child2 = new Individual()
    child2.id = '@I5@'
    child2.name = 'Elizabeth /Tudor/'
    child2.sex = 'F'
    child2.famc = ['@F2@']
    data.individuals.push(child2)

    const f1 = new Family()
    f1.id = '@F1@'
    f1.husbandId = '@I1@'
    f1.wifeId = '@I2@'
    f1.childrenIds = ['@I4@']
    f1.divorced = true
    data.families.push(f1)

    const f2 = new Family()
    f2.id = '@F2@'
    f2.husbandId = '@I1@'
    f2.wifeId = '@I3@'
    f2.childrenIds = ['@I5@']
    data.families.push(f2)

    const serialized = GedcomSerializer.serialize(data)
    const reparsed = GedcomParser.parse(serialized)

    expect(reparsed.individuals.length).toBe(5)
    expect(reparsed.families.length).toBe(2)
    const repF1 = reparsed.families.find(f => f.id === '@F1@')
    expect(repF1?.divorced).toBe(true)
    expect(repF1?.childrenIds).toContain('@I4@')
    const repF2 = reparsed.families.find(f => f.id === '@F2@')
    expect(repF2?.childrenIds).toContain('@I5@')
  })
})

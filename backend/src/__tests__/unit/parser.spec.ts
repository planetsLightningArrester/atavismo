import fs from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'
import { GedcomParser } from '../../gedcom/parser'

test.describe('GedcomParser Unit Tests', () => {
  test('handles empty or whitespace-only input gracefully', () => {
    const emptyResult = GedcomParser.parse('')
    expect(emptyResult.individuals).toHaveLength(0)
    expect(emptyResult.families).toHaveLength(0)
    expect(emptyResult.stats.totalIndividuals).toBe(0)

    const whitespaceResult = GedcomParser.parse('   \n  \n\t  ')
    expect(whitespaceResult.individuals).toHaveLength(0)
    expect(whitespaceResult.stats.totalFamilies).toBe(0)
  })

  test('parses full HEAD and SUBM metadata', () => {
    const raw = `0 HEAD
1 SOUR Atavismo
2 VERS 1.0.0
2 NAME Atavismo Genealogy Suite
2 CORP Atavismo Community
1 DEST ATAVISMO
1 DATE 26 SEP 2026
2 TIME 12:00:00
1 SUBM @U1@
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
1 LANG Portuguese
1 NOTE Master test header note
0 @U1@ SUBM
1 NAME Atavismo Project
1 ADDR São Paulo, Brasil
1 EMAIL info@atavismo.org
1 PHON +55 11 9999-0000
1 LANG Portuguese
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    expect(parsed.metadata.source).toBe('Atavismo')
    expect(parsed.metadata.version).toBe('1.0.0')
    expect(parsed.metadata.name).toBe('Atavismo Genealogy Suite')
    expect(parsed.metadata.corporation).toBe('Atavismo Community')
    expect(parsed.metadata.destination).toBe('ATAVISMO')
    expect(parsed.metadata.date).toBe('26 SEP 2026')
    expect(parsed.metadata.time).toBe('12:00:00')
    expect(parsed.metadata.atavismVersion).toBe('5.5.1')
    expect(parsed.metadata.encoding).toBe('UTF-8')
    expect(parsed.metadata.language).toBe('Portuguese')
    expect(parsed.metadata.notes).toBe('Master test header note')

    expect(parsed.submitter).toBeDefined()
    expect(parsed.submitter?.id).toBe('@U1@')
    expect(parsed.submitter?.name).toBe('Atavismo Project')
    expect(parsed.submitter?.email).toBe('info@atavismo.org')
    expect(parsed.submitter?.phone).toBe('+55 11 9999-0000')
  })

  test('parses SOUR, REPO, and OBJE top-level records', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @R1@ REPO
1 NAME Arquivo Central
1 ADDR Lisboa, Portugal
1 EMAIL repo@archive.pt
0 @S1@ SOUR
1 TITL Livro de Batismos
1 AUTH Paróquia Local
1 PUBL Imprensa Nacional
1 REPO @R1@
0 @O1@ OBJE
1 FORM JPG
1 TITL Certidão Antiga
1 FILE certificates/cert1.jpg
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    expect(Object.keys(parsed.repositories)).toContain('@R1@')
    expect(parsed.repositories['@R1@'].name).toBe('Arquivo Central')
    expect(parsed.repositories['@R1@'].address).toBe('Lisboa, Portugal')

    expect(Object.keys(parsed.sources)).toContain('@S1@')
    expect(parsed.sources['@S1@'].title).toBe('Livro de Batismos')
    expect(parsed.sources['@S1@'].author).toBe('Paróquia Local')
    expect(parsed.sources['@S1@'].repositoryId).toBe('@R1@')

    expect(Object.keys(parsed.media)).toContain('@O1@')
    expect(parsed.media['@O1@'].format).toBe('JPG')
    expect(parsed.media['@O1@'].title).toBe('Certidão Antiga')
    expect(parsed.media['@O1@'].filePath).toBe('certificates/cert1.jpg')
  })

  test('parses individual vital events, life events, citations, and multi-line notes', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @S1@ SOUR
1 TITL Registro Paroquial
0 @I1@ INDI
1 NAME Carolina /Correia/
2 GIVN Carolina
2 SURN Correia
2 NICK Cacau
1 SEX F
1 BIRT
2 DATE 10 AUG 1960
2 PLAC São Paulo, Brasil
2 SOUR @S1@
3 PAGE Pag. 42
3 QUAY 3
3 DATA
4 TEXT Certidão original de nascimento.
1 CHR
2 DATE 25 AUG 1960
2 PLAC Igreja Matriz
1 OCCU Professora Titular
2 DATE FROM 1985 TO 2020
2 PLAC Universidade
1 EDUC Doutorado em História
1 DEAT
2 DATE 15 MAY 2022
2 PLAC São Paulo, Brasil
2 CAUS Causas naturais
1 BURI
2 DATE 17 MAY 2022
2 PLAC Cemitério da Saudade
1 NOTE Primeira linha de notas biográficas.
2 CONT Segunda linha após quebra.
2 CONC Continuação direta na mesma linha.
1 FAMS @F1@
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    expect(parsed.individuals).toHaveLength(1)
    const indi = parsed.individuals[0]

    expect(indi.id).toBe('@I1@')
    expect(indi.name).toBe('Carolina /Correia/')
    expect(indi.givenName).toBe('Carolina')
    expect(indi.surname).toBe('Correia')
    expect(indi.nick).toBe('Cacau')
    expect(indi.sex).toBe('F')

    // Backwards-compatible properties
    expect(indi.birth?.date).toBe('10 AUG 1960')
    expect(indi.birth?.place).toBe('São Paulo, Brasil')
    expect(indi.birth?.year).toBe(1960)
    expect(indi.death?.date).toBe('15 MAY 2022')
    expect(indi.death?.year).toBe(2022)

    // Events list
    expect(indi.events.length).toBeGreaterThanOrEqual(6)
    const birt = indi.events.find(e => e.type === 'BIRT')
    expect(birt).toBeDefined()
    expect(birt?.citations).toHaveLength(1)
    expect(birt?.citations[0].sourceId).toBe('@S1@')
    expect(birt?.citations[0].page).toBe('Pag. 42')
    expect(birt?.citations[0].quay).toBe(3)
    expect(birt?.citations[0].text).toBe('Certidão original de nascimento.')

    const occu = indi.events.find(e => e.type === 'OCCU')
    expect(occu).toBeDefined()
    expect(occu?.value).toBe('Professora Titular')

    const educ = indi.events.find(e => e.type === 'EDUC')
    expect(educ).toBeDefined()
    expect(educ?.value).toBe('Doutorado em História')

    const deat = indi.events.find(e => e.type === 'DEAT')
    expect(deat).toBeDefined()
    expect(deat?.cause).toBe('Causas naturais')

    // Notes
    expect(indi.notes).toContain('Primeira linha de notas biográficas.')
    expect(indi.notes).toContain('Segunda linha após quebra.Continuação direta na mesma linha.')
  })

  test('parses family units with marriage events and divorce status', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @I1@ INDI
1 NAME João /Silva/
1 SEX M
0 @I2@ INDI
1 NAME Maria /Silva/
1 SEX F
0 @I3@ INDI
1 NAME Pedro /Silva/
1 SEX M
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 12 JUN 1990
2 PLAC Curitiba, PR, Brasil
1 DIV
2 DATE 05 OCT 2005
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    expect(parsed.families).toHaveLength(1)
    const fam = parsed.families[0]

    expect(fam.id).toBe('@F1@')
    expect(fam.husbandId).toBe('@I1@')
    expect(fam.wifeId).toBe('@I2@')
    expect(fam.childrenIds).toEqual(['@I3@'])
    expect(fam.marriage?.date).toBe('12 JUN 1990')
    expect(fam.marriage?.year).toBe(1990)
    expect(fam.divorced).toBe(true)
    expect(fam.events.some(e => e.type === 'DIV')).toBe(true)
  })

  test('flags dangling pointers in diagnostics', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @I1@ INDI
1 NAME Solo /Explorer/
1 SEX M
1 FAMS @F999@
1 FAMC @F888@
0 @F1@ FAM
1 HUSB @I999@
1 WIFE @I888@
1 CHIL @I777@
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    const warnings = parsed.diagnostics.filter(d => d.level === 'WARN')
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings.some(w => w.message.includes('@F999@'))).toBe(true)
    expect(warnings.some(w => w.message.includes('@I999@'))).toBe(true)
  })

  test('successfully parses bundled sample.gedcom with comprehensive stats', () => {
    const samplePath = path.join(__dirname, '..', '..', '..', '..', 'sample.gedcom')
    if (!fs.existsSync(samplePath)) {
      test.skip()
      return
    }

    const content = fs.readFileSync(samplePath, 'utf8')
    const parsed = GedcomParser.parse(content)

    expect(parsed.individuals.length).toBe(229)
    expect(parsed.families.length).toBe(100)
    expect(parsed.stats.totalIndividuals).toBe(229)
    expect(parsed.stats.totalFamilies).toBe(100)
    expect(parsed.stats.generationCount).toBe(7)
    expect(parsed.stats.totalSources).toBeGreaterThanOrEqual(4)
    expect(parsed.stats.totalRepositories).toBeGreaterThanOrEqual(3)
    expect(parsed.stats.totalMedia).toBeGreaterThanOrEqual(2)
    expect(parsed.stats.totalEvents).toBeGreaterThan(500)
    expect(parsed.stats.livingCount).toBeGreaterThan(0)
    expect(parsed.stats.deceasedCount).toBeGreaterThan(0)
    expect(parsed.stats.topSurnames.length).toBeGreaterThan(0)
  })

  test('correctly calculates generation depth on converging family DAG', () => {
    // Root @I1@ -> Child @I3@ -> Grandchild @I5@ (length 3)
    // Root @I2@ -> Child @I4@ -> Child @I3@ -> Grandchild @I5@ (length 4)
    const raw = `0 HEAD
1 SOUR Test
0 @I1@ INDI
1 NAME Ancestor /One/
0 @I2@ INDI
1 NAME Ancestor /Two/
0 @I3@ INDI
1 NAME Intermediate /Three/
0 @I4@ INDI
1 NAME Intermediate /Four/
0 @I5@ INDI
1 NAME Leaf /Five/
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I3@
0 @F2@ FAM
1 HUSB @I2@
1 CHIL @I4@
0 @F3@ FAM
1 HUSB @I4@
1 CHIL @I3@
0 @F4@ FAM
1 HUSB @I3@
1 CHIL @I5@
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    // Depth from @I2@ -> @I4@ -> @I3@ -> @I5@ is 4 generations
    expect(parsed.stats.generationCount).toBe(4)
  })

  test('preserves empty CONT lines and scopes field continuations on SOUR and REPO', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @R1@ REPO
1 NAME Arquivo Central
1 ADDR Rua Principal, 10
2 CONT
2 CONT Lisboa, Portugal
0 @S1@ SOUR
1 TITL Certidão Histórica
2 CONC  de Nascimento
2 CONT Segunda Linha
1 REPO @R1@
0 @I1@ INDI
1 NAME João /Silva/
1 NOTE Primeiro parágrafo.
2 CONT
2 CONT Segundo parágrafo após linha vazia.
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    expect(parsed.repositories['@R1@'].address).toBe('Rua Principal, 10\n\nLisboa, Portugal')
    expect(parsed.sources['@S1@'].title).toBe('Certidão Histórica de Nascimento\nSegunda Linha')
    expect(parsed.individuals[0].notes).toBe('Primeiro parágrafo.\n\nSegundo parágrafo após linha vazia.')
  })

  test('prioritizes canonical BIRT over CHR and DEAT over BURI regardless of line order', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @I1@ INDI
1 NAME Ordem /Invertida/
1 SEX M
1 CHR
2 DATE 20 JAN 1950
2 PLAC Igreja Matriz
1 BIRT
2 DATE 10 JAN 1950
2 PLAC Maternidade Central
1 BURI
2 DATE 05 MAY 2020
2 PLAC Cemitério
1 DEAT
2 DATE 02 MAY 2020
2 PLAC Hospital
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    const indi = parsed.individuals[0]
    expect(indi.birth?.type).toBe('BIRT')
    expect(indi.birth?.date).toBe('10 JAN 1950')
    expect(indi.death?.type).toBe('DEAT')
    expect(indi.death?.date).toBe('02 MAY 2020')
  })

  test('validates event citations and repository references in diagnostics', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @S1@ SOUR
1 TITL Livro Local
1 REPO @R_MISSING@
0 @I1@ INDI
1 NAME Teste /Citação/
1 BIRT
2 DATE 01 JAN 1990
2 SOUR @S_MISSING@
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    const repoWarn = parsed.diagnostics.find(d => d.tag === 'REPO' && d.message.includes('@R_MISSING@'))
    expect(repoWarn).toBeDefined()

    const sourInfo = parsed.diagnostics.find(d => d.tag === 'SOUR' && d.message.includes('@S_MISSING@'))
    expect(sourInfo).toBeDefined()
  })

  test('applies demographic heuristic (115 years) for deceased estimation', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @I1@ INDI
1 NAME Ancestor /Ancient/
1 BIRT
2 DATE 10 JAN 1850
0 @I2@ INDI
1 NAME Young /Modern/
1 BIRT
2 DATE 10 JAN 2010
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    expect(parsed.stats.totalIndividuals).toBe(2)
    expect(parsed.stats.deceasedCount).toBe(1)
    expect(parsed.stats.livingCount).toBe(1)
  })

  test('correctly preserves level 3 note continuation on events with citations in individuals and families', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @S1@ SOUR
1 TITL Source One
0 @I1@ INDI
1 NAME John /Doe/
1 BIRT
2 DATE 01 JAN 1980
2 SOUR @S1@
3 PAGE 42
3 QUAY 3
2 NOTE First line of birth note.
3 CONT Second line of birth note.
3 CONC  and appended words.
0 @F1@ FAM
1 HUSB @I1@
1 MARR
2 DATE 01 JUN 2005
2 SOUR @S1@
3 PAGE 100
2 NOTE First line of marriage note.
3 CONT Second line of marriage note.
3 CONC  continued.
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    const indi = parsed.individuals[0]
    const birth = indi.events.find(e => e.type === 'BIRT')
    expect(birth).toBeDefined()
    expect(birth?.citations).toHaveLength(1)
    expect(birth?.citations[0].page).toBe('42')
    expect(birth?.citations[0].quay).toBe(3)
    expect(birth?.notes).toBe('First line of birth note.\nSecond line of birth note. and appended words.')

    const fam = parsed.families[0]
    const marr = fam.events.find(e => e.type === 'MARR')
    expect(marr).toBeDefined()
    expect(marr?.citations).toHaveLength(1)
    expect(marr?.citations[0].page).toBe('100')
    expect(marr?.notes).toBe('First line of marriage note.\nSecond line of marriage note. continued.')
  })

  test('P0-1: preserves leading whitespace on CONC continuation lines', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @I1@ INDI
1 NAME Test /Person/
1 NOTE Word
2 CONC  continued with space
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    expect(parsed.individuals[0].notes).toBe('Word continued with space')
  })

  test('P0-2: parses multiple same-type citations on a single event independently', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @S1@ SOUR
1 TITL First Source
0 @S2@ SOUR
1 TITL Second Source
0 @I1@ INDI
1 NAME Multi /Citation/
1 BIRT
2 DATE 01 JAN 2000
2 SOUR @S1@
3 PAGE 10
2 SOUR @S2@
3 PAGE 20
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    const birth = parsed.individuals[0].events.find(e => e.type === 'BIRT')
    expect(birth).toBeDefined()
    expect(birth?.citations).toHaveLength(2)
    expect(birth?.citations[0].sourceId).toBe('@S1@')
    expect(birth?.citations[0].page).toBe('10')
    expect(birth?.citations[1].sourceId).toBe('@S2@')
    expect(birth?.citations[1].page).toBe('20')
  })

  test('P0-3: ignores subordinate address tags without corrupting repo.address', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @R1@ REPO
1 NAME Municipal Archives
1 ADDR Street Name 123
2 CITY Lisbon
2 CTRY Portugal
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    expect(parsed.repositories['@R1@'].address).toBe('Street Name 123')
  })

  test('P1-1: produces zero diagnostic warnings on a fully consistent dataset', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @R1@ REPO
1 NAME Clean Repo
0 @S1@ SOUR
1 TITL Clean Source
1 REPO @R1@
0 @I1@ INDI
1 NAME Valid /Individual/
1 SEX M
1 FAMS @F1@
0 @I2@ INDI
1 NAME Valid /Spouse/
1 SEX F
1 FAMS @F1@
0 @I3@ INDI
1 NAME Valid /Child/
1 SEX M
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 10 JAN 2000
2 SOUR @S1@
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    expect(parsed.diagnostics).toHaveLength(0)
  })

  test('P1-2: flags unindexed citation sources on family events', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @I1@ INDI
1 NAME Husband /Test/
0 @I2@ INDI
1 NAME Wife /Test/
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 01 JAN 2000
2 SOUR @MISSING_S@
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    const diag = parsed.diagnostics.find(d => d.tag === 'SOUR' && d.message.includes("Family @F1@ event 'MARR' references unindexed source '@MISSING_S@'"))
    expect(diag).toBeDefined()
    expect(diag?.level).toBe('INFO')
  })

  test('P1-3: flags unindexed media pointers on individuals and families', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @I1@ INDI
1 NAME Media /Individual/
1 OBJE @MISSING_M1@
0 @F1@ FAM
1 OBJE @MISSING_M2@
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    const indiMediaDiag = parsed.diagnostics.find(d => d.tag === 'OBJE' && d.message.includes("Individual @I1@ references unindexed media ID '@MISSING_M1@'"))
    const famMediaDiag = parsed.diagnostics.find(d => d.tag === 'OBJE' && d.message.includes("Family @F1@ references unindexed media ID '@MISSING_M2@'"))
    expect(indiMediaDiag).toBeDefined()
    expect(famMediaDiag).toBeDefined()
  })

  test('P2-1: prevents call stack overflow on circular family relations', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @I1@ INDI
1 NAME Person A
1 FAMS @F1@
1 FAMC @F2@
0 @I2@ INDI
1 NAME Person B
1 FAMS @F2@
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I2@
0 @F2@ FAM
1 HUSB @I2@
1 CHIL @I1@
0 TRLR`

    expect(() => {
      const parsed = GedcomParser.parse(raw)
      expect(parsed.stats.generationCount).toBeGreaterThanOrEqual(1)
    }).not.toThrow()
  })

  test('P2-2: calculates correct generation count for individual-only dataset without families', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @I1@ INDI
1 NAME Lone /Wolf/
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    expect(parsed.stats.totalIndividuals).toBe(1)
    expect(parsed.stats.totalFamilies).toBe(0)
    expect(parsed.stats.generationCount).toBe(1)
  })

  test('P2-3: leaves earliestYear and latestYear undefined when no dates exist', () => {
    const raw = `0 HEAD
1 SOUR Test
0 @I1@ INDI
1 NAME Timeless /One/
0 @I2@ INDI
1 NAME Timeless /Two/
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
0 TRLR`

    const parsed = GedcomParser.parse(raw)
    expect(parsed.stats.earliestYear).toBeUndefined()
    expect(parsed.stats.latestYear).toBeUndefined()
  })

  test('P3-1: generates identical AST across LF, CRLF, and CR line endings', () => {
    const base = '0 HEAD\n1 SOUR Test\n0 @I1@ INDI\n1 NAME John /Doe/\n0 TRLR'
    const crlf = base.replace(/\n/g, '\r\n')
    const cr = base.replace(/\n/g, '\r')

    const parsedLF = GedcomParser.parse(base)
    const parsedCRLF = GedcomParser.parse(crlf)
    const parsedCR = GedcomParser.parse(cr)

    expect(parsedCRLF.individuals).toEqual(parsedLF.individuals)
    expect(parsedCR.individuals).toEqual(parsedLF.individuals)
  })

  test('P3-2: strips UTF-8 BOM before parsing records', () => {
    const raw = '\uFEFF0 HEAD\n1 SOUR Test\n0 @I1@ INDI\n1 NAME Bom /Test/\n0 TRLR'
    const parsed = GedcomParser.parse(raw)
    expect(parsed.individuals).toHaveLength(1)
    expect(parsed.individuals[0].name).toBe('Bom /Test/')
  })

  test('P3-3: safely skips malformed line levels without uncaught exceptions', () => {
    const raw = 'ABC TAG\n-1 TAG\n\n   \n0 HEAD\n1 SOUR Test\nINVALID\n0 @I1@ INDI\n1 NAME Good /Record/\n0 TRLR'
    let parsed: ReturnType<typeof GedcomParser.parse> | undefined
    expect(() => {
      parsed = GedcomParser.parse(raw)
    }).not.toThrow()
    expect(parsed?.individuals).toHaveLength(1)
    expect(parsed?.individuals[0].name).toBe('Good /Record/')
  })
})

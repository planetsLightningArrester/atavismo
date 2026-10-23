<script lang="ts">
  import { _ } from 'svelte-i18n'
  import { cleanName, formatLifespan, fuzzyMatchesQuery, generateNextId } from './common'

  export let individuals: Individual[] = []
  export let families: Family[] = []
  export let sources: Record<string, SourceRecord> = {}
  export let repositories: Record<string, RepositoryRecord> = {}
  export let media: Record<string, MediaRecord> = {}
  export let selectedIndividualId: string = ''
  export let onExploreInTree: (() => void) | null = null
  export let onDatasetChanged: (() => void) | null = null

  type EntityView = 'individuals' | 'families' | 'sources' | 'repositories' | 'media'
  type VitalFilter = 'ALL' | 'LIVING' | 'DECEASED'
  type SortOrder = 'id' | 'name' | 'birth_asc' | 'birth_desc'

  let entityView: EntityView = 'individuals'
  let searchQuery = ''
  let genderFilter: 'ALL' | 'M' | 'F' = 'ALL'
  let vitalFilter: VitalFilter = 'ALL'
  let withSourcesOnly = false
  let withMediaOnly = false
  let yearFromInput = ''
  let yearToInput = ''
  let sortOrder: SortOrder = 'id'

  let selectedFamilyId = ''
  let selectedSourceId = ''
  let selectedRepoId = ''
  let selectedMediaId = ''

  let isEditing = false
  let isCreating = false
  let editId = ''
  let editGivenName = ''
  let editSurname = ''
  let editNick = ''
  let editSex: 'M' | 'F' | 'U' = 'U'
  let editBirthDate = ''
  let editBirthPlace = ''
  let editDeathDate = ''
  let editDeathPlace = ''
  let editNotes = ''

  // Families Authoring State
  let isEditingFamily = false
  let isCreatingFamily = false
  let editFamId = ''
  let editFamHusbandId = ''
  let editFamWifeId = ''
  let editFamChildrenIds: string[] = []
  let editFamMarriageDate = ''
  let editFamMarriagePlace = ''
  let editFamDivorced = false
  let editFamNotes = ''
  let editFamChildToAdd = ''

  // Sources Authoring State
  let isEditingSource = false
  let isCreatingSource = false
  let editSourceId = ''
  let editSourceTitle = ''
  let editSourceAuthor = ''
  let editSourcePublication = ''
  let editSourceRepoId = ''
  let editSourceNotes = ''

  // Repositories Authoring State
  let isEditingRepo = false
  let isCreatingRepo = false
  let editRepoId = ''
  let editRepoName = ''
  let editRepoAddress = ''
  let editRepoPhone = ''
  let editRepoEmail = ''
  let editRepoNotes = ''

  // Multimedia Authoring State
  let isEditingMedia = false
  let isCreatingMedia = false
  let editMediaId = ''
  let editMediaTitle = ''
  let editMediaFormat = 'JPEG'
  let editMediaFilePath = ''
  let editMediaNotes = ''

  // Life Events Authoring State
  let isEditingEvent = false
  let isCreatingEvent = false
  let editEventIndex = -1
  let editEventType = 'BIRT'
  let editEventDate = ''
  let editEventPlace = ''
  let editEventValue = ''
  let editEventCause = ''
  let editEventNotes = ''

  // Citations Authoring State
  let isEditingCitation = false
  let isCreatingCitation = false
  let citationTargetEventIndex: number | null = null
  let editCitationIndex = -1
  let editCitationSourceId = ''
  let editCitationPage = ''
  let editCitationQuay: number | undefined
  let editCitationText = ''

  // Attach Media State
  let isAttachingMedia = false
  let attachMediaSelectId = ''

  let indiMap = new Map<string, Individual>()
  let famMap = new Map<string, Family>()
  let selectedPerson: Individual | undefined

  function extractYearFromString(val: string): number | undefined {
    const m = /\b(1\d{3}|20\d{2})\b/.exec(val)
    return m !== null ? parseInt(m[1], 10) : undefined
  }

  function openEditModal(person: Individual): void {
    editId = person.id
    editGivenName = person.givenName ?? ''
    editSurname = person.surname ?? ''
    editNick = person.nick ?? ''
    editSex = person.sex ?? 'U'
    editBirthDate = person.birth?.date ?? ''
    editBirthPlace = person.birth?.place ?? ''
    editDeathDate = person.death?.date ?? ''
    editDeathPlace = person.death?.place ?? ''
    editNotes = person.notes ?? ''
    isCreating = false
    isEditing = true
  }

  function openCreateModal(): void {
    editId = generateNextId(individuals.map((i) => i.id), 'I')
    editGivenName = ''
    editSurname = ''
    editNick = ''
    editSex = 'U'
    editBirthDate = ''
    editBirthPlace = ''
    editDeathDate = ''
    editDeathPlace = ''
    editNotes = ''
    isEditing = false
    isCreating = true
  }

  function saveEdit(): void {
    const person = individuals.find((i) => i.id === editId)
    if (person !== undefined) {
      person.givenName = editGivenName.trim()
      person.surname = editSurname.trim()
      person.name = `${person.givenName} /${person.surname}/`.trim()
      person.nick = editNick.trim()
      person.sex = editSex
      person.notes = editNotes.trim()

      const birthYear = extractYearFromString(editBirthDate)
      if (editBirthDate.length > 0 || editBirthPlace.length > 0) {
        if (person.birth === undefined) {
          person.birth = { type: 'BIRT' }
        }
        person.birth.date = editBirthDate
        person.birth.place = editBirthPlace
        person.birth.year = birthYear

        let birtEv = person.events.find((e) => e.type === 'BIRT')
        if (birtEv === undefined) {
          birtEv = { type: 'BIRT', citations: [] }
          person.events.unshift(birtEv)
        }
        birtEv.date = editBirthDate
        birtEv.place = editBirthPlace
        birtEv.year = birthYear
      } else {
        person.birth = undefined
        person.events = person.events.filter((e) => e.type !== 'BIRT')
      }

      const deathYear = extractYearFromString(editDeathDate)
      if (editDeathDate.length > 0 || editDeathPlace.length > 0) {
        if (person.death === undefined) {
          person.death = { type: 'DEAT' }
        }
        person.death.date = editDeathDate
        person.death.place = editDeathPlace
        person.death.year = deathYear

        let deatEv = person.events.find((e) => e.type === 'DEAT')
        if (deatEv === undefined) {
          deatEv = { type: 'DEAT', citations: [] }
          person.events.push(deatEv)
        }
        deatEv.date = editDeathDate
        deatEv.place = editDeathPlace
        deatEv.year = deathYear
      } else {
        person.death = undefined
        person.events = person.events.filter((e) => e.type !== 'DEAT')
      }

      individuals = [...individuals]
      isEditing = false
      if (onDatasetChanged !== null) onDatasetChanged()
    }
  }

  function saveCreate(): void {
    const newIndi: Individual = {
      id: editId,
      givenName: editGivenName.trim(),
      surname: editSurname.trim(),
      name: `${editGivenName.trim()} /${editSurname.trim()}/`.trim(),
      nick: editNick.trim(),
      sex: editSex,
      notes: editNotes.trim(),
      fams: [],
      famc: [],
      events: [],
      citations: [],
      mediaIds: [],
    }

    const birthYear = extractYearFromString(editBirthDate)
    if (editBirthDate.length > 0 || editBirthPlace.length > 0) {
      newIndi.birth = {
        type: 'BIRT',
        date: editBirthDate,
        place: editBirthPlace,
        year: birthYear,
      }
      newIndi.events.push({
        type: 'BIRT',
        date: editBirthDate,
        place: editBirthPlace,
        year: birthYear,
        citations: [],
      })
    }

    const deathYear = extractYearFromString(editDeathDate)
    if (editDeathDate.length > 0 || editDeathPlace.length > 0) {
      newIndi.death = {
        type: 'DEAT',
        date: editDeathDate,
        place: editDeathPlace,
        year: deathYear,
      }
      newIndi.events.push({
        type: 'DEAT',
        date: editDeathDate,
        place: editDeathPlace,
        year: deathYear,
        citations: [],
      })
    }

    individuals = [newIndi, ...individuals]
    selectedIndividualId = newIndi.id
    isCreating = false
    if (onDatasetChanged !== null) onDatasetChanged()
  }

  function deletePerson(id: string): void {
    // eslint-disable-next-line no-alert
    if (window.confirm($_('records.confirm_delete'))) {
      individuals = individuals.filter((i) => i.id !== id)
      for (const fam of families) {
        if (fam.husbandId === id) fam.husbandId = undefined
        if (fam.wifeId === id) fam.wifeId = undefined
        fam.childrenIds = fam.childrenIds.filter((cid) => cid !== id)
      }
      families = [...families]
      if (selectedIndividualId === id) {
        selectedIndividualId = individuals[0]?.id ?? ''
      }
      if (onDatasetChanged !== null) onDatasetChanged()
    }
  }

  // Families CRUD
  function openCreateFamilyModal(): void {
    editFamId = generateNextId(families.map((f) => f.id), 'F')
    editFamHusbandId = ''
    editFamWifeId = ''
    editFamChildrenIds = []
    editFamMarriageDate = ''
    editFamMarriagePlace = ''
    editFamDivorced = false
    editFamNotes = ''
    editFamChildToAdd = ''
    isEditingFamily = false
    isCreatingFamily = true
  }

  function openEditFamilyModal(fam: Family): void {
    editFamId = fam.id
    editFamHusbandId = fam.husbandId ?? ''
    editFamWifeId = fam.wifeId ?? ''
    editFamChildrenIds = [...fam.childrenIds]
    editFamMarriageDate = fam.marriage?.date ?? ''
    editFamMarriagePlace = fam.marriage?.place ?? ''
    editFamDivorced = fam.divorced ?? false
    editFamNotes = fam.notes ?? ''
    editFamChildToAdd = ''
    isCreatingFamily = false
    isEditingFamily = true
  }

  function saveFamily(): void {
    const existing = families.find((f) => f.id === editFamId)
    const isNew = existing === undefined
    const fam: Family = existing ?? {
      id: editFamId,
      husbandId: editFamHusbandId.length > 0 ? editFamHusbandId : undefined,
      wifeId: editFamWifeId.length > 0 ? editFamWifeId : undefined,
      childrenIds: [...editFamChildrenIds],
      events: [],
      citations: [],
      mediaIds: [],
      notes: editFamNotes.trim(),
      divorced: editFamDivorced,
    }

    if (!isNew) {
      if (fam.husbandId !== editFamHusbandId && fam.husbandId !== undefined) {
        const oldHusb = indiMap.get(fam.husbandId)
        if (oldHusb !== undefined) {
          oldHusb.fams = oldHusb.fams.filter((fid) => fid !== editFamId)
        }
      }
      if (fam.wifeId !== editFamWifeId && fam.wifeId !== undefined) {
        const oldWife = indiMap.get(fam.wifeId)
        if (oldWife !== undefined) {
          oldWife.fams = oldWife.fams.filter((fid) => fid !== editFamId)
        }
      }
      for (const oldCid of fam.childrenIds) {
        if (!editFamChildrenIds.includes(oldCid)) {
          const child = indiMap.get(oldCid)
          if (child !== undefined) {
            child.famc = child.famc.filter((fid) => fid !== editFamId)
          }
        }
      }
      fam.husbandId = editFamHusbandId.length > 0 ? editFamHusbandId : undefined
      fam.wifeId = editFamWifeId.length > 0 ? editFamWifeId : undefined
      fam.childrenIds = [...editFamChildrenIds]
      fam.divorced = editFamDivorced
      fam.notes = editFamNotes.trim()
    }

    const marrYear = extractYearFromString(editFamMarriageDate)
    if (editFamMarriageDate.length > 0 || editFamMarriagePlace.length > 0) {
      if (fam.marriage === undefined) fam.marriage = { type: 'MARR' }
      fam.marriage.date = editFamMarriageDate
      fam.marriage.place = editFamMarriagePlace
      fam.marriage.year = marrYear

      let marrEv = fam.events.find((e) => e.type === 'MARR')
      if (marrEv === undefined) {
        marrEv = { type: 'MARR', citations: [], mediaIds: [] }
        fam.events.unshift(marrEv)
      }
      marrEv.date = editFamMarriageDate
      marrEv.place = editFamMarriagePlace
      marrEv.year = marrYear
    } else {
      fam.marriage = undefined
      fam.events = fam.events.filter((e) => e.type !== 'MARR')
    }

    if (editFamHusbandId.length > 0) {
      const husb = indiMap.get(editFamHusbandId)
      if (husb !== undefined && !husb.fams.includes(editFamId)) {
        husb.fams.push(editFamId)
      }
    }
    if (editFamWifeId.length > 0) {
      const wife = indiMap.get(editFamWifeId)
      if (wife !== undefined && !wife.fams.includes(editFamId)) {
        wife.fams.push(editFamId)
      }
    }
    for (const cid of editFamChildrenIds) {
      const child = indiMap.get(cid)
      if (child !== undefined && !child.famc.includes(editFamId)) {
        child.famc.push(editFamId)
      }
    }

    if (isNew) {
      families = [fam, ...families]
    } else {
      families = [...families]
    }
    individuals = [...individuals]
    selectedFamilyId = editFamId
    isEditingFamily = false
    isCreatingFamily = false
    if (onDatasetChanged !== null) onDatasetChanged()
  }

  function deleteFamily(id: string): void {
    // eslint-disable-next-line no-alert
    if (window.confirm($_('records.confirm_delete_family'))) {
      families = families.filter((f) => f.id !== id)
      for (const indi of individuals) {
        indi.fams = indi.fams.filter((fid) => fid !== id)
        indi.famc = indi.famc.filter((fid) => fid !== id)
      }
      individuals = [...individuals]
      if (selectedFamilyId === id) {
        selectedFamilyId = families[0]?.id ?? ''
      }
      if (onDatasetChanged !== null) onDatasetChanged()
    }
  }

  // Sources CRUD
  function openCreateSourceModal(): void {
    editSourceId = generateNextId(Object.keys(sources), 'S')
    editSourceTitle = ''
    editSourceAuthor = ''
    editSourcePublication = ''
    editSourceRepoId = ''
    editSourceNotes = ''
    isEditingSource = false
    isCreatingSource = true
  }

  function openEditSourceModal(src: SourceRecord): void {
    editSourceId = src.id
    editSourceTitle = src.title ?? ''
    editSourceAuthor = src.author ?? ''
    editSourcePublication = src.publication ?? ''
    editSourceRepoId = src.repositoryId ?? ''
    editSourceNotes = src.notes ?? ''
    isCreatingSource = false
    isEditingSource = true
  }

  function saveSource(): void {
    const updated: SourceRecord = {
      id: editSourceId,
      title: editSourceTitle.trim(),
      author: editSourceAuthor.trim().length > 0 ? editSourceAuthor.trim() : undefined,
      publication: editSourcePublication.trim().length > 0 ? editSourcePublication.trim() : undefined,
      repositoryId: editSourceRepoId.length > 0 ? editSourceRepoId : undefined,
      notes: editSourceNotes.trim().length > 0 ? editSourceNotes.trim() : undefined,
    }
    sources[editSourceId] = updated
    sources = { ...sources }
    selectedSourceId = editSourceId
    isEditingSource = false
    isCreatingSource = false
    if (onDatasetChanged !== null) onDatasetChanged()
  }

  function deleteSource(id: string): void {
    // eslint-disable-next-line no-alert
    if (window.confirm($_('records.confirm_delete_source'))) {
      const copy = { ...sources }
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete copy[id]
      sources = copy
      for (const indi of individuals) {
        indi.citations = indi.citations.filter((c) => c.sourceId !== id)
        for (const ev of indi.events) {
          ev.citations = ev.citations.filter((c) => c.sourceId !== id)
        }
      }
      for (const fam of families) {
        fam.citations = fam.citations.filter((c) => c.sourceId !== id)
        for (const ev of fam.events) {
          ev.citations = ev.citations.filter((c) => c.sourceId !== id)
        }
      }
      individuals = [...individuals]
      families = [...families]
      if (selectedSourceId === id) {
        selectedSourceId = Object.keys(sources)[0] ?? ''
      }
      if (onDatasetChanged !== null) onDatasetChanged()
    }
  }

  // Repositories CRUD
  function openCreateRepoModal(): void {
    editRepoId = generateNextId(Object.keys(repositories), 'R')
    editRepoName = ''
    editRepoAddress = ''
    editRepoPhone = ''
    editRepoEmail = ''
    editRepoNotes = ''
    isEditingRepo = false
    isCreatingRepo = true
  }

  function openEditRepoModal(repo: RepositoryRecord): void {
    editRepoId = repo.id
    editRepoName = repo.name ?? ''
    editRepoAddress = repo.address ?? ''
    editRepoPhone = repo.phone ?? ''
    editRepoEmail = repo.email ?? ''
    editRepoNotes = repo.notes ?? ''
    isCreatingRepo = false
    isEditingRepo = true
  }

  function saveRepo(): void {
    const updated: RepositoryRecord = {
      id: editRepoId,
      name: editRepoName.trim(),
      address: editRepoAddress.trim().length > 0 ? editRepoAddress.trim() : undefined,
      phone: editRepoPhone.trim().length > 0 ? editRepoPhone.trim() : undefined,
      email: editRepoEmail.trim().length > 0 ? editRepoEmail.trim() : undefined,
      notes: editRepoNotes.trim().length > 0 ? editRepoNotes.trim() : undefined,
    }
    repositories[editRepoId] = updated
    repositories = { ...repositories }
    selectedRepoId = editRepoId
    isEditingRepo = false
    isCreatingRepo = false
    if (onDatasetChanged !== null) onDatasetChanged()
  }

  function deleteRepo(id: string): void {
    // eslint-disable-next-line no-alert
    if (window.confirm($_('records.confirm_delete_repo'))) {
      const copy = { ...repositories }
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete copy[id]
      repositories = copy
      for (const src of Object.values(sources)) {
        if (src.repositoryId === id) {
          src.repositoryId = undefined
        }
      }
      sources = { ...sources }
      if (selectedRepoId === id) {
        selectedRepoId = Object.keys(repositories)[0] ?? ''
      }
      if (onDatasetChanged !== null) onDatasetChanged()
    }
  }

  // Multimedia CRUD
  function openCreateMediaModal(): void {
    editMediaId = generateNextId(Object.keys(media), 'O')
    editMediaTitle = ''
    editMediaFormat = 'JPEG'
    editMediaFilePath = ''
    editMediaNotes = ''
    isEditingMedia = false
    isCreatingMedia = true
  }

  function openEditMediaModal(m: MediaRecord): void {
    editMediaId = m.id
    editMediaTitle = m.title ?? ''
    editMediaFormat = m.format ?? 'JPEG'
    editMediaFilePath = m.filePath ?? ''
    editMediaNotes = m.notes ?? ''
    isCreatingMedia = false
    isEditingMedia = true
  }

  async function browseMediaFile(): Promise<void> {
    try {
      const res = await window.api.pickMediaFile()
      if (!res.canceled && res.filePath !== undefined) {
        editMediaFilePath = res.filePath
        if (typeof res.format === 'string' && res.format.length > 0) {
          editMediaFormat = res.format
        }
        if (typeof res.title === 'string' && res.title.length > 0 && editMediaTitle.trim().length === 0) {
          editMediaTitle = res.title
        }
      }
    } catch (err) {
      console.error('Failed to pick media file:', err)
    }
  }

  function saveMedia(): void {
    const updated: MediaRecord = {
      id: editMediaId,
      title: editMediaTitle.trim().length > 0 ? editMediaTitle.trim() : undefined,
      format: editMediaFormat.trim().length > 0 ? editMediaFormat.trim() : undefined,
      filePath: editMediaFilePath.trim().length > 0 ? editMediaFilePath.trim() : undefined,
      notes: editMediaNotes.trim().length > 0 ? editMediaNotes.trim() : undefined,
    }
    media[editMediaId] = updated
    media = { ...media }
    selectedMediaId = editMediaId
    isEditingMedia = false
    isCreatingMedia = false
    if (onDatasetChanged !== null) onDatasetChanged()
  }

  function deleteMedia(id: string): void {
    // eslint-disable-next-line no-alert
    if (window.confirm($_('records.confirm_delete_media'))) {
      const copy = { ...media }
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete copy[id]
      media = copy
      for (const indi of individuals) {
        indi.mediaIds = indi.mediaIds.filter((mid) => mid !== id)
        for (const ev of indi.events) {
          if (ev.mediaIds !== undefined) {
            ev.mediaIds = ev.mediaIds.filter((mid) => mid !== id)
          }
        }
      }
      for (const fam of families) {
        fam.mediaIds = fam.mediaIds.filter((mid) => mid !== id)
        for (const ev of fam.events) {
          if (ev.mediaIds !== undefined) {
            ev.mediaIds = ev.mediaIds.filter((mid) => mid !== id)
          }
        }
      }
      individuals = [...individuals]
      families = [...families]
      if (selectedMediaId === id) {
        selectedMediaId = Object.keys(media)[0] ?? ''
      }
      if (onDatasetChanged !== null) onDatasetChanged()
    }
  }

  // Life Events on Individual
  function openCreateEventModal(): void {
    if (selectedPerson === undefined) return
    editEventIndex = -1
    editEventType = 'OCCU'
    editEventDate = ''
    editEventPlace = ''
    editEventValue = ''
    editEventCause = ''
    editEventNotes = ''
    isEditingEvent = false
    isCreatingEvent = true
  }

  function openEditEventModal(eventIndex: number): void {
    if (selectedPerson === undefined) return
    const ev = selectedPerson.events[eventIndex]
    if (ev === undefined) return
    editEventIndex = eventIndex
    editEventType = ev.type
    editEventDate = ev.date ?? ''
    editEventPlace = ev.place ?? ''
    editEventValue = ev.value ?? ''
    editEventCause = ev.cause ?? ''
    editEventNotes = ev.notes ?? ''
    isCreatingEvent = false
    isEditingEvent = true
  }

  function saveEvent(): void {
    if (selectedPerson === undefined) return
    const yr = extractYearFromString(editEventDate)
    if (isCreatingEvent) {
      const newEv: LifeEvent = {
        type: editEventType,
        date: editEventDate.trim().length > 0 ? editEventDate.trim() : undefined,
        place: editEventPlace.trim().length > 0 ? editEventPlace.trim() : undefined,
        year: yr,
        value: editEventValue.trim().length > 0 ? editEventValue.trim() : undefined,
        cause: editEventCause.trim().length > 0 ? editEventCause.trim() : undefined,
        notes: editEventNotes.trim().length > 0 ? editEventNotes.trim() : undefined,
        citations: [],
        mediaIds: [],
      }
      selectedPerson.events.push(newEv)
      if (editEventType === 'BIRT') {
        selectedPerson.birth = {
          type: 'BIRT',
          date: newEv.date,
          place: newEv.place,
          year: yr,
        }
      } else if (editEventType === 'DEAT') {
        selectedPerson.death = {
          type: 'DEAT',
          date: newEv.date,
          place: newEv.place,
          year: yr,
        }
      }
    } else if (editEventIndex >= 0 && editEventIndex < selectedPerson.events.length) {
      const ev = selectedPerson.events[editEventIndex]
      ev.type = editEventType
      ev.date = editEventDate.trim().length > 0 ? editEventDate.trim() : undefined
      ev.place = editEventPlace.trim().length > 0 ? editEventPlace.trim() : undefined
      ev.year = yr
      ev.value = editEventValue.trim().length > 0 ? editEventValue.trim() : undefined
      ev.cause = editEventCause.trim().length > 0 ? editEventCause.trim() : undefined
      ev.notes = editEventNotes.trim().length > 0 ? editEventNotes.trim() : undefined
      if (editEventType === 'BIRT') {
        selectedPerson.birth = {
          type: 'BIRT',
          date: ev.date,
          place: ev.place,
          year: yr,
        }
      } else if (editEventType === 'DEAT') {
        selectedPerson.death = {
          type: 'DEAT',
          date: ev.date,
          place: ev.place,
          year: yr,
        }
      }
    }
    individuals = [...individuals]
    isEditingEvent = false
    isCreatingEvent = false
    if (onDatasetChanged !== null) onDatasetChanged()
  }

  function deleteEvent(eventIndex: number): void {
    if (selectedPerson === undefined) return
    // eslint-disable-next-line no-alert
    if (window.confirm($_('records.confirm_delete_event'))) {
      const ev = selectedPerson.events[eventIndex]
      if (ev !== undefined) {
        if (ev.type === 'BIRT') selectedPerson.birth = undefined
        if (ev.type === 'DEAT') selectedPerson.death = undefined
      }
      selectedPerson.events.splice(eventIndex, 1)
      individuals = [...individuals]
      if (onDatasetChanged !== null) onDatasetChanged()
    }
  }

  // Citations CRUD
  function openCreateCitationModal(eventIndex: number | null = null): void {
    citationTargetEventIndex = eventIndex
    editCitationIndex = -1
    editCitationSourceId = Object.keys(sources)[0] ?? ''
    editCitationPage = ''
    editCitationQuay = undefined
    editCitationText = ''
    isEditingCitation = false
    isCreatingCitation = true
  }

  function openEditCitationModal(index: number, eventIndex: number | null = null): void {
    if (selectedPerson === undefined) return
    citationTargetEventIndex = eventIndex
    editCitationIndex = index
    const cit = eventIndex === null
      ? selectedPerson.citations[index]
      : selectedPerson.events[eventIndex]?.citations[index]
    if (cit === undefined) return
    editCitationSourceId = cit.sourceId
    editCitationPage = cit.page ?? ''
    editCitationQuay = cit.quay
    editCitationText = cit.text ?? ''
    isCreatingCitation = false
    isEditingCitation = true
  }

  function saveCitation(): void {
    if (selectedPerson === undefined) return
    const cit: Citation = {
      sourceId: editCitationSourceId,
      page: editCitationPage.trim().length > 0 ? editCitationPage.trim() : undefined,
      quay: editCitationQuay,
      text: editCitationText.trim().length > 0 ? editCitationText.trim() : undefined,
    }

    const targetList = citationTargetEventIndex === null
      ? selectedPerson.citations
      : (selectedPerson.events[citationTargetEventIndex]?.citations ?? selectedPerson.citations)

    if (isCreatingCitation) {
      targetList.push(cit)
    } else if (editCitationIndex >= 0 && editCitationIndex < targetList.length) {
      targetList[editCitationIndex] = cit
    }
    individuals = [...individuals]
    isEditingCitation = false
    isCreatingCitation = false
    if (onDatasetChanged !== null) onDatasetChanged()
  }

  function deleteCitation(index: number, eventIndex: number | null = null): void {
    if (selectedPerson === undefined) return
    // eslint-disable-next-line no-alert
    if (window.confirm($_('records.confirm_delete_citation'))) {
      const targetList = eventIndex === null
        ? selectedPerson.citations
        : selectedPerson.events[eventIndex ?? 0]?.citations
      if (targetList !== undefined) {
        targetList.splice(index, 1)
        individuals = [...individuals]
        if (onDatasetChanged !== null) onDatasetChanged()
      }
    }
  }

  // Attach Media
  function openAttachMediaModal(): void {
    if (selectedPerson === undefined) return
    attachMediaSelectId = Object.keys(media)[0] ?? ''
    isAttachingMedia = true
  }

  function attachMediaToPerson(): void {
    if (selectedPerson === undefined || attachMediaSelectId.length === 0) return
    if (!selectedPerson.mediaIds.includes(attachMediaSelectId)) {
      selectedPerson.mediaIds.push(attachMediaSelectId)
      individuals = [...individuals]
      if (onDatasetChanged !== null) onDatasetChanged()
    }
    isAttachingMedia = false
  }

  function detachMediaFromPerson(mId: string): void {
    if (selectedPerson === undefined) return
    selectedPerson.mediaIds = selectedPerson.mediaIds.filter((id) => id !== mId)
    individuals = [...individuals]
    if (onDatasetChanged !== null) onDatasetChanged()
  }

  const CURRENT_YEAR = new Date().getFullYear()

  // Map of individuals and families by ID for O(1) lookups
  $: indiMap = new Map<string, Individual>(individuals.map((i) => [i.id, i]))
  $: famMap = new Map<string, Family>(families.map((f) => [f.id, f]))

  $: sourceList = Object.values(sources)
  $: repoList = Object.values(repositories)
  $: mediaList = Object.values(media)

  $: {
    if (selectedFamilyId.length === 0 && families.length > 0) {
      selectedFamilyId = families[0].id
    }
    if (selectedSourceId.length === 0 && sourceList.length > 0) {
      selectedSourceId = sourceList[0].id
    }
    if (selectedRepoId.length === 0 && repoList.length > 0) {
      selectedRepoId = repoList[0].id
    }
    if (selectedMediaId.length === 0 && mediaList.length > 0) {
      selectedMediaId = mediaList[0].id
    }
  }

  function isPresumedDeceased(indi: Individual): boolean {
    const hasExplicitDeath =
      indi.death !== undefined || indi.events.some((e) => e.type === 'DEAT' || e.type === 'BURI' || e.type === 'CREM')
    if (hasExplicitDeath) return true
    const birthYear = indi.birth?.year
    return birthYear !== undefined && CURRENT_YEAR - birthYear > 115
  }

  function hasAnyCitation(indi: Individual): boolean {
    if (indi.citations.length > 0) return true
    return indi.events.some((e) => e.citations.length > 0)
  }

  function hasAnyMedia(indi: Individual): boolean {
    if (indi.mediaIds.length > 0) return true
    for (const famId of indi.fams) {
      const fam = famMap.get(famId)
      if (fam !== undefined && fam.mediaIds.length > 0) return true
    }
    return false
  }

  $: parsedYearFrom = yearFromInput.trim().length > 0 ? Number.parseInt(yearFromInput.trim(), 10) : Number.NaN
  $: parsedYearTo = yearToInput.trim().length > 0 ? Number.parseInt(yearToInput.trim(), 10) : Number.NaN

  $: filteredIndividuals = (() => {
    const list = individuals.filter((indi) => {
      if (genderFilter !== 'ALL' && indi.sex !== genderFilter) return false
      if (vitalFilter === 'LIVING' && isPresumedDeceased(indi)) return false
      if (vitalFilter === 'DECEASED' && !isPresumedDeceased(indi)) return false
      if (withSourcesOnly && !hasAnyCitation(indi)) return false
      if (withMediaOnly && !hasAnyMedia(indi)) return false

      if (!Number.isNaN(parsedYearFrom)) {
        if (indi.birth?.year === undefined || indi.birth.year < parsedYearFrom) return false
      }
      if (!Number.isNaN(parsedYearTo)) {
        if (indi.birth?.year === undefined || indi.birth.year > parsedYearTo) return false
      }

      if (searchQuery.trim().length === 0) return true

      const eventPlacesAndValues = indi.events.flatMap((ev) => [ev.place, ev.value, ev.cause, ev.notes])
      return fuzzyMatchesQuery(
        [
          indi.id,
          indi.name,
          indi.givenName,
          indi.surname,
          indi.nick,
          indi.marriedName,
          indi.birth?.place,
          indi.birth?.date,
          indi.death?.place,
          indi.death?.date,
          indi.notes,
          ...eventPlacesAndValues
        ],
        searchQuery
      )
    })

    const sorted = [...list]
    if (sortOrder === 'name') {
      sorted.sort((a, b) => cleanName(a.name).localeCompare(cleanName(b.name)))
    } else if (sortOrder === 'birth_asc') {
      sorted.sort((a, b) => (a.birth?.year ?? 99999) - (b.birth?.year ?? 99999))
    } else if (sortOrder === 'birth_desc') {
      sorted.sort((a, b) => (b.birth?.year ?? -99999) - (a.birth?.year ?? -99999))
    }
    return sorted
  })()

  $: filteredFamilies = families.filter((fam) => {
    if (searchQuery.trim().length === 0) return true
    const husb = typeof fam.husbandId === 'string' ? indiMap.get(fam.husbandId) : undefined
    const wife = typeof fam.wifeId === 'string' ? indiMap.get(fam.wifeId) : undefined
    const children = fam.childrenIds.map((cid) => indiMap.get(cid)?.name).filter(Boolean) as string[]
    return fuzzyMatchesQuery(
      [
        fam.id,
        husb?.name,
        husb?.givenName,
        husb?.surname,
        wife?.name,
        wife?.givenName,
        wife?.surname,
        fam.marriage?.date,
        fam.marriage?.place,
        fam.notes,
        ...children,
      ],
      searchQuery
    )
  })

  $: filteredSources = sourceList.filter((src) => {
    if (searchQuery.trim().length === 0) return true
    const repoName = typeof src.repositoryId === 'string' ? repositories[src.repositoryId]?.name : undefined
    return fuzzyMatchesQuery([src.id, src.title, src.author, src.publication, src.notes, repoName], searchQuery)
  })

  $: filteredRepos = repoList.filter((repo) => {
    if (searchQuery.trim().length === 0) return true
    return fuzzyMatchesQuery([repo.id, repo.name, repo.address, repo.email, repo.phone, repo.notes], searchQuery)
  })

  $: filteredMedia = mediaList.filter((m) => {
    if (searchQuery.trim().length === 0) return true
    return fuzzyMatchesQuery([m.id, m.title, m.format, m.filePath, m.notes], searchQuery)
  })

  $: selectedPerson = indiMap.get(selectedIndividualId)

  interface TimelineItem {
    id: string
    originalIndex?: number
    type: string
    date?: string
    place?: string
    year?: number
    age?: number
    value?: string
    cause?: string
    notes?: string
    spouseName?: string
    citations: Citation[]
  }

  // Build chronological life timeline for selectedPerson
  $: personTimeline = (() => {
    if (selectedPerson === undefined) return []
    const items: TimelineItem[] = []
    const birthYear = selectedPerson.birth?.year

    const computeAge = (evYear?: number, evType?: string): number | undefined => {
      if (evType === 'BIRT' || birthYear === undefined || evYear === undefined) return undefined
      const diff = evYear - birthYear
      return diff >= 0 && diff <= 130 ? diff : undefined
    }

    let hasExplicitBirt = false
    let hasExplicitDeat = false

    for (let idx = 0; idx < selectedPerson.events.length; idx++) {
      const ev = selectedPerson.events[idx]
      if (ev.type === 'BIRT') hasExplicitBirt = true
      if (ev.type === 'DEAT') hasExplicitDeat = true
      const hasContent =
        (ev.date?.length ?? 0) > 0 ||
        (ev.place?.length ?? 0) > 0 ||
        (ev.value?.length ?? 0) > 0 ||
        (ev.cause?.length ?? 0) > 0 ||
        (ev.notes?.length ?? 0) > 0 ||
        ev.citations.length > 0

      if (hasContent) {
        items.push({
          id: `indi-ev-${idx}`,
          originalIndex: idx,
          type: ev.type,
          date: ev.date,
          place: ev.place,
          year: ev.year,
          age: computeAge(ev.year, ev.type),
          value: ev.value,
          cause: ev.cause,
          notes: ev.notes,
          citations: ev.citations
        })
      }
    }

    if (!hasExplicitBirt && selectedPerson.birth !== undefined) {
      const b = selectedPerson.birth
      if ((b.date?.length ?? 0) > 0 || (b.place?.length ?? 0) > 0) {
        items.push({
          id: 'fallback-birt',
          type: b.type ?? 'BIRT',
          date: b.date,
          place: b.place,
          year: b.year,
          citations: []
        })
      }
    }

    if (!hasExplicitDeat && selectedPerson.death !== undefined) {
      const d = selectedPerson.death
      if ((d.date?.length ?? 0) > 0 || (d.place?.length ?? 0) > 0) {
        items.push({
          id: 'fallback-deat',
          type: d.type ?? 'DEAT',
          date: d.date,
          place: d.place,
          year: d.year,
          age: computeAge(d.year, 'DEAT'),
          citations: []
        })
      }
    }

    // Include marriage & family events from fams
    for (const famId of selectedPerson.fams) {
      const fam = famMap.get(famId)
      if (fam !== undefined) {
        const sp = getSpouse(fam, selectedPerson.id)
        const spName = sp !== undefined ? cleanName(sp.name) : undefined
        if (fam.events.length > 0) {
          for (let fIdx = 0; fIdx < fam.events.length; fIdx++) {
            const fev = fam.events[fIdx]
            items.push({
              id: `fam-ev-${fam.id}-${fIdx}`,
              type: fev.type,
              date: fev.date,
              place: fev.place,
              year: fev.year,
              age: computeAge(fev.year, fev.type),
              value: fev.value,
              cause: fev.cause,
              notes: fev.notes,
              spouseName: spName,
              citations: fev.citations
            })
          }
        } else if (fam.marriage !== undefined) {
          items.push({
            id: `fam-marr-${fam.id}`,
            type: 'MARR',
            date: fam.marriage.date,
            place: fam.marriage.place,
            year: fam.marriage.year,
            age: computeAge(fam.marriage.year, 'MARR'),
            spouseName: spName,
            citations: fam.citations
          })
        }
      }
    }

    const typeOrderWeight = (type: string): number => {
      if (type === 'BIRT') return 1
      if (type === 'CHR' || type === 'BAPM' || type === 'BLES' || type === 'ADOP') return 2
      if (type === 'ENGA' || type === 'MARB' || type === 'MARC' || type === 'MARL') return 40
      if (type === 'MARR' || type === 'MARS') return 45
      if (type === 'SEPR' || type === 'DIVF' || type === 'DIV' || type === 'ANUL') return 60
      if (type === 'DEAT') return 90
      if (type === 'BURI' || type === 'CREM') return 95
      return 50
    }

    items.sort((a, b) => {
      if (a.year !== undefined && b.year !== undefined && a.year !== b.year) {
        return a.year - b.year
      }
      return typeOrderWeight(a.type) - typeOrderWeight(b.type)
    })

    return items
  })()

  // Media attached to the selected person or their marriages
  $: personMedia = (() => {
    if (selectedPerson === undefined) return []
    const ids = new Set<string>(selectedPerson.mediaIds)
    for (const famId of selectedPerson.fams) {
      const fam = famMap.get(famId)
      if (fam !== undefined) {
        for (const mId of fam.mediaIds) ids.add(mId)
      }
    }
    const list: MediaRecord[] = []
    for (const id of ids) {
      const m = media[id]
      if (m !== undefined) list.push(m)
    }
    return list
  })()

  // Individuals citing a given source ID
  function getIndividualsForSource(sourceId: string): Individual[] {
    return individuals.filter(
      (indi) =>
        indi.citations.some((c) => c.sourceId === sourceId) ||
        indi.events.some((ev) => ev.citations.some((c) => c.sourceId === sourceId))
    )
  }

  // Sources housed in a given repository ID
  function getSourcesForRepo(repoId: string): SourceRecord[] {
    return sourceList.filter((s) => s.repositoryId === repoId)
  }

  // Individuals linked to a given media ID
  function getIndividualsForMedia(mediaId: string): Individual[] {
    return individuals.filter((indi) => {
      if (indi.mediaIds.includes(mediaId)) return true
      return indi.fams.some((fId) => famMap.get(fId)?.mediaIds.includes(mediaId) ?? false)
    })
  }

  function getEventIcon(type: string): string {
    switch (type) {
      case 'BIRT':
      case 'ADOP':
        return '👶'
      case 'CHR':
      case 'CHRA':
      case 'BAPM':
      case 'BARM':
      case 'BASM':
      case 'BLES':
      case 'CONF':
      case 'FCOM':
      case 'ORDN':
        return '⛪'
      case 'ENGA':
      case 'MARB':
      case 'MARC':
      case 'MARL':
      case 'MARS':
        return '💎'
      case 'MARR':
        return '💍'
      case 'DIV':
      case 'DIVF':
      case 'ANUL':
      case 'SEPR':
        return '💔'
      case 'OCCU':
        return '💼'
      case 'RESI':
        return '🏠'
      case 'EDUC':
      case 'GRAD':
        return '🎓'
      case 'IMMI':
      case 'EMIG':
      case 'NATU':
        return '⛵'
      case 'CENS':
      case 'PROB':
      case 'WILL':
        return '📜'
      case 'RETI':
        return '🏖️'
      case 'DEAT':
        return '🕊️'
      case 'BURI':
      case 'CREM':
        return '⚰️'
      default:
        return '📌'
    }
  }

  function selectPerson(id: string): void {
    selectedIndividualId = id
    entityView = 'individuals'
  }

  function inspectSource(sourceId: string): void {
    if (sources[sourceId] !== undefined) {
      selectedSourceId = sourceId
      entityView = 'sources'
    }
  }

  function inspectRepo(repoId: string): void {
    if (repositories[repoId] !== undefined) {
      selectedRepoId = repoId
      entityView = 'repositories'
    }
  }

  function inspectMedia(mediaId: string): void {
    if (media[mediaId] !== undefined) {
      selectedMediaId = mediaId
      entityView = 'media'
    }
  }

  function getSpouse(fam: Family, personId: string): Individual | undefined {
    const spouseId = fam.husbandId === personId ? fam.wifeId : fam.husbandId
    return typeof spouseId === 'string' && spouseId.length > 0 ? indiMap.get(spouseId) : undefined
  }
</script>

<div class="records-container">
  <!-- Entity Category Sub-Tabs -->
  <div class="entity-subtabs" role="tablist">
    <button
      class="subtab-btn"
      class:active={entityView === 'individuals'}
      data-testid="records-subtab-individuals"
      on:click={() => {
        entityView = 'individuals'
      }}
    >
      👥 {$_('records.tab_individuals')} <span class="subtab-count">{individuals.length}</span>
    </button>
    <button
      class="subtab-btn"
      class:active={entityView === 'families'}
      data-testid="records-subtab-families"
      on:click={() => {
        entityView = 'families'
      }}
    >
      👨‍👩‍👧‍👦 {$_('records.tab_families')} <span class="subtab-count">{families.length}</span>
    </button>
    <button
      class="subtab-btn"
      class:active={entityView === 'sources'}
      data-testid="records-subtab-sources"
      on:click={() => {
        entityView = 'sources'
      }}
    >
      📚 {$_('records.tab_sources')} <span class="subtab-count">{sourceList.length}</span>
    </button>
    <button
      class="subtab-btn"
      class:active={entityView === 'repositories'}
      data-testid="records-subtab-repositories"
      on:click={() => {
        entityView = 'repositories'
      }}
    >
      🏛️ {$_('records.tab_repositories')} <span class="subtab-count">{repoList.length}</span>
    </button>
    <button
      class="subtab-btn"
      class:active={entityView === 'media'}
      data-testid="records-subtab-media"
      on:click={() => {
        entityView = 'media'
      }}
    >
      🖼️ {$_('records.tab_media')} <span class="subtab-count">{mediaList.length}</span>
    </button>
  </div>

  <!-- Search and filter controls -->
  <div class="controls-bar">
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input
        type="text"
        placeholder={$_('main_page.search_placeholder')}
        bind:value={searchQuery}
        class="search-input"
        data-testid="search-records-input"
      />
      {#if searchQuery.length > 0}
        <button
          class="clear-btn"
          on:click={() => {
            searchQuery = ''
          }}
        >
          ✕
        </button>
      {/if}
    </div>

    {#if entityView === 'individuals'}
      <div class="filter-group">
        <button
          class="filter-btn"
          class:active={genderFilter === 'ALL'}
          on:click={() => {
            genderFilter = 'ALL'
          }}
        >
          {$_('main_page.filter_all')} ({filteredIndividuals.length})
        </button>
        <button
          class="filter-btn male"
          class:active={genderFilter === 'M'}
          on:click={() => {
            genderFilter = 'M'
          }}
        >
          ♂ {$_('main_page.filter_males')}
        </button>
        <button
          class="filter-btn female"
          class:active={genderFilter === 'F'}
          on:click={() => {
            genderFilter = 'F'
          }}
        >
          ♀ {$_('main_page.filter_females')}
        </button>
      </div>

      <!-- Advanced Filters Row -->
      <div class="advanced-filters">
        <select class="adv-select" bind:value={vitalFilter} data-testid="vital-status-select">
          <option value="ALL">{$_('records.vital_all')}</option>
          <option value="LIVING">{$_('records.vital_living')}</option>
          <option value="DECEASED">{$_('records.vital_deceased')}</option>
        </select>

        <input
          type="number"
          class="year-input"
          placeholder={$_('records.year_from')}
          bind:value={yearFromInput}
          data-testid="year-from-input"
        />
        <input
          type="number"
          class="year-input"
          placeholder={$_('records.year_to')}
          bind:value={yearToInput}
          data-testid="year-to-input"
        />

        <button
          class="chip-toggle"
          class:active={withSourcesOnly}
          data-testid="filter-with-sources-btn"
          on:click={() => {
            withSourcesOnly = !withSourcesOnly
          }}
        >
          📚 {$_('records.filter_with_sources')}
        </button>

        <button
          class="chip-toggle"
          class:active={withMediaOnly}
          data-testid="filter-with-media-btn"
          on:click={() => {
            withMediaOnly = !withMediaOnly
          }}
        >
          🖼️ {$_('records.filter_with_media')}
        </button>

        <select class="adv-select" bind:value={sortOrder} data-testid="records-sort-select">
          <option value="id">{$_('records.sort_id')}</option>
          <option value="name">{$_('records.sort_name')}</option>
          <option value="birth_asc">{$_('records.sort_birth_asc')}</option>
          <option value="birth_desc">{$_('records.sort_birth_desc')}</option>
        </select>

        <button
          class="add-person-btn"
          data-testid="add-person-btn"
          on:click={openCreateModal}
        >
          ➕ {$_('records.add_person')}
        </button>
      </div>
    {:else if entityView === 'families'}
      <div class="entity-actions-bar">
        <button
          class="add-entity-btn"
          data-testid="add-family-btn"
          on:click={openCreateFamilyModal}
        >
          ➕ {$_('records.add_family')}
        </button>
      </div>
    {:else if entityView === 'sources'}
      <div class="entity-actions-bar">
        <button
          class="add-entity-btn"
          data-testid="add-source-btn"
          on:click={openCreateSourceModal}
        >
          ➕ {$_('records.add_source')}
        </button>
      </div>
    {:else if entityView === 'repositories'}
      <div class="entity-actions-bar">
        <button
          class="add-entity-btn"
          data-testid="add-repo-btn"
          on:click={openCreateRepoModal}
        >
          ➕ {$_('records.add_repo')}
        </button>
      </div>
    {:else if entityView === 'media'}
      <div class="entity-actions-bar">
        <button
          class="add-entity-btn"
          data-testid="add-media-btn"
          on:click={openCreateMediaModal}
        >
          ➕ {$_('records.add_media')}
        </button>
      </div>
    {/if}
  </div>

  {#if entityView === 'individuals'}
    <div class="records-layout">
      <!-- Individuals Table -->
      <div class="table-wrapper">
        <table class="records-table">
          <thead>
            <tr>
              <th style="width: 70px">ID</th>
              <th>{$_('records.name')}</th>
              <th style="width: 50px">{$_('records.sex')}</th>
              <th>{$_('main_page.birth')}</th>
              <th>{$_('main_page.death')}</th>
            </tr>
          </thead>
          <tbody>
            {#if filteredIndividuals.length === 0}
              <tr>
                <td colspan="5" class="empty-cell">
                  {$_('main_page.no_records_found')}
                </td>
              </tr>
            {:else}
              {#each filteredIndividuals.slice(0, 100) as indi (indi.id)}
                <tr
                  class="record-row"
                  class:selected={indi.id === selectedIndividualId}
                  on:click={() => {
                    selectPerson(indi.id)
                  }}
                >
                  <td class="id-cell">{indi.id}</td>
                  <td class="name-cell">
                    <span class="person-name">{cleanName(indi.name)}</span>
                    {#if hasAnyCitation(indi)}
                      <span class="mini-indicator" title={$_('records.citations')}>📚</span>
                    {/if}
                    {#if hasAnyMedia(indi)}
                      <span class="mini-indicator" title={$_('records.media_gallery')}>🖼️</span>
                    {/if}
                  </td>
                  <td class="sex-cell">
                    {#if indi.sex === 'M'}
                      <span class="sex-badge m">♂</span>
                    {:else if indi.sex === 'F'}
                      <span class="sex-badge f">♀</span>
                    {:else}
                      <span class="sex-badge u">?</span>
                    {/if}
                  </td>
                  <td class="event-cell">
                    {#if indi.birth?.date !== undefined || indi.birth?.place !== undefined}
                      <span>{indi.birth?.date ?? ''} {typeof indi.birth?.place === 'string' && indi.birth.place.length > 0 ? `(${indi.birth.place})` : ''}</span>
                    {:else}
                      <span class="text-muted">—</span>
                    {/if}
                  </td>
                  <td class="event-cell">
                    {#if indi.death?.date !== undefined || indi.death?.place !== undefined}
                      <span>{indi.death?.date ?? ''} {typeof indi.death?.place === 'string' && indi.death.place.length > 0 ? `(${indi.death.place})` : ''}</span>
                    {:else}
                      <span class="text-muted">—</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
        {#if filteredIndividuals.length > 100}
          <div class="table-footer-notice">
            {$_({ id: 'records.showing_first_n', values: { total: filteredIndividuals.length } })}
          </div>
        {/if}
      </div>

      <!-- Inspector Panel -->
      <div class="inspector-panel">
        {#if selectedPerson !== undefined}
          <div class="inspector-card">
            <div class="inspector-header">
              <div class="avatar-large" class:male={selectedPerson.sex === 'M'} class:female={selectedPerson.sex === 'F'}>
                {selectedPerson.sex === 'M' ? '♂' : selectedPerson.sex === 'F' ? '♀' : '👤'}
              </div>
              <div class="inspector-header-info">
                <h3 class="inspector-title">{cleanName(selectedPerson.name)}</h3>
                <div class="inspector-subtitle">
                  {selectedPerson.id} &bull; {formatLifespan(selectedPerson.birth, selectedPerson.death)}
                </div>
                {#if typeof selectedPerson.nick === 'string' && selectedPerson.nick.length > 0}
                  <div class="inspector-alias">“{selectedPerson.nick}”</div>
                {/if}
              </div>
              <div class="inspector-controls">
                <button
                  class="action-pill-btn edit"
                  data-testid="inspector-edit-person-btn"
                  on:click={() => {
                    openEditModal(selectedPerson)
                  }}
                >
                  ✏️ {$_('records.edit_person')}
                </button>
                <button
                  class="action-pill-btn delete"
                  data-testid="inspector-delete-person-btn"
                  on:click={() => {
                    deletePerson(selectedPerson.id)
                  }}
                >
                  🗑️
                </button>
                {#if onExploreInTree !== null}
                  <button class="tree-jump-btn" data-testid="inspector-view-in-tree-btn" on:click={onExploreInTree}>
                    🌿 {$_('records.view_in_tree')}
                  </button>
                {/if}
              </div>
            </div>

            <!-- Interactive Chronological Life Timeline -->
            <div class="inspector-section">
              <div class="section-heading-row">
                <div class="section-heading">⏳ {$_('records.timeline')} ({personTimeline.length})</div>
                <button
                  class="action-pill-btn add-btn"
                  data-testid="add-event-btn"
                  on:click={openCreateEventModal}
                >
                  ➕ {$_('records.add_event')}
                </button>
              </div>
              {#if personTimeline.length === 0}
                <div class="event-item text-muted">—</div>
              {:else}
                <div class="timeline-list" data-testid="inspector-timeline">
                  {#each personTimeline as item (item.id)}
                    <div class="timeline-item" data-testid="timeline-event-item">
                      <div class="timeline-marker">
                        <span class="timeline-icon">{getEventIcon(item.type)}</span>
                      </div>
                      <div class="timeline-body">
                        <div class="timeline-header-row">
                          <span class="event-label">{$_(`records.event_types.${item.type}`, { default: item.type })}</span>
                          <div class="timeline-badges">
                            {#if item.year !== undefined}
                              <span class="year-badge">{item.year}</span>
                            {/if}
                            {#if item.age !== undefined}
                              <span class="age-badge">{$_({ id: 'records.age_at_event', values: { age: item.age } })}</span>
                            {/if}
                            {#if item.originalIndex !== undefined}
                              <div class="item-action-btns">
                                <button
                                  class="icon-action-btn"
                                  title={$_('records.edit_event')}
                                  data-testid="edit-event-btn"
                                  on:click={() => {
                                    if (item.originalIndex !== undefined) openEditEventModal(item.originalIndex)
                                  }}
                                >
                                  ✏️
                                </button>
                                <button
                                  class="icon-action-btn delete"
                                  title={$_('records.delete_event')}
                                  data-testid="delete-event-btn"
                                  on:click={() => {
                                    if (item.originalIndex !== undefined) deleteEvent(item.originalIndex)
                                  }}
                                >
                                  🗑️
                                </button>
                                <button
                                  class="action-pill-btn mini"
                                  title={$_('records.add_citation')}
                                  data-testid="add-event-citation-btn"
                                  on:click={() => {
                                    if (item.originalIndex !== undefined) openCreateCitationModal(item.originalIndex)
                                  }}
                                >
                                  + Citation
                                </button>
                              </div>
                            {/if}
                          </div>
                        </div>

                        <div class="timeline-details">
                          {#if typeof item.value === 'string' && item.value.length > 0}
                            <div class="timeline-val">{item.value}</div>
                          {/if}
                          {#if typeof item.spouseName === 'string' && item.spouseName.length > 0}
                            <div class="timeline-spouse">💍 {item.spouseName}</div>
                          {/if}
                          {#if typeof item.date === 'string' && item.date.length > 0}
                            <span class="timeline-date">📅 {item.date}</span>
                          {/if}
                          {#if typeof item.place === 'string' && item.place.length > 0}
                            <span class="timeline-place">📍 {item.place}</span>
                          {/if}
                          {#if typeof item.cause === 'string' && item.cause.length > 0}
                            <span class="timeline-cause">[{item.cause}]</span>
                          {/if}
                          {#if typeof item.notes === 'string' && item.notes.length > 0}
                            <div class="timeline-note">📝 {item.notes}</div>
                          {/if}
                        </div>

                        {#if item.citations.length > 0}
                          <div class="timeline-citations">
                            {#each item.citations as cit, cIdx}
                              {@const srcRecord = sources[cit.sourceId]}
                              <div class="citation-pill-box">
                                <button
                                  class="citation-source-btn"
                                  on:click={() => {
                                    inspectSource(cit.sourceId)
                                  }}
                                >
                                  📚 {srcRecord?.title ?? cit.sourceId}
                                </button>
                                {#if typeof cit.page === 'string' && cit.page.length > 0}
                                  <span class="citation-page">{cit.page}</span>
                                {/if}
                                {#if cit.quay !== undefined}
                                  <span class="quay-badge q-{cit.quay}">
                                    {$_(`records.quay_${cit.quay}`, { default: `QUAY ${cit.quay}` })}
                                  </span>
                                {/if}
                                {#if typeof cit.text === 'string' && cit.text.length > 0}
                                  <blockquote class="citation-excerpt">“{cit.text}”</blockquote>
                                {/if}
                                {#if item.originalIndex !== undefined}
                                  <button
                                    class="icon-action-btn mini"
                                    title={$_('records.edit_citation')}
                                    on:click={() => {
                                      openEditCitationModal(cIdx, item.originalIndex ?? null)
                                    }}
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    class="icon-action-btn mini delete"
                                    title={$_('records.delete_citation')}
                                    on:click={() => {
                                      deleteCitation(cIdx, item.originalIndex ?? null)
                                    }}
                                  >
                                    🗑️
                                  </button>
                                {/if}
                              </div>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Multimedia Gallery Attachments -->
            <div class="inspector-section" data-testid="inspector-media-section">
              <div class="section-heading-row">
                <div class="section-heading">🖼️ {$_('records.media_gallery')} ({personMedia.length})</div>
                <button
                  class="action-pill-btn add-btn"
                  data-testid="attach-media-btn"
                  on:click={openAttachMediaModal}
                >
                  ➕ {$_('records.attach_media')}
                </button>
              </div>
              {#if personMedia.length === 0}
                <div class="event-item text-muted">—</div>
              {:else}
                <div class="media-mini-grid">
                  {#each personMedia as m (m.id)}
                    {@const isDirectlyAttached = selectedPerson.mediaIds.includes(m.id)}
                    <div class="media-mini-card-wrapper">
                      <button
                        class="media-mini-card"
                        on:click={() => {
                          inspectMedia(m.id)
                        }}
                      >
                        <span class="media-format-badge">{m.format ?? 'FILE'}</span>
                        <div class="media-mini-info">
                          <div class="media-mini-title">{m.title ?? m.id}</div>
                          {#if typeof m.filePath === 'string' && m.filePath.length > 0}
                            <div class="media-mini-path">{m.filePath}</div>
                          {/if}
                        </div>
                      </button>
                      {#if isDirectlyAttached}
                        <button
                          class="detach-btn"
                          title={$_('records.detach_media')}
                          data-testid="detach-media-btn"
                          on:click={() => {
                            detachMediaFromPerson(m.id)
                          }}
                        >
                          ✕
                        </button>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Family Links -->
            {#if selectedPerson.famc.length > 0}
              <div class="inspector-section">
                <div class="section-heading">{$_('main_page.parents')}</div>
                {#each selectedPerson.famc as famId}
                  {@const fam = famMap.get(famId)}
                  {#if fam !== undefined}
                    <div class="family-unit">
                      {#if typeof fam.husbandId === 'string' && fam.husbandId.length > 0}
                        {@const f = indiMap.get(fam.husbandId)}
                        <button
                          class="link-btn"
                          on:click={() => {
                            selectPerson(fam.husbandId ?? '')
                          }}
                        >
                          👨 {cleanName(f?.name)} <small>{formatLifespan(f?.birth, f?.death)}</small>
                        </button>
                      {/if}
                      {#if typeof fam.wifeId === 'string' && fam.wifeId.length > 0}
                        {@const m = indiMap.get(fam.wifeId)}
                        <button
                          class="link-btn"
                          on:click={() => {
                            selectPerson(fam.wifeId ?? '')
                          }}
                        >
                          👩 {cleanName(m?.name)} <small>{formatLifespan(m?.birth, m?.death)}</small>
                        </button>
                      {/if}
                    </div>
                  {/if}
                {/each}
              </div>
            {/if}

            {#if selectedPerson.fams.length > 0}
              <div class="inspector-section">
                <div class="section-heading">{$_('main_page.spouses')} & {$_('main_page.children')}</div>
                {#each selectedPerson.fams as famId}
                  {@const fam = famMap.get(famId)}
                  {#if fam !== undefined}
                    <div class="family-unit">
                      {#if getSpouse(fam, selectedPerson.id) !== undefined}
                        {@const spouse = getSpouse(fam, selectedPerson.id)}
                        <div class="spouse-box">
                          <span class="role-tag">💍 {$_('records.spouse')}:</span>
                          <button
                            class="link-btn inline"
                            on:click={() => {
                              selectPerson(spouse?.id ?? '')
                            }}
                          >
                            {cleanName(spouse?.name)} <small>{formatLifespan(spouse?.birth, spouse?.death)}</small>
                          </button>
                        </div>
                      {/if}

                      {#if fam.childrenIds.length > 0}
                        <div class="children-list">
                          <span class="role-tag">👶 {$_('records.children')} ({fam.childrenIds.length}):</span>
                          {#each fam.childrenIds as childId}
                            {@const ch = indiMap.get(childId)}
                            <button
                              class="link-btn child-item"
                              on:click={() => {
                                selectPerson(childId)
                              }}
                            >
                              {ch?.sex === 'M' ? '👦' : '👧'}
                              {cleanName(ch?.name)} <small>{formatLifespan(ch?.birth, ch?.death)}</small>
                            </button>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/if}
                {/each}
              </div>
            {/if}

            {#if typeof selectedPerson.notes === 'string' && selectedPerson.notes.length > 0}
              <div class="inspector-section">
                <div class="section-heading">{$_('main_page.notes')}</div>
                <div class="notes-content">{selectedPerson.notes}</div>
              </div>
            {/if}

            <!-- Person-level Citations -->
            <div class="inspector-section" data-testid="inspector-citations-section">
              <div class="section-heading-row">
                <div class="section-heading">📚 {$_('records.citations')} ({selectedPerson.citations.length})</div>
                <button
                  class="action-pill-btn add-btn"
                  data-testid="add-citation-btn"
                  on:click={() => {
                    openCreateCitationModal(null)
                  }}
                >
                  ➕ {$_('records.add_citation')}
                </button>
              </div>
              {#if selectedPerson.citations.length === 0}
                <div class="event-item text-muted">—</div>
              {:else}
                <div class="citation-cards-list">
                  {#each selectedPerson.citations as cit, cIdx}
                    {@const srcRecord = sources[cit.sourceId]}
                    <div class="citation-full-card" data-testid="person-citation-card">
                      <div class="citation-header-row">
                        <button
                          class="citation-source-btn"
                          on:click={() => {
                            inspectSource(cit.sourceId)
                          }}
                        >
                          📚 {srcRecord?.title ?? cit.sourceId}
                        </button>
                        <div class="item-action-btns">
                          <button
                            class="icon-action-btn"
                            title={$_('records.edit_citation')}
                            on:click={() => {
                              openEditCitationModal(cIdx, null)
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            class="icon-action-btn delete"
                            title={$_('records.delete_citation')}
                            on:click={() => {
                              deleteCitation(cIdx, null)
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div class="citation-card-body">
                        {#if typeof cit.page === 'string' && cit.page.length > 0}
                          <span class="citation-page">{cit.page}</span>
                        {/if}
                        {#if cit.quay !== undefined}
                          <span class="quay-badge q-{cit.quay}">
                            {$_(`records.quay_${cit.quay}`, { default: `QUAY ${cit.quay}` })}
                          </span>
                        {/if}
                        {#if typeof cit.text === 'string' && cit.text.length > 0}
                          <blockquote class="citation-excerpt">“{cit.text}”</blockquote>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <div class="inspector-empty">
            <div class="empty-icon">👆</div>
            <p>{$_('main_page.no_selection')}</p>
          </div>
        {/if}
      </div>
    </div>
  {:else if entityView === 'families'}
    <!-- Families Explorer View -->
    <div class="entity-grid" data-testid="families-explorer-grid">
      {#if filteredFamilies.length === 0}
        <div class="empty-state">{$_('main_page.no_records_found')}</div>
      {:else}
        {#each filteredFamilies as fam (fam.id)}
          {@const husb = typeof fam.husbandId === 'string' ? indiMap.get(fam.husbandId) : undefined}
          {@const wife = typeof fam.wifeId === 'string' ? indiMap.get(fam.wifeId) : undefined}
          <div class="entity-card family-card" class:highlighted={fam.id === selectedFamilyId} data-testid="family-card">
            <div class="entity-card-header">
              <span class="entity-id-badge">{fam.id}</span>
              <div class="card-action-btns">
                <button
                  class="icon-action-btn"
                  title={$_('records.edit_family')}
                  data-testid="edit-family-btn"
                  on:click={() => {
                    openEditFamilyModal(fam)
                  }}
                >
                  ✏️
                </button>
                <button
                  class="icon-action-btn delete"
                  title={$_('records.delete_family')}
                  data-testid="delete-family-btn"
                  on:click={() => {
                    deleteFamily(fam.id)
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>

            <div class="family-spouses-row">
              <div class="spouse-item">
                <span class="spouse-role">👨 {$_('records.husband')}:</span>
                {#if husb !== undefined}
                  <button
                    class="inline-entity-link"
                    on:click={() => {
                      selectPerson(husb.id)
                    }}
                  >
                    {cleanName(husb.name)} <small>{formatLifespan(husb.birth, husb.death)}</small>
                  </button>
                {:else}
                  <span class="text-muted">{$_('records.none_unlinked')}</span>
                {/if}
              </div>
              <div class="spouse-item">
                <span class="spouse-role">👩 {$_('records.wife')}:</span>
                {#if wife !== undefined}
                  <button
                    class="inline-entity-link"
                    on:click={() => {
                      selectPerson(wife.id)
                    }}
                  >
                    {cleanName(wife.name)} <small>{formatLifespan(wife.birth, wife.death)}</small>
                  </button>
                {:else}
                  <span class="text-muted">{$_('records.none_unlinked')}</span>
                {/if}
              </div>
            </div>

            <div class="entity-meta-list">
              {#if fam.marriage?.date !== undefined || fam.marriage?.place !== undefined}
                <div>
                  <strong>💍 {$_('records.marriage_date')}:</strong>
                  {fam.marriage?.date ?? ''} {typeof fam.marriage?.place === 'string' && fam.marriage.place.length > 0 ? `(${fam.marriage.place})` : ''}
                </div>
              {/if}
              {#if fam.divorced}
                <div class="divorce-badge">💔 {$_('records.is_divorced')}</div>
              {/if}
              {#if typeof fam.notes === 'string' && fam.notes.length > 0}
                <div class="family-notes-text">📝 {fam.notes}</div>
              {/if}
            </div>

            {#if fam.childrenIds.length > 0}
              <div class="entity-refs">
                <div class="section-heading">👶 {$_('records.children')} ({fam.childrenIds.length})</div>
                <div class="ref-chips">
                  {#each fam.childrenIds as childId}
                    {@const ch = indiMap.get(childId)}
                    <button
                      class="ref-chip"
                      on:click={() => {
                        selectPerson(childId)
                      }}
                    >
                      {ch?.sex === 'M' ? '👦' : '👧'} {cleanName(ch?.name)}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  {:else if entityView === 'sources'}
    <!-- Sources Explorer View -->
    <div class="entity-grid" data-testid="sources-explorer-grid">
      {#each filteredSources as src (src.id)}
        {@const repo = typeof src.repositoryId === 'string' ? repositories[src.repositoryId] : undefined}
        {@const citingPeople = getIndividualsForSource(src.id)}
        <div class="entity-card" class:highlighted={src.id === selectedSourceId} data-testid="source-card">
          <div class="entity-card-header">
            <span class="entity-id-badge">{src.id}</span>
            <h4 class="entity-card-title">{src.title ?? src.id}</h4>
            <div class="card-action-btns">
              <button
                class="icon-action-btn"
                title={$_('records.edit_source')}
                data-testid="edit-source-btn"
                on:click={() => {
                  openEditSourceModal(src)
                }}
              >
                ✏️
              </button>
              <button
                class="icon-action-btn delete"
                title={$_('records.delete_source')}
                data-testid="delete-source-btn"
                on:click={() => {
                  deleteSource(src.id)
                }}
              >
                🗑️
              </button>
            </div>
          </div>
          <div class="entity-meta-list">
            {#if typeof src.author === 'string' && src.author.length > 0}
              <div><strong>{$_('records.author')}:</strong> {src.author}</div>
            {/if}
            {#if typeof src.publication === 'string' && src.publication.length > 0}
              <div><strong>{$_('records.publication')}:</strong> {src.publication}</div>
            {/if}
            {#if repo !== undefined}
              <div>
                <strong>{$_('records.repository')}:</strong>
                <button
                  class="inline-entity-link"
                  on:click={() => {
                    inspectRepo(repo.id)
                  }}
                >
                  🏛️ {repo.name ?? repo.id}
                </button>
              </div>
            {/if}
          </div>
          {#if citingPeople.length > 0}
            <div class="entity-refs">
              <div class="section-heading">{$_('records.referenced_by')} ({citingPeople.length})</div>
              <div class="ref-chips">
                {#each citingPeople.slice(0, 12) as person (person.id)}
                  <button
                    class="ref-chip"
                    on:click={() => {
                      selectPerson(person.id)
                    }}
                  >
                    {cleanName(person.name)}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else if entityView === 'repositories'}
    <!-- Repositories Explorer View -->
    <div class="entity-grid" data-testid="repositories-explorer-grid">
      {#each filteredRepos as repo (repo.id)}
        {@const housedSources = getSourcesForRepo(repo.id)}
        <div class="entity-card" class:highlighted={repo.id === selectedRepoId} data-testid="repository-card">
          <div class="entity-card-header">
            <span class="entity-id-badge">{repo.id}</span>
            <h4 class="entity-card-title">🏛️ {repo.name ?? repo.id}</h4>
            <div class="card-action-btns">
              <button
                class="icon-action-btn"
                title={$_('records.edit_repo')}
                data-testid="edit-repo-btn"
                on:click={() => {
                  openEditRepoModal(repo)
                }}
              >
                ✏️
              </button>
              <button
                class="icon-action-btn delete"
                title={$_('records.delete_repo')}
                data-testid="delete-repo-btn"
                on:click={() => {
                  deleteRepo(repo.id)
                }}
              >
                🗑️
              </button>
            </div>
          </div>
          <div class="entity-meta-list">
            {#if typeof repo.address === 'string' && repo.address.length > 0}
              <div><strong>{$_('records.address')}:</strong> 📍 {repo.address}</div>
            {/if}
            {#if typeof repo.phone === 'string' && repo.phone.length > 0}
              <div>📞 {repo.phone}</div>
            {/if}
            {#if typeof repo.email === 'string' && repo.email.length > 0}
              <div>✉️ {repo.email}</div>
            {/if}
          </div>
          {#if housedSources.length > 0}
            <div class="entity-refs">
              <div class="section-heading">{$_('records.housed_sources')} ({housedSources.length})</div>
              <div class="ref-chips">
                {#each housedSources as s (s.id)}
                  <button
                    class="ref-chip"
                    on:click={() => {
                      inspectSource(s.id)
                    }}
                  >
                    📚 {s.title ?? s.id}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else if entityView === 'media'}
    <!-- Multimedia Gallery Explorer View -->
    <div class="entity-grid" data-testid="media-explorer-grid">
      {#each filteredMedia as m (m.id)}
        {@const linkedPeople = getIndividualsForMedia(m.id)}
        <div class="entity-card media-card" class:highlighted={m.id === selectedMediaId} data-testid="media-card">
          <div class="media-preview-banner">
            <span class="media-banner-icon">{m.format === 'PDF' ? '📄' : '🖼️'}</span>
            <span class="media-format-pill">{m.format ?? 'OBJE'}</span>
          </div>
          <div class="entity-card-header">
            <span class="entity-id-badge">{m.id}</span>
            <h4 class="entity-card-title">{m.title ?? m.id}</h4>
            <div class="card-action-btns">
              <button
                class="icon-action-btn"
                title={$_('records.edit_media')}
                data-testid="edit-media-btn"
                on:click={() => {
                  openEditMediaModal(m)
                }}
              >
                ✏️
              </button>
              <button
                class="icon-action-btn delete"
                title={$_('records.delete_media')}
                data-testid="delete-media-btn"
                on:click={() => {
                  deleteMedia(m.id)
                }}
              >
                🗑️
              </button>
            </div>
          </div>
          <div class="entity-meta-list">
            {#if typeof m.filePath === 'string' && m.filePath.length > 0}
              <div><strong>{$_('records.file_path')}:</strong> <code>{m.filePath}</code></div>
            {/if}
            {#if typeof m.notes === 'string' && m.notes.length > 0}
              <div>{m.notes}</div>
            {/if}
          </div>
          {#if linkedPeople.length > 0}
            <div class="entity-refs">
              <div class="section-heading">{$_('records.referenced_by')} ({linkedPeople.length})</div>
              <div class="ref-chips">
                {#each linkedPeople as person (person.id)}
                  <button
                    class="ref-chip"
                    on:click={() => {
                      selectPerson(person.id)
                    }}
                  >
                    {cleanName(person.name)}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if isEditing || isCreating}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="modal-backdrop"
    on:click|self={() => {
      isEditing = false
      isCreating = false
    }}
  >
    <div class="edit-modal-card" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title">{isCreating ? $_('records.add_person') : $_('records.edit_person')}</h3>
        <button
          class="modal-close-btn"
          on:click={() => {
            isEditing = false
            isCreating = false
          }}>&times;</button
        >
      </div>

      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label for="edit-id">ID</label>
            <input id="edit-id" type="text" class="form-input" disabled value={editId} />
          </div>
          <div class="form-group">
            <label for="edit-gender">{$_('records.gender')}</label>
            <select id="edit-gender" class="form-input" bind:value={editSex} data-testid="edit-person-sex">
              <option value="U">{$_('main_page.unknown_sex')}</option>
              <option value="M">{$_('main_page.filter_males')}</option>
              <option value="F">{$_('main_page.filter_females')}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="edit-given-name">{$_('records.given_name')}</label>
            <input
              id="edit-given-name"
              type="text"
              class="form-input"
              bind:value={editGivenName}
              placeholder="e.g. John"
              data-testid="edit-person-given-name"
            />
          </div>
          <div class="form-group">
            <label for="edit-surname">{$_('records.surname')}</label>
            <input
              id="edit-surname"
              type="text"
              class="form-input"
              bind:value={editSurname}
              placeholder="e.g. Smith"
              data-testid="edit-person-surname"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="edit-nick">{$_('records.nickname')}</label>
          <input
            id="edit-nick"
            type="text"
            class="form-input"
            bind:value={editNick}
            placeholder="e.g. Jack"
            data-testid="edit-person-nickname"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="edit-birt-date">{$_('records.birth_date')}</label>
            <input
              id="edit-birt-date"
              type="text"
              class="form-input"
              bind:value={editBirthDate}
              placeholder="e.g. 15 JAN 1900"
              data-testid="edit-person-birth-date"
            />
          </div>
          <div class="form-group">
            <label for="edit-birt-place">{$_('records.birth_place')}</label>
            <input
              id="edit-birt-place"
              type="text"
              class="form-input"
              bind:value={editBirthPlace}
              placeholder="e.g. Boston, MA"
              data-testid="edit-person-birth-place"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="edit-deat-date">{$_('records.death_date')}</label>
            <input
              id="edit-deat-date"
              type="text"
              class="form-input"
              bind:value={editDeathDate}
              placeholder="e.g. 20 MAR 1975"
              data-testid="edit-person-death-date"
            />
          </div>
          <div class="form-group">
            <label for="edit-deat-place">{$_('records.death_place')}</label>
            <input
              id="edit-deat-place"
              type="text"
              class="form-input"
              bind:value={editDeathPlace}
              placeholder="e.g. New York, NY"
              data-testid="edit-person-death-place"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="edit-notes">{$_('records.notes_field')}</label>
          <textarea
            id="edit-notes"
            class="form-textarea"
            rows="3"
            bind:value={editNotes}
            placeholder="Biographical notes..."
            data-testid="edit-person-notes"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="modal-btn secondary"
          on:click={() => {
            isEditing = false
            isCreating = false
          }}
          data-testid="cancel-edit-btn"
        >
          {$_('records.cancel')}
        </button>
        <button
          class="modal-btn primary"
          on:click={isCreating ? saveCreate : saveEdit}
          data-testid="save-edit-btn"
        >
          {$_('records.save_changes')}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if isEditingFamily || isCreatingFamily}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="modal-backdrop"
    on:click|self={() => {
      isEditingFamily = false
      isCreatingFamily = false
    }}
  >
    <div class="edit-modal-card" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title">{isCreatingFamily ? $_('records.add_family') : $_('records.edit_family')}</h3>
        <button
          class="modal-close-btn"
          on:click={() => {
            isEditingFamily = false
            isCreatingFamily = false
          }}>&times;</button
        >
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="edit-fam-id">ID</label>
          <input id="edit-fam-id" type="text" class="form-input" disabled value={editFamId} />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="edit-fam-husb">{$_('records.husband')}</label>
            <select id="edit-fam-husb" class="form-input" bind:value={editFamHusbandId} data-testid="edit-family-husband">
              <option value="">{$_('records.none_unlinked')}</option>
              {#each individuals as person (person.id)}
                <option value={person.id}>{person.id} — {cleanName(person.name)} {formatLifespan(person.birth, person.death)}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label for="edit-fam-wife">{$_('records.wife')}</label>
            <select id="edit-fam-wife" class="form-input" bind:value={editFamWifeId} data-testid="edit-family-wife">
              <option value="">{$_('records.none_unlinked')}</option>
              {#each individuals as person (person.id)}
                <option value={person.id}>{person.id} — {cleanName(person.name)} {formatLifespan(person.birth, person.death)}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="edit-fam-marr-date">{$_('records.marriage_date')}</label>
            <input
              id="edit-fam-marr-date"
              type="text"
              class="form-input"
              bind:value={editFamMarriageDate}
              placeholder="e.g. 15 JUN 1920"
              data-testid="edit-family-marriage-date"
            />
          </div>
          <div class="form-group">
            <label for="edit-fam-marr-place">{$_('records.marriage_place')}</label>
            <input
              id="edit-fam-marr-place"
              type="text"
              class="form-input"
              bind:value={editFamMarriagePlace}
              placeholder="e.g. London, UK"
              data-testid="edit-family-marriage-place"
            />
          </div>
        </div>

        <div class="form-group-checkbox">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={editFamDivorced} data-testid="edit-family-divorced" />
            <span>{$_('records.is_divorced')}</span>
          </label>
        </div>

        <div class="form-group">
          <label for="edit-family-add-child-select">{$_('records.children')} ({editFamChildrenIds.length})</label>
          <div class="children-manager">
            {#if editFamChildrenIds.length > 0}
              <div class="selected-children-chips">
                {#each editFamChildrenIds as cid}
                  {@const ch = indiMap.get(cid)}
                  <span class="child-chip">
                    {ch?.sex === 'M' ? '👦' : '👧'} {cleanName(ch?.name)} ({cid})
                    <button
                      type="button"
                      class="remove-chip-btn"
                      on:click={() => {
                        editFamChildrenIds = editFamChildrenIds.filter((id) => id !== cid)
                      }}
                    >✕</button>
                  </span>
                {/each}
              </div>
            {/if}
            <select
              id="edit-family-add-child-select"
              class="form-input add-child-select"
              bind:value={editFamChildToAdd}
              data-testid="edit-family-add-child-select"
              on:change={() => {
                if (editFamChildToAdd.length > 0 && !editFamChildrenIds.includes(editFamChildToAdd)) {
                  editFamChildrenIds = [...editFamChildrenIds, editFamChildToAdd]
                  editFamChildToAdd = ''
                }
              }}
            >
              <option value="">+ Add child...</option>
              {#each individuals.filter((i) => !editFamChildrenIds.includes(i.id)) as cand (cand.id)}
                <option value={cand.id}>{cand.id} — {cleanName(cand.name)} {formatLifespan(cand.birth, cand.death)}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="edit-fam-notes">{$_('records.notes_field')}</label>
          <textarea
            id="edit-fam-notes"
            class="form-textarea"
            rows="3"
            bind:value={editFamNotes}
            placeholder="Family notes..."
            data-testid="edit-family-notes"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="modal-btn secondary"
          on:click={() => {
            isEditingFamily = false
            isCreatingFamily = false
          }}
          data-testid="cancel-family-btn"
        >
          {$_('records.cancel')}
        </button>
        <button
          class="modal-btn primary"
          on:click={saveFamily}
          data-testid="save-family-btn"
        >
          {$_('records.save_changes')}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if isEditingSource || isCreatingSource}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="modal-backdrop"
    on:click|self={() => {
      isEditingSource = false
      isCreatingSource = false
    }}
  >
    <div class="edit-modal-card" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title">{isCreatingSource ? $_('records.add_source') : $_('records.edit_source')}</h3>
        <button
          class="modal-close-btn"
          on:click={() => {
            isEditingSource = false
            isCreatingSource = false
          }}>&times;</button
        >
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="edit-src-id">ID</label>
          <input id="edit-src-id" type="text" class="form-input" disabled value={editSourceId} />
        </div>

        <div class="form-group">
          <label for="edit-src-title">{$_('records.source_title')}</label>
          <input
            id="edit-src-title"
            type="text"
            class="form-input"
            bind:value={editSourceTitle}
            placeholder="Source title or description"
            data-testid="edit-source-title"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="edit-src-author">{$_('records.source_author')}</label>
            <input
              id="edit-src-author"
              type="text"
              class="form-input"
              bind:value={editSourceAuthor}
              placeholder="Author or creator"
              data-testid="edit-source-author"
            />
          </div>
          <div class="form-group">
            <label for="edit-src-repo">{$_('records.source_repo')}</label>
            <select id="edit-src-repo" class="form-input" bind:value={editSourceRepoId} data-testid="edit-source-repo">
              <option value="">{$_('records.none_unlinked')}</option>
              {#each repoList as r (r.id)}
                <option value={r.id}>{r.id} — {r.name ?? r.id}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="edit-src-pub">{$_('records.source_publication')}</label>
          <input
            id="edit-src-pub"
            type="text"
            class="form-input"
            bind:value={editSourcePublication}
            placeholder="Publication facts or agency"
            data-testid="edit-source-publication"
          />
        </div>

        <div class="form-group">
          <label for="edit-src-notes">{$_('records.notes_field')}</label>
          <textarea
            id="edit-src-notes"
            class="form-textarea"
            rows="3"
            bind:value={editSourceNotes}
            placeholder="Source notes or transcripts..."
            data-testid="edit-source-notes"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="modal-btn secondary"
          on:click={() => {
            isEditingSource = false
            isCreatingSource = false
          }}
          data-testid="cancel-source-btn"
        >
          {$_('records.cancel')}
        </button>
        <button
          class="modal-btn primary"
          on:click={saveSource}
          data-testid="save-source-btn"
        >
          {$_('records.save_changes')}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if isEditingRepo || isCreatingRepo}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="modal-backdrop"
    on:click|self={() => {
      isEditingRepo = false
      isCreatingRepo = false
    }}
  >
    <div class="edit-modal-card" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title">{isCreatingRepo ? $_('records.add_repo') : $_('records.edit_repo')}</h3>
        <button
          class="modal-close-btn"
          on:click={() => {
            isEditingRepo = false
            isCreatingRepo = false
          }}>&times;</button
        >
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="edit-repo-id">ID</label>
          <input id="edit-repo-id" type="text" class="form-input" disabled value={editRepoId} />
        </div>

        <div class="form-group">
          <label for="edit-repo-name">{$_('records.repo_name')}</label>
          <input
            id="edit-repo-name"
            type="text"
            class="form-input"
            bind:value={editRepoName}
            placeholder="Archive or library name"
            data-testid="edit-repo-name"
          />
        </div>

        <div class="form-group">
          <label for="edit-repo-address">{$_('records.repo_address')}</label>
          <input
            id="edit-repo-address"
            type="text"
            class="form-input"
            bind:value={editRepoAddress}
            placeholder="Address or location"
            data-testid="edit-repo-address"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="edit-repo-phone">{$_('records.repo_phone')}</label>
            <input
              id="edit-repo-phone"
              type="text"
              class="form-input"
              bind:value={editRepoPhone}
              placeholder="+1 555-0199"
              data-testid="edit-repo-phone"
            />
          </div>
          <div class="form-group">
            <label for="edit-repo-email">{$_('records.repo_email')}</label>
            <input
              id="edit-repo-email"
              type="email"
              class="form-input"
              bind:value={editRepoEmail}
              placeholder="archive@example.org"
              data-testid="edit-repo-email"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="edit-repo-notes">{$_('records.notes_field')}</label>
          <textarea
            id="edit-repo-notes"
            class="form-textarea"
            rows="3"
            bind:value={editRepoNotes}
            placeholder="Repository notes or opening hours..."
            data-testid="edit-repo-notes"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="modal-btn secondary"
          on:click={() => {
            isEditingRepo = false
            isCreatingRepo = false
          }}
          data-testid="cancel-repo-btn"
        >
          {$_('records.cancel')}
        </button>
        <button
          class="modal-btn primary"
          on:click={saveRepo}
          data-testid="save-repo-btn"
        >
          {$_('records.save_changes')}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if isEditingMedia || isCreatingMedia}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="modal-backdrop"
    on:click|self={() => {
      isEditingMedia = false
      isCreatingMedia = false
    }}
  >
    <div class="edit-modal-card" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title">{isCreatingMedia ? $_('records.add_media') : $_('records.edit_media')}</h3>
        <button
          class="modal-close-btn"
          on:click={() => {
            isEditingMedia = false
            isCreatingMedia = false
          }}>&times;</button
        >
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="edit-med-id">ID</label>
          <input id="edit-med-id" type="text" class="form-input" disabled value={editMediaId} />
        </div>

        <div class="form-row">
          <div class="form-group" style="flex: 2">
            <label for="edit-med-title">{$_('records.media_title')}</label>
            <input
              id="edit-med-title"
              type="text"
              class="form-input"
              bind:value={editMediaTitle}
              placeholder="Title or caption"
              data-testid="edit-media-title"
            />
          </div>
          <div class="form-group" style="flex: 1">
            <label for="edit-med-fmt">{$_('records.media_format')}</label>
            <input
              id="edit-med-fmt"
              type="text"
              class="form-input"
              bind:value={editMediaFormat}
              placeholder="JPEG, PNG, PDF"
              data-testid="edit-media-format"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="edit-med-path">{$_('records.media_path')}</label>
          <div class="file-path-row">
            <input
              id="edit-med-path"
              type="text"
              class="form-input"
              bind:value={editMediaFilePath}
              placeholder="/path/to/media.jpg"
              data-testid="edit-media-path"
            />
            <button
              type="button"
              class="browse-btn"
              data-testid="browse-media-file-btn"
              on:click={() => {
                void browseMediaFile()
              }}
            >
              📁 {$_('records.browse_file')}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="edit-med-notes">{$_('records.notes_field')}</label>
          <textarea
            id="edit-med-notes"
            class="form-textarea"
            rows="3"
            bind:value={editMediaNotes}
            placeholder="Multimedia notes..."
            data-testid="edit-media-notes"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="modal-btn secondary"
          on:click={() => {
            isEditingMedia = false
            isCreatingMedia = false
          }}
          data-testid="cancel-media-btn"
        >
          {$_('records.cancel')}
        </button>
        <button
          class="modal-btn primary"
          on:click={saveMedia}
          data-testid="save-media-btn"
        >
          {$_('records.save_changes')}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if isEditingEvent || isCreatingEvent}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="modal-backdrop"
    on:click|self={() => {
      isEditingEvent = false
      isCreatingEvent = false
    }}
  >
    <div class="edit-modal-card" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title">{isCreatingEvent ? $_('records.add_event') : $_('records.edit_event')}</h3>
        <button
          class="modal-close-btn"
          on:click={() => {
            isEditingEvent = false
            isCreatingEvent = false
          }}>&times;</button
        >
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="edit-ev-type">{$_('records.event_type')}</label>
          <select id="edit-ev-type" class="form-input" bind:value={editEventType} data-testid="edit-event-type">
            <option value="BIRT">{$_('records.event_types.BIRT', { default: 'Birth' })}</option>
            <option value="CHR">{$_('records.event_types.CHR', { default: 'Christening' })}</option>
            <option value="BAPM">{$_('records.event_types.BAPM', { default: 'Baptism' })}</option>
            <option value="ADOP">{$_('records.event_types.ADOP', { default: 'Adoption' })}</option>
            <option value="DEAT">{$_('records.event_types.DEAT', { default: 'Death' })}</option>
            <option value="BURI">{$_('records.event_types.BURI', { default: 'Burial' })}</option>
            <option value="CREM">{$_('records.event_types.CREM', { default: 'Cremation' })}</option>
            <option value="OCCU">{$_('records.event_types.OCCU', { default: 'Occupation' })}</option>
            <option value="RESI">{$_('records.event_types.RESI', { default: 'Residence' })}</option>
            <option value="EDUC">{$_('records.event_types.EDUC', { default: 'Education' })}</option>
            <option value="GRAD">{$_('records.event_types.GRAD', { default: 'Graduation' })}</option>
            <option value="EMIG">{$_('records.event_types.EMIG', { default: 'Emigration' })}</option>
            <option value="IMMI">{$_('records.event_types.IMMI', { default: 'Immigration' })}</option>
            <option value="CENS">{$_('records.event_types.CENS', { default: 'Census' })}</option>
            <option value="NATU">{$_('records.event_types.NATU', { default: 'Naturalization' })}</option>
            <option value="RETI">{$_('records.event_types.RETI', { default: 'Retirement' })}</option>
            <option value="PROB">{$_('records.event_types.PROB', { default: 'Probate' })}</option>
            <option value="WILL">{$_('records.event_types.WILL', { default: 'Will' })}</option>
            <option value="EVEN">{$_('records.event_types.EVEN', { default: 'Custom / Other Event' })}</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="edit-ev-date">{$_('records.event_date')}</label>
            <input
              id="edit-ev-date"
              type="text"
              class="form-input"
              bind:value={editEventDate}
              placeholder="e.g. 10 MAY 1945"
              data-testid="edit-event-date"
            />
          </div>
          <div class="form-group">
            <label for="edit-ev-place">{$_('records.event_place')}</label>
            <input
              id="edit-ev-place"
              type="text"
              class="form-input"
              bind:value={editEventPlace}
              placeholder="e.g. Paris, France"
              data-testid="edit-event-place"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="edit-ev-val">{$_('records.event_value')}</label>
            <input
              id="edit-ev-val"
              type="text"
              class="form-input"
              bind:value={editEventValue}
              placeholder="e.g. Blacksmith, or Custom Event Type"
              data-testid="edit-event-val"
            />
          </div>
          {#if editEventType === 'DEAT'}
            <div class="form-group">
              <label for="edit-ev-cause">{$_('records.event_cause')}</label>
              <input
                id="edit-ev-cause"
                type="text"
                class="form-input"
                bind:value={editEventCause}
                placeholder="e.g. Heart failure"
                data-testid="edit-event-cause"
              />
            </div>
          {/if}
        </div>

        <div class="form-group">
          <label for="edit-ev-notes">{$_('records.notes_field')}</label>
          <textarea
            id="edit-ev-notes"
            class="form-textarea"
            rows="3"
            bind:value={editEventNotes}
            placeholder="Event details or notes..."
            data-testid="edit-event-notes"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="modal-btn secondary"
          on:click={() => {
            isEditingEvent = false
            isCreatingEvent = false
          }}
          data-testid="cancel-event-btn"
        >
          {$_('records.cancel')}
        </button>
        <button
          class="modal-btn primary"
          on:click={saveEvent}
          data-testid="save-event-btn"
        >
          {$_('records.save_changes')}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if isEditingCitation || isCreatingCitation}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="modal-backdrop"
    on:click|self={() => {
      isEditingCitation = false
      isCreatingCitation = false
    }}
  >
    <div class="edit-modal-card" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title">{isCreatingCitation ? $_('records.add_citation') : $_('records.edit_citation')}</h3>
        <button
          class="modal-close-btn"
          on:click={() => {
            isEditingCitation = false
            isCreatingCitation = false
          }}>&times;</button
        >
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="edit-cit-src">{$_('records.select_source')}</label>
          <select id="edit-cit-src" class="form-input" bind:value={editCitationSourceId} data-testid="edit-citation-source">
            {#each sourceList as s (s.id)}
              <option value={s.id}>{s.id} — {s.title ?? s.id}</option>
            {/each}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="edit-cit-page">{$_('records.citation_page')}</label>
            <input
              id="edit-cit-page"
              type="text"
              class="form-input"
              bind:value={editCitationPage}
              placeholder="Page 42, entry 7"
              data-testid="edit-citation-page"
            />
          </div>
          <div class="form-group">
            <label for="edit-cit-quay">{$_('records.citation_quay')}</label>
            <select id="edit-cit-quay" class="form-input" bind:value={editCitationQuay} data-testid="edit-citation-quay">
              <option value={undefined}>None / Unspecified</option>
              <option value={0}>{$_('records.quay_0')}</option>
              <option value={1}>{$_('records.quay_1')}</option>
              <option value={2}>{$_('records.quay_2')}</option>
              <option value={3}>{$_('records.quay_3')}</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="edit-cit-text">{$_('records.citation_text')}</label>
          <textarea
            id="edit-cit-text"
            class="form-textarea"
            rows="3"
            bind:value={editCitationText}
            placeholder="Text excerpt from original document..."
            data-testid="edit-citation-text"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="modal-btn secondary"
          on:click={() => {
            isEditingCitation = false
            isCreatingCitation = false
          }}
          data-testid="cancel-citation-btn"
        >
          {$_('records.cancel')}
        </button>
        <button
          class="modal-btn primary"
          on:click={saveCitation}
          data-testid="save-citation-btn"
        >
          {$_('records.save_changes')}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if isAttachingMedia}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="modal-backdrop"
    on:click|self={() => {
      isAttachingMedia = false
    }}
  >
    <div class="edit-modal-card" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title">{$_('records.attach_media')}</h3>
        <button
          class="modal-close-btn"
          on:click={() => {
            isAttachingMedia = false
          }}>&times;</button
        >
      </div>

      <div class="modal-body">
        {#if mediaList.length === 0}
          <p class="text-muted">No multimedia records currently exist in dataset.</p>
          <button
            class="action-pill-btn add-btn"
            on:click={() => {
              isAttachingMedia = false
              openCreateMediaModal()
            }}
          >
            ➕ {$_('records.add_media')}
          </button>
        {:else}
          <div class="form-group">
            <label for="attach-med-select">{$_('records.select_media')}</label>
            <select id="attach-med-select" class="form-input" bind:value={attachMediaSelectId} data-testid="attach-media-select">
              {#each mediaList as m (m.id)}
                <option value={m.id}>{m.id} — {m.title ?? m.id} ({m.format ?? 'OBJE'})</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button
          class="modal-btn secondary"
          on:click={() => {
            isAttachingMedia = false
          }}
        >
          {$_('records.cancel')}
        </button>
        {#if mediaList.length > 0}
          <button
            class="modal-btn primary"
            on:click={attachMediaToPerson}
            data-testid="confirm-attach-media-btn"
          >
            {$_('records.attach_media')}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .records-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .entity-subtabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 12px;
  }

  .subtab-btn {
    background: rgba(26, 32, 44, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e0;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.15s ease;
  }

  .subtab-btn:hover {
    background: rgba(49, 130, 206, 0.2);
    color: #ffffff;
  }

  .subtab-btn.active {
    background: #2b6cb0;
    border-color: #4299e1;
    color: #ffffff;
  }

  .subtab-count {
    background: rgba(0, 0, 0, 0.35);
    padding: 2px 7px;
    border-radius: 10px;
    font-size: 11px;
  }

  .controls-bar {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-box {
    position: relative;
    flex: 1;
    min-width: 240px;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    font-size: 14px;
    color: #718096;
  }

  .search-input {
    width: 100%;
    background: rgba(26, 32, 44, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 9px 36px;
    color: #edf2f7;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s ease;
  }

  .search-input:focus {
    border-color: #3182ce;
  }

  .clear-btn {
    position: absolute;
    right: 10px;
    background: none;
    border: none;
    color: #a0aec0;
    cursor: pointer;
    font-size: 12px;
  }

  .filter-group {
    display: flex;
    gap: 6px;
  }

  .filter-btn {
    background: rgba(26, 32, 44, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #a0aec0;
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-btn.active {
    background: #2b6cb0;
    color: #ffffff;
    border-color: #3182ce;
  }

  .advanced-filters {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
  }

  .adv-select,
  .year-input {
    background: rgba(26, 32, 44, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 6px 10px;
    color: #e2e8f0;
    font-size: 12.5px;
    outline: none;
  }

  .year-input {
    width: 105px;
  }

  .chip-toggle {
    background: rgba(26, 32, 44, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 6px 12px;
    color: #cbd5e0;
    font-size: 12.5px;
    cursor: pointer;
  }

  .chip-toggle.active {
    background: rgba(49, 130, 206, 0.3);
    border-color: #4299e1;
    color: #ffffff;
  }

  .records-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 420px;
    gap: 20px;
    align-items: start;
  }

  @media (max-width: 1150px) {
    .records-layout {
      grid-template-columns: minmax(0, 1fr) 330px;
      gap: 14px;
    }
  }

  @media (max-width: 760px) {
    .records-layout {
      grid-template-columns: 1fr;
    }

    .inspector-panel {
      order: -1;
      position: static;
      max-height: 420px;
    }
  }

  .table-wrapper {
    background: rgba(26, 32, 44, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  .records-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .records-table th {
    background: rgba(15, 23, 42, 0.8);
    padding: 12px 14px;
    text-align: left;
    color: #a0aec0;
    font-weight: 600;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .record-row {
    cursor: pointer;
    transition: background 0.15s ease;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  .record-row:hover {
    background: rgba(49, 130, 206, 0.12);
  }

  .record-row.selected {
    background: rgba(49, 130, 206, 0.25);
  }

  .records-table td {
    padding: 10px 14px;
    color: #e2e8f0;
  }

  .id-cell {
    font-family: monospace;
    color: #a0aec0;
    font-size: 12px;
  }

  .person-name {
    font-weight: 600;
    color: #edf2f7;
  }

  .mini-indicator {
    margin-left: 6px;
    font-size: 11px;
    opacity: 0.85;
  }

  .sex-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
  }

  .sex-badge.m {
    color: #63b3ed;
  }

  .sex-badge.f {
    color: #f687b3;
  }

  .sex-badge.u {
    color: #a0aec0;
  }

  .text-muted {
    color: #718096;
  }

  .empty-cell {
    text-align: center;
    padding: 40px;
    color: #718096;
  }

  .table-footer-notice {
    padding: 10px 16px;
    font-size: 12px;
    color: #a0aec0;
    background: rgba(15, 23, 42, 0.6);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    text-align: center;
  }

  .inspector-panel {
    background: rgba(26, 32, 44, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px;
    min-height: 350px;
    position: sticky;
    top: 20px;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
  }

  .inspector-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
    color: #718096;
    text-align: center;
  }

  .empty-icon {
    font-size: 36px;
    margin-bottom: 12px;
  }

  .inspector-header {
    display: flex;
    gap: 12px;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .inspector-header-info {
    flex: 1;
    min-width: 160px;
  }

  .avatar-large {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
  }

  .avatar-large.male {
    background: rgba(49, 130, 206, 0.2);
    color: #63b3ed;
  }

  .avatar-large.female {
    background: rgba(213, 63, 140, 0.2);
    color: #f687b3;
  }

  .inspector-title {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #edf2f7;
  }

  .inspector-subtitle {
    font-size: 12px;
    color: #a0aec0;
    margin-top: 2px;
  }

  .inspector-alias {
    font-size: 11.5px;
    color: #90cdf4;
    font-style: italic;
    margin-top: 2px;
  }

  .tree-jump-btn {
    background: rgba(49, 130, 206, 0.22);
    border: 1px solid rgba(66, 153, 225, 0.4);
    color: #90cdf4;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .tree-jump-btn:hover {
    background: rgba(49, 130, 206, 0.4);
    color: #ffffff;
  }

  .inspector-section {
    margin-bottom: 18px;
  }

  .section-heading {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #718096;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }

  /* Chronological Life Timeline */
  .timeline-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-left: 2px solid rgba(66, 153, 225, 0.3);
    margin-left: 10px;
    padding-left: 14px;
  }

  .timeline-item {
    position: relative;
    background: rgba(15, 23, 42, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 10px 12px;
  }

  .timeline-marker {
    position: absolute;
    left: -25px;
    top: 10px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #1e293b;
    border: 1px solid rgba(66, 153, 225, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
  }

  .timeline-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .timeline-badges {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .year-badge {
    background: rgba(49, 130, 206, 0.25);
    color: #90cdf4;
    font-size: 11px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .age-badge {
    background: rgba(255, 255, 255, 0.08);
    color: #cbd5e0;
    font-size: 10.5px;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .timeline-details {
    font-size: 12.5px;
    color: #cbd5e0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .timeline-val {
    font-weight: 600;
    color: #f8fafc;
  }

  .timeline-spouse {
    color: #f687b3;
    font-weight: 500;
  }

  .timeline-date,
  .timeline-place {
    color: #94a3b8;
    font-size: 12px;
  }

  .timeline-cause {
    color: #feb2b2;
    font-size: 12px;
  }

  .timeline-note {
    font-size: 11.5px;
    color: #a0aec0;
    font-style: italic;
    margin-top: 2px;
  }

  .timeline-citations {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .citation-pill-box {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 11px;
  }

  .citation-source-btn {
    background: rgba(56, 189, 248, 0.14);
    border: 1px solid rgba(56, 189, 248, 0.3);
    color: #7dd3fc;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    cursor: pointer;
    text-align: left;
  }

  .citation-source-btn:hover {
    background: rgba(56, 189, 248, 0.28);
  }

  .citation-page {
    color: #94a3b8;
  }

  .quay-badge {
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    background: rgba(16, 185, 129, 0.2);
    color: #6ee7b7;
  }

  .citation-excerpt {
    margin: 2px 0 0 0;
    width: 100%;
    font-style: italic;
    color: #94a3b8;
    border-left: 2px solid rgba(148, 163, 184, 0.4);
    padding-left: 6px;
  }

  /* Media Mini Grid in Inspector */
  .media-mini-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .media-mini-card {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 8px 10px;
    color: #e2e8f0;
    cursor: pointer;
    text-align: left;
    width: 100%;
  }

  .media-mini-card:hover {
    border-color: #38bdf8;
  }

  .media-format-badge {
    background: #2563eb;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 6px;
    border-radius: 4px;
  }

  .media-mini-title {
    font-size: 12.5px;
    font-weight: 600;
  }

  .media-mini-path {
    font-size: 11px;
    color: #64748b;
    font-family: monospace;
  }

  /* Entity Grid for Sources, Repositories, Media */
  .entity-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }

  .entity-card {
    background: rgba(26, 32, 44, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .entity-card.highlighted {
    border-color: #38bdf8;
    box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.3);
  }

  .entity-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .entity-id-badge {
    background: rgba(49, 130, 206, 0.25);
    color: #63b3ed;
    font-family: monospace;
    font-size: 11.5px;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .entity-card-title {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #f8fafc;
  }

  .entity-meta-list {
    font-size: 13px;
    color: #cbd5e0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .inline-entity-link {
    background: none;
    border: none;
    color: #63b3ed;
    cursor: pointer;
    padding: 0;
    font-size: 13px;
    text-decoration: underline;
  }

  .entity-refs {
    margin-top: 6px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .ref-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .ref-chip {
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #90cdf4;
    border-radius: 14px;
    padding: 3px 10px;
    font-size: 11.5px;
    cursor: pointer;
  }

  .ref-chip:hover {
    background: rgba(49, 130, 206, 0.3);
    color: #ffffff;
  }

  .media-preview-banner {
    height: 76px;
    background: radial-gradient(circle, #1e293b 0%, #0f172a 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .media-banner-icon {
    font-size: 32px;
  }

  .media-format-pill {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #2563eb;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .event-item {
    font-size: 13px;
    margin-bottom: 4px;
    color: #cbd5e0;
  }

  .event-label {
    font-weight: 600;
    color: #e2e8f0;
  }

  .family-unit {
    background: rgba(15, 23, 42, 0.5);
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 8px;
  }

  .link-btn {
    background: none;
    border: none;
    color: #63b3ed;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    display: block;
    width: 100%;
  }

  .link-btn:hover {
    background: rgba(49, 130, 206, 0.15);
    text-decoration: underline;
  }

  .link-btn small {
    color: #a0aec0;
  }

  .role-tag {
    font-size: 12px;
    color: #a0aec0;
    margin-bottom: 4px;
    display: block;
  }

  .spouse-box {
    margin-bottom: 8px;
  }

  .children-list {
    margin-top: 6px;
    padding-left: 8px;
    border-left: 2px solid rgba(255, 255, 255, 0.1);
  }

  .child-item {
    margin-top: 2px;
  }

  .notes-content {
    background: rgba(15, 23, 42, 0.6);
    border-radius: 6px;
    padding: 10px;
    font-size: 12px;
    line-height: 1.5;
    color: #cbd5e0;
    max-height: 150px;
    overflow-y: auto;
    white-space: pre-wrap;
  }

  .add-person-btn {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border: 1px solid rgba(16, 185, 129, 0.4);
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    padding: 7px 14px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .add-person-btn:hover {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .inspector-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .action-pill-btn {
    border: none;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .action-pill-btn.edit {
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #93c5fd;
  }

  .action-pill-btn.edit:hover {
    background: rgba(59, 130, 246, 0.3);
  }

  .action-pill-btn.delete {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
  }

  .action-pill-btn.delete:hover {
    background: rgba(239, 68, 68, 0.3);
  }

  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .edit-modal-card {
    background: #111827;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    width: 100%;
    max-width: 580px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: modalFadeIn 0.2s ease-out;
  }

  @keyframes modalFadeIn {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .modal-title {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #f3f4f6;
  }

  .modal-close-btn {
    background: none;
    border: none;
    font-size: 22px;
    line-height: 1;
    color: #9ca3af;
    cursor: pointer;
    padding: 0;
  }

  .modal-close-btn:hover {
    color: #ffffff;
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .form-row {
    display: flex;
    gap: 12px;
  }

  .form-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group label {
    font-size: 12px;
    font-weight: 600;
    color: #9ca3af;
  }

  .form-input,
  .form-textarea {
    background: #1f2937;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: #f3f4f6;
    padding: 8px 12px;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s ease;
  }

  .form-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .form-input:focus,
  .form-textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
  }

  .form-textarea {
    resize: vertical;
    font-family: inherit;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .modal-btn {
    border: none;
    padding: 8px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .modal-btn.secondary {
    background: rgba(255, 255, 255, 0.08);
    color: #cbd5e0;
  }

  .modal-btn.secondary:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .modal-btn.primary {
    background: #3b82f6;
    color: #ffffff;
  }

  .modal-btn.primary:hover {
    background: #2563eb;
  }

  .entity-actions-bar {
    display: flex;
    align-items: center;
    margin-left: auto;
  }

  .add-entity-btn {
    background: #3b82f6;
    border: none;
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    padding: 7px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .add-entity-btn:hover {
    background: #2563eb;
  }

  .family-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .family-spouses-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
  }

  .spouse-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }

  .spouse-role {
    font-weight: 600;
    color: #a0aec0;
    font-size: 12px;
    min-width: 130px;
  }

  .divorce-badge {
    display: inline-block;
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
  }

  .family-notes-text {
    font-size: 12px;
    color: #cbd5e0;
    font-style: italic;
  }

  .card-action-btns {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }

  .icon-action-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    color: #cbd5e0;
    font-size: 12px;
    padding: 3px 7px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .icon-action-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }

  .icon-action-btn.delete:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: #ef4444;
  }

  .icon-action-btn.mini {
    padding: 1px 5px;
    font-size: 11px;
  }

  .section-heading-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .section-heading-row .section-heading {
    margin-bottom: 0;
  }

  .action-pill-btn.add-btn {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.4);
    color: #60a5fa;
    border-radius: 6px;
    padding: 3px 9px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .action-pill-btn.add-btn:hover {
    background: rgba(59, 130, 246, 0.35);
    color: #ffffff;
  }

  .action-pill-btn.mini {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #93c5fd;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    cursor: pointer;
  }

  .action-pill-btn.mini:hover {
    background: rgba(59, 130, 246, 0.25);
    color: #ffffff;
  }

  .item-action-btns {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }

  .file-path-row {
    display: flex;
    gap: 8px;
  }

  .browse-btn {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.4);
    color: #60a5fa;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
  }

  .browse-btn:hover {
    background: rgba(59, 130, 246, 0.4);
    color: #ffffff;
  }

  .media-mini-card-wrapper {
    position: relative;
    display: inline-block;
  }

  .detach-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(239, 68, 68, 0.5);
    color: #f87171;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .detach-btn:hover {
    background: #ef4444;
    color: #ffffff;
  }

  .citation-cards-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .citation-full-card {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .citation-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .citation-card-body {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 12px;
  }

  .form-group-checkbox {
    display: flex;
    align-items: center;
    padding: 4px 0;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #e2e8f0;
    cursor: pointer;
  }

  .children-manager {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .selected-children-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .child-chip {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.35);
    color: #bfdbfe;
    border-radius: 12px;
    padding: 3px 8px;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .remove-chip-btn {
    background: transparent;
    border: none;
    color: #f87171;
    font-size: 11px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .remove-chip-btn:hover {
    color: #ef4444;
  }

  .add-child-select {
    width: 100%;
  }
</style>

import fs from 'fs'
import path from 'path'
import { Print, color } from 'printaeu'
import { app, type BrowserWindow, ipcMain, dialog } from 'electron'
import { type Update, getUpdates, installUpdate } from './update'
import { DataServerResponse, GedcomParser, GedcomSerializer, type GedcomData } from './types'

const logDir = app.getPath('logs')

const info = Print.create()
info.preAppend(`[${color.green}SERV${color.reset}] [${color.cyan}INFO${color.reset}] `)
info.logToFile(path.join(logDir, 'app.log'))

const warn = Print.create()
warn.preAppend(`[${color.green}SERV${color.reset}] [${color.yellow}WARN${color.reset}] `)
warn.logToFile(path.join(logDir, 'app.log'))

const err = Print.create()
err.preAppend(`[${color.green}SERV${color.reset}] [${color.red}ERROR${color.reset}] `)
err.logToFile(path.join(logDir, 'app.log'))

class BasicError {
  message: string
  name = 'BasicError'
  constructor(message: string) {
    this.message = message
  }
}

/**
 * Decodes a raw file buffer into a UTF-8 string, automatically handling UTF-16 LE
 * and UTF-16 BE encodings (commonly emitted by Windows genealogy software with `1 CHAR UNICODE`).
 */
export function decodeGedcomBuffer(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.subarray(2).toString('utf16le')
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const body = buf.subarray(2)
    const swapped = Buffer.allocUnsafe(body.length)
    for (let i = 0; i + 1 < body.length; i += 2) {
      swapped[i] = body[i + 1]
      swapped[i + 1] = body[i]
    }
    return swapped.toString('utf16le')
  }
  if (buf.length >= 4 && buf[0] !== 0x00 && buf[1] === 0x00 && buf[2] !== 0x00 && buf[3] === 0x00) {
    return buf.toString('utf16le')
  }
  if (buf.length >= 4 && buf[0] === 0x00 && buf[1] !== 0x00 && buf[2] === 0x00 && buf[3] !== 0x00) {
    const swapped = Buffer.allocUnsafe(buf.length)
    for (let i = 0; i + 1 < buf.length; i += 2) {
      swapped[i] = buf[i + 1]
      swapped[i + 1] = buf[i]
    }
    return swapped.toString('utf16le')
  }
  return buf.toString('utf-8')
}

/**
 * Finds the bundled sample data file path across development, test, and packaged ASAR environments.
 */
function findSampleDataPath(): string | undefined {
  const candidatePaths = [
    path.join(process.resourcesPath, 'sample.gedcom'),
    path.join(__dirname, '..', '..', 'sample.gedcom'),
    path.join(process.cwd(), 'sample.gedcom'),
    path.join(app.getAppPath(), 'sample.gedcom'),
    path.join(app.getAppPath(), '..', 'sample.gedcom')
  ]

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p
    }
  }
  return undefined
}

/**
 * Starts an IPC server to communicate with the client.
 * @param win an Electron `BrowserWindow`
 */
export async function server(win: BrowserWindow): Promise<void> {
  ipcMain.on('gedcom-data', async (_, ...args) => {
    const input: unknown = args[0]

    if (typeof input !== 'string') {
      const error = new BasicError(`Invalid input of type '${typeof input}'`)
      err.log(error.message)
      win.webContents.send('gedcom-data', new DataServerResponse(error, undefined))
      return
    }

    let fileContent = ''
    if (input === 'SAMPLE' || input === '__SAMPLE__') {
      const samplePath = findSampleDataPath()
      if (samplePath === undefined) {
        const error = new BasicError('Sample GEDCOM dataset file was not found')
        err.log(error.message)
        win.webContents.send('gedcom-data', new DataServerResponse(error, undefined))
        return
      }
      try {
        fileContent = decodeGedcomBuffer(fs.readFileSync(samplePath))
      } catch (error: unknown) {
        const msg = `Error reading sample file: ${error instanceof Error ? error.message : String(error)}`
        err.log(msg)
        win.webContents.send('gedcom-data', new DataServerResponse(new BasicError(msg), undefined))
        return
      }
    } else {
      // Only accept raw GEDCOM text content over IPC; reject arbitrary disk paths
      fileContent = input
    }

    try {
      info.log(`Parsing GEDCOM content (${fileContent.length} chars)`)
      const parsed = GedcomParser.parse(fileContent)
      if (parsed.individuals.length === 0 && parsed.families.length === 0) {
        const emptyErr = new BasicError('Invalid or empty GEDCOM content: no individuals or families found.')
        warn.log(emptyErr.message)
        win.webContents.send('gedcom-data', new DataServerResponse(emptyErr, undefined))
        return
      }
      info.log(`Successfully parsed ${parsed.individuals.length} individuals and ${parsed.families.length} families`)
      win.webContents.send('gedcom-data', new DataServerResponse(undefined, parsed))
    } catch (error: unknown) {
      const msg = `Error parsing GEDCOM data: ${error instanceof Error ? error.message : String(error)}`
      err.log(msg)
      win.webContents.send('gedcom-data', new DataServerResponse(new BasicError(msg), undefined))
    }
  })

  ipcMain.on('dialog-open-file', async () => {
    try {
      const result = await dialog.showOpenDialog(win, {
        title: 'Open GEDCOM File',
        properties: ['openFile'],
        filters: [
          { name: 'GEDCOM Files (*.ged, *.gedcom, *.data, *.txt)', extensions: ['ged', 'gedcom', 'data', 'txt'] },
          { name: 'All Files (*.*)', extensions: ['*'] }
        ]
      })

      if (result.canceled || result.filePaths.length === 0) {
        win.webContents.send('dialog-open-file-result', { canceled: true })
        return
      }

      const selectedPath = result.filePaths[0]
      const fileContent = decodeGedcomBuffer(fs.readFileSync(selectedPath))
      const parsed = GedcomParser.parse(fileContent)
      if (parsed.individuals.length === 0 && parsed.families.length === 0) {
        const emptyErr = new BasicError('Invalid or empty GEDCOM file: no individuals or families found.')
        warn.log(emptyErr.message)
        win.webContents.send('dialog-open-file-result', {
          canceled: false,
          filePath: selectedPath,
          data: new DataServerResponse(emptyErr, undefined)
        })
        return
      }
      win.webContents.send('dialog-open-file-result', {
        canceled: false,
        filePath: selectedPath,
        data: new DataServerResponse(undefined, parsed)
      })
    } catch (error: unknown) {
      const msg = `Dialog error: ${error instanceof Error ? error.message : String(error)}`
      err.log(msg)
      win.webContents.send('dialog-open-file-result', {
        canceled: false,
        data: new DataServerResponse(new BasicError(msg), undefined)
      })
    }
  })

  ipcMain.on('dialog-save-file', async (_, defaultName?: string) => {
    try {
      const result = await dialog.showSaveDialog(win, {
        title: 'Save GEDCOM File',
        defaultPath: typeof defaultName === 'string' && defaultName.length > 0 ? defaultName : 'family_tree.ged',
        filters: [
          { name: 'GEDCOM Files (*.ged, *.gedcom)', extensions: ['ged', 'gedcom'] },
          { name: 'All Files (*.*)', extensions: ['*'] }
        ]
      })
      win.webContents.send('dialog-save-file-result', {
        canceled: result.canceled,
        filePath: result.filePath
      })
    } catch (error: unknown) {
      const msg = `Save dialog error: ${error instanceof Error ? error.message : String(error)}`
      err.log(msg)
      win.webContents.send('dialog-save-file-result', {
        canceled: true,
        error: msg
      })
    }
  })

  ipcMain.on('save-gedcom-file', async (_, args: { filePath: string, content: string }) => {
    try {
      if (typeof args?.filePath !== 'string' || typeof args?.content !== 'string') {
        throw new Error('Invalid arguments passed to save-gedcom-file')
      }
      fs.writeFileSync(args.filePath, args.content, 'utf-8')
      info.log(`Successfully saved GEDCOM file (${args.content.length} characters) to ${args.filePath}`)
      win.webContents.send('save-gedcom-file-result', {
        success: true,
        filePath: args.filePath
      })
    } catch (error: unknown) {
      const msg = `Failed to save GEDCOM file: ${error instanceof Error ? error.message : String(error)}`
      err.log(msg)
      win.webContents.send('save-gedcom-file-result', {
        success: false,
        error: msg
      })
    }
  })

  ipcMain.on('gedcom-serialize', (_, data: GedcomData) => {
    try {
      const serialized = GedcomSerializer.serialize(data)
      win.webContents.send('gedcom-serialize-result', { success: true, content: serialized })
    } catch (error: unknown) {
      const msg = `Serialization error: ${error instanceof Error ? error.message : String(error)}`
      err.log(msg)
      win.webContents.send('gedcom-serialize-result', { success: false, error: msg })
    }
  })

  ipcMain.on('check-updates', async () => {
    win.webContents.send('update-results', await getUpdates())
  })

  ipcMain.on('proceed-with-update', async (_, ...args) => {
    try {
      const update: Update = args[0]
      await installUpdate(update)
    } catch (error: unknown) {
      err.log('Error on proceeding with the update')
      if (error instanceof Error) err.log(error.message)
      else err.log(error)
    }
  })
}

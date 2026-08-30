import fs from 'fs'
import path from 'path'
import { Print, color } from 'printaeu'
import { app, type BrowserWindow, ipcMain, dialog } from 'electron'
import { type Update, getUpdates, installUpdate } from './update'
import { DataServerResponse, GedcomParser } from './types'

const logDir = app.getPath('logs')

/** Logs an info */
const info = Print.create()
info.preAppend(`[${color.green}SERV${color.reset}] [${color.cyan}INFO${color.reset}] `)
info.logToFile(path.join(logDir, 'app.log'))

/** Logs a warning */
const warn = Print.create()
warn.preAppend(`[${color.green}SERV${color.reset}] [${color.yellow}WARN${color.reset}] `)
warn.logToFile(path.join(logDir, 'app.log'))

/** Logs an error */
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
 * Finds the bundled sample data file path across environments.
 */
function findSampleDataPath(): string | undefined {
  const candidatePaths = [
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
  // Parse GEDCOM from file path or text content
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
        fileContent = fs.readFileSync(samplePath, 'utf-8')
      } catch (error: unknown) {
        const msg = `Error reading sample file: ${error instanceof Error ? error.message : String(error)}`
        err.log(msg)
        win.webContents.send('gedcom-data', new DataServerResponse(new BasicError(msg), undefined))
        return
      }
    } else if (input.includes('\n') || input.startsWith('0 ') || input.startsWith('0\t')) {
      // Direct raw text content
      fileContent = input
    } else {
      // File path
      info.log(`Reading GEDCOM file from path: ${input}`)
      try {
        fileContent = fs.readFileSync(input, 'utf-8')
      } catch (error: unknown) {
        const msg = `Error reading file '${input}': ${error instanceof Error ? error.message : String(error)}`
        err.log(msg)
        win.webContents.send('gedcom-data', new DataServerResponse(new BasicError(msg), undefined))
        return
      }
    }

    try {
      info.log(`Parsing GEDCOM content (${fileContent.length} chars)`)
      const parsed = GedcomParser.parse(fileContent)
      info.log(`Successfully parsed ${parsed.individuals.length} individuals and ${parsed.families.length} families`)
      win.webContents.send('gedcom-data', new DataServerResponse(undefined, parsed))
    } catch (error: unknown) {
      const msg = `Error parsing GEDCOM data: ${error instanceof Error ? error.message : String(error)}`
      err.log(msg)
      win.webContents.send('gedcom-data', new DataServerResponse(new BasicError(msg), undefined))
    }
  })

  // Open native file picker dialog
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
      const fileContent = fs.readFileSync(selectedPath, 'utf-8')
      const parsed = GedcomParser.parse(fileContent)
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

  // Listen to check updates requests
  ipcMain.on('check-updates', async () => {
    win.webContents.send('update-results', await getUpdates())
  })

  // Listen to install updates requests
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

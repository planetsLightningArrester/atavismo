import { type Update } from './update'
import { ipcRenderer, contextBridge } from 'electron'
import { type DataServerResponse } from './types'

window.addEventListener('DOMContentLoaded', () => {
  // Update versions in DOM if present
  for (const type of ['chrome', 'node', 'electron']) {
    const version = process.versions[type]
    if (typeof version !== 'undefined') {
      const element = document.getElementById(`${type}-version`)
      if (element !== null) element.innerText = version
    }
  }
})

export interface OpenDialogResponse {
  canceled: boolean
  filePath?: string
  data?: DataServerResponse
}

export interface SaveDialogResponse {
  canceled: boolean
  filePath?: string
  error?: string
}

export interface SaveFileResult {
  success: boolean
  filePath?: string
  error?: string
}

export interface SerializeResult {
  success: boolean
  content?: string
  error?: string
}

export interface PickMediaResponse {
  canceled: boolean
  filePath?: string
  format?: string
  title?: string
  error?: string
}

/** Context bridge. Map the IPC communication between the client and the server */
contextBridge.exposeInMainWorld('api', {
  /**
   * Send a file path or raw GEDCOM text to parse
   * @param input file path or GEDCOM text
   */
  sendDataToServer: async (input: string): Promise<DataServerResponse> => {
    ipcRenderer.send('gedcom-data', input)
    return await new Promise<DataServerResponse>(resolve => {
      ipcRenderer.once('gedcom-data', (_, response: DataServerResponse) => {
        resolve(response)
      })
    })
  },

  /**
   * Loads the bundled sample GEDCOM dataset
   */
  loadSampleData: async (): Promise<DataServerResponse> => {
    ipcRenderer.send('gedcom-data', '__SAMPLE__')
    return await new Promise<DataServerResponse>(resolve => {
      ipcRenderer.once('gedcom-data', (_, response: DataServerResponse) => {
        resolve(response)
      })
    })
  },

  /**
   * Opens native OS file picker for GEDCOM files
   */
  openFileDialog: async (): Promise<OpenDialogResponse> => {
    ipcRenderer.send('dialog-open-file')
    return await new Promise<OpenDialogResponse>(resolve => {
      ipcRenderer.once('dialog-open-file-result', (_, result: OpenDialogResponse) => {
        resolve(result)
      })
    })
  },

  /**
   * Opens native OS save file picker dialog for saving GEDCOM files
   */
  saveFileDialog: async (defaultName?: string): Promise<SaveDialogResponse> => {
    ipcRenderer.send('dialog-save-file', defaultName)
    return await new Promise<SaveDialogResponse>(resolve => {
      ipcRenderer.once('dialog-save-file-result', (_, result: SaveDialogResponse) => {
        resolve(result)
      })
    })
  },

  /**
   * Opens native OS file picker to select a multimedia asset
   */
  pickMediaFile: async (): Promise<PickMediaResponse> => {
    ipcRenderer.send('dialog-pick-media')
    return await new Promise<PickMediaResponse>(resolve => {
      ipcRenderer.once('dialog-pick-media-result', (_, result: PickMediaResponse) => {
        resolve(result)
      })
    })
  },

  /**
   * Saves raw GEDCOM content to the specified file path on disk
   */
  saveGedcomFile: async (filePath: string, content: string): Promise<SaveFileResult> => {
    ipcRenderer.send('save-gedcom-file', { filePath, content })
    return await new Promise<SaveFileResult>(resolve => {
      ipcRenderer.once('save-gedcom-file-result', (_, result: SaveFileResult) => {
        resolve(result)
      })
    })
  },

  /**
   * Serializes in-memory GedcomData dataset to standard GEDCOM text
   */
  serializeGedcom: async (data: unknown): Promise<SerializeResult> => {
    ipcRenderer.send('gedcom-serialize', data)
    return await new Promise<SerializeResult>(resolve => {
      ipcRenderer.once('gedcom-serialize-result', (_, result: SerializeResult) => {
        resolve(result)
      })
    })
  },

  /** Send a request to the server to check updates */
  checkUpdates: async (): Promise<Update | undefined> => {
    ipcRenderer.send('check-updates')
    return await new Promise<Update | undefined>(resolve => {
      ipcRenderer.once('update-results', (_, update: Update | undefined) => {
        resolve(update)
      })
    })
  },

  /**
   * Send a request to the server to proceed with the app update
   * @param update the update to install
   */
  proceedWithUpdate: (update: Update): void => {
    ipcRenderer.send('proceed-with-update', update)
  }
})

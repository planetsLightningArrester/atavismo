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

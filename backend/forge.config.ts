import fs from 'fs'
import path from 'path'
import { MakerZIP } from '@electron-forge/maker-zip'
import { type ForgeConfig } from '@electron-forge/shared-types'
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives'

// Fix Node 22/24 stream.Readable compatibility in fd-slicer@1.1.0 (used by yauzl -> extract-zip -> @electron/packager).
// Setting `this.destroyed = true` on a Readable stream in Node 24 mutates `_readableState.destroyed = true` before
// buffered compressed chunks drain into zlib.InflateRaw, causing `electron-forge package` to hang indefinitely.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fdSlicer = require('fd-slicer') as {
    createFromFd: (fd: number, options?: Record<string, unknown>) => {
      fd: number
      pend: { go: (fn: (cb: () => void) => void) => void }
      unref: () => void
      createReadStream: (opts?: Record<string, unknown>) => NodeJS.ReadableStream & {
        _fdDestroyed?: boolean
        destroyed: boolean
        _readableState: { highWaterMark: number }
        endOffset?: number
        pos: number
        context: { fd: number, pend: { go: (fn: (cb: () => void) => void) => void }, unref: () => void }
        push: (chunk: Buffer | null) => boolean
        destroy: (err?: Error) => void
        _read: (n: number) => void
      }
    }
  }
  const origCreateFromFd = fdSlicer.createFromFd
  fdSlicer.createFromFd = function (fd: number, options?: Record<string, unknown>) {
    const slicer = origCreateFromFd.call(this, fd, options)
    const origCreateReadStream = slicer.createReadStream.bind(slicer)
    slicer.createReadStream = function (opts?: Record<string, unknown>) {
      const rs = origCreateReadStream(opts)
      rs._fdDestroyed = false
      rs.destroyed = false
      rs._read = function (n: number) {
        if (this._fdDestroyed === true) return
        let toRead = Math.min(this._readableState.highWaterMark, n)
        if (this.endOffset !== undefined && this.endOffset !== null) {
          toRead = Math.min(toRead, this.endOffset - this.pos)
        }
        if (toRead <= 0) {
          this._fdDestroyed = true
          this.push(null)
          this.context.unref()
          return
        }
        this.context.pend.go((cb) => {
          if (this._fdDestroyed === true) {
            cb()
            return
          }
          const buffer = Buffer.alloc(toRead)
          fs.read(this.context.fd, buffer, 0, toRead, this.pos, (err, bytesRead) => {
            if (err !== null && err !== undefined) {
              this.destroy(err)
            } else if (bytesRead === 0) {
              this._fdDestroyed = true
              this.push(null)
              this.context.unref()
            } else {
              this.pos += bytesRead
              this.push(buffer.subarray(0, bytesRead))
            }
            cb()
          })
        })
      }
      rs.destroy = function (err?: Error) {
        if (this._fdDestroyed === true) return
        this._fdDestroyed = true
        this.emit('error', err ?? new Error('stream destroyed'))
        this.context.unref()
      }
      return rs
    }
    return slicer
  }
} catch {
  // Ignore if fd-slicer is not present
}

const config: ForgeConfig = {
  packagerConfig: {
    name: 'Atavismo',
    asar: true,
    prune: false,
    icon: path.join(__dirname, 'src', 'images', 'icon'),
    executableName: 'atavismo',
    extraResource: [path.join(__dirname, '..', 'sample.gedcom')],
    ignore: [
      /^\/out($|\/)/,
      /^\/src($|\/)/,
      /^\/playwright-report($|\/)/,
      /^\/test-results($|\/)/,
      /^\/dist\/__tests__($|\/)/,
      /^\/node_modules\/(?!printaeu($|\/))/,
      /^\/(\.eslint.*|\.prettier.*|tsconfig.*|nodemon.*|playwright\.config\.ts|forge\.config\.ts|README\.md)$/
    ]
  },
  rebuildConfig: {},
  makers: [new MakerZIP({})],
  plugins: [new AutoUnpackNativesPlugin({})],
}

export default config

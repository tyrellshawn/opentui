import { EventEmitter } from "events"
import { parseKeypress, type KeyEventType, type ParsedKey } from "./parse.keypress"
import type { PasteChunk } from "./stdin-buffer"
import { detectPasteFileType } from "./paste-detect"

export class KeyEvent implements ParsedKey {
  name: string
  ctrl: boolean
  meta: boolean
  shift: boolean
  option: boolean
  sequence: string
  number: boolean
  raw: string
  eventType: KeyEventType
  source: "raw" | "kitty"
  code?: string
  super?: boolean
  hyper?: boolean
  capsLock?: boolean
  numLock?: boolean
  baseCode?: number
  repeated?: boolean

  private _defaultPrevented: boolean = false
  private _propagationStopped: boolean = false

  constructor(key: ParsedKey) {
    this.name = key.name
    this.ctrl = key.ctrl
    this.meta = key.meta
    this.shift = key.shift
    this.option = key.option
    this.sequence = key.sequence
    this.number = key.number
    this.raw = key.raw
    this.eventType = key.eventType
    this.source = key.source
    this.code = key.code
    this.super = key.super
    this.hyper = key.hyper
    this.capsLock = key.capsLock
    this.numLock = key.numLock
    this.baseCode = key.baseCode
    this.repeated = key.repeated
  }

  get defaultPrevented(): boolean {
    return this._defaultPrevented
  }

  get propagationStopped(): boolean {
    return this._propagationStopped
  }

  preventDefault(): void {
    this._defaultPrevented = true
  }

  stopPropagation(): void {
    this._propagationStopped = true
  }
}

export type PasteEventInit = {
  data: Buffer
  text?: string
  fileType?: string
}

export class PasteEvent {
  data: Buffer
  text?: string
  fileType?: string
  private _defaultPrevented: boolean = false
  private _propagationStopped: boolean = false

  constructor(init: PasteEventInit) {
    this.data = init.data
    this.text = init.text
    this.fileType = init.fileType
  }

  get defaultPrevented(): boolean {
    return this._defaultPrevented
  }

  get propagationStopped(): boolean {
    return this._propagationStopped
  }

  preventDefault(): void {
    this._defaultPrevented = true
  }

  stopPropagation(): void {
    this._propagationStopped = true
  }
}

export type KeyHandlerEventMap = {
  keypress: [KeyEvent]
  keyrelease: [KeyEvent]
  paste: [PasteEvent]
}

export class KeyHandler extends EventEmitter<KeyHandlerEventMap> {
  protected useKittyKeyboard: boolean

  constructor(useKittyKeyboard: boolean = false) {
    super()
    this.useKittyKeyboard = useKittyKeyboard
  }

  public processInput(data: string): boolean {
    const parsedKey = parseKeypress(data, { useKittyKeyboard: this.useKittyKeyboard })

    if (!parsedKey) {
      return false
    }

    try {
      switch (parsedKey.eventType) {
        case "press":
          this.emit("keypress", new KeyEvent(parsedKey))
          break
        case "release":
          this.emit("keyrelease", new KeyEvent(parsedKey))
          break
        default:
          this.emit("keypress", new KeyEvent(parsedKey))
          break
      }
    } catch (error) {
      console.error(`[KeyHandler] Error processing input:`, error)
      return true
    }

    return true
  }

  public processPaste(data: string | Buffer | PasteChunk): void {
    try {
      const { buffer, text } = this.normalizePasteInput(data)
      const fileType = detectPasteFileType(buffer)
      const cleanedText = fileType
        ? undefined
        : text !== undefined
          ? Bun.stripANSI(text)
          : this.getCleanedText(buffer, fileType)

      this.emit(
        "paste",
        new PasteEvent({
          data: buffer,
          text: cleanedText,
          fileType,
        }),
      )
    } catch (error) {
      console.error(`[KeyHandler] Error processing paste:`, error)
    }
  }

  private normalizePasteInput(data: string | Buffer | PasteChunk): { buffer: Buffer; text?: string } {
    if (typeof data === "string") {
      return { buffer: Buffer.from(data), text: data }
    }

    if (Buffer.isBuffer(data)) {
      return { buffer: data }
    }

    return { buffer: data.data, text: data.text }
  }

  private getCleanedText(buffer: Buffer, fileType?: string): string | undefined {
    if (fileType) {
      return undefined
    }

    return Bun.stripANSI(buffer.toString())
  }
}

/**
 * This class is used internally by the renderer to ensure global handlers
 * can preventDefault before renderable handlers process events.
 */
export class InternalKeyHandler extends KeyHandler {
  private renderableHandlers: Map<keyof KeyHandlerEventMap, Set<Function>> = new Map()

  constructor(useKittyKeyboard: boolean = false) {
    super(useKittyKeyboard)
  }

  public emit<K extends keyof KeyHandlerEventMap>(event: K, ...args: KeyHandlerEventMap[K]): boolean {
    return this.emitWithPriority(event, ...args)
  }

  private emitWithPriority<K extends keyof KeyHandlerEventMap>(event: K, ...args: KeyHandlerEventMap[K]): boolean {
    let hasGlobalListeners = false

    // Check if we should emit to global handlers
    // Global handlers are emitted using the parent EventEmitter which calls all listeners
    // We need to manually iterate to check for stopPropagation between handlers
    const globalListeners = this.listeners(event as any)
    if (globalListeners.length > 0) {
      hasGlobalListeners = true

      for (const listener of globalListeners) {
        try {
          listener(...args)
        } catch (error) {
          console.error(`[KeyHandler] Error in global ${event} handler:`, error)
        }

        // Check if propagation was stopped after this handler
        if (event === "keypress" || event === "keyrelease" || event === "paste") {
          const keyEvent = args[0]
          if (keyEvent.propagationStopped) {
            return hasGlobalListeners
          }
        }
      }
    }

    const renderableSet = this.renderableHandlers.get(event)
    // Snapshot the handler list so listeners added during dispatch (e.g., via focus changes)
    // do not receive the in-flight key event.
    const renderableHandlers = renderableSet && renderableSet.size > 0 ? [...renderableSet] : []
    let hasRenderableListeners = false

    if (renderableSet && renderableSet.size > 0) {
      hasRenderableListeners = true

      if (event === "keypress" || event === "keyrelease" || event === "paste") {
        const keyEvent = args[0]
        if (keyEvent.defaultPrevented) return hasGlobalListeners || hasRenderableListeners
        if (keyEvent.propagationStopped) return hasGlobalListeners || hasRenderableListeners
      }

      for (const handler of renderableHandlers) {
        try {
          handler(...args)
        } catch (error) {
          console.error(`[KeyHandler] Error in renderable ${event} handler:`, error)
        }

        // Check if propagation was stopped after this handler
        if (event === "keypress" || event === "keyrelease" || event === "paste") {
          const keyEvent = args[0]
          if (keyEvent.propagationStopped) {
            return hasGlobalListeners || hasRenderableListeners
          }
        }
      }
    }

    return hasGlobalListeners || hasRenderableListeners
  }

  public onInternal<K extends keyof KeyHandlerEventMap>(
    event: K,
    handler: (...args: KeyHandlerEventMap[K]) => void,
  ): void {
    if (!this.renderableHandlers.has(event)) {
      this.renderableHandlers.set(event, new Set())
    }
    this.renderableHandlers.get(event)!.add(handler)
  }

  public offInternal<K extends keyof KeyHandlerEventMap>(
    event: K,
    handler: (...args: KeyHandlerEventMap[K]) => void,
  ): void {
    const handlers = this.renderableHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }
}

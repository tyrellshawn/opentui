import {
  BoxRenderable,
  InputRenderable,
  TextareaRenderable,
  TextRenderable,
  bold,
  createCliRenderer,
  fg,
  t,
  type CliRenderer,
} from "../index"
import { KeyEvent, PasteEvent } from "../lib/KeyHandler"
import { setupCommonDemoKeys } from "./lib/standalone-keys"

let renderer: CliRenderer | null = null
let container: BoxRenderable | null = null
let singleLineInput: InputRenderable | null = null
let multilineInput: TextareaRenderable | null = null
let logDisplay: TextRenderable | null = null
let instructions: TextRenderable | null = null
let keypressHandler: ((event: KeyEvent) => void) | null = null
let pasteHandler: ((event: PasteEvent) => void) | null = null

const logEntries: string[] = []

function formatHexHead(buffer: Buffer): string {
  if (buffer.length === 0) return "<empty>"
  const hex = buffer.subarray(0, 16).toString("hex")
  return hex.match(/.{1,2}/g)?.join(" ") ?? hex
}

function formatTextPreview(buffer: Buffer): string {
  const text = buffer.toString("utf8")
  const normalized = text.replace(/\r/g, "").replace(/\n/g, " ⏎ ")
  return normalized.length > 80 ? `${normalized.slice(0, 80)}…` : normalized
}

function updateLog(event: PasteEvent): void {
  const entry = `len=${event.data.length} head=${formatHexHead(event.data)} preview=${formatTextPreview(event.data)}`

  logEntries.unshift(entry)
  logEntries.splice(12)

  if (logDisplay) {
    logDisplay.content = t`${logEntries.join("\n")}`
  }

  const text = event.text ?? event.data.toString("utf8")
  if (singleLineInput) {
    singleLineInput.value = text
  }

  if (multilineInput) {
    multilineInput.value = text
  }
}

function createLayout(rendererInstance: CliRenderer): void {
  container = new BoxRenderable(rendererInstance, {
    id: "paste-demo-root",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    padding: 2,
    gap: 1,
  })

  instructions = new TextRenderable(rendererInstance, {
    id: "paste-demo-instructions",
    width: 100,
    height: 4,
    content: t`${bold("Paste Demo")}
- Paste into the single-line input or the textarea
- Logs show file type, byte length, first 16 bytes, and text preview
- Press q to quit, Ctrl+C to exit`,
  })

  singleLineInput = new InputRenderable(rendererInstance, {
    id: "paste-demo-input",
    width: 70,
    height: 3,
    placeholder: "Paste here (single line)",
  })

  multilineInput = new TextareaRenderable(rendererInstance, {
    id: "paste-demo-textarea",
    width: 70,
    height: 6,
    placeholder: "Or paste here (textarea)",
  })

  logDisplay = new TextRenderable(rendererInstance, {
    id: "paste-demo-log",
    width: 100,
    height: 12,
    fg: fg("#A0FFA0"),
    content: t`Waiting for paste events…`,
  })

  container.add(instructions)
  container.add(singleLineInput)
  container.add(multilineInput)
  container.add(logDisplay)

  rendererInstance.root.add(container)
}

export function run(rendererInstance: CliRenderer): void {
  renderer = rendererInstance
  renderer.setBackgroundColor("#0e1116")

  createLayout(rendererInstance)

  keypressHandler = (event: KeyEvent) => {
    if (event.name === "q") {
      renderer?.destroy()
      return
    }
  }

  pasteHandler = (event: PasteEvent) => {
    updateLog(event)
  }

  renderer.keyInput.on("keypress", keypressHandler)
  renderer.keyInput.on("paste", pasteHandler)
  renderer.requestRender()
}

export function destroy(rendererInstance: CliRenderer): void {
  rendererInstance.clearFrameCallbacks()

  if (keypressHandler) {
    rendererInstance.keyInput.off("keypress", keypressHandler)
    keypressHandler = null
  }

  if (pasteHandler) {
    rendererInstance.keyInput.off("paste", pasteHandler)
    pasteHandler = null
  }

  if (container) {
    rendererInstance.root.remove("paste-demo-root")
    container = null
  }

  singleLineInput = null
  multilineInput = null
  logDisplay = null
  instructions = null
  logEntries.length = 0
}

if (import.meta.main) {
  const rendererInstance = await createCliRenderer({
    exitOnCtrlC: true,
  })

  run(rendererInstance)
  setupCommonDemoKeys(rendererInstance)
  rendererInstance.start()
}

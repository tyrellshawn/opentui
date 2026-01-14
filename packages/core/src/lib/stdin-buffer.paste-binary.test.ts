import { describe, expect, test } from "bun:test"
import { ANSI } from "../ansi"
import { StdinBuffer } from "./stdin-buffer"

describe("StdinBuffer bracketed paste", () => {
  test("emits raw buffer for binary paste payloads", () => {
    const stdinBuffer = new StdinBuffer()
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
    const pasteSequence = Buffer.concat([
      Buffer.from(ANSI.bracketedPasteStart),
      pngBytes,
      Buffer.from(ANSI.bracketedPasteEnd),
    ])

    let received: any
    stdinBuffer.on("paste", (event) => {
      received = event
    })

    stdinBuffer.process(pasteSequence)

    expect(Buffer.isBuffer(received?.data)).toBe(true)
    expect(received?.data?.equals?.(pngBytes)).toBe(true)
    expect(typeof received?.text === "string" || received?.text === undefined).toBe(true)
  })
})

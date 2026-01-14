import { expect, test } from "bun:test"
import { InternalKeyHandler } from "./KeyHandler"

test("processPaste emits file type and buffer for image data", () => {
  const handler = new InternalKeyHandler()
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])

  let received: any
  handler.on("paste", (event) => {
    received = event
  })

  handler.processPaste(pngBytes)

  expect(Buffer.isBuffer(received?.data)).toBe(true)
  expect(received?.data?.equals?.(pngBytes)).toBe(true)
  expect(received?.fileType).toBe("image/png")
  expect(received?.text).toBeUndefined()
})

test("processPaste preserves text when no file type is detected", () => {
  const handler = new InternalKeyHandler()

  let receivedText: string | undefined
  handler.on("paste", (event) => {
    receivedText = event.text
  })

  handler.processPaste("plain text")

  expect(receivedText).toBe("plain text")
})

import { expect, test } from "bun:test"
import { InternalKeyHandler } from "./KeyHandler"

test("processPaste emits buffer for image data", () => {
  const handler = new InternalKeyHandler()
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])

  let received: any
  handler.on("paste", (event) => {
    received = event
  })

  handler.processPaste(pngBytes)

  expect(Buffer.isBuffer(received?.data)).toBe(true)
  expect(received?.data?.equals?.(pngBytes)).toBe(true)
})

test("processPaste emits buffer for text data", () => {
  const handler = new InternalKeyHandler()

  let receivedData: Buffer | undefined
  handler.on("paste", (event) => {
    receivedData = event.data
  })

  handler.processPaste("plain text")

  expect(Buffer.isBuffer(receivedData)).toBe(true)
  expect(receivedData?.toString()).toBe("plain text")
})

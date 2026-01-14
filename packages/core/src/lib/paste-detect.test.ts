import { expect, test } from "bun:test"
import { detectPasteFileType } from "./paste-detect"

test("detectPasteFileType identifies common image signatures", () => {
  expect(detectPasteFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png")
  expect(detectPasteFileType(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg")
  expect(detectPasteFileType(Buffer.from("GIF89a"))).toBe("image/gif")
  expect(detectPasteFileType(Buffer.from("RIFF1234WEBP"))).toBe("image/webp")
  expect(detectPasteFileType(Buffer.from([0x42, 0x4d, 0x00, 0x00]))).toBe("image/bmp")
  expect(detectPasteFileType(Buffer.from([0x00, 0x00, 0x01, 0x00, 0x00]))).toBe("image/x-icon")
  expect(detectPasteFileType(Buffer.from('<?xml version="1.0"?><svg></svg>'))).toBe("image/svg+xml")
})

test("detectPasteFileType returns undefined for non-image data", () => {
  expect(detectPasteFileType(Buffer.from("plain text"))).toBeUndefined()
})

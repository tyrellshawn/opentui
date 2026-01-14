const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff])
const GIF_SIGNATURE = Buffer.from([0x47, 0x49, 0x46, 0x38])
const WEBP_RIFF = Buffer.from("RIFF")
const WEBP_WEBP = Buffer.from("WEBP")
const BMP_SIGNATURE = Buffer.from([0x42, 0x4d])
const ICO_SIGNATURE = Buffer.from([0x00, 0x00, 0x01, 0x00])

function matchesSignature(buffer: Buffer, signature: Buffer, offset: number = 0): boolean {
  if (buffer.length < signature.length + offset) return false
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i + offset] !== signature[i]) {
      return false
    }
  }
  return true
}

function detectSvg(buffer: Buffer): boolean {
  if (buffer.length === 0) return false
  const sample = buffer.slice(0, 512).toString("utf8").trimStart().toLowerCase()
  return sample.startsWith("<svg") || sample.startsWith("<?xml")
}

export function detectPasteFileType(buffer: Buffer): string | undefined {
  if (matchesSignature(buffer, PNG_SIGNATURE)) return "image/png"
  if (matchesSignature(buffer, JPEG_SIGNATURE)) return "image/jpeg"
  if (matchesSignature(buffer, GIF_SIGNATURE)) return "image/gif"
  if (matchesSignature(buffer, BMP_SIGNATURE)) return "image/bmp"
  if (matchesSignature(buffer, ICO_SIGNATURE)) return "image/x-icon"

  if (matchesSignature(buffer, WEBP_RIFF) && matchesSignature(buffer, WEBP_WEBP, 8)) {
    return "image/webp"
  }

  if (detectSvg(buffer)) return "image/svg+xml"

  return undefined
}

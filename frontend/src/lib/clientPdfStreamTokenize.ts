/**
 * Fallback for PDF tokenization when PII is inside FlateDecode streams.
 * Decompresses each stream, replaces PII with tokens (same-length pad), recompresses.
 * Uses in-place replacement when new stream size <= original so xref stays valid.
 */

import type { PiiMap } from "./clientVaultTypes";

const ENDSTREAM_MARKER = new Uint8Array([
  0x65, 0x6e, 0x64, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d,
]); // "endstream"
const FLATE_MARKER = new Uint8Array([
  0x2f, 0x46, 0x6c, 0x61, 0x74, 0x65, 0x44, 0x65, 0x63, 0x6f, 0x64, 0x65,
]); // "/FlateDecode"

function findBytes(haystack: Uint8Array, needle: Uint8Array, start = 0): number {
  if (needle.length === 0 || needle.length > haystack.length - start)
    return -1;
  for (let i = start; i <= haystack.length - needle.length; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

/** Parse /Length N from dict bytes (between << and >>). Returns -1 if not found. */
function parseLengthFromDict(dict: Uint8Array): number {
  const lenMarker = new TextEncoder().encode("/Length ");
  const idx = findBytes(dict, lenMarker);
  if (idx === -1) return -1;
  let start = idx + lenMarker.length;
  while (start < dict.length && (dict[start] === 0x20 || dict[start] === 0x09))
    start++;
  let end = start;
  while (end < dict.length && dict[end] >= 0x30 && dict[end] <= 0x39) end++;
  if (end === start) return -1;
  const s = new TextDecoder().decode(dict.subarray(start, end));
  return parseInt(s, 10) | 0;
}

/** Check if dict contains /Filter /FlateDecode (or /FlateDecode in array). */
function hasFlateDecode(dict: Uint8Array): boolean {
  return findBytes(dict, FLATE_MARKER) !== -1;
}

/** Decompress raw deflate (PDF FlateDecode) in browser. */
async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    const pako = await import("pako");
    return pako.inflateRaw(data);
  }
  const format = "deflate-raw" as CompressionFormat;
  const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Compress with raw deflate in browser. */
async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined") {
    const pako = await import("pako");
    return pako.deflateRaw(data);
  }
  const format = "deflate-raw" as CompressionFormat;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  }).pipeThrough(new CompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export interface StreamSpan {
  dictStart: number;
  dictEnd: number;
  lengthKeyStart: number;
  lengthKeyEnd: number;
  dataStart: number;
  dataEnd: number;
}

const STREAM_WORD = new Uint8Array([0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]); // "stream"
const GTGT_STREAM = new Uint8Array([0x3e, 0x3e, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]); // ">>stream"
const SPACE_STREAM = new Uint8Array([0x20, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]); // " stream"

/**
 * Find FlateDecode stream spans in the PDF buffer.
 * Supports both ">> stream" and ">>stream" (PDF spec allows no space).
 */
function findFlateStreamSpans(arr: Uint8Array): StreamSpan[] {
  const spans: StreamSpan[] = [];
  const lengthKey = new TextEncoder().encode("/Length ");
  let searchStart = 0;
  for (;;) {
    const withSpace = findBytes(arr, SPACE_STREAM, searchStart);
    const noSpace = findBytes(arr, GTGT_STREAM, searchStart);
    let streamIdx: number;
    let streamWordLen: number;
    let dictEnd: number;
    if (noSpace !== -1 && (withSpace === -1 || noSpace <= withSpace)) {
      streamIdx = noSpace + 2;
      streamWordLen = STREAM_WORD.length;
      dictEnd = noSpace;
    } else if (withSpace !== -1) {
      streamIdx = withSpace;
      streamWordLen = SPACE_STREAM.length;
      dictEnd = withSpace;
    } else {
      break;
    }
    let dictStart = -1;
    for (let i = dictEnd - 1; i >= Math.max(0, dictEnd - 1024); i--) {
      if (arr[i] === 0x3c && arr[i + 1] === 0x3c) {
        dictStart = i;
        break;
      }
    }
    if (dictStart === -1) {
      searchStart = streamIdx + 1;
      continue;
    }
    const dict = arr.subarray(dictStart, dictEnd);
    if (!hasFlateDecode(dict)) {
      searchStart = streamIdx + 1;
      continue;
    }
    const length = parseLengthFromDict(dict);
    if (length < 0) {
      searchStart = streamIdx + 1;
      continue;
    }
    const afterStream = streamIdx + streamWordLen;
    let eolLen = 0;
    if (afterStream < arr.length && arr[afterStream] === 0x0d && arr[afterStream + 1] === 0x0a)
      eolLen = 2;
    else if (afterStream < arr.length && arr[afterStream] === 0x0a)
      eolLen = 1;
    else {
      searchStart = streamIdx + 1;
      continue;
    }
    const dataStart = afterStream + eolLen;
    const dataEnd = dataStart + length;
    if (dataEnd > arr.length) {
      searchStart = streamIdx + 1;
      continue;
    }
    const lk = findBytes(dict, lengthKey);
    let lengthKeyStart = -1;
    let lengthKeyEnd = -1;
    if (lk !== -1) {
      let ns = lk + lengthKey.length;
      while (ns < dict.length && (dict[ns] === 0x20 || dict[ns] === 0x09))
        ns++;
      let ne = ns;
      while (ne < dict.length && dict[ne] >= 0x30 && dict[ne] <= 0x39) ne++;
      lengthKeyStart = dictStart + lk;
      lengthKeyEnd = dictStart + ne;
    }
    spans.push({
      dictStart,
      dictEnd,
      lengthKeyStart,
      lengthKeyEnd,
      dataStart,
      dataEnd,
    });
    searchStart = dataEnd;
  }
  return spans;
}

/**
 * Replace PII with tokens in decompressed stream content (same-length: pad token with spaces).
 * Returns null if any token is longer than its value. Works on bytes to preserve encoding.
 */
function replaceInDecodedStream(
  decoded: Uint8Array,
  piiMap: PiiMap
): Uint8Array | null {
  const encoder = new TextEncoder();
  const entries = Object.values(piiMap.byToken).sort(
    (a, b) => encoder.encode(b.value).length - encoder.encode(a.value).length
  );
  let arr = new Uint8Array(decoded);
  for (const entry of entries) {
    const valueBytes = encoder.encode(entry.value);
    let tokenBytes = encoder.encode(entry.token);
    if (tokenBytes.length > valueBytes.length) return null;
    if (tokenBytes.length < valueBytes.length) {
      const padded = new Uint8Array(valueBytes.length);
      padded.set(tokenBytes);
      padded.fill(0x20, tokenBytes.length);
      tokenBytes = padded;
    }
    let pos = findBytes(arr, valueBytes);
    if (pos === -1) continue;
    while (pos !== -1) {
      arr.set(tokenBytes, pos);
      pos = findBytes(arr, valueBytes);
    }
  }
  return arr;
}

/**
 * Replace tokens with PII in decompressed stream (rehydration). Value may be truncated to token length.
 */
function rehydrateInDecodedStream(
  decoded: Uint8Array,
  piiMap: PiiMap
): Uint8Array {
  const encoder = new TextEncoder();
  let arr = new Uint8Array(decoded);
  for (const [token, entry] of Object.entries(piiMap.byToken)) {
    const tokenBytes = encoder.encode(token);
    let valueBytes = encoder.encode(entry.value);
    if (valueBytes.length > tokenBytes.length) {
      valueBytes = valueBytes.slice(0, tokenBytes.length);
    } else if (valueBytes.length < tokenBytes.length) {
      const padded = new Uint8Array(tokenBytes.length);
      padded.set(valueBytes);
      padded.fill(0x20, valueBytes.length);
      valueBytes = padded;
    }
    let pos = findBytes(arr, tokenBytes);
    while (pos !== -1) {
      arr.set(valueBytes, pos);
      pos = findBytes(arr, tokenBytes);
    }
  }
  return arr;
}

/**
 * When raw buffer replacement fails, try decompressing FlateDecode streams, replacing PII, recompressing.
 * Only does in-place replacement when new stream size <= original (pad with zeros); updates /Length in dict.
 * Returns modified buffer or null if not possible.
 */
export async function replacePiiInPdfFlateStreams(
  buffer: ArrayBuffer,
  piiMap: PiiMap
): Promise<ArrayBuffer | null> {
  if (Object.keys(piiMap.byToken).length === 0) return buffer;
  const arr = new Uint8Array(buffer);
  const spans = findFlateStreamSpans(arr);
  if (spans.length === 0) return null;

  const encoder = new TextEncoder();
  let anyReplaced = false;
  for (const span of spans) {
    const data = arr.subarray(span.dataStart, span.dataEnd);
    let decoded: Uint8Array;
    try {
      decoded = await inflateRaw(data);
    } catch {
      continue;
    }
    const replaced = replaceInDecodedStream(decoded, piiMap);
    if (replaced === null) return null;
    const recompressed = await deflateRaw(replaced);
    if (recompressed.length > data.length) return null;
    anyReplaced = true;
    const padded = new Uint8Array(data.length);
    padded.set(recompressed);
    arr.set(padded, span.dataStart);
    if (
      span.lengthKeyEnd > span.lengthKeyStart &&
      span.lengthKeyStart >= 0 &&
      span.lengthKeyEnd <= arr.length
    ) {
      const existingLenStr = new TextDecoder()
        .decode(arr.subarray(span.lengthKeyStart, span.lengthKeyEnd))
        .replace(/^\s+|\s+$/g, "");
      const existingLen = parseInt(existingLenStr, 10) | 0;
      if (existingLen !== recompressed.length) {
        const newLenStr = String(recompressed.length).padStart(
          existingLenStr.length,
          " "
        );
        const newLenBytes = encoder.encode(newLenStr);
        const copyLen = Math.min(
          newLenBytes.length,
          span.lengthKeyEnd - span.lengthKeyStart
        );
        arr.set(newLenBytes.subarray(0, copyLen), span.lengthKeyStart);
      }
    }
  }
  return anyReplaced ? arr.buffer : null;
}

/**
 * Rehydrate tokens → PII inside FlateDecode streams (inverse of replacePiiInPdfFlateStreams).
 * Used when the server-returned PDF has tokens in compressed streams.
 */
export async function rehydratePdfFlateStreams(
  buffer: ArrayBuffer,
  piiMap: PiiMap
): Promise<ArrayBuffer> {
  if (Object.keys(piiMap.byToken).length === 0) return buffer;
  const arr = new Uint8Array(buffer);
  const spans = findFlateStreamSpans(arr);
  for (const span of spans) {
    const data = arr.subarray(span.dataStart, span.dataEnd);
    let decoded: Uint8Array;
    try {
      decoded = await inflateRaw(data);
    } catch {
      continue;
    }
    const rehydrated = rehydrateInDecodedStream(decoded, piiMap);
    const recompressed = await deflateRaw(rehydrated);
    if (recompressed.length > data.length) continue;
    const padded = new Uint8Array(data.length);
    padded.set(recompressed);
    arr.set(padded, span.dataStart);
    if (
      span.lengthKeyEnd > span.lengthKeyStart &&
      span.lengthKeyStart >= 0 &&
      span.lengthKeyEnd <= arr.length
    ) {
      const encoder = new TextEncoder();
      const existingLenStr = new TextDecoder()
        .decode(arr.subarray(span.lengthKeyStart, span.lengthKeyEnd))
        .replace(/^\s+|\s+$/g, "");
      const newLenStr = String(recompressed.length).padStart(
        existingLenStr.length,
        " "
      );
      const newLenBytes = encoder.encode(newLenStr);
      const copyLen = Math.min(
        newLenBytes.length,
        span.lengthKeyEnd - span.lengthKeyStart
      );
      arr.set(newLenBytes.subarray(0, copyLen), span.lengthKeyStart);
    }
  }
  return arr.buffer;
}

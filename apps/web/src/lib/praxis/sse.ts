/**
 * Incremental Server-Sent-Events frame parser.
 *
 * Feed decoded string chunks via `push`; it returns the `data` payload of every
 * frame that completed in that chunk (frames are separated by a blank line).
 * A partial trailing frame is retained until a later `push` completes it; call
 * `flush` once the stream ends to emit a final frame that arrived without a
 * trailing blank line.
 *
 * Scope: only `data:` fields are surfaced (each praxis frame's data is one JSON
 * `RuntimeEvent`). `event:`/`id:` fields and `:`-comment heartbeats are ignored.
 * The caller is responsible for `JSON.parse`-ing each returned payload.
 *
 * All SSE line terminators (LF, CRLF, CR) are handled at extraction time, so no
 * whole-buffer normalization pass is needed.
 */
const FRAME_SEP = /\r\n\r\n|\n\n|\r\r/g;
const LINE_SEP = /\r\n|\r|\n/;

export class SseParser {
  private buffer = "";

  push(chunk: string): string[] {
    this.buffer += chunk;

    const payloads: string[] = [];
    const sep = new RegExp(FRAME_SEP);
    let consumed = 0;
    let match: RegExpExecArray | null;
    while ((match = sep.exec(this.buffer)) !== null) {
      const data = this.parseFrame(this.buffer.slice(consumed, match.index));
      if (data !== null) payloads.push(data);
      consumed = match.index + match[0].length;
    }
    this.buffer = this.buffer.slice(consumed);
    return payloads;
  }

  /** Emit a final frame still buffered at stream end (no trailing blank line). */
  flush(): string[] {
    const data = this.parseFrame(this.buffer);
    this.buffer = "";
    return data !== null ? [data] : [];
  }

  private parseFrame(frame: string): string | null {
    const dataLines: string[] = [];
    for (const line of frame.split(LINE_SEP)) {
      if (line.startsWith(":")) continue; // comment / heartbeat
      if (line.startsWith("data:")) {
        // A single leading space after the colon is part of the framing, not data.
        dataLines.push(line.slice(5).replace(/^ /, ""));
      }
      // event:/id: fields are not used this slice.
    }
    return dataLines.length > 0 ? dataLines.join("\n") : null;
  }
}

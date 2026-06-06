/**
 * Incremental Server-Sent-Events frame parser.
 *
 * Feed decoded string chunks via `push`; it returns the `data` payload of every
 * frame that completed in that chunk (frames are separated by a blank line).
 * A partial trailing frame is retained until a later `push` completes it.
 *
 * Scope: only `data:` fields are surfaced (each praxis frame's data is one JSON
 * `RuntimeEvent`). `event:`/`id:` fields and `:`-comment heartbeats are ignored.
 * The caller is responsible for `JSON.parse`-ing each returned payload.
 */
export class SseParser {
  private buffer = "";

  push(chunk: string): string[] {
    // Normalize CRLF on the accumulated buffer so a `\r\n` split across chunk
    // boundaries still collapses correctly.
    this.buffer = (this.buffer + chunk).replace(/\r\n/g, "\n");

    const payloads: string[] = [];
    let sep: number;
    while ((sep = this.buffer.indexOf("\n\n")) !== -1) {
      const frame = this.buffer.slice(0, sep);
      this.buffer = this.buffer.slice(sep + 2);
      const data = this.parseFrame(frame);
      if (data !== null) payloads.push(data);
    }
    return payloads;
  }

  private parseFrame(frame: string): string | null {
    const dataLines: string[] = [];
    for (const line of frame.split("\n")) {
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

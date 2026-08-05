export class EscPosBuilder {
  private bytes: number[] = [];

  constructor() {
    this.init();
  }

  /** Initialize the printer (ESC @) */
  init() {
    this.bytes.push(0x1b, 0x40);
    return this;
  }

  /** Select character font (0 = Font A, 1 = Font B) */
  font(n: 0 | 1) {
    this.bytes.push(0x1b, 0x4d, n);
    return this;
  }

  /** Set text alignment */
  align(align: 'left' | 'center' | 'right') {
    const val = align === 'center' ? 1 : align === 'right' ? 2 : 0;
    this.bytes.push(0x1b, 0x61, val);
    return this;
  }

  /** Toggle bold text */
  bold(on: boolean) {
    this.bytes.push(0x1b, 0x45, on ? 1 : 0);
    return this;
  }

  /** Set text size multiplier (1 to 8) */
  size(width: number, height: number) {
    const w = Math.max(1, Math.min(8, width)) - 1;
    const h = Math.max(1, Math.min(8, height)) - 1;
    const n = (w << 4) | h;
    this.bytes.push(0x1d, 0x21, n);
    return this;
  }

  /** Print raw text */
  text(str: string) {
    for (let i = 0; i < str.length; i++) {
      let code = str.charCodeAt(i);
      // Basic fallback for unsupported characters
      if (code > 255) code = 63; // '?'
      this.bytes.push(code);
    }
    return this;
  }

  /** Print text with a newline */
  textLine(str: string) {
    return this.text(str + '\n');
  }

  /** Draw a solid or dotted line */
  drawLine(width: number = 48, char = '-') {
    return this.textLine(char.repeat(width));
  }

  /** Print left-aligned text and right-aligned text on the same line */
  leftRight(left: string, right: string, width: number = 48) {
    const spaceLength = width - left.length - right.length;
    if (spaceLength >= 0) {
      return this.textLine(left + ' '.repeat(spaceLength) + right);
    } else {
      const maxLeft = Math.max(1, width - right.length - 1);
      const truncLeft = left.substring(0, maxLeft);
      const space = width - truncLeft.length - right.length;
      return this.textLine(truncLeft + ' '.repeat(Math.max(0, space)) + right);
    }
  }

  /** Feed paper by n lines */
  feed(lines: number) {
    this.bytes.push(0x1b, 0x64, lines);
    return this;
  }

  /** Cut paper (Partial cut with feed) */
  cut() {
    this.bytes.push(0x1d, 0x56, 0x42, 0x00);
    return this;
  }

  /** Return the final byte array to send to the printer */
  build(): number[] {
    return this.bytes;
  }
}

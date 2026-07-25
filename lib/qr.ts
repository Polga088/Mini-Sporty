const MODE_8BIT_BYTE = 0x4;
const ERROR_CORRECT_LEVEL_BITS = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2
} as const;

const VERSION = 4;
const MODULE_COUNT = 17 + VERSION * 4;
const DATA_CODEWORDS = 80;
const EC_CODEWORDS = 20;

const EXP_TABLE = new Array<number>(256);
const LOG_TABLE = new Array<number>(256);

for (let i = 0; i < 8; i += 1) {
  EXP_TABLE[i] = 1 << i;
}

for (let i = 8; i < 256; i += 1) {
  EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
}

for (let i = 0; i < 255; i += 1) {
  LOG_TABLE[EXP_TABLE[i]] = i;
}

class BitBuffer {
  private bits: number[] = [];

  get lengthInBits() {
    return this.bits.length;
  }

  put(num: number, length: number) {
    for (let i = length - 1; i >= 0; i -= 1) {
      this.putBit(((num >>> i) & 1) === 1);
    }
  }

  putBit(bit: boolean) {
    this.bits.push(bit ? 1 : 0);
  }

  getByte(index: number) {
    let value = 0;
    for (let i = 0; i < 8; i += 1) {
      value = (value << 1) | (this.bits[index * 8 + i] ?? 0);
    }
    return value;
  }
}

class QR8bitByte {
  readonly bytes: Uint8Array;

  constructor(data: string) {
    this.bytes = new TextEncoder().encode(data);
  }

  getLength() {
    return this.bytes.length;
  }

  write(buffer: BitBuffer) {
    for (const byte of this.bytes) {
      buffer.put(byte, 8);
    }
  }
}

class Polynomial {
  private readonly coefficients: number[];
  private readonly offset: number;

  constructor(coefficients: number[], offset = 0) {
    let start = 0;
    while (start < coefficients.length && coefficients[start] === 0) {
      start += 1;
    }
    this.coefficients = coefficients.slice(start);
    this.offset = offset + start;
  }

  get length() {
    return this.coefficients.length;
  }

  get(index: number) {
    return this.coefficients[index];
  }

  multiply(other: Polynomial) {
    const result = new Array(this.length + other.length - 1).fill(0);
    for (let i = 0; i < this.length; i += 1) {
      for (let j = 0; j < other.length; j += 1) {
        result[i + j] ^= gfMultiply(this.get(i), other.get(j));
      }
    }
    return new Polynomial(result);
  }

  mod(other: Polynomial) {
    const result = this.coefficients.slice();

    while (result.length >= other.length) {
      const ratio = result[0];
      if (ratio !== 0) {
        for (let i = 0; i < other.length; i += 1) {
          result[i] ^= gfMultiply(other.get(i), ratio);
        }
      }
      result.shift();
      while (result.length > 0 && result[0] === 0) {
        result.shift();
      }
    }

    return new Polynomial(result);
  }
}

function gfMultiply(x: number, y: number) {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[x] + LOG_TABLE[y]) % 255];
}

function getErrorCorrectPolynomial(length: number) {
  let poly = new Polynomial([1]);
  for (let i = 0; i < length; i += 1) {
    poly = poly.multiply(new Polynomial([1, EXP_TABLE[i]]));
  }
  return poly;
}

function createDataBytes(data: QR8bitByte[]) {
  const buffer = new BitBuffer();
  for (const item of data) {
    buffer.put(MODE_8BIT_BYTE, 4);
    buffer.put(item.getLength(), 8);
    item.write(buffer);
  }

  if (buffer.lengthInBits > DATA_CODEWORDS * 8) {
    throw new Error("QR payload trop long.");
  }

  const terminator = Math.min(4, DATA_CODEWORDS * 8 - buffer.lengthInBits);
  buffer.put(0, terminator);
  while (buffer.lengthInBits % 8 !== 0) {
    buffer.putBit(false);
  }

  const bytes = new Array<number>();
  for (let i = 0; i < buffer.lengthInBits / 8; i += 1) {
    bytes.push(buffer.getByte(i));
  }

  let padByte = 0xec;
  while (bytes.length < DATA_CODEWORDS) {
    bytes.push(padByte);
    padByte = padByte === 0xec ? 0x11 : 0xec;
  }

  const rsPoly = getErrorCorrectPolynomial(EC_CODEWORDS);
  const rawPoly = new Polynomial([...bytes, ...new Array(EC_CODEWORDS).fill(0)]);
  const modPoly = rawPoly.mod(rsPoly);
  const ecBytes = new Array(EC_CODEWORDS).fill(0);
  const offset = EC_CODEWORDS - modPoly.length;
  for (let i = 0; i < modPoly.length; i += 1) {
    ecBytes[i + offset] = modPoly.get(i);
  }

  return [...bytes, ...ecBytes];
}

function getPatternPosition() {
  return [6, 26];
}

function createMatrix() {
  const modules: (boolean | null)[][] = Array.from({ length: MODULE_COUNT }, () => Array(MODULE_COUNT).fill(null));
  const reserved: boolean[][] = Array.from({ length: MODULE_COUNT }, () => Array(MODULE_COUNT).fill(false));

  const setModule = (row: number, col: number, value: boolean, permanent = true) => {
    modules[row][col] = value;
    if (permanent) reserved[row][col] = true;
  };

  const addFinderPattern = (row: number, col: number) => {
    for (let r = -1; r <= 7; r += 1) {
      for (let c = -1; c <= 7; c += 1) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || rr >= MODULE_COUNT || cc < 0 || cc >= MODULE_COUNT) continue;
        if ((0 <= r && r <= 6 && (c === 0 || c === 6)) || (0 <= c && c <= 6 && (r === 0 || r === 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
          setModule(rr, cc, true);
        } else {
          setModule(rr, cc, false);
        }
      }
    }
  };

  const addAlignmentPattern = (row: number, col: number) => {
    for (let r = -2; r <= 2; r += 1) {
      for (let c = -2; c <= 2; c += 1) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || rr >= MODULE_COUNT || cc < 0 || cc >= MODULE_COUNT) continue;
        setModule(rr, cc, Math.max(Math.abs(r), Math.abs(c)) !== 1);
      }
    }
  };

  addFinderPattern(0, 0);
  addFinderPattern(0, MODULE_COUNT - 7);
  addFinderPattern(MODULE_COUNT - 7, 0);

  for (let i = 0; i < MODULE_COUNT; i += 1) {
    if (modules[6][i] === null) setModule(6, i, i % 2 === 0, true);
    if (modules[i][6] === null) setModule(i, 6, i % 2 === 0, true);
  }

  const positions = getPatternPosition();
  for (const row of positions) {
    for (const col of positions) {
      if (modules[row][col] !== null) continue;
      if ((row <= 8 && col <= 8) || (row <= 8 && col >= MODULE_COUNT - 8) || (row >= MODULE_COUNT - 8 && col <= 8)) continue;
      addAlignmentPattern(row, col);
    }
  }

  setModule(MODULE_COUNT - 8, 8, true, true);

  for (let i = 0; i < 9; i += 1) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  for (let i = MODULE_COUNT - 8; i < MODULE_COUNT; i += 1) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }

  return { modules, reserved, setModule };
}

function getBCHDigit(data: number) {
  let digit = 0;
  while (data !== 0) {
    digit += 1;
    data >>>= 1;
  }
  return digit;
}

function getBCHTypeInfo(data: number) {
  let d = data << 10;
  const g = 0x537;
  while (getBCHDigit(d) - getBCHDigit(g) >= 0) {
    d ^= g << (getBCHDigit(d) - getBCHDigit(g));
  }
  return ((data << 10) | d) ^ 0x5412;
}

const MASK_FUNCTIONS: Array<(row: number, col: number) => boolean> = [
  (row, col) => (row + col) % 2 === 0,
  (row) => row % 2 === 0,
  (_row, col) => col % 3 === 0,
  (row, col) => (row + col) % 3 === 0,
  (row, col) => (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0,
  (row, col) => ((row * col) % 2) + ((row * col) % 3) === 0,
  (row, col) => (((row * col) % 2) + ((row * col) % 3)) % 2 === 0,
  (row, col) => (((row + col) % 2) + ((row * col) % 3)) % 2 === 0
];

function mapData(modules: (boolean | null)[][], reserved: boolean[][], data: number[], maskPattern: number) {
  let inc = -1;
  let row = MODULE_COUNT - 1;
  let bitIndex = 7;
  let byteIndex = 0;

  for (let col = MODULE_COUNT - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;

    while (true) {
      for (let c = 0; c < 2; c += 1) {
        const currentCol = col - c;
        if (!reserved[row][currentCol]) {
          let dark = false;
          if (byteIndex < data.length) {
            dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
          }
          if (MASK_FUNCTIONS[maskPattern](row, currentCol)) {
            dark = !dark;
          }
          modules[row][currentCol] = dark;
          bitIndex -= 1;
          if (bitIndex === -1) {
            byteIndex += 1;
            bitIndex = 7;
          }
        }
      }

      row += inc;
      if (row < 0 || row >= MODULE_COUNT) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
  }
}

function setupFormatInfo(modules: (boolean | null)[][], reserved: boolean[][], maskPattern: number) {
  const formatInfo = getBCHTypeInfo((ERROR_CORRECT_LEVEL_BITS.L << 3) | maskPattern);
  for (let i = 0; i <= 5; i += 1) {
    const bit = ((formatInfo >>> i) & 1) === 1;
    modules[8][i] = bit;
    reserved[8][i] = true;
  }
  modules[8][7] = ((formatInfo >>> 6) & 1) === 1;
  modules[8][8] = ((formatInfo >>> 7) & 1) === 1;
  modules[7][8] = ((formatInfo >>> 8) & 1) === 1;
  for (let i = 9; i < 15; i += 1) {
    const bit = ((formatInfo >>> i) & 1) === 1;
    modules[14 - i][8] = bit;
    reserved[14 - i][8] = true;
  }
  for (let i = 0; i < 8; i += 1) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  reserved[8][7] = true;
  reserved[8][8] = true;
  reserved[7][8] = true;
}

function lostPointLevel1(modules: (boolean | null)[][]) {
  let lostPoint = 0;
  for (let row = 0; row < MODULE_COUNT; row += 1) {
    let sameCount = 0;
    let prevDark = false;
    for (let col = 0; col < MODULE_COUNT; col += 1) {
      const dark = modules[row][col] ?? false;
      if (col === 0) {
        prevDark = dark;
        sameCount = 1;
      } else if (dark === prevDark) {
        sameCount += 1;
      } else {
        if (sameCount >= 5) lostPoint += 3 + (sameCount - 5);
        prevDark = dark;
        sameCount = 1;
      }
    }
    if (sameCount >= 5) lostPoint += 3 + (sameCount - 5);
  }
  for (let col = 0; col < MODULE_COUNT; col += 1) {
    let sameCount = 0;
    let prevDark = false;
    for (let row = 0; row < MODULE_COUNT; row += 1) {
      const dark = modules[row][col] ?? false;
      if (row === 0) {
        prevDark = dark;
        sameCount = 1;
      } else if (dark === prevDark) {
        sameCount += 1;
      } else {
        if (sameCount >= 5) lostPoint += 3 + (sameCount - 5);
        prevDark = dark;
        sameCount = 1;
      }
    }
    if (sameCount >= 5) lostPoint += 3 + (sameCount - 5);
  }
  return lostPoint;
}

function lostPointLevel2(modules: (boolean | null)[][]) {
  let lostPoint = 0;
  for (let row = 0; row < MODULE_COUNT - 1; row += 1) {
    for (let col = 0; col < MODULE_COUNT - 1; col += 1) {
      const count = [modules[row][col], modules[row + 1][col], modules[row][col + 1], modules[row + 1][col + 1]].every(Boolean) ||
        [modules[row][col], modules[row + 1][col], modules[row][col + 1], modules[row + 1][col + 1]].every((value) => !value);
      if (count) lostPoint += 3;
    }
  }
  return lostPoint;
}

function lostPointLevel3(modules: (boolean | null)[][]) {
  let lostPoint = 0;
  const pattern1 = [true, false, true, true, true, false, true];
  const pattern2 = [false, true, false, false, false, true, false];

  for (let row = 0; row < MODULE_COUNT; row += 1) {
    for (let col = 0; col < MODULE_COUNT - 6; col += 1) {
      const slice = modules[row].slice(col, col + 7);
      if (slice.every((value, index) => value === pattern1[index] || value === pattern2[index])) {
        lostPoint += 40;
      }
    }
  }

  for (let col = 0; col < MODULE_COUNT; col += 1) {
    for (let row = 0; row < MODULE_COUNT - 6; row += 1) {
      const slice = [modules[row][col], modules[row + 1][col], modules[row + 2][col], modules[row + 3][col], modules[row + 4][col], modules[row + 5][col], modules[row + 6][col]];
      if (slice.every((value, index) => value === pattern1[index] || value === pattern2[index])) {
        lostPoint += 40;
      }
    }
  }

  return lostPoint;
}

function lostPointLevel4(modules: (boolean | null)[][]) {
  let darkCount = 0;
  for (let row = 0; row < MODULE_COUNT; row += 1) {
    for (let col = 0; col < MODULE_COUNT; col += 1) {
      if (modules[row][col]) darkCount += 1;
    }
  }
  const percent = (darkCount * 100) / (MODULE_COUNT * MODULE_COUNT);
  const rating = Math.floor(Math.abs(percent - 50) / 5);
  return rating * 10;
}

function getLostPoint(modules: (boolean | null)[][]) {
  return lostPointLevel1(modules) + lostPointLevel2(modules) + lostPointLevel3(modules) + lostPointLevel4(modules);
}

function cloneMatrix(matrix: (boolean | null)[][]) {
  return matrix.map((row) => row.slice());
}

export function buildPresenceQrSvg(content: string) {
  const data = createDataBytes([new QR8bitByte(content)]);
  let bestMatrix: (boolean | null)[][] = [];
  let bestLostPoint = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 8; mask += 1) {
    const { modules, reserved } = createMatrix();
    mapData(modules, reserved, data, mask);
    setupFormatInfo(modules, reserved, mask);
    const lostPoint = getLostPoint(modules);
    if (lostPoint < bestLostPoint) {
      bestLostPoint = lostPoint;
      bestMatrix = cloneMatrix(modules);
    }
  }

  const cell = 8;
  const margin = 4;
  const size = (MODULE_COUNT + margin * 2) * cell;
  const rects: string[] = [];

  for (let row = 0; row < MODULE_COUNT; row += 1) {
    for (let col = 0; col < MODULE_COUNT; col += 1) {
      if (bestMatrix[row][col]) {
        rects.push(`<rect x="${(col + margin) * cell}" y="${(row + margin) * cell}" width="${cell}" height="${cell}" rx="1" fill="#0f172a"/>`);
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <rect x="0" y="0" width="${size}" height="${size}" rx="24" fill="#ffffff"/>
  <g>${rects.join("")}</g>
</svg>`;
}

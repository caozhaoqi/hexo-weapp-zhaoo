const MD5 = (string: string): string => {
  const MD5 = (string: string): string => {
    const rotateLeft = (lValue: number, iShiftBits: number): number => {
      return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    };

    const addUnsigned = (lX: number, lY: number): number => {
      const lX4 = (lX & 0xFFFFFFFF) >>> 0;
      const lY4 = (lY & 0xFFFFFFFF) >>> 0;
      return (lX4 + lY4) >>> 0;
    };

    const F = (x: number, y: number, z: number): number => {
      return (x & y) | (~x & z);
    };

    const G = (x: number, y: number, z: number): number => {
      return (x & z) | (y & ~z);
    };

    const H = (x: number, y: number, z: number): number => {
      return x ^ y ^ z;
    };

    const I = (x: number, y: number, z: number): number => {
      return y ^ (x | ~z);
    };

    const FF = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number => {
      a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    const GG = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number => {
      a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    const HH = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number => {
      a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    const II = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number => {
      a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    const convertToWordArray = (string: string): number[] => {
      const lWordCount = (string.length + 8) >>> 6;
      const lWordArray = new Array(lWordCount);
      for (let i = 0; i < lWordCount; i++) {
        lWordArray[i] = 0;
      }
      for (let i = 0; i < string.length; i++) {
        lWordArray[i >>> 2] |= string.charCodeAt(i) << (8 * (i % 4));
      }
      return lWordArray;
    };

    const wordToHex = (lValue: number): string => {
      const wordToHexValue = '0123456789abcdef';
      let lByte = 0;
      let lHex = '';
      for (let i = 0; i <= 3; i++) {
        lByte = (lValue >>> (8 * i)) & 0xFF;
        lHex += wordToHexValue.charAt((lByte >>> 4) & 0x0F);
        lHex += wordToHexValue.charAt(lByte & 0x0F);
      }
      return lHex;
    };

    if (!string) return '';

    const lMessage = convertToWordArray(string);
    const lWordCount = lMessage.length;
    const lMD5Buffer = new Array(16);

    let a = 0x67452301;
    let b = 0xEFCDAB89;
    let c = 0x98BADCFE;
    let d = 0x10325476;
    let AA = 0;
    let BB = 0;
    let CC = 0;
    let DD = 0;

    for (let i = 0; i < lWordCount; i += 16) {
      AA = a;
      BB = b;
      CC = c;
      DD = d;

      for (let j = 0; j < 64; j++) {
        const s = [
          7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
          5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
          4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
          6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
        ];
        const k = [
          0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
          0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
          0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
          0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
          0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
          0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
          0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
          0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
          0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
          0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
          0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
          0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
          0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
          0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
          0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
          0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
        ];

        let lIndex = j;
        let lTemp = 0;

        if (j < 16) {
          lTemp = FF(a, b, c, d, lMessage[i + j], s[j], k[j]);
        } else if (j < 32) {
          lIndex = (5 * j + 1) % 16;
          lTemp = GG(a, b, c, d, lMessage[i + lIndex], s[j], k[j]);
        } else if (j < 48) {
          lIndex = (3 * j + 5) % 16;
          lTemp = HH(a, b, c, d, lMessage[i + lIndex], s[j], k[j]);
        } else {
          lIndex = (7 * j) % 16;
          lTemp = II(a, b, c, d, lMessage[i + lIndex], s[j], k[j]);
        }

        a = d;
        d = c;
        c = b;
        b = lTemp;
      }

      a = addUnsigned(a, AA);
      b = addUnsigned(b, BB);
      c = addUnsigned(c, CC);
      d = addUnsigned(d, DD);
    }

    return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
  };

  return MD5(string);
};

export default MD5;

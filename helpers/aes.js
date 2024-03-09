import crypto from "crypto-js";

var a = [],
  c = [],
  d = [],
  p = [],
  m = [],
  l = [],
  g = [],
  y = [],
  _ = [],
  S = [];

(function () {
  for (var x = [], C = 0; C < 256; C++)
    C < 128 ? (x[C] = C << 1) : (x[C] = (C << 1) ^ 283);
  for (var T = 0, I = 0, C = 0; C < 256; C++) {
    var R = I ^ (I << 1) ^ (I << 2) ^ (I << 3) ^ (I << 4);
    (R = (R >>> 8) ^ (R & 255) ^ 99), (a[T] = R), (c[R] = T);
    var O = x[T],
      L = x[O],
      B = x[L],
      k = (x[R] * 257) ^ (R * 16843008);
    (d[T] = (k << 24) | (k >>> 8)),
      (p[T] = (k << 16) | (k >>> 16)),
      (m[T] = (k << 8) | (k >>> 24)),
      (l[T] = k);
    var k = (B * 16843009) ^ (L * 65537) ^ (O * 257) ^ (T * 16843008);
    (g[R] = (k << 24) | (k >>> 8)),
      (y[R] = (k << 16) | (k >>> 16)),
      (_[R] = (k << 8) | (k >>> 24)),
      (S[R] = k),
      T ? ((T = O ^ x[x[x[B ^ O]]]), (I ^= x[x[I]])) : (T = I = 1);
  }
})();

var A = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54];

var w = (crypto.algo.AES = crypto.lib.BlockCipher.extend({
  _doReset: function () {
    var x;
    if (!(this._nRounds && this._keyPriorReset === this._key)) {
      for (
        var C = (this._keyPriorReset = this._key),
          T = C.words,
          I = C.sigBytes / 4,
          R = (this._nRounds = I + 6),
          O = (R + 1) * 4,
          L = (this._keySchedule = []),
          B = 0;
        B < O;
        B++
      )
        B < I
          ? (L[B] = T[B])
          : ((x = L[B - 1]),
            B % I
              ? I > 6 &&
                B % I == 4 &&
                (x =
                  (a[x >>> 24] << 24) |
                  (a[(x >>> 16) & 255] << 16) |
                  (a[(x >>> 8) & 255] << 8) |
                  a[x & 255])
              : ((x = (x << 8) | (x >>> 24)),
                (x =
                  (a[x >>> 24] << 24) |
                  (a[(x >>> 16) & 255] << 16) |
                  (a[(x >>> 8) & 255] << 8) |
                  a[x & 255]),
                (x ^= A[(B / I) | 0] << 24)),
            (L[B] = L[B - I] ^ x));
      for (var k = (this._invKeySchedule = []), s = 0; s < O; s++) {
        var B = O - s;
        if (s % 4) var x = L[B];
        else var x = L[B - 4];
        s < 4 || B <= 4
          ? (k[s] = x)
          : (k[s] =
              g[a[x >>> 24]] ^
              y[a[(x >>> 16) & 255]] ^
              _[a[(x >>> 8) & 255]] ^
              S[a[x & 255]]);
      }
    }
  },
  encryptBlock: function (x, C) {
    this._doCryptBlock(x, C, this._keySchedule, d, p, m, l, a);
  },
  decryptBlock: function (x, C) {
    var T = x[C + 1];
    (x[C + 1] = x[C + 3]),
      (x[C + 3] = T),
      this._doCryptBlock(x, C, this._invKeySchedule, g, y, _, S, c);
    var T = x[C + 1];
    (x[C + 1] = x[C + 3]), (x[C + 3] = T);
  },
  _doCryptBlock: function (x, C, T, I, R, O, L, B) {
    for (
      var k = this._nRounds,
        s = x[C] ^ T[0],
        f = x[C + 1] ^ T[1],
        h = x[C + 2] ^ T[2],
        b = x[C + 3] ^ T[3],
        M = 4,
        P = 1;
      P < k;
      P++
    ) {
      var N =
          I[s >>> 24] ^
          R[(f >>> 16) & 255] ^
          O[(h >>> 8) & 255] ^
          L[b & 255] ^
          T[M++],
        E =
          I[f >>> 24] ^
          R[(h >>> 16) & 255] ^
          O[(b >>> 8) & 255] ^
          L[s & 255] ^
          T[M++],
        v =
          I[h >>> 24] ^
          R[(b >>> 16) & 255] ^
          O[(s >>> 8) & 255] ^
          L[f & 255] ^
          T[M++],
        D =
          I[b >>> 24] ^
          R[(s >>> 16) & 255] ^
          O[(f >>> 8) & 255] ^
          L[h & 255] ^
          T[M++];
      (s = N), (f = E), (h = v), (b = D);
    }
    var N =
        ((B[s >>> 24] << 24) |
          (B[(f >>> 16) & 255] << 16) |
          (B[(h >>> 8) & 255] << 8) |
          B[b & 255]) ^
        T[M++],
      E =
        ((B[f >>> 24] << 24) |
          (B[(h >>> 16) & 255] << 16) |
          (B[(b >>> 8) & 255] << 8) |
          B[s & 255]) ^
        T[M++],
      v =
        ((B[h >>> 24] << 24) |
          (B[(b >>> 16) & 255] << 16) |
          (B[(s >>> 8) & 255] << 8) |
          B[f & 255]) ^
        T[M++],
      D =
        ((B[b >>> 24] << 24) |
          (B[(s >>> 16) & 255] << 16) |
          (B[(f >>> 8) & 255] << 8) |
          B[h & 255]) ^
        T[M++];
    (x[C] = N), (x[C + 1] = E), (x[C + 2] = v), (x[C + 3] = D);
  },
  keySize: 256 / 32,
}));

crypto.AES = crypto.lib.BlockCipher._createHelper(w);

export default crypto.AES;

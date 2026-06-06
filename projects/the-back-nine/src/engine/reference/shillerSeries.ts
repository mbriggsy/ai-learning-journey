/**
 * Shiller historical market series (S&P 500 total-return components + CPI + the
 * long-term government bond yield), 1925-1995. VENDORED + COMMITTED from
 * cFIREsim-open (github.com/boknows/cFIREsim-open, js/marketData.js; Shiller data
 * from 1871) — never fetched at build (clean-clone discipline, ai-journey-stats/008).
 *
 * DIRECTIONAL by construction (findings Strand 4): cFIREsim-open models the bond
 * leg as the Shiller long-term GOVERNMENT rate used yield-as-return (no duration /
 * price effect) - NOT Trinity's long-term CORPORATE bonds, NOR Bengen's
 * intermediate-term GOVERNMENT total return. So a backtest on this series lands
 * DIRECTIONALLY near the published Trinity/Bengen figures (right band), exact only
 * once the corporate / Ibbotson-intermediate series is pinned (the P1 exit gate).
 *
 * stockNominal = price growth + dividend yield (cFIREsim applies the dividend to the
 * start-of-year value). bondNominal = the year's long-term government yield. 1925 is
 * included so 1926's inflation (cpi[1926]/cpi[1925]-1) is defined.
 */
export interface ShillerYear {
  readonly year: number
  /** CPI index level (used to deflate nominal returns + size inflation-adjusted withdrawals). */
  readonly cpi: number
  /** Nominal S&P total return = price growth + dividend yield. */
  readonly stockNominal: number
  /** Nominal bond return = the long-term government yield (yield-as-return; the
   *  cFIREsim-open simplification — directional, not a duration model). */
  readonly bondNominal: number
}

/** 1925-1995, ascending by year. The Trinity vintage is the 1926-1995 sub-range. */
export const SHILLER_1925_1995: readonly ShillerYear[] = [
  { year: 1925, cpi: 17.3, stockNominal: 0.24803402, bondNominal: 0.0386 },
  { year: 1926, cpi: 17.9, stockNominal: 0.10731226, bondNominal: 0.0368 },
  { year: 1927, cpi: 17.5, stockNominal: 0.3602015, bondNominal: 0.0334 },
  { year: 1928, cpi: 17.3, stockNominal: 0.46244723, bondNominal: 0.0333 },
  { year: 1929, cpi: 17.1, stockNominal: -0.09211585, bondNominal: 0.036 },
  { year: 1930, cpi: 17.1, stockNominal: -0.21921695, bondNominal: 0.0329 },
  { year: 1931, cpi: 15.9, stockNominal: -0.42010638, bondNominal: 0.0334 },
  { year: 1932, cpi: 14.3, stockNominal: -0.05020482, bondNominal: 0.0368 },
  { year: 1933, cpi: 12.9, stockNominal: 0.55641749, bondNominal: 0.0331 },
  { year: 1934, cpi: 13.2, stockNominal: -0.0796205, bondNominal: 0.0312 },
  { year: 1935, cpi: 13.6, stockNominal: 0.53455723, bondNominal: 0.0279 },
  { year: 1936, cpi: 13.8, stockNominal: 0.31322674, bondNominal: 0.0265 },
  { year: 1937, cpi: 14.1, stockNominal: -0.31552018, bondNominal: 0.0268 },
  { year: 1938, cpi: 14.2, stockNominal: 0.17536101, bondNominal: 0.0256 },
  { year: 1939, cpi: 14, stockNominal: 0.02506664, bondNominal: 0.0236 },
  { year: 1940, cpi: 13.9, stockNominal: -0.09159894, bondNominal: 0.0221 },
  { year: 1941, cpi: 14.1, stockNominal: -0.08973147, bondNominal: 0.0195 },
  { year: 1942, cpi: 15.7, stockNominal: 0.20865991, bondNominal: 0.0246 },
  { year: 1943, cpi: 16.9, stockNominal: 0.23290387, bondNominal: 0.0247 },
  { year: 1944, cpi: 17.4, stockNominal: 0.19015468, bondNominal: 0.0248 },
  { year: 1945, cpi: 17.8, stockNominal: 0.38349392, bondNominal: 0.0237 },
  { year: 1946, cpi: 18.2, stockNominal: -0.1189419, bondNominal: 0.0219 },
  { year: 1947, cpi: 21.5, stockNominal: 0.02191539, bondNominal: 0.0225 },
  { year: 1948, cpi: 23.7, stockNominal: 0.09260506, bondNominal: 0.0244 },
  { year: 1949, cpi: 24, stockNominal: 0.1605903, bondNominal: 0.0231 },
  { year: 1950, cpi: 23.5, stockNominal: 0.32464455, bondNominal: 0.0232 },
  { year: 1951, cpi: 25.4, stockNominal: 0.21059264, bondNominal: 0.0257 },
  { year: 1952, cpi: 26.5, stockNominal: 0.14069161, bondNominal: 0.0268 },
  { year: 1953, cpi: 26.6, stockNominal: 0.026356, bondNominal: 0.0283 },
  { year: 1954, cpi: 26.9, stockNominal: 0.45548586, bondNominal: 0.0248 },
  { year: 1955, cpi: 26.7, stockNominal: 0.28361433, bondNominal: 0.0261 },
  { year: 1956, cpi: 26.8, stockNominal: 0.06681766, bondNominal: 0.029 },
  { year: 1957, cpi: 27.6, stockNominal: -0.05664385, bondNominal: 0.0346 },
  { year: 1958, cpi: 28.6, stockNominal: 0.39599538, bondNominal: 0.0309 },
  { year: 1959, cpi: 29, stockNominal: 0.07491316, bondNominal: 0.0402 },
  { year: 1960, cpi: 29.3, stockNominal: 0.0612902, bondNominal: 0.0472 },
  { year: 1961, cpi: 29.8, stockNominal: 0.18916059, bondNominal: 0.0384 },
  { year: 1962, cpi: 30, stockNominal: -0.02871478, bondNominal: 0.0408 },
  { year: 1963, cpi: 30.4, stockNominal: 0.2079107, bondNominal: 0.0383 },
  { year: 1964, cpi: 30.9, stockNominal: 0.15652937, bondNominal: 0.0417 },
  { year: 1965, cpi: 31.2, stockNominal: 0.1128271, bondNominal: 0.0419 },
  { year: 1966, cpi: 31.8, stockNominal: -0.06568795, bondNominal: 0.0461 },
  { year: 1967, cpi: 32.9, stockNominal: 0.15950266, bondNominal: 0.0458 },
  { year: 1968, cpi: 34.1, stockNominal: 0.10406144, bondNominal: 0.0553 },
  { year: 1969, cpi: 35.6, stockNominal: -0.08441176, bondNominal: 0.0604 },
  { year: 1970, cpi: 37.8, stockNominal: 0.07023951, bondNominal: 0.0779 },
  { year: 1971, cpi: 39.8, stockNominal: 0.13841053, bondNominal: 0.0624 },
  { year: 1972, cpi: 41.1, stockNominal: 0.17589545, bondNominal: 0.0595 },
  { year: 1973, cpi: 42.6, stockNominal: -0.16159908, bondNominal: 0.0646 },
  { year: 1974, cpi: 46.6, stockNominal: -0.2096556, bondNominal: 0.0699 },
  { year: 1975, cpi: 52.1, stockNominal: 0.3848309, bondNominal: 0.075 },
  { year: 1976, cpi: 55.6, stockNominal: 0.10967716, bondNominal: 0.0774 },
  { year: 1977, cpi: 58.5, stockNominal: -0.09107254, bondNominal: 0.0721 },
  { year: 1978, cpi: 62.5, stockNominal: 0.1570452, bondNominal: 0.0796 },
  { year: 1979, cpi: 68.3, stockNominal: 0.16350747, bondNominal: 0.091 },
  { year: 1980, cpi: 77.8, stockNominal: 0.25067629, bondNominal: 0.108 },
  { year: 1981, cpi: 87, stockNominal: -0.07142857, bondNominal: 0.1257 },
  { year: 1982, cpi: 94.3, stockNominal: 0.28695652, bondNominal: 0.1459 },
  { year: 1983, cpi: 97.8, stockNominal: 0.20085467, bondNominal: 0.1046 },
  { year: 1984, cpi: 101.9, stockNominal: 0.07403846, bondNominal: 0.1167 },
  { year: 1985, cpi: 105.5, stockNominal: 0.25742033, bondNominal: 0.1138 },
  { year: 1986, cpi: 109.6, stockNominal: 0.30854947, bondNominal: 0.0919 },
  { year: 1987, cpi: 111.2, stockNominal: -0.0215501, bondNominal: 0.0708 },
  { year: 1988, cpi: 115.7, stockNominal: 0.17467733, bondNominal: 0.0867 },
  { year: 1989, cpi: 121.1, stockNominal: 0.22558981, bondNominal: 0.0909 },
  { year: 1990, cpi: 127.4, stockNominal: -0.00982439, bondNominal: 0.0821 },
  { year: 1991, cpi: 134.6, stockNominal: 0.31551415, bondNominal: 0.0809 },
  { year: 1992, cpi: 138.1, stockNominal: 0.07544222, bondNominal: 0.0703 },
  { year: 1993, cpi: 142.6, stockNominal: 0.11527997, bondNominal: 0.066 },
  { year: 1994, cpi: 146.2, stockNominal: 0.01032432, bondNominal: 0.0575 },
  { year: 1995, cpi: 150.3, stockNominal: 0.34895218, bondNominal: 0.0778 },
]

export const SHILLER_SOURCE =
  "cFIREsim-open js/marketData.js (Shiller data); long-term GOVERNMENT bond yield-as-return — directional vs Trinity-corporate / Bengen-intermediate-government until pinned"

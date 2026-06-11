/**
 * Damodaran historical annual TOTAL-return series, 1928-1995 — the P1-exit
 * VALIDATION proxy for Trinity's long-term-corporate leg and Bengen's
 * intermediate-government leg. VENDORED + COMMITTED excerpt (clean-clone
 * discipline, ai-journey-stats/008) from Aswath Damodaran's "Historical Returns
 * on Stocks, Bonds and Bills" dataset (histretSP.xls, NYU Stern), accessed
 * 2026-06-11; source-file sha256
 * 12430ac0d0e762b8d0b0a1246089111ec18245278f224e7f6e9925496ca901d8 (author-saved
 * 2026-05-14). License posture: free for research/personal use with attribution,
 * never resold as data — this tool is personal and never sold.
 *
 * WHAT IT IS (the source's own documented method, sheet "T. Bond yield & return"):
 * annual TOTAL returns — the coupon promised at the start of the year plus the
 * price change a constant-maturity bond suffers when the year ends at the new
 * rate — reconstructed from FRED yields (10-year Treasury; Moody's Seasoned
 * Aaa/Baa corporate). stockNominal is the S&P 500 INCLUSIVE of dividends;
 * inflationRate is the source's FRED CPI column. Extraction was cross-sheet
 * validated (tbond10 and Baa agree between the source's two tables, 68/68 years)
 * and spot-checked against an independent recon agent's reads (8/8 match).
 *
 * THE HONEST PROXY GAPS (the re-scoped P1-exit gate, ratified 2026-06-11 — this
 * citation IS the disclosure):
 *  - Trinity used Ibbotson SBBI long-term HIGH-GRADE corporate (the Salomon
 *    index); this carries Moody's Aaa — the closest free grade match (Baa is one
 *    notch lower and diverges hard in depressions: 1931 Aaa -1.6% vs Baa -15.7%)
 *    — as a synthetic constant-maturity reconstruction, not a traded index.
 *  - Bengen used SBBI intermediate-term (~5yr) GOVERNMENT; this carries the
 *    10-YEAR Treasury — longer duration, more rate-sensitive, so the Bengen arm
 *    runs CONSERVATIVE (SAFEMAX-analogue ~3.67% vs his published 4.15%; his
 *    worst-cohort structure reproduces exactly: 1966, then 1965, then 1964).
 *  - Coverage starts 1928 (FRED yield history), missing Trinity's 1926-27 start
 *    cohorts: 39 rolling 30-yr windows vs the study's 41.
 *  - Bit-exact Trinity/Bengen equality is RETIRED as a target: SBBI is commercial
 *    AND revised across yearbook editions, and Bengen's 1994 paper used estimated
 *    1994-95 tail data — no canonical dataset exists to be exact against.
 * Validation is SURVIVE/FAIL with window counts pinned to an independent
 * blended-multiplier derivation (DND/012), never bit-exact published figures.
 *
 * The Shiller series (shillerSeries.ts) remains the spine's golden anchor,
 * UNTOUCHED (golden cases are never perturbed); this series adds the TIGHTER
 * total-return validation arms beside it.
 */

export interface DamodaranYear {
  readonly year: number
  /** Nominal S&P 500 total return, dividends included. */
  readonly stockNominal: number
  /** Nominal Moody's Aaa corporate total return (constant-maturity reconstruction)
   *  — the Trinity long-term-HIGH-GRADE-corporate proxy arm. */
  readonly aaaCorporateNominal: number
  /** Nominal Moody's Baa corporate total return — the one-notch-lower comparison
   *  arm (kept beside Aaa so the grade spread stays visible in the data). */
  readonly baaCorporateNominal: number
  /** Nominal 10-year US Treasury total return (constant-maturity reconstruction)
   *  — the Bengen intermediate-government proxy arm (duration-conservative). */
  readonly tbond10Nominal: number
  /** The year's CPI inflation RATE (not a level — deflation needs no prior year). */
  readonly inflationRate: number
}

/** 1928-1995, ascending by year, no gaps. */
export const DAMODARAN_1928_1995: readonly DamodaranYear[] = [
  { year: 1928, stockNominal: 0.43811155152887893, aaaCorporateNominal: 0.03279485596639467, baaCorporateNominal: 0.03219551470232438, tbond10Nominal: 0.008354708589799302, inflationRate: -0.0115607 },
  { year: 1929, stockNominal: -0.0829794661190966, aaaCorporateNominal: 0.0413918041608565, baaCorporateNominal: 0.03017856239904043, tbond10Nominal: 0.04203804156320426, inflationRate: 0.005848 },
  { year: 1930, stockNominal: -0.25123636363636365, aaaCorporateNominal: 0.058557414353302785, baaCorporateNominal: 0.005397809464823829, tbond10Nominal: 0.045409314348970366, inflationRate: -0.0639535 },
  { year: 1931, stockNominal: -0.4383754889178619, aaaCorporateNominal: -0.015625061412875695, baaCorporateNominal: -0.15680775082667592, tbond10Nominal: -0.02558855961942253, inflationRate: -0.0931677 },
  { year: 1932, stockNominal: -0.08642364532019696, aaaCorporateNominal: 0.11070808430446419, baaCorporateNominal: 0.23589601675740196, tbond10Nominal: 0.08790306990477326, inflationRate: -0.1027397 },
  { year: 1933, stockNominal: 0.49982225433526023, aaaCorporateNominal: 0.05302144635939915, baaCorporateNominal: 0.1296689369754826, tbond10Nominal: 0.01855272089185736, inflationRate: 0.007633600000000001 },
  { year: 1934, stockNominal: -0.011885656970912803, aaaCorporateNominal: 0.10149829894135538, baaCorporateNominal: 0.18816429268482648, tbond10Nominal: 0.0796344261796561, inflationRate: 0.0151515 },
  { year: 1935, stockNominal: 0.4674042105263158, aaaCorporateNominal: 0.06896470928924045, baaCorporateNominal: 0.1330773186567917, tbond10Nominal: 0.04472047729656613, inflationRate: 0.029850699999999997 },
  { year: 1936, stockNominal: 0.3194341027550261, aaaCorporateNominal: 0.06325523749892505, baaCorporateNominal: 0.11383815871922703, tbond10Nominal: 0.0501787540454506, inflationRate: 0.014492799999999998 },
  { year: 1937, stockNominal: -0.3533672875436554, aaaCorporateNominal: 0.021716541759769864, baaCorporateNominal: -0.044161916839982614, tbond10Nominal: 0.01379146059646038, inflationRate: 0.028571399999999997 },
  { year: 1938, stockNominal: 0.29282654028436017, aaaCorporateNominal: 0.04314412650095709, baaCorporateNominal: 0.0923588171368742, tbond10Nominal: 0.04213248532204607, inflationRate: -0.0277778 },
  { year: 1939, stockNominal: -0.010975646879756443, aaaCorporateNominal: 0.04277893512866122, baaCorporateNominal: 0.0798313776534614, tbond10Nominal: 0.04412261394206067, inflationRate: 0 },
  { year: 1940, stockNominal: -0.10672873194221515, aaaCorporateNominal: 0.04931305690287914, baaCorporateNominal: 0.08648137177582957, tbond10Nominal: 0.05402481596284551, inflationRate: 0.0071429 },
  { year: 1941, stockNominal: -0.1277145557655955, aaaCorporateNominal: 0.019343859466896082, baaCorporateNominal: 0.05007172857275923, tbond10Nominal: -0.020221975848580105, inflationRate: 0.09929080000000001 },
  { year: 1942, stockNominal: 0.19173762945914843, aaaCorporateNominal: 0.027138648440788254, baaCorporateNominal: 0.051799010426587015, tbond10Nominal: 0.022948682374484164, inflationRate: 0.0903226 },
  { year: 1943, stockNominal: 0.25061310133060394, aaaCorporateNominal: 0.03415116032293629, baaCorporateNominal: 0.08044670060105924, tbond10Nominal: 0.0249, inflationRate: 0.0295858 },
  { year: 1944, stockNominal: 0.1903067694944301, aaaCorporateNominal: 0.03086492118978481, baaCorporateNominal: 0.0656586358825617, tbond10Nominal: 0.025776111579070303, inflationRate: 0.0229885 },
  { year: 1945, stockNominal: 0.358210843373494, aaaCorporateNominal: 0.034832273065963905, baaCorporateNominal: 0.06799865477817886, tbond10Nominal: 0.03804417341923723, inflationRate: 0.0224719 },
  { year: 1946, stockNominal: -0.08429147465437781, aaaCorporateNominal: 0.026099999999999998, baaCorporateNominal: 0.025080329773195936, tbond10Nominal: 0.031283745375695685, inflationRate: 0.1813187 },
  { year: 1947, stockNominal: 0.052, aaaCorporateNominal: 0.004621314197530965, baaCorporateNominal: 0.0026212022665691934, tbond10Nominal: 0.009196968062832236, inflationRate: 0.08837210000000001 },
  { year: 1948, stockNominal: 0.057045751633986834, aaaCorporateNominal: 0.03463564893844166, baaCorporateNominal: 0.03436959560510321, tbond10Nominal: 0.019510369413175046, inflationRate: 0.0299145 },
  { year: 1949, stockNominal: 0.18303223684210526, aaaCorporateNominal: 0.04620358900096729, baaCorporateNominal: 0.053773011179658936, tbond10Nominal: 0.04663485182797314, inflationRate: -0.0207469 },
  { year: 1950, stockNominal: 0.30805539011316263, aaaCorporateNominal: 0.017991888160641522, baaCorporateNominal: 0.042388173056720914, tbond10Nominal: 0.00429595741710961, inflationRate: 0.059322 },
  { year: 1951, stockNominal: 0.2367846304454234, aaaCorporateNominal: -0.0022878940405443617, baaCorporateNominal: -0.001909809130136969, tbond10Nominal: -0.0029531392208319886, inflationRate: 0.06 },
  { year: 1952, stockNominal: 0.18150988641144306, aaaCorporateNominal: 0.03351731104908272, baaCorporateNominal: 0.04441241504740077, tbond10Nominal: 0.022679961918305656, inflationRate: 0.0075472 },
  { year: 1953, stockNominal: -0.012082047421904465, aaaCorporateNominal: 0.0161417791067146, baaCorporateNominal: 0.016201123818443276, tbond10Nominal: 0.04143840258908851, inflationRate: 0.007490599999999999 },
  { year: 1954, stockNominal: 0.525633212414349, aaaCorporateNominal: 0.05101997366101275, baaCorporateNominal: 0.061579051817707856, tbond10Nominal: 0.032898034558095555, inflationRate: -0.0074348999999999995 },
  { year: 1955, stockNominal: 0.3259733185102835, aaaCorporateNominal: 0.007836816530544771, baaCorporateNominal: 0.02044690004344954, tbond10Nominal: -0.013364391288618781, inflationRate: 0.0037452999999999996 },
  { year: 1956, stockNominal: 0.07439511873350935, aaaCorporateNominal: -0.017776723510078835, baaCorporateNominal: -0.023526541979620903, tbond10Nominal: -0.022557738173154165, inflationRate: 0.029850699999999997 },
  { year: 1957, stockNominal: -0.1045736018855796, aaaCorporateNominal: 0.03258710443988213, baaCorporateNominal: -0.007189284402542365, tbond10Nominal: 0.0679701284662499, inflationRate: 0.0289855 },
  { year: 1958, stockNominal: 0.43719954988747184, aaaCorporateNominal: 0.016287536451366026, baaCorporateNominal: 0.06430092897336026, tbond10Nominal: -0.020990181755274694, inflationRate: 0.0176056 },
  { year: 1959, stockNominal: 0.12056457163557326, aaaCorporateNominal: 0.0013915704024072828, baaCorporateNominal: 0.015743430895022732, tbond10Nominal: -0.026466312591385065, inflationRate: 0.017301 },
  { year: 1960, stockNominal: 0.00336535314743695, aaaCorporateNominal: 0.06413422238199645, baaCorporateNominal: 0.06663187163303434, tbond10Nominal: 0.11639503690963365, inflationRate: 0.0136054 },
  { year: 1961, stockNominal: 0.2663771295818275, aaaCorporateNominal: 0.03793924579815568, baaCorporateNominal: 0.051, tbond10Nominal: 0.020609208076323167, inflationRate: 0.006711399999999999 },
  { year: 1962, stockNominal: -0.08811460517120888, aaaCorporateNominal: 0.05862673314530984, baaCorporateNominal: 0.06495327993606576, tbond10Nominal: 0.05693544054008462, inflationRate: 0.0133333 },
  { year: 1963, stockNominal: 0.22611927099841514, aaaCorporateNominal: 0.033631458860784454, baaCorporateNominal: 0.054644805711862345, tbond10Nominal: 0.016841620739546127, inflationRate: 0.0164474 },
  { year: 1964, stockNominal: 0.16415455878432425, aaaCorporateNominal: 0.036357498175775174, baaCorporateNominal: 0.05161739272285027, tbond10Nominal: 0.037280648911540815, inflationRate: 0.0097087 },
  { year: 1965, stockNominal: 0.12399242477876114, aaaCorporateNominal: 0.025576433994000343, baaCorporateNominal: 0.03190009462253881, tbond10Nominal: 0.007188550935926234, inflationRate: 0.0192308 },
  { year: 1966, stockNominal: -0.0997095423563779, aaaCorporateNominal: -0.007000645768695815, baaCorporateNominal: -0.03445361597577637, tbond10Nominal: 0.029079409324299622, inflationRate: 0.0345912 },
  { year: 1967, stockNominal: 0.23802966513133328, aaaCorporateNominal: -0.004454276726093172, baaCorporateNominal: 0.008952266148446825, tbond10Nominal: -0.015806209932824666, inflationRate: 0.030395099999999998 },
  { year: 1968, stockNominal: 0.10814862651601535, aaaCorporateNominal: 0.04316522905760194, baaCorporateNominal: 0.04845146224309746, tbond10Nominal: 0.032746196950768365, inflationRate: 0.0471976 },
  { year: 1969, stockNominal: -0.08241371076449064, aaaCorporateNominal: -0.021804851328215524, baaCorporateNominal: -0.02025164250792147, tbond10Nominal: -0.050140493209926106, inflationRate: 0.0619718 },
  { year: 1970, stockNominal: 0.03561144905496419, aaaCorporateNominal: 0.08265633351676632, baaCorporateNominal: 0.05649567656988873, tbond10Nominal: 0.16754737183412338, inflationRate: 0.0557029 },
  { year: 1971, stockNominal: 0.14221150298426474, aaaCorporateNominal: 0.10347820104742242, baaCorporateNominal: 0.1400146617421994, tbond10Nominal: 0.09786896619712297, inflationRate: 0.0326633 },
  { year: 1972, stockNominal: 0.18755362915074925, aaaCorporateNominal: 0.08439605896884504, baaCorporateNominal: 0.11409093579389698, tbond10Nominal: 0.02818449050444969, inflationRate: 0.0340633 },
  { year: 1973, stockNominal: -0.14308047437526472, aaaCorporateNominal: 0.029951880508655077, baaCorporateNominal: 0.043180404854323576, tbond10Nominal: 0.036586646024150085, inflationRate: 0.0870588 },
  { year: 1974, stockNominal: -0.2590178575089697, aaaCorporateNominal: -0.0012310591515394126, baaCorporateNominal: -0.04380719797719167, tbond10Nominal: 0.019886086932378574, inflationRate: 0.1233766 },
  { year: 1975, stockNominal: 0.36995137106184356, aaaCorporateNominal: 0.0953774072759104, baaCorporateNominal: 0.11049964074144952, tbond10Nominal: 0.03605253602603384, inflationRate: 0.0693642 },
  { year: 1976, stockNominal: 0.23830999002106662, aaaCorporateNominal: 0.1423007238393551, baaCorporateNominal: 0.19752813987098014, tbond10Nominal: 0.1598456074290921, inflationRate: 0.0486486 },
  { year: 1977, stockNominal: -0.06979704075935232, aaaCorporateNominal: 0.06582879510261744, baaCorporateNominal: 0.09954662852090639, tbond10Nominal: 0.012899606071070449, inflationRate: 0.06701030000000001 },
  { year: 1978, stockNominal: 0.0650928391167193, aaaCorporateNominal: 0.02008474307948263, baaCorporateNominal: 0.03137584977169086, tbond10Nominal: -0.007775806907508648, inflationRate: 0.0901771 },
  { year: 1979, stockNominal: 0.18519490167516386, aaaCorporateNominal: -0.0024730935003710736, baaCorporateNominal: -0.020091101436615355, tbond10Nominal: 0.006707203124723546, inflationRate: 0.13293939999999999 },
  { year: 1980, stockNominal: 0.3173524550676301, aaaCorporateNominal: -0.025510823097555202, baaCorporateNominal: -0.033156783371910456, tbond10Nominal: -0.02989744251999403, inflationRate: 0.125163 },
  { year: 1981, stockNominal: -0.04702390247495576, aaaCorporateNominal: 0.07936976425152531, baaCorporateNominal: 0.08462399480891206, tbond10Nominal: 0.08199215335892354, inflationRate: 0.0892236 },
  { year: 1982, stockNominal: 0.20419055079559353, aaaCorporateNominal: 0.27885424288106153, baaCorporateNominal: 0.2905245565590866, tbond10Nominal: 0.32814549486295586, inflationRate: 0.0382979 },
  { year: 1983, stockNominal: 0.22337155858930619, aaaCorporateNominal: 0.07851818352094624, baaCorporateNominal: 0.16194289622798344, tbond10Nominal: 0.032002094451429264, inflationRate: 0.0379098 },
  { year: 1984, stockNominal: 0.0614614199963621, aaaCorporateNominal: 0.14796279212681412, baaCorporateNominal: 0.15619207332454216, tbond10Nominal: 0.13733364344102345, inflationRate: 0.0394867 },
  { year: 1985, stockNominal: 0.3123514948576895, aaaCorporateNominal: 0.25967206594531983, baaCorporateNominal: 0.23862641849916477, tbond10Nominal: 0.2571248821260641, inflationRate: 0.0379867 },
  { year: 1986, stockNominal: 0.18494578758046187, aaaCorporateNominal: 0.1895256949661746, baaCorporateNominal: 0.2214614600547623, tbond10Nominal: 0.24284215141767618, inflationRate: 0.010979000000000001 },
  { year: 1987, stockNominal: 0.05812721641821871, aaaCorporateNominal: -0.008470046679026788, baaCorporateNominal: 0.011171968043818023, tbond10Nominal: -0.04960508937926228, inflationRate: 0.0443439 },
  { year: 1988, stockNominal: 0.16537192812044688, aaaCorporateNominal: 0.12871994621968308, baaCorporateNominal: 0.15681384703221346, tbond10Nominal: 0.08223595843484167, inflationRate: 0.0441941 },
  { year: 1989, stockNominal: 0.31475183638196724, aaaCorporateNominal: 0.14386362626980134, baaCorporateNominal: 0.16312115752422615, tbond10Nominal: 0.17693647159446219, inflationRate: 0.04647300000000001 },
  { year: 1990, stockNominal: -0.03064451612903212, aaaCorporateNominal: 0.07717359602344319, baaCorporateNominal: 0.056477750205500804, tbond10Nominal: 0.06235375333553336, inflationRate: 0.061062599999999995 },
  { year: 1991, stockNominal: 0.3023484313487976, aaaCorporateNominal: 0.14979112964226093, baaCorporateNominal: 0.16400049125760602, tbond10Nominal: 0.15004510019517303, inflationRate: 0.0306428 },
  { year: 1992, stockNominal: 0.07493727972380064, aaaCorporateNominal: 0.09844351503261206, baaCorporateNominal: 0.13682874000406886, tbond10Nominal: 0.09361637316207942, inflationRate: 0.0290065 },
  { year: 1993, stockNominal: 0.0996705147919488, aaaCorporateNominal: 0.14301459202248662, baaCorporateNominal: 0.1644459431669278, tbond10Nominal: 0.14210957589263107, inflationRate: 0.027484099999999997 },
  { year: 1994, stockNominal: 0.013259206774573897, aaaCorporateNominal: -0.027807661421247742, baaCorporateNominal: -0.012313818260180243, tbond10Nominal: -0.08036655550998592, inflationRate: 0.026749000000000002 },
  { year: 1995, stockNominal: 0.3719519890260631, aaaCorporateNominal: 0.21161302520080752, baaCorporateNominal: 0.20087516571052572, tbond10Nominal: 0.23480780112538907, inflationRate: 0.0253841 },
]

export const DAMODARAN_SOURCE =
  'Damodaran NYU "Historical Returns on Stocks, Bonds and Bills" (histretSP.xls), accessed 2026-06-11, sha256 12430ac0d0e762b8d0b0a1246089111ec18245278f224e7f6e9925496ca901d8; S&P 500 w/ dividends + Aaa/Baa constant-maturity corporate + 10yr Treasury total returns + FRED CPI; the re-scoped P1-exit proxy pin (2026-06-11) — survive/fail validation arms, never bit-exact SBBI/Trinity/Bengen'

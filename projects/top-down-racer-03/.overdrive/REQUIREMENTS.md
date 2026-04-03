# REQUIREMENTS REGISTRY

*Extracted: 2026-03-09T00:00:00Z*
*Source: docs/Top-Down-Racer-v03-GSD-Spec.md*
*Total: 127 requirements*

---

| ID | Type | Priority | Text | Verification | Phase |
|-----|------|----------|------|--------------|-------|
| R-001 | constraint | must | The simulation engine (src/engine/) must have zero modifications from v02 | inspection — diff src/engine/ against v0 | - |
| R-002 | constraint | must | The engine/renderer architectural boundary must have zero cross-layer imports | static analysis — grep for engine import | - |
| R-003 | constraint | must | The renderer must only read engine state and never mutate game logic | code review — renderer has no write acce | - |
| R-004 | constraint | must | Track 1 (oval) geometry must remain unchanged from v02 | inspection — diff track01.ts geometry da | - |
| R-005 | constraint | must | The project must use TypeScript as the primary implementation language | inspection — all game source files are . | - |
| R-006 | constraint | must | The project must use PixiJS v8 with WebGL as the rendering engine | inspection — package.json contains pixi. | - |
| R-007 | constraint | must | The project must use Vitest for TypeScript test infrastructure | inspection — package.json contains vites | - |
| R-008 | constraint | must | The project must use pytest for Python test infrastructure | inspection — Python tests use pytest fra | - |
| R-009 | constraint | must | The application must be statically deployable with no server infrastructure | inspection — no server-side code, all as | - |
| R-010 | constraint | must | The application must not include any multiplayer functionality | inspection — no networking code, no mult | - |
| R-011 | constraint | must | The application must have exactly three tracks — no fourth track added | inspection — track registry contains exa | - |
| R-012 | constraint | must | The physics engine must not be modified | inspection — physics code identical to v | - |
| R-013 | constraint | must | Cars must be implemented as static top-down sprites with PixiJS-native continuou | inspection — car rendering uses sprite.r | 2 |
| R-014 | constraint | must | The v02 ONNX model must be retired and not used in v03 production | inspection — v02 ONNX file not reference | 5 |
| R-015 | constraint | must | AI retraining must use full PPO from scratch, not transfer learning from v02 | inspection — training script initializes | 5 |
| R-016 | constraint | must | The reward function must be shipped unchanged from v02 | inspection — diff reward function agains | 5 |
| R-017 | constraint | must | Track geometry files in src/tracks/ must be treated as data files, not engine co | inspection — track files contain only ge | 1 |
| R-018 | constraint | must | v03 must start from a fresh project scaffold, not a wholesale copy of v02 src/ | inspection — v03 scaffold is independent | - |
| R-019 | constraint | must | The build must use zero hand-written game code — GSD + asset pipeline only | inspection — all game code generated thr | - |
| R-020 | data | must | Raw AI-generated assets must be stored in assets/raw/ and gitignored | inspection — assets/raw/ exists in .giti | 1 |
| R-021 | data | must | Processed game-ready assets must be stored in public/assets/ and tracked in git | inspection — public/assets/ is git-track | 1 |
| R-022 | functional | must | An asset processor script must be built using Sharp (Node.js) for resize, optimi | unit test — processor script runs and pr | 1 |
| R-023 | functional | must | A typed asset manifest must be auto-generated at src/assets/manifest.ts with zer | unit test — manifest is generated, conta | 1 |
| R-024 | functional | must | A texture atlas builder must output PixiJS-compatible JSON + PNG atlas in Textur | unit test — atlas builder produces valid | 1 |
| R-025 | data | must | All referenced files in the asset manifest must exist on disk | unit test — iterate manifest entries, as | 1 |
| R-026 | data | must | All referenced files in the asset manifest must have correct dimensions matching | unit test — read image dimensions, asser | 1 |
| R-027 | non-functional | must | All Phase 1 asset pipeline tooling must have automated tests | inspection — test files exist for proces | 1 |
| R-028 | constraint | must | Claude Code must never call Nano Banana or Ludo.ai APIs directly — asset generat | inspection — no API calls to Nano Banana | - |
| R-029 | constraint | must | All assets must be generated before Phase 2 execution begins | inspection — Phase 2 plan does not inclu | 1 |
| R-030 | data | must | Asset processor scripts must reside in the tools/ directory | inspection — tools/ directory contains S | 1 |
| R-031 | data | must | Player car sprites must be provided in 3 color variants as PNG with transparent  | unit test — 3 player car PNGs exist, 256 | 2 |
| R-032 | data | must | AI opponent car sprite must be a PNG with transparent background at 256×256px wi | unit test — AI car PNG exists, 256×256,  | 2 |
| R-033 | data | must | Car sprites must have front clearly distinguishable from rear | manual check — visual inspection confirm | 2 |
| R-034 | data | must | Track 01 background must be a pre-rendered PNG at 2048×2048 in top-down view | unit test — file exists, dimensions are  | 2 |
| R-035 | data | must | Track 02 background must be a pre-rendered PNG at 2048×2048 in top-down view | unit test — file exists, dimensions are  | 2 |
| R-036 | data | must | Track 03 background must be a pre-rendered PNG at 2048×2048 in top-down view | unit test — file exists, dimensions are  | 2 |
| R-037 | data | must | Asphalt texture must be a seamless tileable PNG at 512×512 with wet/dry variant | unit test — file exists, 512×512, seamle | 2 |
| R-038 | data | must | Grass texture must be a seamless tileable PNG at 256×256 | unit test — file exists, 256×256 | 2 |
| R-039 | data | must | Curb texture must be a PNG at 128×64 with red/white alternating pattern | unit test — file exists, 128×64 | 2 |
| R-040 | data | must | Menu background must be a PNG at 1920×1080 with dark dramatic racing atmosphere | unit test — file exists, 1920×1080; manu | 4 |
| R-041 | data | must | Engine sound idle loop must be a WAV file ≤200KB as a seamless loop | unit test — file exists, ≤200KB, WAV for | 4 |
| R-042 | data | must | Engine sound mid-RPM loop must be a WAV file ≤200KB as a seamless loop | unit test — file exists, ≤200KB, WAV for | 4 |
| R-043 | data | must | Engine sound high-RPM loop must be a WAV file ≤200KB as a seamless loop | unit test — file exists, ≤200KB, WAV for | 4 |
| R-044 | functional | must | Track surfaces must use tiled textures for asphalt, curbs, grass, and rumble str | manual check — track surfaces render wit | 2 |
| R-045 | functional | must | Track environment must include visual details such as barriers, tire walls, and  | manual check — environment details visib | 2 |
| R-046 | functional | must | Track 1 (oval) must receive a visual-only upgrade with no geometry changes | inspection — track01.ts geometry unchang | 2 |
| R-047 | functional | must | Track 2 must be redesigned as a longer high-speed circuit with genuine braking z | inspection — track02.ts geometry is new, | 1 |
| R-048 | functional | must | Track 2 must have at least one straight long enough that the AI must decide when | inspection — track02.ts contains a strai | 1 |
| R-049 | functional | must | Track 2 must have 2-3 genuine braking zones | inspection — track geometry analysis sho | 1 |
| R-050 | constraint | must | Track 2 must have no hairpin corners | inspection — no corner radius in track02 | 1 |
| R-051 | functional | should | Track 2 driveable surface must be approximately 20% wider than v02 tracks | measurement — compare track width to v02 | 1 |
| R-052 | functional | should | Track 2 circuit length must be 30-40% larger than v02 Track 2 | measurement — compute centerline length, | 1 |
| R-053 | functional | must | Track 3 must be redesigned as a full circuit with mixed-radius corners | inspection — track03.ts geometry is new, | 1 |
| R-054 | functional | must | Track 3 must have a minimum of 6 distinct corners | inspection — count distinct corners in t | 1 |
| R-055 | functional | must | Track 3 must have no two corners with the same geometric radius | measurement — compute radius of each cor | 1 |
| R-056 | functional | must | Track 3 must include one genuinely decreasing-radius corner that tightens mid-co | inspection — track geometry contains a c | 1 |
| R-057 | functional | must | Track 3 must include one chicane consisting of two direction changes in quick su | inspection — track geometry contains two | 1 |
| R-058 | functional | must | Track 3 must be narrower in technical sections and wider on straights | measurement — compare track width at tec | 1 |
| R-059 | functional | should | Track 3 circuit length must be 50-60% larger than v02 Track 3 | measurement — compute centerline length, | 1 |
| R-060 | functional | must | The v02 ONNX model must fail on Track 3 (v03) on first inference run | integration test — load v02 ONNX, run in | 5 |
| R-061 | functional | must | The post-processing filter chain must be applied to a dedicated WorldContainer | inspection — WorldContainer exists with  | 3 |
| R-062 | functional | must | The HUD container must live outside the WorldContainer and have no filters appli | inspection — HUDContainer is a sibling o | 3 |
| R-063 | functional | must | WorldContainer must contain TrackLayer, CarLayer, and EffectsLayer as children | inspection — WorldContainer has three ch | 3 |
| R-064 | functional | must | HUDContainer must contain Speedometer, LapCounter, and MiniMap components | inspection — HUDContainer has Speedomete | 4 |
| R-065 | functional | must | Bloom/glow effect must be visible on car headlights (P0 priority) | manual check — bloom glow visible on hea | 3 |
| R-066 | functional | must | Cars must have a soft drop shadow rendered via DropShadowFilter (P0 priority) | manual check — soft shadow visible benea | 3 |
| R-067 | functional | must | Velocity-driven motion blur must be applied to the car at speed via MotionBlurFi | manual check — motion blur visible on ca | 3 |
| R-068 | functional | must | Skid marks must persist on the track surface via RenderTexture accumulation (P1  | manual check — skid marks appear during  | 3 |
| R-069 | functional | should | Heat shimmer effect must appear behind car exhaust using displacement map with a | manual check — heat shimmer distortion v | 3 |
| R-070 | functional | should | Speed lines must be rendered as screen-space effect using custom GLSL, gated by  | manual check — speed lines appear at hig | 3 |
| R-071 | functional | could | Screen-space bloom (CRT/bloom post-pass) must be applied to the full scene via R | manual check — cinematic bloom visible a | 3 |
| R-072 | functional | must | Track background must be rendered as a PixiJS Sprite loaded from a pre-rendered  | inspection — track background loaded as  | 2 |
| R-073 | functional | must | A tiled texture overlay must be applied to the driveable surface using a RenderT | inspection — tiled texture uses RenderTe | 2 |
| R-074 | functional | must | The camera viewport must crop the large track background so only the visible are | inspection — camera culling is active, o | 2 |
| R-075 | functional | must | The speedometer must be an analog gauge using PixiJS Graphics arc, positioned at | manual check — analog gauge visible at b | 4 |
| R-076 | functional | must | Current lap / total laps must be displayed at top center using PixiJS Text | manual check — lap counter visible at to | 4 |
| R-077 | functional | must | Lap timer must be displayed at top right using PixiJS Text with monospace font,  | manual check — timer visible at top righ | 4 |
| R-078 | functional | must | Best lap time must be displayed at top right below the lap timer, dimmed until f | manual check — best lap appears dim init | 4 |
| R-079 | functional | must | Mini-map must be rendered at bottom right using PixiJS Graphics at 1/20th scale  | manual check — mini-map visible at botto | 4 |
| R-080 | functional | must | Mini-map must show car positions as dots updated each frame from engine state | manual check — dots on mini-map track ca | 4 |
| R-081 | functional | must | Mini-map must show checkpoint gates as tick marks | manual check — checkpoint tick marks vis | 4 |
| R-082 | functional | must | Position indicator must be displayed at top left showing race position vs AI (e. | manual check — position indicator visibl | 4 |
| R-083 | functional | must | Main menu must be Stitch-designed with animated cinematic feel, implemented as a | manual check — main menu renders as DOM  | 4 |
| R-084 | functional | must | Track selection screen must show full-screen preview with animated car | manual check — track select shows full-s | 4 |
| R-085 | functional | must | Results screen must be implemented as a DOM overlay matching Stitch design refer | manual check — results screen renders as | 4 |
| R-086 | functional | must | Pause menu must be implemented with Stitch-generated design | manual check — pause menu renders with d | 4 |
| R-087 | data | must | Stitch designs must be generated for main menu, track select, results screen, an | inspection — Stitch design reference fil | 4 |
| R-088 | constraint | must | HUD must be implemented in PixiJS, not DOM, due to tight coupling with game stat | inspection — HUD components are PixiJS o | 4 |
| R-089 | functional | must | Engine sound must use 3 WAV loops (idle, mid, high RPM) with GainNode crossfade  | manual check — engine sound crossfades s | 4 |
| R-090 | functional | must | SFX (skid, collision, checkpoint chime) must continue using Web Audio API synthe | inspection — SFX code uses Web Audio API | 4 |
| R-091 | functional | could | Optional ambient racing music should be available for the menu screen | manual check — menu plays ambient music  | 4 |
| R-092 | functional | must | AI training sanity run on Track 1 (oval) must complete within 100K steps with cl | integration test — training log shows cl | 5 |
| R-093 | functional | must | If Track 1 sanity run fails, the reward function must be diagnosed before furthe | process check — Phase 5 workflow include | 5 |
| R-094 | functional | must | Primary AI training must run on Track 3 (gauntlet) with a budget of 2M steps | inspection — training script configured  | 5 |
| R-095 | non-functional | should | AI must achieve competent lap completion on Track 3 by 1M training steps | integration test — training log shows co | 5 |
| R-096 | functional | must | ONNX model must be exported at training convergence | inspection — ONNX file produced by expor | 5 |
| R-097 | functional | must | Cross-track validation must run the Track 3 model on Track 2 in inference-only m | integration test — Track 3 model loaded, | 5 |
| R-098 | non-functional | must | The exported ONNX model must be ≤50KB for browser delivery | unit test — ONNX file size ≤50KB | 5 |
| R-099 | constraint | must | AI training must use PPO algorithm with the same configuration as v02 | inspection — PPO hyperparameters match v | 5 |
| R-100 | constraint | must | AI training must run in Phase 5, after all visual upgrade phases are complete | inspection — Phase 5 depends on Phases 1 | 5 |
| R-101 | constraint | must | New track geometries must be defined and engine-tested before AI training begins | integration test — track geometry loads  | 1 |
| R-102 | non-functional | must | The application must maintain 60fps with all post-processing effects active | manual check — PixiJS renderer stats sho | 3 |
| R-103 | non-functional | must | Performance must be verifiable via PixiJS renderer stats | inspection — PixiJS renderer stats integ | 3 |
| R-104 | non-functional | must | Renderer must initialize without error (integration test) | integration test — renderer initializes  | 2 |
| R-105 | non-functional | must | All asset keys in the manifest must resolve to loadable assets (integration test | integration test — iterate asset manifes | 2 |
| R-106 | non-functional | must | Visual baseline screenshots must be captured for each screen state at Phase 4 co | inspection — baseline screenshot files e | 4 |
| R-107 | non-functional | must | Visual baseline images must be stored for future regression comparison | inspection — baseline images stored in d | 4 |
| R-108 | non-functional | must | Manual verification gate must occur at the end of each phase where human approve | process check — each phase plan includes | - |
| R-109 | non-functional | must | Renderer visual tests must be added without replacing existing test infrastructu | inspection — new renderer tests exist al | 2 |
| R-110 | non-functional | must | Car sprites must be high-resolution and clearly rendered | manual check — car sprites appear high-r | 2 |
| R-111 | non-functional | must | Player car and AI car must be visually distinct from each other | manual check — player and AI cars clearl | 2 |
| R-112 | non-functional | must | All 3 circuits must look like actual racing circuits, not geometry tests | manual check — tracks have realistic rac | 2 |
| R-113 | non-functional | must | Track 2 must be visually and geometrically distinct from v02 Track 2 | manual check — Track 2 is clearly differ | 2 |
| R-114 | non-functional | must | Track 3 must have mixed-radius corners with no two corners the same | measurement — geometric analysis of corn | 1 |
| R-115 | functional | must | The v03 trained AI model must be able to complete laps on Track 3 | integration test — v03 model completes l | 5 |
| R-116 | non-functional | must | The main menu must be of sufficient quality to pass for a commercial game's main | manual check — human assessment of comme | 4 |
| R-117 | non-functional | must | HUD speedometer, lap timer, and mini-map must all be functional and readable dur | manual check — all HUD elements render c | 4 |
| R-118 | constraint | must | The project must have exactly 5 phases in its roadmap | inspection — roadmap contains exactly 5  | - |
| R-119 | functional | must | Phase 1 must deliver asset processor tooling, typed manifest, texture atlas buil | inspection — all Phase 1 deliverables ex | 1 |
| R-120 | functional | must | Phase 2 must deliver high-res car sprites, track art for all 3 circuits, tiled s | inspection — all Phase 2 deliverables ex | 2 |
| R-121 | functional | must | Phase 3 must deliver bloom, motion blur, shadow, heat shimmer, and upgraded part | manual check — all Phase 3 effects visib | 3 |
| R-122 | functional | must | Phase 4 must deliver Stitch-based menus, commercial HUD, mini-map, and layered e | manual check — all Phase 4 deliverables  | 4 |
| R-123 | functional | must | Phase 5 must deliver AI sanity run on Track 1, full training on Track 3, cross-t | inspection — all Phase 5 deliverables co | 5 |
| R-124 | functional | must | The number of car color variants must be 4-6 total (3 player colors + AI variant | inspection — count car sprite variants,  | 2 |
| R-125 | functional | must | Track 1 must have a clean oval visual identity with day racing and simple grands | manual check — Track 1 background shows  | 2 |
| R-126 | functional | must | Track 2 must have a night lighting stadium atmosphere visual identity | manual check — Track 2 background shows  | 2 |
| R-127 | functional | must | Track 3 must have a technical, moody, European circuit aesthetic visual identity | manual check — Track 3 background shows  | 2 |

---

*Generated by Overdrive RTM Builder*
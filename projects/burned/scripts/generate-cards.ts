/**
 * Generate all 11 BURNED action/utility card illustrations via Imagen 4.
 * Run: set -a && source .env && set +a && npx tsx scripts/generate-cards.ts
 *
 * Roster portraits already exist — this covers every non-operative card type.
 * Rate limit: 7s between calls. ~77s total for 11 images.
 *
 * Use --only=burned,extraction to regenerate specific cards.
 */
import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const MODEL = 'imagen-4.0-generate-001';
const OUTPUT_DIR = resolve('temp/cards');
const INTER_CALL_DELAY_MS = 7_000;

const STYLE_PREFIX =
  'Mid-century modern illustration, 1960s retro spy-agency style, ' +
  'bold graphic linework, flat saturated color fills, angular geometric simplification, ' +
  'warm color palette with deep teals burnt oranges and rich creams, ' +
  'stylized NOT photographic NOT 3D render NOT realistic NOT cartoon, ' +
  'clean vector-like quality, Saul Bass inspired composition, ' +
  'iconic object centered in frame like a classified dossier stamp, ' +
  'ABSOLUTELY NO TEXT NO WORDS NO LETTERS NO NUMBERS NO TYPOGRAPHY NO TITLES NO CAPTIONS NO LOGOS NO WATERMARKS NO SIGNATURES NO WRITING OF ANY KIND, ';

interface CardPrompt {
  type: string;
  name: string;
  prompt: string;
}

const CARDS: CardPrompt[] = [
  {
    type: 'burned',
    name: 'Burned',
    prompt:
      // Iter 3 (2026-05-06): iter 2 fixed iter 1's hard-edged cone
      // truncation but lost iter 1's operative drama — the bulb apparatus
      // dominated and the operative shrank to a peripheral walking
      // figure. Briggsy verdict: "convey the agent has been caught /
      // discovered." Iter 3 combines:
      //   * Iter 1's foreground HERO operative (large in frame,
      //     dramatic shielding pose, half-lit silhouette).
      //   * Iter 2's continuous cone (extends past operative, gradual
      //     falloff, NO hard mid-air boundary) + cast shadow on the
      //     rooftop floor.
      //   * NEW: explicit emotional payload — frozen at the instant of
      //     DISCOVERY, head snapped sharply to face the bulb, body
      //     reading as REACTIVE not in-motion. The card is called
      //     BURNED; the cinematic in-game is the moment of being made.
      // Compositional structural directive: operative occupies the LEFT
      // TWO-THIRDS of the frame as dominant subject, bulb + tripod at
      // far-right edge as the source of the cone, NOT the hero.
      //
      // Iter 1 archive: public/assets/cards/_archive/burned-2026-05-06-iter1-cone-truncation-rejected.webp
      // Iter 2 archive: public/assets/cards/_archive/burned-2026-05-06-iter2-operative-too-small-rejected.webp
      'a dramatic close-up rooftop scene at night at the instant of a flashbulb detonation, the moment of DISCOVERY captured in still frame — an operative caught and made by an unseen camera, ' +
      'COMPOSITIONAL LAYOUT — ONE solitary operative occupies the LEFT TWO-THIRDS of the frame as the dominant subject filling roughly HALF the vertical height of the frame, a tripod-mounted vintage flashbulb sits at the FAR-RIGHT edge of the frame as the source of the cone of light but NOT the visual hero, the cone of light fills the space between them and extends past the operative to fade at the screen-left edge, ' +
      'the operative wears a long trench coat and a fedora hat, captured FROZEN mid-stride at the precise instant of being SEEN — his body angled forward as if walking but his head snapped sharply to the right looking directly toward the firing bulb, shoulders rotating in startled recognition, knee bent from the interrupted stride, the body language reads as INSTANT REACTION to being caught: this is the moment of cover blown, surprise and recognition frozen in white light, ' +
      'the operative\'s right arm is raised toward the light in a defensive shielding gesture, palm of the hand facing the bulb and the back of the hand toward the operative\'s own face, fingers splayed, the arm at shoulder height, ' +
      'the operative is harshly side-lit by the cone of light from the right — his right side facing the bulb is brightly washed in pure white-amber glare, the contour of his right arm shoulder hat brim and trench coat catches the light as a hard-edged bright silhouette outline, his left side falls into deep self-shadow, the operative reads as a HIGH-CONTRAST silhouette with one harshly-lit edge and one shadowed edge — body and emotion reading through posture and outline alone, no detailed facial features required, ' +
      'a BROAD WIDE cone of brilliant white-amber light fans out from the firing flashbulb at screen-right across the entire rooftop, the cone is ONE CONTINUOUS WEDGE of illumination starting at the bulb and extending all the way past the operative to the screen-left edge of the frame, the cone widens as it travels leftward and the light fades GRADUALLY at its outer reaches with a soft gradient falloff, NO hard-edged truncation in mid-air anywhere, the cone CONTINUES past the operative and reaches the rooftop floor on the far side, ' +
      'the operative\'s body casts a long elongated dark SHADOW on the rooftop floor stretching toward screen-left as the bulb\'s light hits him — his own shadow on the floor is the only motivated dark zone within the cone\'s reach, ' +
      'a vintage 1960s studio flashbulb on a slim metal tripod is positioned at the FAR RIGHT edge of the frame, the bulb FIRING at the moment of capture with sparkling lens-flare pinpricks scattered around it, the tripod and bulb apparatus are visible but compositionally SUBORDINATE to the operative — they live at the right edge as the source of the cone, not the visual focus, ' +
      'a dark city skyline silhouette of tall rectangular buildings runs across the bottom horizon line behind the operative, deep charcoal shapes with a few tiny warm amber pinpricks for distant lit windows, ' +
      'a thin layer of fog and mist hangs in the air on the rooftop and catches the cone of light as a soft glowing white-amber haze, especially dense near the bulb, ' +
      'CRITICAL: ONLY ONE PERSON in the entire image, the lone operative is the only human, NO photographer visible behind the tripod, NO second figure, NO crowd, NO red carpet, NO event, NO formal venue, NO press scrum — this is a covert rooftop at night, the tripod stands alone with no operator, ' +
      'the SOLE light source is the firing flashbulb at screen-right, no other light sources, every shadow in the scene falls toward the left because the light comes from the right, ' +
      'NO badge, NO ID card, NO photograph in frame, NO sign, NO document — the firing flashbulb alone tells the story of identity captured, ' +
      'the moment your cover is blown, the instant of being SEEN, the agent caught and discovered, REVELATION frozen in white light, ' +
      'cool deep teal and charcoal night palette with the SINGLE cone of brilliant white-amber as the dominant accent, ' +
      'the scene fills the entire square frame edge to edge with NO white borders NO cream borders NO vignette NO padding NO matting, every corner contains rooftop or sky or city silhouette, ' +
      'NO text NO letters NO words NO numbers NO writing anywhere in the scene on any surface, ' +
      'mid-century modern 1960s spy-film noir aesthetic, bold geometric angular style, flat illustration, ' +
      'square full-bleed composition with the foreground operative as the dominant hero, caught in the continuous cone of light at the instant of discovery',
  },
  {
    type: 'extraction',
    name: 'Extraction',
    prompt:
      // Iter 2: prior generation produced a strong composition (helicopter
      // spotlight, rappelling figure, city skyline, cloud wisps) but Imagen
      // hallucinated a hanging luggage-tag placard with "CLASSIFIED DOSSIER"
      // gibberish. Prompt didn't ask for a tag — model reached for text on
      // its own. Fix: preserve every piece of the original composition, but
      // explicitly forbid any hanging tag/sign/placard/cargo between the
      // helicopter and the figure. Rope + figure only, nothing else on it.
      'a dramatic low-angle view looking up at a black silhouetted helicopter hovering in a twilight sky, ' +
      'a single thick rope descends straight down from the belly of the helicopter, ' +
      'a small human figure in silhouette grips the rope mid-descent, clearly recognizable as a person with arms and legs visible against the sky, ' +
      'a bright amber spotlight beam fans down in a wide cone from the helicopter through wispy geometric clouds illuminating the rope and figure below, ' +
      'a city skyline silhouette of tall rectangular buildings in deep charcoal runs across the bottom of the frame, ' +
      'geometric wind swirls and curved speed lines across the sky suggest motion and turbulence, ' +
      'small bird silhouettes in the distance, ' +
      'NO hanging tag, NO sign, NO placard, NO banner, NO cargo, NO dossier, NO label, NO luggage tag, NO text, NO letters, NO words, NO numbers, NO writing of any kind, nothing printed on the helicopter or hanging from the rope, ' +
      'just the helicopter, rope, and figure alone in the spotlight, ' +
      'the urgent moment of rescue and escape, cool teal and charcoal sky with a warm amber spotlight beam and burnt orange cloud highlights, ' +
      'bold geometric angular style, flat illustration, ' +
      'square composition centered on the helicopter and descending rope',
  },
  {
    type: 'reassign',
    name: 'Reassign',
    prompt:
      // Iter 3 concept: folder handoff across the briefing-room conference
      // table. Ties into the "Mother's office" vocabulary already used in
      // the game UI (blotter, dossiers). Two gloved hands, one sliding a
      // sealed manila folder across to the other — "this one's yours now."
      'a dramatic slightly overhead view of a dark polished mahogany conference table, ' +
      'EXACTLY TWO HANDS TOTAL in the frame — ONE single hand with a small bandage entering from the LEFT edge, and ONE single bare hand entering from the RIGHT edge, that is TWO (2) hands total and ZERO additional hands, do not render any extra hands from the top bottom or anywhere else, ' +
      'the LEFT HAND has a SUBTLE bandage — a small simple white gauze wrap around just two of the fingers (the index and middle finger) or a small neat dressing across the back of the hand, most of the hand skin still visible — this is a MINOR injury, not heavy mummy-wrapping, most of the hand uncovered, clean and minimal medical dressing only, ' +
      'NO blood, NO red stains, NO wounds visible, NO drips, the bandage is clean plain white gauze only, ' +
      'the RIGHT HAND is a plain bare ungloved human hand with visible skin — NO gloves, NO bandages, just a clean healthy hand, ' +
      'both hands emerge from crisp white dress-shirt cuffs and dark suit sleeves, ' +
      'the LEFT bandaged hand is pushing a sealed manila folder across the table toward the right, fingers splayed on top of the folder mid-slide, ' +
      'the RIGHT bare hand has palm open and fingers just starting to reach out to receive the folder, ' +
      'the visual contrast between the bandaged hand and the clean hand tells the story of an injured agent handing off the mission to an able-bodied replacement, ' +
      'the folder is mid-slide leaving a faint motion trail on the polished wood, ' +
      'the manila folder is closed and sealed with a single red wax seal in its center, no text no labels no writing on the folder at all, ' +
      'warm amber lamp light pools down from above onto the center of the table highlighting the folder and hands, ' +
      'faint venetian blind shadow stripes fall diagonally across the table surface as signature Archer Mother-office lighting, ' +
      'only hands and forearms visible, faces and bodies are entirely off-frame, ' +
      'deep teal and charcoal shadows surround the lit pool, dark wood grain visible on the table, ' +
      'the clandestine moment of mission handoff, one operative passing an assignment to another, you are off this one someone else is on, ' +
      'the scene fills the entire square frame edge to edge with NO white borders NO vignette NO background padding, ' +
      'NO text NO letters NO words NO numbers NO writing anywhere on the folder or table or anywhere in the scene, ' +
      'mid-century modern 1960s retro spy-agency aesthetic, bold geometric angular style, flat illustration, ' +
      'square full-bleed composition centered on the folder mid-slide',
  },
  {
    type: 'direct-order',
    name: 'Direct Order',
    prompt:
      // Iter 18 (shipped): 17 iterations of cigar orientation wars and
      // unshakeable "blinds cast stripes on desk" Imagen prior. Cigar
      // killed entirely (replaced with smoldering ashtray — ash + embers
      // + smoke wisp, no geometry to fight). Blind stripes killed by
      // closing the blinds fully: slats shut, no light through, pendant
      // lamp becomes the sole warm light source. Deck-consistent with
      // Reassign / Intel Briefing / Go Dark / Call in a Favor —
      // venetian blinds as motif, pendant lamp, architectural depth,
      // suit/tie visible in partial silhouette.
      'HERO — a slightly low-angle view of a commanding authoritative figure seated behind a large dark polished mahogany executive desk in a 1960s spy-agency private office, the figure leans forward aggressively in a sharp dark charcoal suit with a visible white collared shirt and dark tie (suit fabric, shirt collar, and tie are all clearly visible — partial silhouette with fabric texture readable, NOT a pure black blob), the figure\'s ONE arm extended straight toward the camera with the INDEX FINGER pointing directly at the viewer in dramatic foreshortening, fingertip aimed at the camera lens, other fingers curled into the palm, this pointing finger is the SOLE hero gesture of the composition, the figure\'s other hand rests naturally on the desk or at their side, the face is obscured in strong shadow — just a jawline and shoulder outline suggested, authority archetype not portrait, ' +
      'OFFICE BACKDROP — directly behind the figure is a tall wide window with classic 1960s horizontal venetian blinds, and the blinds are FULLY CLOSED — the horizontal slats are tilted completely shut, flat and closed, blocking all outside light from passing through, the blinds read as a solid dark striped panel (slats visible as a graphic pattern on the window itself only) but NO light passes through the blinds, NO amber glow from outside, the blinds do NOT act as a light source, so ZERO blind-shadow pattern is cast anywhere in the room — the desk surface and floor show NO horizontal stripes, NO parallel shadow lines, NO train-track shadows, NO blind-pattern of any kind on any surface, blinds exist only as a dark graphic element on the window, ' +
      'LIGHTING — the SOLE warm light source in the scene is a brass pendant lamp hanging from the ceiling above the desk casting a warm amber pool of light DOWN onto the desk surface and illuminating the figure from above, the pendant is the only warm light — no competing window light, no amber glow from behind the figure, just the overhead pendant pool on the desk with deep charcoal shadows everywhere else, the desk surface is clean mahogany wood with the pendant pool and nothing else, ' +
      'SMOLDERING ASHTRAY — on the lower-left corner of the desk sits a small round dark glass ashtray (a required element that must appear in the frame), inside the ashtray bowl there is a small pile of gray ash with a few bright amber-orange embers glowing among the ashes (NO cigar, NO cigarette — just ash with embers), and a single thin pale wisp of smoke rises vertically upward out of the ashtray bowl from the glowing embers into the air, ' +
      'ENVIRONMENT DEPTH — architectural richness in the back wall: the corner of a dark wood filing cabinet visible at one side of the frame, a framed decorative wall item (abstract shape only, no text) on the back wall, deep charcoal shadows in the room corners, the office feels like a real lived-in space not an empty void, ' +
      'deep teal and charcoal shadows surround the warm amber highlights from blinds and pendant, the scene fills the entire square frame edge to edge with NO white borders NO vignette, ' +
      'authority issuing a direct order, chain-of-command intensity, ' +
      'square full-bleed composition centered on the pointing finger with the full office environment as backdrop',
  },
  {
    type: 'go-dark',
    name: 'Go Dark',
    prompt:
      // Variant B iter 1 (2026-05-01): four corridor iterations all
      // wobbled between symmetric-corridor / figure-facing-camera
      // because the corridor framing has no narrative anchor that forces
      // back-to-camera. Pivot to the canonical noir idiom that DOES:
      // operative walking away into fog under a distant streetlight.
      // Imagen has overwhelming training data for this image — the
      // prior pulls TOWARD back-of-figure, not against it. Echoes Back
      // Channel's already-approved wet-noir-street vocabulary for deck
      // cohesion (Back Channel = at the booth; Go Dark = leaving).
      'first-person POV view from inside a dark wet city street at night, the camera is positioned a few steps behind a walking operative, looking forward down the street with them; slight fog and light rain hanging in the air, a single tall vintage streetlamp stands ahead in the middle distance casting a warm amber halo of light through the fog, ' +
      'ONE solitary operative in a long trench coat and fedora hat is walking AWAY from the viewer down the street toward the distant streetlamp, the operative is positioned mid-frame at medium-distance, slightly off-center, their entire body visible from behind, in mid-stride mid-step; ' +
      'we see ONLY the BACK of the operative — the curved back of the fedora hat brim from behind, the shoulders and back of the long trench coat, the legs walking forward away from us, the heels of shoes on wet pavement; we never see their face, never their front, never their profile, the operative is fully turned away from us walking toward the distant fog-shrouded streetlamp; ' +
      'the streetlamp ahead of the operative casts warm amber rim-light onto the back of the hat brim and the shoulders of the trench coat — only the silhouette outline catches the glow, the rest of the figure is dark; the operative is silhouetted against the bright fog-halo of the streetlamp; ' +
      'the wet pavement of the street reflects the streetlamp as long stretched amber smears running toward the operative\'s feet, foreshortened by perspective; the rain falls as fine diagonal lines crossing the amber halo; ' +
      'on both sides of the street: dark looming city architecture in deep silhouette — tall narrow buildings with rows of small dim windows, a fire escape ladder zig-zagging down one facade, a closed doorway in another, a narrow alley mouth disappearing into black; the buildings rise on both sides extending past the top of the view, two dark vertical masses with the bright fog-halo street running between them; ' +
      'CRITICAL: ONLY ONE PERSON in the entire image, ONLY ONE FIGURE, ONLY ONE OPERATIVE, the figure walking down the street is the ONLY human in the scene, no other figures in the windows or doorways or alleys, no second silhouette anywhere; ' +
      'CRITICAL: the operative is seen FROM BEHIND walking AWAY — their back to us, the streetlamp ahead of them — never frontal, never side profile, never iconic-hero pose; ' +
      'a single light source — the streetlamp ahead — illuminates the entire scene from front-distance; the foreground (where the camera is) is the darkest part of the frame, the operative is mid-tone silhouetted, the streetlamp halo is the brightest point; ' +
      'warm amber streetlamp accents on a cool deep teal and charcoal dominant palette, the foreground is nearly black, the fog catches the amber as a soft glowing halo; ' +
      'the scene fills the entire square frame edge to edge with NO white borders NO vignette NO padding, ' +
      'NO text NO letters NO words NO numbers NO writing anywhere, NO street signs NO neon signs NO storefront text, ' +
      'mid-century modern 1960s spy-film noir aesthetic, bold geometric angular style, flat illustration, ' +
      'the camera is positioned INSIDE this street, looking forward; the wet pavement extends from directly under the camera all the way to the streetlamp ahead and continues past it, the buildings on both sides extend up past the top of the view and down past the bottom, the rainy sky extends past the top, the camera captures only a portion of the scene with everything continuing beyond the visible area on every side; ' +
      'the scene fills the entire square frame edge to edge with NO white borders NO cream borders NO vignette NO padding NO matting',
  },
  {
    type: 'intel-briefing',
    name: 'Intel Briefing',
    prompt:
      // Iter 2: Watergate-era break-in visual — gloved hand holding a
      // miniature spy camera photographing classified documents on a desk,
      // pen-light beam illuminating from a low angle, filing cabinet
      // drawer cracked open in the background, dark office at night.
      // Peak espionage-gathering imagery, directly maps to the card\'s
      // "look at top 3 cards of the deck" mechanic.
      'a dramatic close-up overhead view of a dark office at night during a break-in, captured in the moment of espionage, ' +
      'a gloved hand holds a small silver miniature Minox-style spy camera hovering over a spread of classified paper documents laid out on the desk, the camera pointed straight down about to photograph the pages, ' +
      'a small silver pen-flashlight gripped in the other gloved hand casts a narrow amber beam across the documents from a low side angle, illuminating just the paper surface in a sharp wedge of warm light, ' +
      'in the background the dim shape of a metal filing cabinet has one drawer cracked open with folders visible, the rest of the room in deep charcoal shadow, ' +
      'the documents on the desk show rows of abstract horizontal line patterns suggesting paragraphs of text but absolutely no letters or words of any kind, a few of them are slightly askew as if recently rifled through, ' +
      'venetian blind shadow stripes fall diagonally across the back wall from an unseen window with streetlight outside, signature Archer venetian-blind lighting, ' +
      'the only warm light comes from the narrow flashlight beam on the documents, everything else is cool teal and deep charcoal shadow, ' +
      'Watergate-era 1970s spy break-in energy, photographing classified intelligence under a flashlight, ' +
      'the scene fills the entire square frame edge to edge with NO white borders NO vignette NO padding, ' +
      'NO text NO letters NO words NO numbers NO writing anywhere on the documents or camera or any surface, ' +
      'mid-century modern 1960s-1970s spy-film noir aesthetic, bold geometric angular style, flat illustration, ' +
      'square full-bleed composition centered on the gloved hands camera and illuminated documents',
  },
  {
    type: 'falsify-intel',
    name: 'Falsify Intel',
    prompt:
      // Iter 4: same late-night terminal scene, but the light source is now
      // a small articulating Anglepoise-style desk lamp (Pixar/Luxo shape)
      // positioned over the keyboard instead of a flashlight in the teeth.
      // Flashlight-in-mouth pose was ambiguous at card size — read as a
      // pipe/cigar. An articulating lamp is a mid-century design icon,
      // unmistakable in silhouette, and lets the operative's posture stay
      // clean.
      'a covert operative hunched forward at a vintage cathode ray tube computer terminal on a wooden desk in a dark room, ' +
      'a small articulating Anglepoise desk lamp with a conical metal hood on a spring-loaded jointed arm is bolted to the desk, its hood tilted down close over the keyboard casting a narrow cone of warm amber light onto the keys, ' +
      'both hands poised over the keys typing intently, ' +
      'the CRT terminal screen glows a soft teal green and displays ONLY abstract horizontal line patterns and geometric blocks, absolutely no letters or words or numbers or text of any kind on the screen, ' +
      'the room is mostly dark, lit only by the teal screen glow and the warm amber pool of lamp light on the keyboard, ' +
      'deep charcoal shadows swallowing the background, late-night covert infiltration energy, ' +
      'the operative is in partial silhouette with hard side lighting, nothing in the mouth, lips closed, ' +
      'a small stack of blank colored folders sits beside the terminal, completely blank with no labels or writing, ' +
      'mid-century modern 1960s retro computing aesthetic, chunky CRT housing and mechanical keyboard, ' +
      'warm amber lamp light as the dominant warm accent against a cool teal and deep charcoal palette, ' +
      'bold geometric angular style, flat illustration, ' +
      'square composition centered on the figure and terminal',
  },
  {
    type: 'burn-the-files',
    name: 'Burn the Files',
    prompt:
      // Iter 2: prior gen landed a tidy drawer fire that reads more like
      // "toasting marshmallows" than "destroying evidence under time
      // pressure." Card name is Burn the Files — the fire needs to be the
      // HERO of the composition, roaring out of the cabinet, papers
      // actively burning as they tumble, firelight repainting the scene.
      'a tall steel filing cabinet engulfed in a raging inferno, ' +
      'massive roaring flames in bright amber orange and yellow shoot upward from the open top drawer, tongues of fire climbing high and curling, licking into the upper portion of the frame, ' +
      'classified paper documents and manila folders tumble out of the drawer into the air, many of them actively on fire with blackened curled edges and small flames licking their surfaces, ' +
      'glowing orange embers and sparks scatter upward against the dark background, drifting with the heat, ' +
      'NO smoke, NO black smoke column, NO dark smoke plume anywhere in the image — only bright flames and embers above the cabinet, ' +
      'the floor around the cabinet is lit by a bright warm amber pool of firelight, ' +
      'the cabinet body itself glows red-hot along the top edge, its front face reflecting orange firelight, ' +
      'frantic evidence-destruction energy, the scramble to destroy everything before they arrive, ' +
      'deep charcoal and dark teal background lit dramatically from the fire, the scene fills the entire square frame edge to edge with NO white borders NO vignette, ' +
      'NO text NO letters NO words NO numbers NO writing on any of the papers or the cabinet or anywhere in the scene — the documents show abstract horizontal line patterns only, ' +
      'mid-century modern 1960s retro spy-agency aesthetic, bold geometric angular style, flat illustration, ' +
      'square full-bleed composition centered on the burning cabinet',
  },
  {
    type: 'back-channel',
    name: 'Back Channel',
    prompt:
      // Variant: 1960s phone booth on a dark city street at night. Narrative
      // move — "back channel" now tells a clandestine-call story through the
      // SCENE rather than through object anatomy. The phone inside the booth
      // is small and stylized, so anatomy risk is low. The amber glow of the
      // booth against the cool night street carries all the Archer mood.
      // Iter 12: full-bleed edge-to-edge (iter 11's win) plus the trench-
      // coated silhouette back inside the booth (iter 9's win). ONE sign on
      // the booth with the word TELEPHONE spelled explicitly, no secondary
      // street signs with text to mess up.
      'a classic 1960s outdoor glass telephone booth standing alone on a dark city street corner at night, ' +
      'the booth is a tall narrow rectangular box with glass walls on three sides and a folding door, its frame painted deep teal with warm red trim, ' +
      'the top of the booth has a single illuminated signboard with the word TELEPHONE spelled clearly in bold sans-serif capital letters — T, E, L, E, P, H, O, N, E — nine letters spelling TELEPHONE correctly, no other text anywhere, ' +
      'the interior of the booth is lit with a warm amber glow that spills out through the glass onto the wet pavement, ' +
      'a silhouetted figure in a long trench coat and fedora hat stands inside the booth facing the back wall with their back to the viewer, holding a rotary telephone receiver up to their ear, ' +
      'the figure is fully in dark silhouette, just a recognizable outline of shoulders hat and coat against the warm interior glow, ' +
      'a dark city skyline of tall rectangular buildings looms behind the booth in deep charcoal silhouette with small warm amber window lights, ' +
      'a parked vintage car in the middle distance, a single distant streetlamp casts a small amber pool of light, ' +
      'faint geometric rain streaks in the air, wet pavement with reflected amber highlights, ' +
      'cool teal and charcoal night palette with warm amber accents from the booth interior, building windows, and streetlamp, ' +
      'clandestine late-night phone call energy, anonymous figure calling from a public line you cannot trace, ' +
      'the dark night sky and city scene must fill the entire square frame edge to edge — NO white borders NO white edges NO vignette NO background padding, every corner of the frame contains night sky or buildings or pavement, ' +
      'the ONLY text anywhere in the image is the word TELEPHONE on the booth signboard, absolutely no other letters or words or numbers or signage on any other sign building or surface, ' +
      'mid-century modern 1960s spy-film noir aesthetic, bold geometric angular style, flat illustration, ' +
      'square full-bleed composition centered on the glowing phone booth',
  },
  {
    type: 'call-in-a-favor',
    name: 'Call in a Favor',
    prompt:
      // Iter 2: prior gen was a floating handshake with a cartoonishly
      // oversized playing card — literal but on-the-nose for a card-game
      // card AND no atmosphere. Pivot: dead-drop at a dim smoky bar
      // counter, matchbook slid across between two silhouetted figures,
      // amber backlit spirits behind, cigarette smoke haze. Pure Archer.
      'two 1960s mafia-looking men seated side by side on bar stools at a polished wooden bar counter at night, both with their backs to the viewer, ' +
      'the LEFT man wears a dark charcoal suit and a fedora, the RIGHT man is bald and wears a burnt-orange suit, two visually distinct men not twins, ' +
      'a small slim flat stack of hundred-dollar bills sits on the bar counter between them, resting directly on the polished wood, just sitting there — NO motion, NO streaks, NO speed lines, NO shadows-that-look-like-shapes, NO coaster NO placemat NO envelope beneath it, just plain cash on plain wood, ' +
      'a glass tumbler of amber whiskey with ice sits on the counter between them, ' +
      'warm amber backlit liquor bottles fill the shelves behind the bar, a single amber pendant lamp hangs over the counter, ' +
      'the scene is clean and simple — no smoke, no cigarettes, no clutter — just two guys, whiskey, and the cash slide, ' +
      'deep charcoal and dark teal shadows around the edges, warm amber and burnt orange dominant palette from the bar lights, ' +
      'clandestine late-night favor-asking energy, an unspoken debt changing hands, ' +
      'the scene fills the entire square frame edge to edge with NO white borders NO vignette NO padding, every corner contains bar atmosphere, ' +
      'NO text NO letters NO words NO numbers NO writing anywhere in the scene, no denominations no serial numbers, ' +
      'mid-century modern 1960s spy-film noir aesthetic, bold geometric angular style, flat illustration, ' +
      'square full-bleed composition centered on the cash brick mid-slide',
  },
  {
    type: 'intercepted',
    name: 'Intercepted',
    prompt:
      // Iter 13 clean rewrite. 12 prior iterations accumulated too much
      // conflicting text; Imagen kept zooming out, dropping props, and
      // rendering "HR" / "HR OFFICE" text banners. Stripped to minimum
      // viable prompt: ~5 short clauses, every element mentioned ONCE.
      // Dolores Grieves is a recurring BURNED NPC — Pam Poovey
      // archetype HR Director (Dash=Archer, Vera=Lana, Janet=Malory,
      // Dolores=Pam).
      'a 1960s spy agency HR office: a confident plus-sized young blonde woman in her late 20s (smooth youthful complexion, fresh face, NOT middle-aged, NOT older — she is young and in her prime) stands behind a wooden reception counter facing the viewer, she holds up a wooden clipboard with a BOLD RED X symbol stamped on the paper (two thick crossed diagonal strokes forming a geometric X mark, NOT letters) in one hand and gives a clear THUMBS-DOWN gesture with her other hand (closed fist, thumb pointing straight down), ' +
      'the woman is visually modeled on Pam Poovey from the animated show Archer — pale platinum-blonde hair in a high voluminous upswept pompadour-style quiff (volume swept back from her forehead), a smooth youthful face with subtle natural contouring (NO circular cheek blush marks, NO cartoon cheek-blush ovals, NO pink cheek spots, NO distinct oval shapes on the cheeks — her cheeks are smoothly integrated into her face with no separate circle-shape markings), small pale-blue eyes, a SINGLE DEFINED JAWLINE with no double chin and no sagging chin fold, slight confident smirk, broad-shouldered solid plus-sized body (she has mass and substance not softness, farm-strong not flabby), she wears a snug-fitting creamy tan cashmere sweater with a scoop neckline showing a modest hint of cleavage, a short pearl choker around her neck, and a small floral brooch at her chest, ' +
      'behind her a wall of dark mahogany filing cabinets, NO venetian blinds anywhere in the scene (no window with horizontal blind slats, no blind pattern on any wall, no light stripes, no striped shadows, no amber bands, no horizontal line patterns of any kind — just plain solid dark walls behind her), a brass pendant lamp hangs overhead and is the SOLE light source in the entire scene casting a single soft warm amber downward cone onto the counter and Dolores (no other light sources anywhere, no window light, no ambient glow from any other direction), a black rotary desk telephone and small metal inbox tray on the counter beside her, deep teal and charcoal shadows fill the corners of the room, ' +
      'ABSOLUTELY NO TEXT NO LETTERS NO WORDS NO NUMBERS NO TYPOGRAPHY anywhere in the scene on any surface — no writing on the counter, no writing on the cabinets, no name tags, no title cards, no signs, the only red mark in the image is the bold geometric X symbol on the clipboard paper, ' +
      'square full-bleed composition, the scene fills the entire frame edge to edge with no white borders and no vignette',
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not set.');
    process.exit(1);
  }

  // Parse --only flag
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const onlyTypes = onlyArg
    ? new Set(onlyArg.replace('--only=', '').split(','))
    : null;

  const cards = onlyTypes
    ? CARDS.filter((c) => onlyTypes.has(c.type))
    : CARDS;

  if (cards.length === 0) {
    console.error('ERROR: No matching card types found.');
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const ai = new GoogleGenAI({ apiKey });

  console.log(`\n=== BURNED — Card Illustration Generation ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Cards: ${cards.length}${onlyTypes ? ` (filtered: ${[...onlyTypes].join(', ')})` : ''}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  const results: Array<{ type: string; name: string; status: string }> = [];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const fullPrompt = STYLE_PREFIX + card.prompt;

    console.log(`[${i + 1}/${cards.length}] Generating ${card.name}...`);

    try {
      const response = await ai.models.generateImages({
        model: MODEL,
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '1:1',
          personGeneration: PersonGeneration.ALLOW_ADULT,
        },
      });

      const images = response.generatedImages;
      if (!images || images.length === 0) {
        console.error(`  FAILED: Safety filter or empty response.`);
        results.push({ type: card.type, name: card.name, status: 'FAILED' });
      } else {
        const buffer = Buffer.from(images[0].image!.imageBytes!, 'base64');
        const outPath = resolve(OUTPUT_DIR, `${card.type}.png`);
        await writeFile(outPath, buffer);
        console.log(`  Saved: ${outPath} (${buffer.length} bytes)`);
        results.push({ type: card.type, name: card.name, status: 'OK' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ERROR: ${msg}`);
      results.push({ type: card.type, name: card.name, status: 'ERROR' });
    }

    if (i < cards.length - 1) {
      console.log(`  Waiting ${INTER_CALL_DELAY_MS / 1000}s...`);
      await delay(INTER_CALL_DELAY_MS);
    }
  }

  console.log('\n=== Results ===');
  console.table(results);

  const failed = results.filter((r) => r.status !== 'OK').length;
  if (failed > 0) {
    console.log(`\n${failed} failed. Re-run with: --only=${results.filter(r => r.status !== 'OK').map(r => r.type).join(',')}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

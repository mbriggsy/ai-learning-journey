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
      // Iter 4 (2026-05-07): pivot to a different burned-narrative beat.
      // Iter 3 (rooftop flashbulb-discovery) shipped successfully but
      // Briggsy wanted to try the consequence beat instead of the
      // discovery beat — agent being escorted/loaded into the back of a
      // 1960s police cruiser. Same emotional payload (your cover is
      // blown, you're done) but rendered through the moment AFTER the
      // catch rather than the instant of capture. Tonally closer to
      // Archer's "Mother's people came for you" beats than the "frozen
      // at the bulb" iter 3.
      //
      // Iter 3 (rooftop flashbulb) prompt archived in commit history.
      // If iter 4 doesn't land, revert this block.
      //
      // Iter 1 archive: public/assets/cards/_archive/burned-2026-05-06-iter1-cone-truncation-rejected.webp
      // Iter 2 archive: public/assets/cards/_archive/burned-2026-05-06-iter2-operative-too-small-rejected.webp
      // Iter 17 (2026-05-07): pull camera back from iter 15-16 close-
      // crop so the REAR of the sedan (taillights, trunk silhouette,
      // bumper) is visible as spatial context. Iter 16 succeeded at
      // killing the quantum-door but cropped so close that the open
      // door read as the FRONT door (no rear-of-car visible to give
      // it spatial position as "the second door from the front").
      // Plus: push flat-illustration cel-shaded Archer style harder
      // — iter 16 went too painterly/dimensional, lost the cartoony
      // animated-frame feel of the rest of the deck.
      'a wet city street at night, mid-century 1960s noir scene rendered as a FLAT 2D ILLUSTRATION ANIMATED CEL — bold geometric angular shapes, flat color fills with minimal shading, deliberately stylized like a frame from a 1960s animated spy series, NOT photorealistic, NOT 3D rendered, NOT painterly with dimensional gradients. ' +
      'CAMERA POSITION — the camera is positioned BEHIND the parked sedan, looking forward at the REAR of the car from a few feet back at street level. The sedan is parked head-first away from the camera so we see the BACK of the car closest to us, with the body receding into the distance toward the front. This is a REAR-THREE-QUARTER view weighted heavily toward the rear of the vehicle. ' +
      'FOREGROUND ELEMENTS — closest to the camera in the foreground: the REAR BUMPER + TRUNK LID (closed) + TWO ROUND RED TAILLIGHTS glowing warm red, one at each rear corner of the trunk. The taillights are bright prominent red circles in the foreground. ' +
      'MID-GROUND ELEMENTS — the BACK-SEAT door of the sedan is SWUNG WIDE OPEN, hinged at its forward edge (the B-pillar) and swinging outward toward the camera. Because the back-seat is geometrically closest to the trunk, the back-seat door is the NEAREST door to the camera in the frame, prominently positioned in mid-ground. The dark amber-lit back-bench-seat interior is visible through the open doorway. ' +
      'BACKGROUND ELEMENTS — receding into the distance toward the front of the sedan: the FRONT-PASSENGER door (CLOSED, partially visible at distance), then the front fender, hood, and windshield disappearing into the misty perspective. The front of the car is small and distant, the back of the car is large and dominant in the frame. ' +
      'WHY THIS COMPOSITION KEEPS THE BACK-SEAT DOOR THE OPEN ONE — the camera is positioned behind the sedan, so the rear-of-car elements (bumper, taillights, trunk, back-seat door) are the prominent foreground/midground subjects. The front door is far in the distance, smaller and unimportant. The BACK-SEAT door is the dominant door in the frame and unambiguously the open one because it\'s the only door at this proximity to the camera. ' +
      'CRITICAL CAR ANATOMY — this is a 1960s 4-DOOR sedan viewed from BEHIND-AND-SLIGHTLY-OFFSET. On the visible side of the car there are EXACTLY TWO doors: the back-seat door (NEAR the camera, OPEN) and the front-passenger door (FAR from camera, CLOSED). The trunk is closed. The roof is bare smooth metal. ' +
      'OPEN DOOR ANATOMY — the open back-seat door is swung wide outward from the body, a distinct flat rectangular panel hanging outward from its hinge with the door handle visible on its outer face. Through the rectangular opening where the door used to cover, the dark upholstered back-bench-seat interior glows WARM AMBER from the dome light. The door panel and the opening are spatially distinct — the panel is to one side of the opening, the opening is the rectangular hole in the body. ' +
      'TWO FIGURES — camera positioned behind both figures looking forward at the parked sedan ahead. The two men walk together forward across wet pavement toward the parked sedan, both seen from behind with their backs to the viewer, faces hidden. ' +
      'COMPOSITION ACTION — the two figures walk forward, mid-stride, approaching the open back-seat door which sits ahead of them in the middle-background of the frame. They are NOT yet at the car; the open back-seat doorway is their destination a few steps ahead. ' +
      '(1) The first man wears a long dark trench coat and a dark grey fedora pulled low (brim covers his face). His hands are held together behind his back with simple steel handcuffs visible at the small of his back. He walks forward mid-stride, body upright. ' +
      '(2) The second man, in a sharp dark charcoal suit, dark narrow tie, and dark grey fedora, walks close beside the first, one hand resting on the first man\'s upper arm in a guiding gesture. Also seen from behind. ' +
      'AROUND THE FIGURES — wet asphalt under their feet reflecting warm amber from the open doorway and a distant streetlamp. Fine diagonal rain streaks. Faint mist. Dark city silhouette in the far background past the figures. ' +
      'Lighting: the warm amber rectangle of the open back-seat doorway is the brightest light in the scene, casting amber rim-light onto the figures\' backs and a warm pool on the wet pavement at their feet. A distant streetlamp halo in the upper background adds a secondary cool-amber accent. Cool deep teal and charcoal night palette with warm amber as the dominant accent. ' +
      'PER-CORNER COMPOSITION ANCHORS — the bottom-left corner contains wet asphalt reflections, the bottom-right corner contains the bottom edge of the open door OR wet pavement, the top-left corner contains dark city silhouette OR misty teal sky, the top-right corner contains the upper edge of the open doorway OR amber dome-light glow. Every corner of the rendered image contains scene content; never empty white space. ' +
      'CRITICAL ANTI-MATTE — rendered like a CINEMA FILM FRAME (edge-to-edge content), NOT like a postage stamp (with a white perimeter border), NOT like a framed art print (with a matte around it). NO white border, NO white edges, NO matte, NO vignette, NO padding, NO frame. The painted scene goes ALL THE WAY to every edge. ' +
      'CRITICAL — absolutely NO text, NO letters, NO words, NO numbers, NO writing, NO captions, NO banners, NO labels. ' +
      'No other figures, no faces visible, only the backs of the two men at the open doorway. ' +
      'mid-century modern 1960s spy-film noir aesthetic, bold geometric angular style, flat illustration, full-bleed square frame',
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
      // Iter 3 (2026-05-07): iter 2 shipped with a thin baked-in white
      // perimeter border that wasn't visible at preview size but read
      // clearly on the rendered card face (edge-pixel sampling: 96/96
      // near-white). Strengthen the anti-border directive using the
      // pattern that empirically worked for back-channel and burn iter3:
      // EVERY CORNER must contain a scene element by name. Imagen's
      // sky-heavy-illustration prior pulls toward a white frame; this
      // forces it to commit pixels at the perimeter to actual content.
      'CRITICAL — the scene fills the entire square frame edge to edge with absolutely NO white borders NO white edges NO white perimeter NO cream borders NO vignette NO padding NO matting NO frame, every single corner of the frame contains either dark teal twilight sky or geometric cloud silhouette or city-skyline building silhouette, the perimeter of the image at all four edges is sky or cloud or building — never empty white space, ' +
      'square full-bleed composition centered on the helicopter and descending rope',
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
      // FRESH START 2026-05-07: 10 iterations of camera-photographing-
      // documents fought Imagen's "render the iconic lens-side of a
      // camera" prior to a draw. The lens-barrel-protrusion variant
      // technically worked (lens points down) but produced weird
      // tubular gadgets. New concept entirely: the card mechanic is
      // "look at the top 3 cards of the deck" — direct visual metaphor
      // is a gloved hand lifting the top of three fanned classified
      // surveillance photos in a manila dossier folder. No camera, no
      // orientation problems, peak Mother\'s-office vocabulary.
      'a dramatic close-up overhead view of a polished mahogany desk in a dark 1960s spy-agency office at night. ' +
      'CENTERED ON THE DESK — an open manila dossier folder lying flat on the desk surface, with three classified surveillance photographs fanned out from the folder, each photo a slightly-overlapping rectangle of glossy black-and-white photographic paper, the three photos arranged in a tight overlapping fan with one photo in front and two slightly visible behind it. Each photograph shows an abstract human silhouette against a generic urban background — a figure in a trench coat seen from the side or behind, no faces, no identifying details. The surfaces of the photographs are entirely image (silhouette + background) — NO captions, NO labels, NO timestamps, NO text printed anywhere on any of the photographs. ' +
      'A single dark espionage-gloved hand enters the frame from the upper-right edge, lifting the corner of the FRONTMOST photograph in the fan with thumb and forefinger — the photograph is partially raised at one corner exposing a glimpse of the photograph beneath it. The gesture reads as covert peeking, examining what\'s underneath, taking a look at intel laid out for review. ' +
      'A brass pendant lamp hangs above the desk casting a warm amber pool of light directly onto the dossier and the fanned photographs. The lamp\'s light source is implied above the frame — the warm amber pool is centered on the photographs as the focal point. ' +
      'AROUND THE DOSSIER on the desk: a wax-stamped manila envelope partially visible at one edge, a brass paperweight or letter opener at another, faint cigarette smoke wisp rising from off-frame. The desk surface is dark polished mahogany with subtle wood grain. ' +
      'BACKGROUND — beyond the desk, deep charcoal shadow fills the rest of the office; faint diagonal venetian-blind shadow stripes fall across one corner of the desk surface from an unseen window with a streetlight outside, signature Archer-Mother-office lighting vocabulary. ' +
      'The photographs show abstract grayscale silhouettes only — no letters, no words, no faces, no recognizable identifying details. The dossier folder is plain manila, no text, no labels. The desk is bare wood, no text on any surface. ' +
      'CRITICAL — full-bleed square composition, every corner of the frame contains either dark mahogany desk surface or deep charcoal shadow; absolutely NO white borders, NO white edges, NO matte, NO vignette, NO padding, NO frame. The painted scene goes all the way to every edge. ' +
      'CRITICAL — absolutely NO text, NO letters, NO words, NO numbers, NO writing, NO captions, NO banners, NO labels anywhere in the scene on any surface — the dossier folder, the photographs, the envelope, the desk are all blank of any writing. ' +
      'cool deep teal and charcoal palette with the warm amber pendant-lamp pool on the photographs as the dominant accent, ' +
      'mid-century modern 1960s spy-film noir aesthetic, bold geometric angular style, flat illustration, full-bleed square frame, peak Mother\'s-office briefing vocabulary',
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
      'warm amber backlit liquor bottles fill the shelves behind the bar — the rows of backlit bottle shelves continue UNBROKEN all the way to BOTH the far-left and far-right edges of the frame, evenly lit corner to corner with no dark gaps, a single amber pendant lamp hangs over the counter, ' +
      'the scene is clean and simple — no smoke, no cigarettes, no clutter — just two guys, whiskey, and the cash slide, ' +
      'soft deep teal and charcoal tones confined to the lower corners only, kept as gentle gradients NEVER hard-edged shapes, warm amber and burnt orange dominant palette from the bar lights, ' +
      'clandestine late-night favor-asking energy, an unspoken debt changing hands, ' +
      'the scene fills the entire square frame edge to edge with NO white borders NO vignette NO padding, every corner contains bar atmosphere, ' +
      'NO dark angular wedge, NO diagonal shadow slab, NO black triangular panel, NO phantom door or wall edge cutting across or down onto the liquor shelves — the backbar shelving reads as one clean unbroken wall of bottles, ' +
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

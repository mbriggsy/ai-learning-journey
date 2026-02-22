/**
 * ============================================================================
 * PAC-MAN — Standalone Canvas-Based Game
 * ============================================================================
 *
 * ARCHITECTURE SPECIFICATION
 * --------------------------
 *
 * 1. MODULE BREAKDOWN
 *    ─────────────────
 *    The game is structured as a single-file vanilla JS application using ES6
 *    classes. Logical modules are separated by comments:
 *
 *    • Constants & Configuration — tile size, speeds, colours, scoring, timing
 *    • Tile Map — the classic 28×31 maze encoded as a 2D array
 *    • Data Structures / Classes — GameState, PacMan, Ghost
 *    • Initialisation — canvas setup, object creation, level reset
 *    • Game Loop — requestAnimationFrame-driven loop with delta-time
 *    • Update Logic — movement, collision detection, ghost AI, mode switching
 *    • Rendering — maze, pac-man, ghosts, HUD (score / lives / level)
 *    • Input Handling — keyboard events mapped to direction intents
 *    • Sound — lightweight wrapper (Web Audio API or no-op stubs)
 *    • Bootstrap — DOMContentLoaded wiring
 *
 * 2. DATA STRUCTURES
 *    ────────────────
 *    Tile values in the map array:
 *      0 = open path (no pellet)
 *      1 = wall
 *      2 = pellet (dot)
 *      3 = power pellet (energiser)
 *      4 = ghost house door
 *
 *    PacMan {x, y, direction, nextDirection, mouthAngle, mouthOpen, speed}
 *      • x/y are pixel positions (centre of sprite)
 *      • direction & nextDirection are {dx, dy} unit vectors
 *      • mouthAngle animates between 0 and PI/4
 *
 *    Ghost {name, x, y, startX, startY, direction, mode, color, dotColor,
 *           scatterTarget, speed, frightenedTimer, deadTarget, inHouse,
 *           dotCounter}
 *      • mode is one of: "scatter", "chase", "frightened", "dead"
 *      • scatterTarget is the fixed corner tile for scatter mode
 *      • deadTarget is the ghost-house entrance tile
 *
 *    GameState {score, lives, level, mode, modeTimer, modeIndex,
 *              frightenedTimer, globalDotCounter, pelletsRemaining,
 *              paused, gameOver, won}
 *      • mode is the current global ghost mode ("scatter" or "chase")
 *      • modeTimer counts down to the next scatter/chase switch
 *      • modeIndex tracks position in the scatter/chase schedule
 *
 * 3. GHOST AI MODES
 *    ──────────────
 *    Scatter  — each ghost targets its assigned corner of the maze
 *    Chase    — each ghost uses a unique targeting strategy:
 *               Blinky → pac-man's current tile
 *               Pinky  → 4 tiles ahead of pac-man
 *               Inky   → reflection of Blinky through 2 tiles ahead of pac-man
 *               Clyde  → pac-man if distance > 8, else scatter target
 *    Frightened — ghosts move randomly at intersections, can be eaten
 *    Dead     — eyes travel back to the ghost house via BFS shortest path
 *
 *    Mode transitions follow a timed schedule per level that alternates
 *    between scatter and chase phases, eventually staying in chase.
 *
 * 4. GAME LOOP DESIGN
 *    ─────────────────
 *    gameLoop(timestamp)
 *      ├─ compute dt (capped at 1/15 s to avoid spiral-of-death)
 *      ├─ update(dt)
 *      │   ├─ update mode timers / scatter-chase switching
 *      │   ├─ update pac-man position (wall check, tunnel wrap)
 *      │   ├─ eat pellets / power pellets
 *      │   ├─ update each ghost (AI target → BFS → move)
 *      │   ├─ checkCollisions (pac-man ↔ ghosts)
 *      │   ├─ checkWin (all pellets eaten)
 *      │   └─ checkDeath (ghost collision while not frightened)
 *      ├─ render()
 *      │   ├─ clear canvas
 *      │   ├─ renderMaze()
 *      │   ├─ renderPacMan()
 *      │   ├─ renderGhosts()
 *      │   └─ renderHUD()
 *      └─ requestAnimationFrame(gameLoop)
 *
 * 5. EVENT FLOW
 *    ──────────
 *    DOMContentLoaded
 *      → initGame() — create canvas context, build map, spawn entities
 *      → requestAnimationFrame(gameLoop)
 *
 *    keydown
 *      → handleInput(e) — set pacman.nextDirection; also handles pause
 *
 *    Ghost eaten → score += ghost multiplier, ghost.mode = "dead"
 *    All pellets eaten → checkWin() → next level or victory screen
 *    PacMan caught → lives--, resetPositions() or gameOver
 *
 * ============================================================================
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

/** Tile size in pixels */
const TILE_SIZE = 20;

/** Map dimensions */
const COLS = 28;
const ROWS = 31;

/** Canvas dimensions derived from map */
const CANVAS_WIDTH = COLS * TILE_SIZE;
const CANVAS_HEIGHT = ROWS * TILE_SIZE;

/** Direction vectors */
const DIR_UP    = { dx:  0, dy: -1 };
const DIR_DOWN  = { dx:  0, dy:  1 };
const DIR_LEFT  = { dx: -1, dy:  0 };
const DIR_RIGHT = { dx:  1, dy:  0 };
const DIR_NONE  = { dx:  0, dy:  0 };

/** Ghost names in order */
const GHOST_NAMES = ["blinky", "pinky", "inky", "clyde"];

/** Ghost body colours */
const GHOST_COLORS = {
    blinky: "#FF0000",
    pinky:  "#FFB8FF",
    inky:   "#00FFFF",
    clyde:  "#FFB852"
};

/** Frightened ghost colour */
const FRIGHTENED_COLOR = "#2121DE";
const FRIGHTENED_FLASH_COLOR = "#FFFFFF";

/** Ghost scatter-mode corner targets (tile col, tile row) */
const SCATTER_TARGETS = {
    blinky: { col: 25, row: 0  },
    pinky:  { col: 2,  row: 0  },
    inky:   { col: 27, row: 31 },
    clyde:  { col: 0,  row: 31 }
};

/** Ghost house entrance tile */
const GHOST_HOUSE_ENTRANCE = { col: 13, row: 12 };

/** Ghost starting positions (pixel centres) */
const GHOST_START_POSITIONS = {
    blinky: { col: 13, row: 11 },
    pinky:  { col: 13, row: 14 },
    inky:   { col: 11, row: 14 },
    clyde:  { col: 15, row: 14 }
};

/** Pac-Man starting position (tile) */
const PACMAN_START = { col: 13, row: 22 };

/** Score values */
const SCORE_PELLET = 10;
const SCORE_POWER_PELLET = 50;
const SCORE_GHOST = [200, 400, 800, 1600];

/** Extra life threshold */
const EXTRA_LIFE_SCORE = 10000;

/** Speed (pixels per second) — index by level (0-based, clamped) */
const PACMAN_SPEED   = [80, 90, 90, 90, 100];
const GHOST_SPEED    = [75, 85, 85, 85, 95];
const GHOST_FRIGHT_SPEED = [50, 55, 55, 60, 60];
const GHOST_DEAD_SPEED = 150;
const GHOST_TUNNEL_SPEED = [40, 45, 45, 50, 50];

/**
 * Scatter / Chase schedule per level (seconds).
 * Array of [mode, duration] pairs. Last entry has Infinity duration.
 * Index 0 = levels 1; index 1 = levels 2-4; index 2 = levels 5+.
 */
const MODE_SCHEDULE = [
    // Level 1
    [
        ["scatter", 7], ["chase", 20],
        ["scatter", 7], ["chase", 20],
        ["scatter", 5], ["chase", 20],
        ["scatter", 5], ["chase", Infinity]
    ],
    // Levels 2-4
    [
        ["scatter", 7], ["chase", 20],
        ["scatter", 7], ["chase", 20],
        ["scatter", 5], ["chase", 1033],
        ["scatter", 1/60], ["chase", Infinity]
    ],
    // Levels 5+
    [
        ["scatter", 5], ["chase", 20],
        ["scatter", 5], ["chase", 20],
        ["scatter", 5], ["chase", 1037],
        ["scatter", 1/60], ["chase", Infinity]
    ]
];

/** Frightened mode duration (seconds) per level (0-based) */
const FRIGHTENED_DURATION = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1, 0, 0];

/** Number of flashes before frightened ends */
const FRIGHTENED_FLASHES = 5;

/** Tunnel columns (wrapping) */
const TUNNEL_ROW = 14;
const TUNNEL_LEFT_COL = 0;
const TUNNEL_RIGHT_COL = 27;

// ============================================================================
// TILE MAP — Classic Pac-Man 28×31 layout
// ============================================================================
// 0 = open path (no pellet)
// 1 = wall
// 2 = pellet
// 3 = power pellet
// 4 = ghost house door

const ORIGINAL_MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
    [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
    [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
    [1,1,1,1,1,1,2,1,1,0,1,1,1,4,4,1,1,1,0,1,1,2,1,1,1,1,1,1],
    [1,1,1,1,1,1,2,0,0,0,1,0,0,0,0,0,0,1,0,0,0,2,1,1,1,1,1,1],
    [0,0,0,0,0,0,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,0,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
    [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
    [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
    [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
    [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
    [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];

// ============================================================================
// GLOBAL STATE
// ============================================================================

/** @type {CanvasRenderingContext2D} */
let ctx = null;

/** @type {HTMLCanvasElement} */
let canvas = null;

/** Current tile map (mutable copy per level) */
let map = [];

/** @type {GameState} */
let gameState = null;

/** @type {PacMan} */
let pacman = null;

/** @type {Ghost[]} */
let ghosts = [];

/** Timestamp of the previous frame */
let lastTimestamp = 0;

/** Ghost-eat multiplier resets each power pellet */
let ghostEatMultiplier = 0;

/** Global dot counter for ghost house exit */
let globalDotCounter = 0;

// ============================================================================
// CLASSES
// ============================================================================

/**
 * Tracks global game state: score, lives, level, ghost-mode schedule, timers.
 */
class GameState {
    constructor() {
        /** @type {number} Current score */
        this.score = 0;

        /** @type {number} Remaining lives */
        this.lives = 3;

        /** @type {number} Current level (0-based) */
        this.level = 0;

        /** @type {string} Current global ghost mode — "scatter" or "chase" */
        this.mode = "scatter";

        /** @type {number} Seconds remaining in current mode phase */
        this.modeTimer = 0;

        /** @type {number} Index into the MODE_SCHEDULE for the current level */
        this.modeIndex = 0;

        /** @type {number} Seconds remaining in frightened mode (0 = not active) */
        this.frightenedTimer = 0;

        /** @type {number} Total pellets remaining on this level */
        this.pelletsRemaining = 0;

        /** @type {boolean} Whether the game is paused */
        this.paused = false;

        /** @type {boolean} Whether the game is over (no lives left) */
        this.gameOver = false;

        /** @type {boolean} Whether the player has cleared all levels */
        this.won = false;

        /** @type {boolean} Whether an extra life has been awarded */
        this.extraLifeAwarded = false;
    }
}

/**
 * The player-controlled Pac-Man entity.
 */
class PacMan {
    constructor() {
        /** @type {number} X pixel position (centre of sprite) */
        this.x = 0;

        /** @type {number} Y pixel position (centre of sprite) */
        this.y = 0;

        /** @type {{dx:number, dy:number}} Current movement direction */
        this.direction = DIR_NONE;

        /** @type {{dx:number, dy:number}} Buffered next direction from input */
        this.nextDirection = DIR_NONE;

        /** @type {number} Current mouth opening angle (radians, 0..PI/4) */
        this.mouthAngle = 0;

        /** @type {boolean} Whether the mouth is opening (true) or closing */
        this.mouthOpening = true;

        /** @type {number} Movement speed in pixels per second */
        this.speed = 0;
    }
}

/**
 * A ghost enemy with AI-driven movement and multiple behavioural modes.
 */
class Ghost {
    /**
     * @param {string} name — one of "blinky", "pinky", "inky", "clyde"
     */
    constructor(name) {
        /** @type {string} Ghost identifier */
        this.name = name;

        /** @type {number} X pixel position (centre of sprite) */
        this.x = 0;

        /** @type {number} Y pixel position (centre of sprite) */
        this.y = 0;

        /** @type {number} Starting X pixel position (for resets) */
        this.startX = 0;

        /** @type {number} Starting Y pixel position (for resets) */
        this.startY = 0;

        /** @type {{dx:number, dy:number}} Current movement direction */
        this.direction = DIR_LEFT;

        /** @type {string} Current AI mode: "scatter"|"chase"|"frightened"|"dead" */
        this.mode = "scatter";

        /** @type {string} CSS colour for this ghost */
        this.color = GHOST_COLORS[name];

        /** @type {{col:number, row:number}} Fixed scatter-mode target tile */
        this.scatterTarget = SCATTER_TARGETS[name];

        /** @type {number} Movement speed in pixels per second */
        this.speed = 0;

        /** @type {boolean} Whether the ghost is still inside the ghost house */
        this.inHouse = false;

        /** @type {number} Dot counter controlling when ghost leaves the house */
        this.dotCounter = 0;

        /** @type {number} Dot limit — ghost exits house after this many dots eaten */
        this.dotLimit = 0;

        /** @type {number} Tile col where direction was last chosen (prevents oscillation) */
        this.lastPickedTileCol = -1;

        /** @type {number} Tile row where direction was last chosen (prevents oscillation) */
        this.lastPickedTileRow = -1;
    }
}

// ============================================================================
// INITIALISATION
// ============================================================================

/**
 * Set up the canvas, create game objects, and start the game loop.
 * Called once on DOMContentLoaded.
 */
function initGame() {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    canvas.width = COLS * TILE_SIZE;
    canvas.height = (ROWS + 2) * TILE_SIZE;

    gameState = new GameState();
    initLevel();
    lastTimestamp = 0;
    requestAnimationFrame(gameLoop);
}

/**
 * Initialise (or reinitialise) the current level:
 * deep-copy the map, count pellets, create/reset PacMan and Ghosts.
 */
function initLevel() {
    map = JSON.parse(JSON.stringify(ORIGINAL_MAP));

    gameState.pelletsRemaining = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (map[r][c] === 2 || map[r][c] === 3) {
                gameState.pelletsRemaining++;
            }
        }
    }

    pacman = new PacMan();
    const pacStart = tileToCentre(PACMAN_START.col, PACMAN_START.row);
    pacman.x = pacStart.x;
    pacman.y = pacStart.y;
    pacman.direction = DIR_RIGHT;
    pacman.nextDirection = DIR_RIGHT;
    pacman.speed = getPacManSpeed(gameState.level);

    ghosts = [];
    const dotLimits = { blinky: 0, pinky: 0, inky: 30, clyde: 60 };
    for (const name of GHOST_NAMES) {
        const ghost = new Ghost(name);
        const pos = GHOST_START_POSITIONS[name];
        const centre = tileToCentre(pos.col, pos.row);
        ghost.x = centre.x;
        ghost.y = centre.y;
        ghost.startX = centre.x;
        ghost.startY = centre.y;
        ghost.speed = getGhostSpeed(gameState.level, "scatter");
        ghost.inHouse = (name !== "blinky");
        ghost.dotLimit = dotLimits[name];
        ghost.dotCounter = 0;
        ghost.mode = "scatter";
        ghost.direction = ghost.inHouse ? DIR_DOWN : DIR_LEFT;
        ghost.lastPickedTileCol = -1;
        ghost.lastPickedTileRow = -1;
        ghosts.push(ghost);
    }

    const schedule = getModeSchedule(gameState.level);
    gameState.modeIndex = 0;
    gameState.mode = schedule[0][0];
    gameState.modeTimer = schedule[0][1];
    gameState.frightenedTimer = 0;
    ghostEatMultiplier = 0;
    globalDotCounter = 0;
}

// ============================================================================
// GAME LOOP
// ============================================================================

/**
 * Main loop driven by requestAnimationFrame.
 * Computes delta-time, then calls update() and render().
 *
 * @param {DOMHighResTimeStamp} timestamp — provided by rAF
 */
function gameLoop(timestamp) {
    if (lastTimestamp === 0) {
        lastTimestamp = timestamp;
    }
    let dt = (timestamp - lastTimestamp) / 1000;
    if (dt > 1 / 15) dt = 1 / 15;
    lastTimestamp = timestamp;

    if (!gameState.paused && !gameState.gameOver && !gameState.won) {
        update(dt);
    }

    render();
    requestAnimationFrame(gameLoop);
}

// ============================================================================
// UPDATE LOGIC
// ============================================================================

/**
 * Advance the game simulation by dt seconds.
 *
 * @param {number} dt — elapsed time in seconds since last frame
 */
function update(dt) {
    updateModeTimers(dt);
    movePacMan(dt);

    // Animate mouth
    const mouthSpeed = 8;
    if (pacman.mouthOpening) {
        pacman.mouthAngle += mouthSpeed * dt;
        if (pacman.mouthAngle >= Math.PI / 4) {
            pacman.mouthAngle = Math.PI / 4;
            pacman.mouthOpening = false;
        }
    } else {
        pacman.mouthAngle -= mouthSpeed * dt;
        if (pacman.mouthAngle <= 0) {
            pacman.mouthAngle = 0;
            pacman.mouthOpening = true;
        }
    }

    eatPellet();

    for (const ghost of ghosts) {
        updateGhostAI(ghost, dt);
    }

    checkCollisions();
    checkWin();
}

/**
 * Move Pac-Man by his speed * dt, handling wall collisions and tunnel wrap.
 *
 * @param {number} dt — elapsed seconds
 */
function movePacMan(dt) {
    const tileCentre = tileToCentre(
        Math.floor(pacman.x / TILE_SIZE),
        Math.floor(pacman.y / TILE_SIZE)
    );
    const distToCentre = Math.abs(pacman.x - tileCentre.x) + Math.abs(pacman.y - tileCentre.y);

    if (distToCentre < 2) {
        // At tile centre — try to turn
        if (pacman.nextDirection.dx !== 0 || pacman.nextDirection.dy !== 0) {
            if (canMove(tileCentre.x, tileCentre.y, pacman.nextDirection)) {
                // Only snap to tile centre when actually changing direction;
                // snapping every frame while going straight causes oscillation.
                if (pacman.nextDirection.dx !== pacman.direction.dx ||
                    pacman.nextDirection.dy !== pacman.direction.dy) {
                    pacman.x = tileCentre.x;
                    pacman.y = tileCentre.y;
                }
                pacman.direction = pacman.nextDirection;
            }
        }

        if (!canMove(tileCentre.x, tileCentre.y, pacman.direction)) {
            pacman.x = tileCentre.x;
            pacman.y = tileCentre.y;
            return;
        }
    }

    if (pacman.direction.dx === 0 && pacman.direction.dy === 0) return;

    pacman.x += pacman.direction.dx * pacman.speed * dt;
    pacman.y += pacman.direction.dy * pacman.speed * dt;

    // Tunnel wrap
    if (pacman.x < 0) pacman.x += CANVAS_WIDTH;
    if (pacman.x >= CANVAS_WIDTH) pacman.x -= CANVAS_WIDTH;

    // Wall collision: snap to tile centre if we moved into a wall
    const nextTile = pixelToTile(
        pacman.x + pacman.direction.dx * (TILE_SIZE / 2),
        pacman.y + pacman.direction.dy * (TILE_SIZE / 2)
    );
    if (nextTile.col >= 0 && nextTile.col < COLS && nextTile.row >= 0 && nextTile.row < ROWS) {
        if (map[nextTile.row][nextTile.col] === 1) {
            const snapped = tileToCentre(
                Math.floor(pacman.x / TILE_SIZE),
                Math.floor(pacman.y / TILE_SIZE)
            );
            pacman.x = snapped.x;
            pacman.y = snapped.y;
        }
    }
}

/**
 * Check if a given pixel-centre position can move in a direction
 * (i.e. the destination tile is not a wall).
 *
 * @param {number} x — pixel x
 * @param {number} y — pixel y
 * @param {{dx:number,dy:number}} dir — direction vector
 * @returns {boolean}
 */
function canMove(x, y, dir) {
    const targetX = x + dir.dx * TILE_SIZE / 2 + dir.dx;
    const targetY = y + dir.dy * TILE_SIZE / 2 + dir.dy;
    const tile = pixelToTile(targetX, targetY);

    // Allow tunnel wrap
    if (tile.col < 0 || tile.col >= COLS) return true;
    if (tile.row < 0 || tile.row >= ROWS) return false;

    const tileVal = map[tile.row][tile.col];
    if (tileVal === 1) return false;
    if (tileVal === 4) return false; // Pac-Man cannot enter ghost house door
    return true;
}

/**
 * Consume the pellet (if any) at Pac-Man's current tile.
 * Awards score and triggers frightened mode for power pellets.
 */
function eatPellet() {
    const tile = pixelToTile(pacman.x, pacman.y);
    if (tile.row < 0 || tile.row >= ROWS || tile.col < 0 || tile.col >= COLS) return;

    const tileVal = map[tile.row][tile.col];
    if (tileVal === 2) {
        gameState.score += SCORE_PELLET;
        map[tile.row][tile.col] = 0;
        gameState.pelletsRemaining--;
        globalDotCounter++;
        playSound("chomp");
    } else if (tileVal === 3) {
        gameState.score += SCORE_POWER_PELLET;
        map[tile.row][tile.col] = 0;
        gameState.pelletsRemaining--;
        globalDotCounter++;
        activateFrightenedMode();
    }

    if (gameState.score >= EXTRA_LIFE_SCORE && !gameState.extraLifeAwarded) {
        gameState.lives++;
        gameState.extraLifeAwarded = true;
    }
}

/**
 * Activate frightened mode on all non-dead ghosts, reset eat multiplier.
 */
function activateFrightenedMode() {
    gameState.frightenedTimer = getFrightenedDuration(gameState.level);
    ghostEatMultiplier = 0;
    for (const ghost of ghosts) {
        if (ghost.mode !== "dead") {
            ghost.mode = "frightened";
            // Reverse direction
            ghost.direction = { dx: -ghost.direction.dx, dy: -ghost.direction.dy };
            // Force direction re-evaluation at the current tile so the ghost
            // doesn't coast through its last tile centre and into a wall.
            ghost.lastPickedTileCol = -1;
            ghost.lastPickedTileRow = -1;
        }
    }
}

/**
 * Update mode timers and handle scatter ↔ chase transitions.
 *
 * @param {number} dt — elapsed seconds
 */
function updateModeTimers(dt) {
    if (gameState.frightenedTimer > 0) {
        gameState.frightenedTimer -= dt;
        if (gameState.frightenedTimer <= 0) {
            gameState.frightenedTimer = 0;
            // Restore ghosts to current scatter/chase mode
            for (const ghost of ghosts) {
                if (ghost.mode === "frightened") {
                    ghost.mode = gameState.mode;
                }
            }
        }
    } else {
        gameState.modeTimer -= dt;
        if (gameState.modeTimer <= 0) {
            const schedule = getModeSchedule(gameState.level);
            gameState.modeIndex++;
            if (gameState.modeIndex >= schedule.length) {
                gameState.modeIndex = schedule.length - 1;
            }
            gameState.mode = schedule[gameState.modeIndex][0];
            gameState.modeTimer = schedule[gameState.modeIndex][1];

            // Switch all non-frightened, non-dead ghosts and reverse their direction
            for (const ghost of ghosts) {
                if (ghost.mode !== "frightened" && ghost.mode !== "dead" && !ghost.inHouse) {
                    ghost.mode = gameState.mode;
                    ghost.direction = { dx: -ghost.direction.dx, dy: -ghost.direction.dy };
                }
            }
        }
    }
}

// ============================================================================
// GHOST AI
// ============================================================================

/**
 * Run the AI for a single ghost: determine target, pick direction, move.
 *
 * @param {Ghost} ghost
 * @param {number} dt — elapsed seconds
 */
function updateGhostAI(ghost, dt) {
    // Update speed based on mode
    if (ghost.mode === "dead") {
        ghost.speed = GHOST_DEAD_SPEED;
    } else if (ghost.mode === "frightened") {
        ghost.speed = getGhostSpeed(gameState.level, "frightened");
    } else {
        ghost.speed = getGhostSpeed(gameState.level, ghost.mode);
    }

    // Check if in tunnel for speed reduction
    const ghostTile = pixelToTile(ghost.x, ghost.y);
    if (ghostTile.row === TUNNEL_ROW && (ghostTile.col <= 5 || ghostTile.col >= 22)) {
        if (ghost.mode !== "dead") {
            ghost.speed = GHOST_TUNNEL_SPEED[Math.min(gameState.level, GHOST_TUNNEL_SPEED.length - 1)];
        }
    }

    if (ghost.inHouse) {
        // Check if ghost should exit
        if (ghost.dotLimit <= globalDotCounter) {
            // Move toward ghost house entrance
            const entranceCentre = tileToCentre(GHOST_HOUSE_ENTRANCE.col, GHOST_HOUSE_ENTRANCE.row);
            // First move to the centre column
            const centreX = tileToCentre(13, 14).x;
            if (Math.abs(ghost.x - centreX) > 1) {
                ghost.x += (centreX > ghost.x ? 1 : -1) * ghost.speed * dt;
            } else {
                ghost.x = centreX;
                // Now move up toward the entrance
                // Exit to one tile ABOVE the door (row 11) so pickDirection
                // finds open corridor rather than snapping back into the house.
                if (ghost.y > entranceCentre.y - TILE_SIZE) {
                    ghost.y -= ghost.speed * dt;
                } else {
                    // Exited the house — placed at tile (13, 11), open corridor
                    ghost.y = entranceCentre.y - TILE_SIZE;
                    ghost.x = entranceCentre.x;
                    ghost.inHouse = false;
                    ghost.mode = gameState.frightenedTimer > 0 ? "frightened" : gameState.mode;
                    ghost.direction = DIR_LEFT;
                    ghost.lastPickedTileCol = -1;
                    ghost.lastPickedTileRow = -1;
                }
            }
        } else {
            // Bob up and down inside the house
            ghost.y += ghost.direction.dy * 30 * dt;
            const homeCentre = tileToCentre(GHOST_START_POSITIONS[ghost.name].col, GHOST_START_POSITIONS[ghost.name].row);
            if (ghost.y < homeCentre.y - 5) {
                ghost.direction = DIR_DOWN;
            } else if (ghost.y > homeCentre.y + 5) {
                ghost.direction = DIR_UP;
            }
        }
        return;
    }

    if (ghost.mode === "dead") {
        // Move toward ghost house entrance
        const entranceCentre = tileToCentre(GHOST_HOUSE_ENTRANCE.col, GHOST_HOUSE_ENTRANCE.row);
        const distToEntrance = Math.abs(ghost.x - entranceCentre.x) + Math.abs(ghost.y - entranceCentre.y);

        if (distToEntrance < 2) {
            // Enter the house
            ghost.inHouse = true;
            ghost.mode = "scatter";
            ghost.x = entranceCentre.x;
            ghost.y = entranceCentre.y + TILE_SIZE * 2;
            ghost.direction = DIR_UP;
            ghost.dotLimit = 0; // Exit immediately
            return;
        }

        // Use greedy direction picking toward entrance
        const target = GHOST_HOUSE_ENTRANCE;
        const tileCentre = tileToCentre(ghostTile.col, ghostTile.row);
        const distTC = Math.abs(ghost.x - tileCentre.x) + Math.abs(ghost.y - tileCentre.y);

        if (distTC < 2 && (ghostTile.col !== ghost.lastPickedTileCol ||
                            ghostTile.row !== ghost.lastPickedTileRow)) {
            ghost.x = tileCentre.x;
            ghost.y = tileCentre.y;
            ghost.lastPickedTileCol = ghostTile.col;
            ghost.lastPickedTileRow = ghostTile.row;
            const newDir = pickDirection(ghost, target, true);
            ghost.direction = newDir;
        }

        ghost.x += ghost.direction.dx * ghost.speed * dt;
        ghost.y += ghost.direction.dy * ghost.speed * dt;

        // Tunnel wrap
        if (ghost.x < 0) ghost.x += CANVAS_WIDTH;
        if (ghost.x >= CANVAS_WIDTH) ghost.x -= CANVAS_WIDTH;
        return;
    }

    // Normal movement (scatter/chase/frightened)
    const tileCentre = tileToCentre(ghostTile.col, ghostTile.row);
    const distTC = Math.abs(ghost.x - tileCentre.x) + Math.abs(ghost.y - tileCentre.y);

    if (distTC < 2 && (ghostTile.col !== ghost.lastPickedTileCol ||
                        ghostTile.row !== ghost.lastPickedTileRow)) {
        ghost.x = tileCentre.x;
        ghost.y = tileCentre.y;
        ghost.lastPickedTileCol = ghostTile.col;
        ghost.lastPickedTileRow = ghostTile.row;

        if (ghost.mode === "frightened") {
            // Random direction
            const dirs = [DIR_UP, DIR_LEFT, DIR_DOWN, DIR_RIGHT];
            const validDirs = [];
            for (const d of dirs) {
                if (d.dx === -ghost.direction.dx && d.dy === -ghost.direction.dy) continue;
                const nc = ghostTile.col + d.dx;
                const nr = ghostTile.row + d.dy;
                if (isWalkable(nc, nr, ghost)) {
                    validDirs.push(d);
                }
            }
            if (validDirs.length > 0) {
                ghost.direction = validDirs[Math.floor(Math.random() * validDirs.length)];
            } else {
                // No forward options — allow reverse rather than passing through a wall
                const rc = ghostTile.col - ghost.direction.dx;
                const rr = ghostTile.row - ghost.direction.dy;
                if (isWalkable(rc, rr, ghost)) {
                    ghost.direction = { dx: -ghost.direction.dx, dy: -ghost.direction.dy };
                }
            }
        } else {
            const target = getGhostTarget(ghost);
            ghost.direction = pickDirection(ghost, target, false);
        }
    }

    ghost.x += ghost.direction.dx * ghost.speed * dt;
    ghost.y += ghost.direction.dy * ghost.speed * dt;

    // Tunnel wrap
    if (ghost.x < 0) ghost.x += CANVAS_WIDTH;
    if (ghost.x >= CANVAS_WIDTH) ghost.x -= CANVAS_WIDTH;
}

/**
 * Pick the best direction for a ghost toward a target tile using greedy selection.
 *
 * @param {Ghost} ghost
 * @param {{col:number, row:number}} targetTile
 * @param {boolean} isDead — whether the ghost is dead (can pass through door)
 * @returns {{dx:number, dy:number}}
 */
function pickDirection(ghost, targetTile, isDead) {
    const ghostTile = pixelToTile(ghost.x, ghost.y);
    const dirs = [DIR_UP, DIR_LEFT, DIR_DOWN, DIR_RIGHT];
    let bestDir = ghost.direction;
    let bestDist = Infinity;

    for (const d of dirs) {
        // Cannot reverse
        if (d.dx === -ghost.direction.dx && d.dy === -ghost.direction.dy) continue;

        const nc = ghostTile.col + d.dx;
        const nr = ghostTile.row + d.dy;

        // Check if walkable
        if (!isWalkableForGhost(nc, nr, ghost, isDead)) continue;

        // No-up zones: ghosts cannot go up near ghost house
        if (d.dy === -1 && !isDead) {
            if ((ghostTile.row === 12 || ghostTile.row === 24) &&
                (ghostTile.col >= 12 && ghostTile.col <= 15)) {
                continue;
            }
        }

        const dist = distSq({ col: nc, row: nr }, targetTile);
        if (dist < bestDist) {
            bestDist = dist;
            bestDir = d;
        }
    }

    return bestDir;
}

/**
 * Check whether a tile is walkable for a ghost.
 *
 * @param {number} col
 * @param {number} row
 * @param {Ghost} ghost
 * @param {boolean} isDead
 * @returns {boolean}
 */
function isWalkableForGhost(col, row, ghost, isDead) {
    // Allow tunnel
    if (col < 0 || col >= COLS) return true;
    if (row < 0 || row >= ROWS) return false;

    const tileVal = map[row][col];
    if (tileVal === 1) return false;
    if (tileVal === 4) return isDead || ghost.inHouse;
    return true;
}

/**
 * Compute the target tile for a ghost based on its current mode.
 *
 * @param {Ghost} ghost
 * @returns {{col:number, row:number}} target tile coordinates
 */
function getGhostTarget(ghost) {
    if (ghost.mode === "scatter") {
        return ghost.scatterTarget;
    }

    if (ghost.mode === "dead") {
        return GHOST_HOUSE_ENTRANCE;
    }

    // Chase mode
    const pacTile = pixelToTile(pacman.x, pacman.y);

    switch (ghost.name) {
        case "blinky":
            return pacTile;

        case "pinky": {
            let targetCol = pacTile.col + pacman.direction.dx * 4;
            let targetRow = pacTile.row + pacman.direction.dy * 4;
            // Reproduce the original overflow bug for UP direction
            if (pacman.direction.dy === -1) {
                targetCol -= 4;
            }
            return { col: targetCol, row: targetRow };
        }

        case "inky": {
            // 2 tiles ahead of pac-man
            let aheadCol = pacTile.col + pacman.direction.dx * 2;
            let aheadRow = pacTile.row + pacman.direction.dy * 2;
            if (pacman.direction.dy === -1) {
                aheadCol -= 2;
            }
            // Find blinky
            const blinky = ghosts[0];
            const blinkyTile = pixelToTile(blinky.x, blinky.y);
            // Reflect: target = ahead + (ahead - blinky)
            return {
                col: aheadCol + (aheadCol - blinkyTile.col),
                row: aheadRow + (aheadRow - blinkyTile.row)
            };
        }

        case "clyde": {
            const d = distSq(pixelToTile(ghost.x, ghost.y), pacTile);
            if (d > 64) {
                return pacTile;
            }
            return ghost.scatterTarget;
        }

        default:
            return ghost.scatterTarget;
    }
}

/**
 * Use BFS (breadth-first search) from the ghost's current tile to find
 * the best next direction toward the target tile.
 *
 * Ghosts cannot reverse direction (except on mode switches).
 * At each intersection the ghost picks the neighbour tile closest
 * to the target (Euclidean distance), with tie-breaking priority:
 * UP > LEFT > DOWN > RIGHT.
 *
 * @param {Ghost} ghost
 * @param {{col:number, row:number}} targetTile
 * @returns {{dx:number, dy:number}} the chosen direction
 */
function bfsNextDirection(ghost, targetTile) {
    return pickDirection(ghost, targetTile, ghost.mode === "dead");
}

/**
 * Check whether a tile is walkable for a ghost.
 *
 * @param {number} col
 * @param {number} row
 * @param {Ghost} ghost — needed to check ghost-house-door permeability
 * @returns {boolean}
 */
function isWalkable(col, row, ghost) {
    return isWalkableForGhost(col, row, ghost, ghost.mode === "dead");
}

// ============================================================================
// COLLISION DETECTION
// ============================================================================

/**
 * Check for collisions between Pac-Man and every ghost.
 * If a ghost is frightened → eat it. Otherwise → Pac-Man dies.
 */
function checkCollisions() {
    const pacTile = pixelToTile(pacman.x, pacman.y);

    for (const ghost of ghosts) {
        if (ghost.inHouse) continue;

        const ghostTile = pixelToTile(ghost.x, ghost.y);

        if (pacTile.col === ghostTile.col && pacTile.row === ghostTile.row) {
            if (ghost.mode === "frightened") {
                ghostEatMultiplier++;
                gameState.score += SCORE_GHOST[Math.min(ghostEatMultiplier - 1, 3)];
                ghost.mode = "dead";
                playSound("eatGhost");
            } else if (ghost.mode !== "dead") {
                checkDeath();
                return;
            }
        }
    }
}

/**
 * Handle Pac-Man being caught by a ghost: lose a life or game over.
 */
function checkDeath() {
    gameState.lives--;
    playSound("death");
    if (gameState.lives <= 0) {
        gameState.gameOver = true;
    } else {
        resetPositions();
    }
}

/**
 * Check if all pellets have been eaten, advancing to the next level.
 */
function checkWin() {
    if (gameState.pelletsRemaining === 0 && !gameState.gameOver) {
        gameState.level++;
        if (gameState.level >= 5) {
            gameState.won = true;
        } else {
            initLevel();
        }
    }
}

/**
 * Reset Pac-Man and all ghosts to their starting positions
 * without resetting the map or score.
 */
function resetPositions() {
    const pacStart = tileToCentre(PACMAN_START.col, PACMAN_START.row);
    pacman.x = pacStart.x;
    pacman.y = pacStart.y;
    pacman.direction = DIR_NONE;
    pacman.nextDirection = DIR_NONE;
    pacman.speed = getPacManSpeed(gameState.level);

    const dotLimits = { blinky: 0, pinky: 0, inky: 30, clyde: 60 };
    for (const ghost of ghosts) {
        const pos = GHOST_START_POSITIONS[ghost.name];
        const centre = tileToCentre(pos.col, pos.row);
        ghost.x = centre.x;
        ghost.y = centre.y;
        ghost.inHouse = (ghost.name !== "blinky");
        ghost.mode = "scatter";
        ghost.direction = ghost.inHouse ? DIR_DOWN : DIR_LEFT;
        ghost.lastPickedTileCol = -1;
        ghost.lastPickedTileRow = -1;
        ghost.dotLimit = dotLimits[ghost.name];
        ghost.dotCounter = 0;
    }

    const schedule = getModeSchedule(gameState.level);
    gameState.modeIndex = 0;
    gameState.mode = schedule[0][0];
    gameState.modeTimer = schedule[0][1];
    gameState.frightenedTimer = 0;
    ghostEatMultiplier = 0;
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Clear the canvas and draw all game elements.
 */
function render() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    renderMaze();
    renderPacMan();
    renderGhosts();
    renderHUD();

    if (gameState.paused) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#FFF";
        ctx.font = "bold 36px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
    }

    if (gameState.gameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#FF0000";
        ctx.font = "bold 36px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = "#FFF";
        ctx.font = "20px 'Courier New', monospace";
        ctx.fillText("Score: " + gameState.score, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText("Press Enter to restart", canvas.width / 2, canvas.height / 2 + 50);
    }

    if (gameState.won) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 36px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText("YOU WIN!", canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = "#FFF";
        ctx.font = "20px 'Courier New', monospace";
        ctx.fillText("Score: " + gameState.score, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText("Press Enter to restart", canvas.width / 2, canvas.height / 2 + 50);
    }
}

/**
 * Draw the maze: walls as rounded-rect blocks, pellets as circles,
 * power pellets as larger blinking circles, ghost house door as a bar.
 */
function renderMaze() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = c * TILE_SIZE;
            const y = r * TILE_SIZE;
            const tile = map[r][c];

            if (tile === 1) {
                ctx.fillStyle = "#1a1aff";
                ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            } else if (tile === 2) {
                ctx.fillStyle = "#ffb8ae";
                ctx.beginPath();
                ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (tile === 3) {
                // Power pellet — blink
                if (Math.floor(Date.now() / 300) % 2 === 0) {
                    ctx.fillStyle = "#ffb8ae";
                    ctx.beginPath();
                    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (tile === 4) {
                ctx.fillStyle = "#FFB8FF";
                ctx.fillRect(x, y + TILE_SIZE / 2 - 2, TILE_SIZE, 4);
            }
        }
    }
}

/**
 * Draw Pac-Man as a filled yellow arc with an animated mouth.
 */
function renderPacMan() {
    ctx.fillStyle = "#FFFF00";
    ctx.beginPath();

    let rotation = 0;
    if (pacman.direction.dx === 1) rotation = 0;
    else if (pacman.direction.dx === -1) rotation = Math.PI;
    else if (pacman.direction.dy === -1) rotation = Math.PI * 1.5;
    else if (pacman.direction.dy === 1) rotation = Math.PI * 0.5;

    const startAngle = rotation + pacman.mouthAngle;
    const endAngle = rotation + Math.PI * 2 - pacman.mouthAngle;

    ctx.arc(pacman.x, pacman.y, TILE_SIZE / 2 - 1, startAngle, endAngle);
    ctx.lineTo(pacman.x, pacman.y);
    ctx.closePath();
    ctx.fill();
}

/**
 * Draw all ghosts. Normal ghosts are coloured blobs with eyes.
 * Frightened ghosts are blue. Dead ghosts show only eyes.
 */
function renderGhosts() {
    for (const ghost of ghosts) {
        const gx = ghost.x;
        const gy = ghost.y;
        const size = TILE_SIZE / 2 - 1;

        if (ghost.mode === "dead") {
            // Draw only eyes
            drawGhostEyes(gx, gy, ghost.direction);
            continue;
        }

        // Determine body color
        let bodyColor = ghost.color;
        if (ghost.mode === "frightened") {
            if (gameState.frightenedTimer < 2) {
                bodyColor = (Math.floor(Date.now() / 250) % 2 === 0) ? FRIGHTENED_COLOR : FRIGHTENED_FLASH_COLOR;
            } else {
                bodyColor = FRIGHTENED_COLOR;
            }
        }

        ctx.fillStyle = bodyColor;

        // Ghost body: rounded top + rectangular bottom + wavy edge
        ctx.beginPath();
        ctx.arc(gx, gy - 2, size, Math.PI, 0, false);
        ctx.lineTo(gx + size, gy + size);

        // Wavy bottom
        const waveCount = 3;
        const waveWidth = (size * 2) / waveCount;
        for (let i = 0; i < waveCount; i++) {
            const wx = gx + size - i * waveWidth;
            ctx.quadraticCurveTo(
                wx - waveWidth / 4, gy + size + 3,
                wx - waveWidth / 2, gy + size
            );
            ctx.quadraticCurveTo(
                wx - waveWidth * 3 / 4, gy + size - 3,
                wx - waveWidth, gy + size
            );
        }

        ctx.closePath();
        ctx.fill();

        // Eyes
        if (ghost.mode === "frightened") {
            // Simple frightened face
            ctx.fillStyle = "#FFF";
            ctx.beginPath();
            ctx.arc(gx - 3, gy - 3, 2, 0, Math.PI * 2);
            ctx.arc(gx + 3, gy - 3, 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            drawGhostEyes(gx, gy, ghost.direction);
        }
    }
}

/**
 * Draw ghost eyes at position.
 */
function drawGhostEyes(x, y, direction) {
    // White part
    ctx.fillStyle = "#FFF";
    ctx.beginPath();
    ctx.ellipse(x - 4, y - 3, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 4, y - 3, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils - offset by direction
    const pupilOffsetX = direction.dx * 2;
    const pupilOffsetY = direction.dy * 2;
    ctx.fillStyle = "#00F";
    ctx.beginPath();
    ctx.arc(x - 4 + pupilOffsetX, y - 3 + pupilOffsetY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 4 + pupilOffsetX, y - 3 + pupilOffsetY, 2, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Draw the score, current level, and remaining lives on screen.
 */
function renderHUD() {
    const hudY = ROWS * TILE_SIZE + 5;

    ctx.fillStyle = "#FFF";
    ctx.font = "16px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText("SCORE: " + gameState.score, 10, hudY + 16);

    ctx.textAlign = "right";
    ctx.fillText("LEVEL: " + (gameState.level + 1), canvas.width - 10, hudY + 16);

    // Draw lives as small pac-man icons
    ctx.textAlign = "left";
    for (let i = 0; i < gameState.lives; i++) {
        const lx = 10 + i * 25;
        const ly = hudY + 32;
        ctx.fillStyle = "#FFFF00";
        ctx.beginPath();
        ctx.arc(lx + 8, ly, 7, 0.25 * Math.PI, 1.75 * Math.PI);
        ctx.lineTo(lx + 8, ly);
        ctx.closePath();
        ctx.fill();
    }
}

// ============================================================================
// INPUT HANDLING
// ============================================================================

/**
 * Process a keydown event: map arrow keys / WASD to a direction intent,
 * handle pause toggle (P or Escape).
 *
 * @param {KeyboardEvent} e
 */
function handleInput(e) {
    switch (e.code) {
        case "ArrowUp":
        case "KeyW":
            e.preventDefault();
            if (pacman) pacman.nextDirection = DIR_UP;
            break;
        case "ArrowDown":
        case "KeyS":
            e.preventDefault();
            if (pacman) pacman.nextDirection = DIR_DOWN;
            break;
        case "ArrowLeft":
        case "KeyA":
            e.preventDefault();
            if (pacman) pacman.nextDirection = DIR_LEFT;
            break;
        case "ArrowRight":
        case "KeyD":
            e.preventDefault();
            if (pacman) pacman.nextDirection = DIR_RIGHT;
            break;
        case "KeyP":
        case "Escape":
            if (gameState && !gameState.gameOver && !gameState.won) {
                gameState.paused = !gameState.paused;
            }
            break;
        case "Enter":
        case "Space":
            if (gameState && (gameState.gameOver || gameState.won)) {
                initGame();
            }
            break;
    }
}

// ============================================================================
// SOUND (Stub)
// ============================================================================

let audioCtx = null;

/**
 * Play a sound effect. Uses Web Audio API if available, otherwise no-op.
 *
 * @param {string} type — one of "chomp", "death", "eatGhost", "powerPellet",
 *                        "siren", "intro"
 */
function playSound(type) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        switch (type) {
            case "chomp":
                osc.frequency.value = 200;
                gain.gain.value = 0.05;
                osc.start();
                osc.stop(audioCtx.currentTime + 0.05);
                break;
            case "eatGhost":
                osc.frequency.setValueAtTime(600, audioCtx.currentTime);
                osc.frequency.linearRampToValueAtTime(200, audioCtx.currentTime + 0.3);
                gain.gain.value = 0.1;
                osc.start();
                osc.stop(audioCtx.currentTime + 0.3);
                break;
            case "death":
                osc.frequency.setValueAtTime(500, audioCtx.currentTime);
                osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.8);
                gain.gain.value = 0.1;
                osc.start();
                osc.stop(audioCtx.currentTime + 0.8);
                break;
            default:
                osc.disconnect();
                return;
        }
    } catch (e) {
        // Sound is optional
    }
}

// ============================================================================
// UTILITY HELPERS
// ============================================================================

/**
 * Convert pixel position to tile coordinates.
 *
 * @param {number} x — pixel x
 * @param {number} y — pixel y
 * @returns {{col:number, row:number}}
 */
function pixelToTile(x, y) {
    return { col: Math.floor(x / TILE_SIZE), row: Math.floor(y / TILE_SIZE) };
}

/**
 * Convert tile coordinates to pixel centre.
 *
 * @param {number} col
 * @param {number} row
 * @returns {{x:number, y:number}}
 */
function tileToCentre(col, row) {
    return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
}

/**
 * Get the level-appropriate speed for pac-man.
 *
 * @param {number} level — 0-based level index
 * @returns {number} speed in pixels per second
 */
function getPacManSpeed(level) {
    return PACMAN_SPEED[Math.min(level, PACMAN_SPEED.length - 1)];
}

/**
 * Get the level-appropriate speed for a ghost in a given mode.
 *
 * @param {number} level — 0-based level index
 * @param {string} mode — ghost mode
 * @returns {number} speed in pixels per second
 */
function getGhostSpeed(level, mode) {
    if (mode === "dead") return GHOST_DEAD_SPEED;
    if (mode === "frightened") return GHOST_FRIGHT_SPEED[Math.min(level, GHOST_FRIGHT_SPEED.length - 1)];
    return GHOST_SPEED[Math.min(level, GHOST_SPEED.length - 1)];
}

/**
 * Get the scatter/chase mode schedule for the current level.
 *
 * @param {number} level — 0-based
 * @returns {Array} schedule array from MODE_SCHEDULE
 */
function getModeSchedule(level) {
    if (level === 0) return MODE_SCHEDULE[0];
    if (level <= 3) return MODE_SCHEDULE[1];
    return MODE_SCHEDULE[2];
}

/**
 * Get frightened duration for the current level.
 *
 * @param {number} level — 0-based
 * @returns {number} duration in seconds
 */
function getFrightenedDuration(level) {
    return FRIGHTENED_DURATION[Math.min(level, FRIGHTENED_DURATION.length - 1)];
}

/**
 * Euclidean distance squared between two tile positions.
 *
 * @param {{col:number,row:number}} a
 * @param {{col:number,row:number}} b
 * @returns {number}
 */
function distSq(a, b) {
    return (a.col - b.col) ** 2 + (a.row - b.row) ** 2;
}

// ============================================================================
// BOOTSTRAP
// ============================================================================

document.addEventListener("DOMContentLoaded", function () {
    initGame();
});

document.addEventListener("keydown", function (e) {
    handleInput(e);
});

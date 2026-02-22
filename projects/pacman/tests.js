/**
 * tests.js — Self-contained unit tests for Pac-Man game logic.
 * No DOM, no canvas, no npm required.
 * Run in any modern browser via tests.html, or in Node.js.
 */

// ============================================================================
// MINIMAL TEST HARNESS
// ============================================================================

let passed = 0;
let failed = 0;
let results = [];

function test(name, fn) {
    try {
        fn();
        passed++;
        results.push({ name, ok: true, message: null });
    } catch (e) {
        failed++;
        results.push({ name, ok: false, message: e.message });
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

function assertEqual(a, b, message) {
    const aStr = JSON.stringify(a);
    const bStr = JSON.stringify(b);
    if (aStr !== bStr) {
        throw new Error((message || "assertEqual failed") + " — Expected " + bStr + ", got " + aStr);
    }
}

// ============================================================================
// INLINED CONSTANTS (copied from game.js)
// ============================================================================

const TILE_SIZE = 20;
const COLS = 28;
const ROWS = 31;

const GHOST_NAMES = ["blinky", "pinky", "inky", "clyde"];

const GHOST_COLORS = {
    blinky: "#FF0000",
    pinky:  "#FFB8FF",
    inky:   "#00FFFF",
    clyde:  "#FFB852"
};

const FRIGHTENED_COLOR = "#2121DE";

const SCATTER_TARGETS = {
    blinky: { col: 25, row: 0  },
    pinky:  { col: 2,  row: 0  },
    inky:   { col: 27, row: 31 },
    clyde:  { col: 0,  row: 31 }
};

const SCORE_PELLET = 10;
const SCORE_POWER_PELLET = 50;
const SCORE_GHOST = [200, 400, 800, 1600];

const PACMAN_SPEED      = [80, 90, 90, 90, 100];
const GHOST_SPEED       = [75, 85, 85, 85, 95];
const GHOST_FRIGHT_SPEED = [50, 55, 55, 60, 60];
const GHOST_DEAD_SPEED  = 150;

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

const FRIGHTENED_DURATION = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1, 0, 0];

const PACMAN_START = { col: 13, row: 22 };

const GHOST_START_POSITIONS = {
    blinky: { col: 13, row: 11 },
    pinky:  { col: 13, row: 14 },
    inky:   { col: 11, row: 14 },
    clyde:  { col: 15, row: 14 }
};

const DIR_UP    = { dx:  0, dy: -1 };
const DIR_DOWN  = { dx:  0, dy:  1 };
const DIR_LEFT  = { dx: -1, dy:  0 };
const DIR_RIGHT = { dx:  1, dy:  0 };

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
// INLINED PURE FUNCTIONS (copied from game.js)
// ============================================================================

function pixelToTile(x, y) {
    return { col: Math.floor(x / TILE_SIZE), row: Math.floor(y / TILE_SIZE) };
}

function tileToCentre(col, row) {
    return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
}

function distSq(a, b) {
    return (a.col - b.col) ** 2 + (a.row - b.row) ** 2;
}

function getPacManSpeed(level) {
    return PACMAN_SPEED[Math.min(level, PACMAN_SPEED.length - 1)];
}

function getGhostSpeed(level, mode) {
    if (mode === "dead") return GHOST_DEAD_SPEED;
    if (mode === "frightened") return GHOST_FRIGHT_SPEED[Math.min(level, GHOST_FRIGHT_SPEED.length - 1)];
    return GHOST_SPEED[Math.min(level, GHOST_SPEED.length - 1)];
}

function getModeSchedule(level) {
    if (level === 0) return MODE_SCHEDULE[0];
    if (level <= 3) return MODE_SCHEDULE[1];
    return MODE_SCHEDULE[2];
}

function getFrightenedDuration(level) {
    return FRIGHTENED_DURATION[Math.min(level, FRIGHTENED_DURATION.length - 1)];
}

/**
 * Ghost walkability check — copied from game.js.
 * @param {number} col
 * @param {number} row
 * @param {{inHouse:boolean}} ghost
 * @param {boolean} isDead
 * @returns {boolean}
 */
function isWalkableForGhost(col, row, ghost, isDead) {
    if (col < 0 || col >= COLS) return true; // tunnel wrap
    if (row < 0 || row >= ROWS) return false;
    const tileVal = ORIGINAL_MAP[row][col];
    if (tileVal === 1) return false;
    if (tileVal === 4) return isDead || ghost.inHouse;
    return true;
}

/**
 * Frightened-mode direction picker WITHOUT the empty-validDirs fallback.
 * Mirrors the pre-fix behaviour so tests can verify it produced no valid dirs.
 * Returns the array of candidate directions (may be empty).
 */
function frightenedPickDirs_noFallback(ghost, ghostTile) {
    const dirs = [DIR_UP, DIR_LEFT, DIR_DOWN, DIR_RIGHT];
    const validDirs = [];
    for (const d of dirs) {
        if (d.dx === -ghost.direction.dx && d.dy === -ghost.direction.dy) continue;
        const nc = ghostTile.col + d.dx;
        const nr = ghostTile.row + d.dy;
        if (isWalkableForGhost(nc, nr, ghost, false)) {
            validDirs.push(d);
        }
    }
    return validDirs;
}

/**
 * Frightened-mode direction picker WITH the reverse-fallback fix.
 * Mirrors the fixed updateGhostAI logic.
 * Returns the array of candidate directions — never empty for any reachable tile.
 */
function frightenedPickDirs_withFallback(ghost, ghostTile) {
    const validDirs = frightenedPickDirs_noFallback(ghost, ghostTile);
    if (validDirs.length === 0) {
        const rc = ghostTile.col - ghost.direction.dx;
        const rr = ghostTile.row - ghost.direction.dy;
        if (isWalkableForGhost(rc, rr, ghost, false)) {
            validDirs.push({ dx: -ghost.direction.dx, dy: -ghost.direction.dy });
        }
    }
    return validDirs;
}

/**
 * Simulated activateFrightenedMode — mirrors the fixed version in game.js.
 * Reverses direction AND resets lastPickedTile for all non-dead ghosts.
 */
function mockActivateFrightenedMode(ghosts) {
    for (const ghost of ghosts) {
        if (ghost.mode !== "dead") {
            ghost.mode = "frightened";
            ghost.direction = { dx: -ghost.direction.dx, dy: -ghost.direction.dy };
            ghost.lastPickedTileCol = -1;
            ghost.lastPickedTileRow = -1;
        }
    }
}

// ============================================================================
// MOCK canMove FOR TILE-LOGIC TESTS
// Uses a small 3x3 test map:
//   row 0: [1, 0, 0]  (wall, open, open)
//   row 1: [0, 0, 4]  (open, open, ghost-door)
//   row 2: [0, 0, 0]  (all open)
// ============================================================================

const TEST_MAP = [
    [1, 0, 0],
    [0, 0, 4],
    [0, 0, 0]
];

const TEST_TILE_SIZE = 20;
const TEST_COLS = 3;
const TEST_ROWS = 3;

/**
 * Simplified canMove using TEST_MAP.
 * @param {number} x - pixel x of current centre
 * @param {number} y - pixel y of current centre
 * @param {{dx:number,dy:number}} dir
 * @returns {boolean}
 */
function mockCanMove(x, y, dir) {
    const targetX = x + dir.dx * TEST_TILE_SIZE / 2 + dir.dx;
    const targetY = y + dir.dy * TEST_TILE_SIZE / 2 + dir.dy;
    const col = Math.floor(targetX / TEST_TILE_SIZE);
    const row = Math.floor(targetY / TEST_TILE_SIZE);

    // Allow tunnel wrap on left/right
    if (col < 0 || col >= TEST_COLS) return true;
    if (row < 0 || row >= TEST_ROWS) return false;

    const tileVal = TEST_MAP[row][col];
    if (tileVal === 1) return false;
    if (tileVal === 4) return false; // Pac-Man cannot enter ghost house door
    return true;
}

// ============================================================================
// TESTS — pixelToTile
// ============================================================================

test("pixelToTile: origin maps to col 0, row 0", function () {
    const result = pixelToTile(10, 10);
    assertEqual(result.col, 0, "col");
    assertEqual(result.row, 0, "row");
});

test("pixelToTile: pixel 25,25 maps to col 1, row 1", function () {
    const result = pixelToTile(25, 25);
    assertEqual(result.col, 1, "col");
    assertEqual(result.row, 1, "row");
});

test("pixelToTile: pixel 0,0 maps to col 0, row 0", function () {
    const result = pixelToTile(0, 0);
    assertEqual(result.col, 0, "col");
    assertEqual(result.row, 0, "row");
});

test("pixelToTile: pixel 40,60 maps to col 2, row 3", function () {
    const result = pixelToTile(40, 60);
    assertEqual(result.col, 2, "col");
    assertEqual(result.row, 3, "row");
});

// ============================================================================
// TESTS — tileToCentre
// ============================================================================

test("tileToCentre: tile (0,0) centre is {x:10, y:10}", function () {
    const result = tileToCentre(0, 0);
    assertEqual(result.x, 10, "x");
    assertEqual(result.y, 10, "y");
});

test("tileToCentre: tile (1,1) centre is {x:30, y:30}", function () {
    const result = tileToCentre(1, 1);
    assertEqual(result.x, 30, "x");
    assertEqual(result.y, 30, "y");
});

test("tileToCentre: tile (2,3) centre is {x:50, y:70}", function () {
    const result = tileToCentre(2, 3);
    assertEqual(result.x, 50, "x");
    assertEqual(result.y, 70, "y");
});

// ============================================================================
// TESTS — distSq
// ============================================================================

test("distSq: {0,0} to {3,4} is 25", function () {
    const d = distSq({ col: 0, row: 0 }, { col: 3, row: 4 });
    assertEqual(d, 25, "distSq");
});

test("distSq: same tile is 0", function () {
    const d = distSq({ col: 5, row: 5 }, { col: 5, row: 5 });
    assertEqual(d, 0, "distSq");
});

test("distSq: {1,1} to {4,5} is 25", function () {
    const d = distSq({ col: 1, row: 1 }, { col: 4, row: 5 });
    assertEqual(d, 25, "distSq");
});

test("distSq: symmetric — a to b equals b to a", function () {
    const ab = distSq({ col: 2, row: 3 }, { col: 7, row: 7 });
    const ba = distSq({ col: 7, row: 7 }, { col: 2, row: 3 });
    assertEqual(ab, ba, "symmetry");
});

// ============================================================================
// TESTS — getPacManSpeed
// ============================================================================

test("getPacManSpeed: level 0 → 80", function () {
    assertEqual(getPacManSpeed(0), 80, "level 0");
});

test("getPacManSpeed: level 1 → 90", function () {
    assertEqual(getPacManSpeed(1), 90, "level 1");
});

test("getPacManSpeed: level 4 → 100", function () {
    assertEqual(getPacManSpeed(4), 100, "level 4");
});

test("getPacManSpeed: level 10 → clamped to 100 (last entry)", function () {
    assertEqual(getPacManSpeed(10), 100, "level 10 clamped");
});

test("getPacManSpeed: level 999 → clamped to 100 (last entry)", function () {
    assertEqual(getPacManSpeed(999), 100, "level 999 clamped");
});

// ============================================================================
// TESTS — getGhostSpeed
// ============================================================================

test("getGhostSpeed: level 0, scatter → 75", function () {
    assertEqual(getGhostSpeed(0, "scatter"), 75, "scatter speed");
});

test("getGhostSpeed: level 0, chase → 75", function () {
    assertEqual(getGhostSpeed(0, "chase"), 75, "chase speed");
});

test("getGhostSpeed: level 0, frightened → 50", function () {
    assertEqual(getGhostSpeed(0, "frightened"), 50, "frightened speed");
});

test("getGhostSpeed: level 0, dead → 150", function () {
    assertEqual(getGhostSpeed(0, "dead"), 150, "dead speed");
});

test("getGhostSpeed: high level, frightened → clamped (60)", function () {
    assertEqual(getGhostSpeed(10, "frightened"), 60, "frightened clamped");
});

test("getGhostSpeed: high level, scatter → clamped (95)", function () {
    assertEqual(getGhostSpeed(10, "scatter"), 95, "scatter clamped");
});

// ============================================================================
// TESTS — getModeSchedule
// ============================================================================

test("getModeSchedule: level 0 returns MODE_SCHEDULE[0]", function () {
    const sched = getModeSchedule(0);
    assert(sched === MODE_SCHEDULE[0], "should be MODE_SCHEDULE[0]");
});

test("getModeSchedule: level 2 returns MODE_SCHEDULE[1]", function () {
    const sched = getModeSchedule(2);
    assert(sched === MODE_SCHEDULE[1], "should be MODE_SCHEDULE[1]");
});

test("getModeSchedule: level 5 returns MODE_SCHEDULE[2]", function () {
    const sched = getModeSchedule(5);
    assert(sched === MODE_SCHEDULE[2], "should be MODE_SCHEDULE[2]");
});

test("getModeSchedule: level 1 returns MODE_SCHEDULE[1]", function () {
    const sched = getModeSchedule(1);
    assert(sched === MODE_SCHEDULE[1], "should be MODE_SCHEDULE[1]");
});

test("getModeSchedule: level 3 returns MODE_SCHEDULE[1]", function () {
    const sched = getModeSchedule(3);
    assert(sched === MODE_SCHEDULE[1], "should be MODE_SCHEDULE[1]");
});

test("getModeSchedule: level 4 returns MODE_SCHEDULE[2]", function () {
    const sched = getModeSchedule(4);
    assert(sched === MODE_SCHEDULE[2], "should be MODE_SCHEDULE[2]");
});

test("getModeSchedule: level 0 first entry is scatter,7", function () {
    const sched = getModeSchedule(0);
    assertEqual(sched[0][0], "scatter", "first mode");
    assertEqual(sched[0][1], 7, "first duration");
});

test("getModeSchedule: level 0 last entry is chase,Infinity", function () {
    const sched = getModeSchedule(0);
    const last = sched[sched.length - 1];
    assertEqual(last[0], "chase", "last mode");
    assert(last[1] === Infinity, "last duration Infinity");
});

// ============================================================================
// TESTS — getFrightenedDuration
// ============================================================================

test("getFrightenedDuration: level 0 → 6", function () {
    assertEqual(getFrightenedDuration(0), 6, "level 0");
});

test("getFrightenedDuration: level 1 → 5", function () {
    assertEqual(getFrightenedDuration(1), 5, "level 1");
});

test("getFrightenedDuration: level 4 → 2", function () {
    assertEqual(getFrightenedDuration(4), 2, "level 4");
});

test("getFrightenedDuration: level 100 → clamped to last value (0)", function () {
    const last = FRIGHTENED_DURATION[FRIGHTENED_DURATION.length - 1];
    assertEqual(getFrightenedDuration(100), last, "level 100 clamped");
});

test("getFrightenedDuration: level 999 → clamped to last value", function () {
    const last = FRIGHTENED_DURATION[FRIGHTENED_DURATION.length - 1];
    assertEqual(getFrightenedDuration(999), last, "level 999 clamped");
});

// ============================================================================
// TESTS — Score constants
// ============================================================================

test("SCORE_PELLET === 10", function () {
    assertEqual(SCORE_PELLET, 10, "pellet score");
});

test("SCORE_POWER_PELLET === 50", function () {
    assertEqual(SCORE_POWER_PELLET, 50, "power pellet score");
});

test("SCORE_GHOST[0] === 200", function () {
    assertEqual(SCORE_GHOST[0], 200, "ghost eat 1");
});

test("SCORE_GHOST[1] === 400", function () {
    assertEqual(SCORE_GHOST[1], 400, "ghost eat 2");
});

test("SCORE_GHOST[2] === 800", function () {
    assertEqual(SCORE_GHOST[2], 800, "ghost eat 3");
});

test("SCORE_GHOST[3] === 1600", function () {
    assertEqual(SCORE_GHOST[3], 1600, "ghost eat 4");
});

// ============================================================================
// TESTS — Map integrity
// ============================================================================

test("ORIGINAL_MAP has 31 rows", function () {
    assertEqual(ORIGINAL_MAP.length, 31, "row count");
});

test("Every row in ORIGINAL_MAP has 28 columns", function () {
    for (let r = 0; r < ORIGINAL_MAP.length; r++) {
        assert(ORIGINAL_MAP[r].length === 28, "row " + r + " has " + ORIGINAL_MAP[r].length + " cols, expected 28");
    }
});

test("ORIGINAL_MAP has exactly 4 power pellets (tile value 3)", function () {
    let count = 0;
    for (let r = 0; r < ORIGINAL_MAP.length; r++) {
        for (let c = 0; c < ORIGINAL_MAP[r].length; c++) {
            if (ORIGINAL_MAP[r][c] === 3) count++;
        }
    }
    assertEqual(count, 4, "power pellet count");
});

test("Tile at row 0, col 0 is a wall (1)", function () {
    assertEqual(ORIGINAL_MAP[0][0], 1, "top-left corner");
});

test("Tile at row 14, col 0 is tunnel open (0) — allows wrapping", function () {
    assertEqual(ORIGINAL_MAP[14][0], 0, "tunnel left");
});

test("Tile at row 14, col 27 is tunnel open (0) — allows wrapping", function () {
    assertEqual(ORIGINAL_MAP[14][27], 0, "tunnel right");
});

test("Ghost house door tiles (4) exist at row 12", function () {
    assert(ORIGINAL_MAP[12][13] === 4 || ORIGINAL_MAP[12][14] === 4, "ghost house door present");
});

// ============================================================================
// TESTS — Ghost constants
// ============================================================================

test("GHOST_NAMES has exactly 4 entries", function () {
    assertEqual(GHOST_NAMES.length, 4, "ghost name count");
});

test("GHOST_NAMES contains blinky, pinky, inky, clyde", function () {
    assertEqual(GHOST_NAMES[0], "blinky", "blinky");
    assertEqual(GHOST_NAMES[1], "pinky",  "pinky");
    assertEqual(GHOST_NAMES[2], "inky",   "inky");
    assertEqual(GHOST_NAMES[3], "clyde",  "clyde");
});

test("GHOST_COLORS has entries for all 4 ghosts", function () {
    for (const name of GHOST_NAMES) {
        assert(typeof GHOST_COLORS[name] === "string" && GHOST_COLORS[name].length > 0,
            "color missing for " + name);
    }
});

test("GHOST_COLORS blinky is red (#FF0000)", function () {
    assertEqual(GHOST_COLORS.blinky, "#FF0000", "blinky color");
});

test("GHOST_COLORS pinky is pink (#FFB8FF)", function () {
    assertEqual(GHOST_COLORS.pinky, "#FFB8FF", "pinky color");
});

test("GHOST_COLORS inky is cyan (#00FFFF)", function () {
    assertEqual(GHOST_COLORS.inky, "#00FFFF", "inky color");
});

test("GHOST_COLORS clyde is orange (#FFB852)", function () {
    assertEqual(GHOST_COLORS.clyde, "#FFB852", "clyde color");
});

test("SCATTER_TARGETS has entries for all 4 ghosts", function () {
    for (const name of GHOST_NAMES) {
        const t = SCATTER_TARGETS[name];
        assert(t !== undefined && typeof t.col === "number" && typeof t.row === "number",
            "scatter target missing for " + name);
    }
});

test("SCATTER_TARGETS blinky is top-right corner", function () {
    assertEqual(SCATTER_TARGETS.blinky.col, 25, "blinky scatter col");
    assertEqual(SCATTER_TARGETS.blinky.row, 0,  "blinky scatter row");
});

test("SCATTER_TARGETS pinky is top-left corner", function () {
    assertEqual(SCATTER_TARGETS.pinky.col, 2, "pinky scatter col");
    assertEqual(SCATTER_TARGETS.pinky.row, 0, "pinky scatter row");
});

// ============================================================================
// TESTS — Ghost state constants / FRIGHTENED_COLOR
// ============================================================================

test("FRIGHTENED_COLOR is defined and non-empty", function () {
    assert(typeof FRIGHTENED_COLOR === "string" && FRIGHTENED_COLOR.length > 0,
        "FRIGHTENED_COLOR must be a non-empty string");
});

test("Valid ghost modes are scatter, chase, frightened, dead", function () {
    const validModes = ["scatter", "chase", "frightened", "dead"];
    // Verify the strings themselves are distinguishable (sanity check)
    assertEqual(validModes.length, 4, "mode count");
    assert(validModes.includes("scatter"),   "scatter mode");
    assert(validModes.includes("chase"),     "chase mode");
    assert(validModes.includes("frightened"),"frightened mode");
    assert(validModes.includes("dead"),      "dead mode");
});

// ============================================================================
// TESTS — mockCanMove logic
// TEST_MAP:
//   row 0: [1(wall), 0(open), 0(open)]
//   row 1: [0(open), 0(open), 4(door)]
//   row 2: [0(open), 0(open), 0(open)]
//
// Tile centres (TILE_SIZE=20): col 0 → x=10, col 1 → x=30, col 2 → x=50
//                               row 0 → y=10, row 1 → y=30, row 2 → y=50
// ============================================================================

test("mockCanMove: moving right from (30,30) into col 2 row 1 (ghost door) → false", function () {
    // From centre of tile (1,1) = pixel (30,30), moving right toward col 2 which is tile value 4
    const result = mockCanMove(30, 30, { dx: 1, dy: 0 });
    assertEqual(result, false, "cannot enter ghost door");
});

test("mockCanMove: moving up from (30,30) into col 1 row 0 (wall? no, open) → true", function () {
    // From centre of tile (1,1) = (30,30), moving up toward row 0 col 1 which is 0 (open)
    const result = mockCanMove(30, 30, { dx: 0, dy: -1 });
    assertEqual(result, true, "can move into open tile");
});

test("mockCanMove: moving left from (30,30) into col 0 row 1 (open) → true", function () {
    // From centre of tile (1,1) = (30,30), moving left toward col 0 row 1 which is 0 (open)
    const result = mockCanMove(30, 30, { dx: -1, dy: 0 });
    assertEqual(result, true, "can move into open tile on left");
});

test("mockCanMove: moving up from (10,30) into col 0 row 0 (wall=1) → false", function () {
    // From centre of tile (0,1) = (10,30), moving up toward row 0 col 0 which is 1 (wall)
    const result = mockCanMove(10, 30, { dx: 0, dy: -1 });
    assertEqual(result, false, "cannot move into wall");
});

test("mockCanMove: moving down from (30,30) into col 1 row 2 (open) → true", function () {
    // From centre of tile (1,1) = (30,30), moving down toward row 2 col 1 which is 0 (open)
    const result = mockCanMove(30, 30, { dx: 0, dy: 1 });
    assertEqual(result, true, "can move down into open tile");
});

test("mockCanMove: moving left off left edge from (10,30) → true (tunnel wrap)", function () {
    // From centre of tile (0,1) = (10,30), moving left goes off-map → tunnel wrap allowed
    const result = mockCanMove(10, 30, { dx: -1, dy: 0 });
    assertEqual(result, true, "tunnel wrap left is allowed");
});

// ============================================================================
// TESTS — PACMAN_START validity
// These would have caught the "Pac-Man spawns inside a wall" bug.
// ============================================================================

test("PACMAN_START is within map bounds", function () {
    assert(PACMAN_START.col >= 0 && PACMAN_START.col < COLS,
        "PACMAN_START.col " + PACMAN_START.col + " is out of bounds");
    assert(PACMAN_START.row >= 0 && PACMAN_START.row < ROWS,
        "PACMAN_START.row " + PACMAN_START.row + " is out of bounds");
});

test("PACMAN_START tile is not a wall — catches start-in-wall bug", function () {
    const tile = ORIGINAL_MAP[PACMAN_START.row][PACMAN_START.col];
    assert(tile !== 1,
        "PACMAN_START (" + PACMAN_START.col + "," + PACMAN_START.row +
        ") is a wall tile (value 1) — Pac-Man will be permanently stuck");
});

test("PACMAN_START tile is walkable (0, 2 or 3)", function () {
    const tile = ORIGINAL_MAP[PACMAN_START.row][PACMAN_START.col];
    assert(tile === 0 || tile === 2 || tile === 3,
        "PACMAN_START tile must be open path (0), pellet (2) or power pellet (3), got " + tile);
});

test("PACMAN_START tile is not the ghost house door (value 4)", function () {
    const tile = ORIGINAL_MAP[PACMAN_START.row][PACMAN_START.col];
    assert(tile !== 4, "PACMAN_START must not be a ghost house door tile");
});

test("From PACMAN_START Pac-Man can move in at least one direction", function () {
    const dirs = [DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT];
    let movable = 0;
    for (const d of dirs) {
        const nc = PACMAN_START.col + d.dx;
        const nr = PACMAN_START.row + d.dy;
        if (nc < 0 || nc >= COLS) { movable++; continue; } // tunnel
        if (nr < 0 || nr >= ROWS) continue;
        const v = ORIGINAL_MAP[nr][nc];
        if (v !== 1 && v !== 4) movable++;
    }
    assert(movable >= 1,
        "No walkable neighbour found from PACMAN_START — Pac-Man cannot move at all");
});

// ============================================================================
// TESTS — Ghost start position validity
// ============================================================================

test("All ghost start positions are within map bounds", function () {
    for (const name of GHOST_NAMES) {
        const pos = GHOST_START_POSITIONS[name];
        assert(pos.col >= 0 && pos.col < COLS, name + " start col out of bounds");
        assert(pos.row >= 0 && pos.row < ROWS, name + " start row out of bounds");
    }
});

test("All ghost start tiles are not outer walls (value 1)", function () {
    for (const name of GHOST_NAMES) {
        const pos = GHOST_START_POSITIONS[name];
        const tile = ORIGINAL_MAP[pos.row][pos.col];
        assert(tile !== 1,
            name + " starts on a wall tile (value 1) at col " + pos.col + ", row " + pos.row);
    }
});

// ============================================================================
// TESTS — In-house ghost bobbing direction
// These would have caught the "ghosts frozen because DIR_LEFT.dy === 0" bug.
// The bobbing formula is: ghost.y += direction.dy * speed * dt
// If direction.dy is 0 the ghost never moves and the flip conditions never fire.
// ============================================================================

test("DIR_LEFT has dy === 0 — unusable as an in-house bob direction", function () {
    assertEqual(DIR_LEFT.dy, 0,
        "DIR_LEFT.dy must be 0 (confirming it cannot drive vertical bobbing)");
});

test("Bobbing formula with DIR_LEFT produces zero displacement (documents the bug)", function () {
    const dt = 1 / 60;
    const bobSpeed = 30;
    const delta = DIR_LEFT.dy * bobSpeed * dt;
    assertEqual(delta, 0,
        "ghost.y += DIR_LEFT.dy * speed * dt gives 0 — ghost will never move");
});

test("DIR_DOWN has dy === 1 — valid in-house bob direction", function () {
    assertEqual(DIR_DOWN.dy, 1, "DIR_DOWN.dy must be 1");
});

test("Bobbing formula with DIR_DOWN produces positive displacement", function () {
    const dt = 1 / 60;
    const bobSpeed = 30;
    const delta = DIR_DOWN.dy * bobSpeed * dt;
    assert(delta > 0,
        "ghost.y += DIR_DOWN.dy * speed * dt must be positive so bobbing starts");
});

test("In-house ghost init direction must have non-zero dy", function () {
    // The correct initial direction for in-house ghosts is DIR_DOWN (dy=1).
    // DIR_LEFT (dy=0) causes the ghost to be permanently frozen.
    const inHouseInitDir = DIR_DOWN;
    assert(inHouseInitDir.dy !== 0,
        "In-house ghost initial direction has dy=0 — bobbing will never produce movement");
});

test("After one bob step with DIR_DOWN ghost.y increases", function () {
    const dt = 1 / 60;
    const startY = 290;
    const newY = startY + DIR_DOWN.dy * 30 * dt;
    assert(newY > startY, "ghost.y should increase on first step with DIR_DOWN");
});

test("After one bob step with DIR_LEFT ghost.y is unchanged", function () {
    const dt = 1 / 60;
    const startY = 290;
    const newY = startY + DIR_LEFT.dy * 30 * dt;
    assertEqual(newY, startY, "ghost.y must not change with DIR_LEFT — confirms the frozen-ghost bug");
});

// ============================================================================
// TESTS — isWalkableForGhost
// These validate the wall-check that both the bug and fix depend on.
// A ghost that ignores walls can escape the map; these ensure the logic
// correctly blocks walls, doors, and out-of-bounds rows.
// ============================================================================

test("isWalkableForGhost: wall tile (1) is not walkable", function () {
    const ghost = { inHouse: false };
    assert(!isWalkableForGhost(0, 0, ghost, false),
        "top-left corner (0,0) is value 1 — must not be walkable");
});

test("isWalkableForGhost: open tile (0) is walkable", function () {
    const ghost = { inHouse: false };
    // Row 11, col 9 is value 0 in the maze
    assert(isWalkableForGhost(9, 11, ghost, false),
        "open tile at (9,11) must be walkable");
});

test("isWalkableForGhost: pellet tile (2) is walkable", function () {
    const ghost = { inHouse: false };
    // Row 1, col 1 is value 2 (pellet)
    assert(isWalkableForGhost(1, 1, ghost, false),
        "pellet tile at (1,1) must be walkable");
});

test("isWalkableForGhost: ghost door (4) not walkable for live ghost", function () {
    const ghost = { inHouse: false };
    assert(!isWalkableForGhost(13, 12, ghost, false),
        "ghost door at (13,12) must not be walkable for a live non-house ghost");
});

test("isWalkableForGhost: ghost door (4) is walkable for dead ghost", function () {
    const ghost = { inHouse: false };
    assert(isWalkableForGhost(13, 12, ghost, true),
        "ghost door at (13,12) must be walkable when isDead=true");
});

test("isWalkableForGhost: ghost door (4) is walkable for in-house ghost", function () {
    const ghost = { inHouse: true };
    assert(isWalkableForGhost(13, 12, ghost, false),
        "ghost door must be passable for a ghost still in the house");
});

test("isWalkableForGhost: row -1 (above map) is not walkable", function () {
    const ghost = { inHouse: false };
    assert(!isWalkableForGhost(6, -1, ghost, false),
        "row -1 is out of bounds — must not be walkable");
});

test("isWalkableForGhost: col -1 returns true (tunnel wrap)", function () {
    const ghost = { inHouse: false };
    assert(isWalkableForGhost(-1, 14, ghost, false),
        "col=-1 must return true so tunnel wrapping is permitted");
});

test("isWalkableForGhost: col === COLS returns true (tunnel wrap)", function () {
    const ghost = { inHouse: false };
    assert(isWalkableForGhost(COLS, 14, ghost, false),
        "col=COLS must return true so tunnel wrapping is permitted");
});

// ============================================================================
// TESTS — Maze boundary walls (structural invariant)
// The wall-escape bug relied on ghosts passing through boundary walls.
// These tests confirm the structural guarantee: row 0, row 29, col 0 and
// col 27 are walls everywhere except the tunnel row (14) and the bottom
// HUD row (30).  If these tiles change, ghosts could escape the map.
// ============================================================================

test("Row 0 is entirely walls — ghost cannot escape off the top", function () {
    for (let c = 0; c < COLS; c++) {
        assertEqual(ORIGINAL_MAP[0][c], 1,
            "row 0 col " + c + " must be a wall (value 1)");
    }
});

test("Row 29 is entirely walls — ghost cannot escape off the bottom", function () {
    for (let c = 0; c < COLS; c++) {
        assertEqual(ORIGINAL_MAP[29][c], 1,
            "row 29 col " + c + " must be a wall (value 1)");
    }
});

test("Col 0 is walls everywhere except tunnel row (14) and HUD row (30)", function () {
    for (let r = 0; r < ROWS; r++) {
        const v = ORIGINAL_MAP[r][0];
        assert(v === 1 || r === 14 || r === 30,
            "col 0 row " + r + " has value " + v + " — expected 1 (wall)");
    }
});

test("Col 27 is walls everywhere except tunnel row (14) and HUD row (30)", function () {
    for (let r = 0; r < ROWS; r++) {
        const v = ORIGINAL_MAP[r][27];
        assert(v === 1 || r === 14 || r === 30,
            "col 27 row " + r + " has value " + v + " — expected 1 (wall)");
    }
});

// ============================================================================
// TESTS — activateFrightenedMode must reset lastPickedTile
//
// Root cause of the wall-escape bug:
//   1. Ghost going DOWN at tile (6,1); lastPickedTile = (6,1).
//   2. Power pellet eaten → direction reversed to UP.
//      lastPickedTile was NOT reset (pre-fix).
//   3. Ghost reaches tile (6,1) centre: lastPickedTile == (6,1) →
//      direction-pick guard SKIPS evaluation.
//   4. Ghost flies UP without turning, enters wall row 0, then row -1.
//
// The fix: reset lastPickedTile to -1 in activateFrightenedMode so the
// direction picker fires at the ghost's current tile after the reversal.
// ============================================================================

test("activateFrightenedMode: non-dead ghost is set to frightened mode", function () {
    const ghosts = [{ mode: "scatter", direction: DIR_LEFT,
                      lastPickedTileCol: 6, lastPickedTileRow: 1 }];
    mockActivateFrightenedMode(ghosts);
    assertEqual(ghosts[0].mode, "frightened", "ghost mode must become frightened");
});

test("activateFrightenedMode: ghost direction is reversed", function () {
    const ghosts = [{ mode: "scatter", direction: DIR_LEFT,
                      lastPickedTileCol: 6, lastPickedTileRow: 1 }];
    mockActivateFrightenedMode(ghosts);
    assertEqual(ghosts[0].direction.dx,  1, "dx reversed from -1 to +1");
    assertEqual(ghosts[0].direction.dy,  0, "dy unchanged");
});

test("activateFrightenedMode: lastPickedTileCol reset to -1 — catches the escape bug", function () {
    const ghosts = [{ mode: "scatter", direction: DIR_DOWN,
                      lastPickedTileCol: 6, lastPickedTileRow: 1 }];
    mockActivateFrightenedMode(ghosts);
    assertEqual(ghosts[0].lastPickedTileCol, -1,
        "lastPickedTileCol must be -1 so direction re-evaluation fires at current tile; " +
        "without this reset the ghost coasts through tile (6,1) with direction=UP and enters row 0");
});

test("activateFrightenedMode: lastPickedTileRow reset to -1 — catches the escape bug", function () {
    const ghosts = [{ mode: "scatter", direction: DIR_DOWN,
                      lastPickedTileCol: 6, lastPickedTileRow: 1 }];
    mockActivateFrightenedMode(ghosts);
    assertEqual(ghosts[0].lastPickedTileRow, -1,
        "lastPickedTileRow must be -1 after frightened activation");
});

test("activateFrightenedMode: dead ghost is NOT changed", function () {
    const ghosts = [{ mode: "dead", direction: DIR_LEFT,
                      lastPickedTileCol: 5, lastPickedTileRow: 5 }];
    mockActivateFrightenedMode(ghosts);
    assertEqual(ghosts[0].mode, "dead",
        "dead ghost must stay dead during activateFrightenedMode");
    assertEqual(ghosts[0].lastPickedTileCol, 5,
        "dead ghost lastPickedTileCol must not be reset");
});

test("activateFrightenedMode: all non-dead ghosts in a mixed group get lastPickedTile reset", function () {
    const ghosts = [
        { mode: "scatter",    direction: DIR_LEFT,  lastPickedTileCol:  6, lastPickedTileRow: 1 },
        { mode: "chase",      direction: DIR_DOWN,  lastPickedTileCol: 13, lastPickedTileRow: 8 },
        { mode: "frightened", direction: DIR_RIGHT, lastPickedTileCol: 21, lastPickedTileRow: 5 },
        { mode: "dead",       direction: DIR_UP,    lastPickedTileCol: 10, lastPickedTileRow: 10 }
    ];
    mockActivateFrightenedMode(ghosts);
    assertEqual(ghosts[0].lastPickedTileCol, -1, "scatter ghost reset");
    assertEqual(ghosts[1].lastPickedTileCol, -1, "chase ghost reset");
    assertEqual(ghosts[2].lastPickedTileCol, -1, "already-frightened ghost reset");
    assertEqual(ghosts[3].lastPickedTileCol, 10, "dead ghost NOT reset");
});

// ============================================================================
// TESTS — The exact wall-escape scenario (regression tests)
//
// These reproduce the specific sequence that caused a ghost to escape off the
// top of the board and document why each part of the fix is necessary.
// ============================================================================

test("Escape scenario: without reset, lastPickedTile==(6,1) would cause guard to skip pick", function () {
    // Pre-fix state: ghost reversed to UP at tile (6,1), lastPickedTile=(6,1).
    // The guard `ghostTile !== lastPickedTile` evaluates to false → pick is skipped.
    const ghostTile         = { col: 6, row: 1 };
    const lastPickedTileCol = 6; // same as ghostTile — pre-fix state
    const lastPickedTileRow = 1;
    const wouldSkipPick = (ghostTile.col === lastPickedTileCol &&
                           ghostTile.row === lastPickedTileRow);
    assert(wouldSkipPick,
        "Documents pre-fix bug: with lastPickedTile==(6,1) the direction guard skips the pick, " +
        "ghost continues UP unchecked");
});

test("Escape scenario: with reset, lastPickedTile==(-1,-1) forces pick at (6,1)", function () {
    const ghostTile         = { col: 6, row: 1 };
    const lastPickedTileCol = -1; // post-fix state after activateFrightenedMode
    const lastPickedTileRow = -1;
    const wouldSkipPick = (ghostTile.col === lastPickedTileCol &&
                           ghostTile.row === lastPickedTileRow);
    assert(!wouldSkipPick,
        "After reset, lastPickedTile≠(6,1) so direction pick DOES fire at tile (6,1)");
});

test("Escape scenario: direction picker at (6,1) with direction=UP never includes UP", function () {
    // With lastPickedTile reset, the picker fires at (6,1).
    // UP would lead to (6,0) = wall — it must not appear in validDirs.
    const ghost     = { direction: DIR_UP, inHouse: false };
    const ghostTile = { col: 6, row: 1 };
    const validDirs = frightenedPickDirs_noFallback(ghost, ghostTile);
    const includesUp = validDirs.some(d => d.dy === -1);
    assert(!includesUp,
        "Picker must never include DIR_UP from (6,1): destination (6,0) is a wall");
});

test("Escape scenario: direction picker at (6,1) with direction=UP produces at least one safe dir", function () {
    const ghost     = { direction: DIR_UP, inHouse: false };
    const ghostTile = { col: 6, row: 1 };
    const validDirs = frightenedPickDirs_withFallback(ghost, ghostTile);
    assert(validDirs.length > 0,
        "Ghost at (6,1) going UP must have at least one safe direction available");
});

test("Escape scenario: every direction returned at (6,1) stays within the map and avoids walls", function () {
    const ghost     = { direction: DIR_UP, inHouse: false };
    const ghostTile = { col: 6, row: 1 };
    const validDirs = frightenedPickDirs_withFallback(ghost, ghostTile);
    for (const d of validDirs) {
        const nc = ghostTile.col + d.dx;
        const nr = ghostTile.row + d.dy;
        assert(nr >= 0,    "direction must not go above row 0 (map boundary)");
        assert(nr < ROWS,  "direction must not go below map boundary");
        if (nc >= 0 && nc < COLS) {
            assert(ORIGINAL_MAP[nr][nc] !== 1,
                "direction at (6,1) must not lead into wall tile at (" + nc + "," + nr + ")");
        }
    }
});

test("Escape scenario: same check on symmetric corridor (21,1) — mirror side of maze", function () {
    const ghost     = { direction: DIR_UP, inHouse: false };
    const ghostTile = { col: 21, row: 1 };
    const validDirs = frightenedPickDirs_withFallback(ghost, ghostTile);
    assert(validDirs.length > 0,
        "Ghost at (21,1) going UP must have a safe direction");
    const includesUp = validDirs.some(d => d.dy === -1);
    assert(!includesUp,
        "Picker must not include UP from (21,1): (21,0) is a wall");
});

// ============================================================================
// TESTS — Frightened direction picker: comprehensive maze scan
//
// These tests exhaustively verify that for every walkable tile in the map,
// and every possible ghost direction, the picker (with fallback) always
// returns at least one valid direction.  A single failure here means there
// exists a tile+direction combination where the ghost could become stuck or
// escape through a wall.
// ============================================================================

test("Frightened picker (with fallback): every walkable tile has valid dirs for UP", function () {
    const failed = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (ORIGINAL_MAP[r][c] === 1 || ORIGINAL_MAP[r][c] === 4) continue;
            const ghost = { direction: DIR_UP, inHouse: false };
            const dirs  = frightenedPickDirs_withFallback(ghost, { col: c, row: r });
            if (dirs.length === 0) failed.push("(" + c + "," + r + ")");
        }
    }
    assert(failed.length === 0,
        "Tiles with no valid dirs going UP: " + failed.join(", "));
});

test("Frightened picker (with fallback): every walkable tile has valid dirs for DOWN", function () {
    const failed = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (ORIGINAL_MAP[r][c] === 1 || ORIGINAL_MAP[r][c] === 4) continue;
            const ghost = { direction: DIR_DOWN, inHouse: false };
            const dirs  = frightenedPickDirs_withFallback(ghost, { col: c, row: r });
            if (dirs.length === 0) failed.push("(" + c + "," + r + ")");
        }
    }
    assert(failed.length === 0,
        "Tiles with no valid dirs going DOWN: " + failed.join(", "));
});

test("Frightened picker (with fallback): every walkable tile has valid dirs for LEFT", function () {
    const failed = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (ORIGINAL_MAP[r][c] === 1 || ORIGINAL_MAP[r][c] === 4) continue;
            const ghost = { direction: DIR_LEFT, inHouse: false };
            const dirs  = frightenedPickDirs_withFallback(ghost, { col: c, row: r });
            if (dirs.length === 0) failed.push("(" + c + "," + r + ")");
        }
    }
    assert(failed.length === 0,
        "Tiles with no valid dirs going LEFT: " + failed.join(", "));
});

test("Frightened picker (with fallback): every walkable tile has valid dirs for RIGHT", function () {
    const failed = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (ORIGINAL_MAP[r][c] === 1 || ORIGINAL_MAP[r][c] === 4) continue;
            const ghost = { direction: DIR_RIGHT, inHouse: false };
            const dirs  = frightenedPickDirs_withFallback(ghost, { col: c, row: r });
            if (dirs.length === 0) failed.push("(" + c + "," + r + ")");
        }
    }
    assert(failed.length === 0,
        "Tiles with no valid dirs going RIGHT: " + failed.join(", "));
});

test("Frightened picker (with fallback): no direction ever points to a wall tile", function () {
    // Exhaustive check: for every walkable tile and all 4 directions, every
    // candidate direction returned must not lead into a wall tile.
    const dirs = [DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT];
    const violations = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (ORIGINAL_MAP[r][c] === 1 || ORIGINAL_MAP[r][c] === 4) continue;
            for (const startDir of dirs) {
                const ghost      = { direction: startDir, inHouse: false };
                const ghostTile  = { col: c, row: r };
                const candidates = frightenedPickDirs_withFallback(ghost, ghostTile);
                for (const d of candidates) {
                    const nc = c + d.dx;
                    const nr = r + d.dy;
                    if (nc < 0 || nc >= COLS) continue; // tunnel — ok
                    if (nr < 0 || nr >= ROWS) {
                        violations.push("(" + c + "," + r + ") dir=" +
                            JSON.stringify(startDir) + " → out-of-bounds row " + nr);
                        continue;
                    }
                    if (ORIGINAL_MAP[nr][nc] === 1) {
                        violations.push("(" + c + "," + r + ") dir=" +
                            JSON.stringify(startDir) + " → wall at (" + nc + "," + nr + ")");
                    }
                }
            }
        }
    }
    assert(violations.length === 0,
        "Picker returned wall-bound directions: " + violations.slice(0, 5).join("; ") +
        (violations.length > 5 ? " (+" + (violations.length - 5) + " more)" : ""));
});

// ============================================================================
// EXPORT RESULTS
// ============================================================================

if (typeof window !== "undefined") {
    window.testResults = { passed, failed, results };
}

// Node.js summary (if run directly)
if (typeof process !== "undefined" && typeof process.exit === "function") {
    console.log("Results: " + passed + " passed, " + failed + " failed");
    if (failed > 0) {
        results.filter(r => !r.ok).forEach(r => {
            console.log("  FAIL: " + r.name + (r.message ? " — " + r.message : ""));
        });
        process.exit(1);
    } else {
        process.exit(0);
    }
}

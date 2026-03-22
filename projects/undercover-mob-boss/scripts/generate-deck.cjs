const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const path = require("path");

// Icon imports
const { FaClipboardCheck, FaShieldAlt, FaCogs, FaUsers, FaBug, FaChartBar } = require("react-icons/fa");

// === NOIR COLOR PALETTE ===
const C = {
  bg1: "12111D",       // deepest noir
  bg2: "1A1928",       // dark card
  bg3: "242336",       // lighter card
  gold: "C9A96E",      // muted period gold
  goldBright: "D4AF37", // bright gold accent
  cream: "F5F0E8",     // warm cream text
  tan: "A09882",       // muted secondary text
  darkGold: "8B7340",  // dark gold for subtle elements
  green: "4A7C59",     // muted green for "pass"
  red: "8B3A3A",       // muted red
};

// === ICON HELPERS ===
function renderIconSvg(IconComponent, color, size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}

async function iconToBase64Png(IconComponent, color, size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}

// Factory for shadow (avoid mutation pitfall)
const cardShadow = () => ({ type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.4 });

async function buildDeck() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Briggsy";
  pres.title = "Undercover Mob Boss — Executive Summary";

  // Pre-render icons
  const icons = {
    clipboard: await iconToBase64Png(FaClipboardCheck, `#${C.gold}`),
    shield: await iconToBase64Png(FaShieldAlt, `#${C.gold}`),
    cogs: await iconToBase64Png(FaCogs, `#${C.gold}`),
    users: await iconToBase64Png(FaUsers, `#${C.gold}`),
    bug: await iconToBase64Png(FaBug, `#${C.gold}`),
    chart: await iconToBase64Png(FaChartBar, `#${C.gold}`),
  };

  // =====================================================
  // SLIDE 1: TITLE
  // =====================================================
  const s1 = pres.addSlide();
  s1.background = { color: C.bg1 };

  // Top gold line
  s1.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0.6, w: 10, h: 0.02, fill: { color: C.gold } });

  // Title - two lines
  s1.addText([
    { text: "UNDERCOVER", options: { breakLine: true } },
    { text: "MOB BOSS" },
  ], {
    x: 0.5, y: 1.0, w: 9, h: 1.5,
    fontSize: 44, fontFace: "Georgia", color: C.goldBright, bold: true,
    charSpacing: 4, align: "center", valign: "middle", margin: 0,
  });

  // Subtitle
  s1.addText("A Digital Social Deduction Game", {
    x: 0.5, y: 2.3, w: 9, h: 0.5,
    fontSize: 18, fontFace: "Georgia", color: C.tan, italic: true,
    align: "center", margin: 0,
  });

  // Divider
  s1.addShape(pres.shapes.RECTANGLE, { x: 3.5, y: 3.1, w: 3, h: 0.02, fill: { color: C.darkGold } });

  // Key line
  s1.addText("Concept to Production in 8 Days", {
    x: 0.5, y: 3.4, w: 9, h: 0.5,
    fontSize: 22, fontFace: "Georgia", color: C.cream, bold: true,
    align: "center", margin: 0,
  });

  s1.addText("Autonomous Spec-Driven Development", {
    x: 0.5, y: 3.9, w: 9, h: 0.5,
    fontSize: 16, fontFace: "Calibri", color: C.tan,
    align: "center", margin: 0,
  });

  // Bottom gold line
  s1.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.0, w: 10, h: 0.02, fill: { color: C.gold } });

  // Date
  s1.addText("March 2026", {
    x: 0.5, y: 5.1, w: 9, h: 0.4,
    fontSize: 12, fontFace: "Calibri", color: C.tan,
    align: "center", margin: 0,
  });

  // =====================================================
  // SLIDE 2: WHAT WE BUILT
  // =====================================================
  const s2 = pres.addSlide();
  s2.background = { color: C.bg1 };

  s2.addText("WHAT WE BUILT", {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 28, fontFace: "Georgia", color: C.goldBright, bold: true, margin: 0,
  });
  s2.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 0.9, w: 2.0, h: 0.02, fill: { color: C.gold } });

  // Description
  s2.addText([
    { text: "A production-quality multiplayer party game for 5\u201310 players.", options: { fontSize: 16, color: C.cream, bold: true, breakLine: true } },
    { text: "", options: { fontSize: 8, breakLine: true } },
    { text: "Same room. Phones as private devices. Shared screen as the game board. 1940s noir theme with AI-generated art and full narrator voiceover. Browser-based PWA \u2014 no app install, join via QR code.", options: { fontSize: 14, color: C.tan } },
  ], { x: 0.6, y: 1.2, w: 5.0, h: 1.8, fontFace: "Calibri", valign: "top", margin: 0 });

  // Right side: feature cards
  const features = [
    { label: "Players", value: "5\u201310" },
    { label: "Test Suite", value: "1,260" },
    { label: "Rules Verified", value: "209 / 209" },
    { label: "Browsers", value: "4 Engines" },
  ];
  features.forEach((f, i) => {
    const fy = 1.2 + i * 0.95;
    s2.addShape(pres.shapes.RECTANGLE, { x: 6.2, y: fy, w: 3.2, h: 0.8, fill: { color: C.bg2 }, shadow: cardShadow() });
    s2.addText(f.value, { x: 6.4, y: fy + 0.05, w: 2.8, h: 0.45, fontSize: 22, fontFace: "Georgia", color: C.goldBright, bold: true, margin: 0 });
    s2.addText(f.label, { x: 6.4, y: fy + 0.45, w: 2.8, h: 0.3, fontSize: 12, fontFace: "Calibri", color: C.tan, margin: 0 });
  });

  // =====================================================
  // SLIDE 3: THE APPROACH
  // =====================================================
  const s3 = pres.addSlide();
  s3.background = { color: C.bg1 };

  s3.addText("THE APPROACH", {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 28, fontFace: "Georgia", color: C.goldBright, bold: true, margin: 0,
  });
  s3.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 0.9, w: 2.0, h: 0.02, fill: { color: C.gold } });

  // Two columns
  // Left: Spec-Driven Dev
  s3.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.2, w: 4.3, h: 3.8, fill: { color: C.bg2 }, shadow: cardShadow() });
  s3.addImage({ data: icons.clipboard, x: 0.8, y: 1.4, w: 0.4, h: 0.4 });
  s3.addText("Spec-Driven Development", {
    x: 1.4, y: 1.4, w: 3.2, h: 0.4,
    fontSize: 16, fontFace: "Georgia", color: C.cream, bold: true, margin: 0,
  });
  s3.addText([
    { text: "Full product spec locked before a single line of code", options: { bullet: true, breakLine: true, fontSize: 13, color: C.tan } },
    { text: "", options: { fontSize: 6, breakLine: true } },
    { text: "7 sequential phase plans with clear scope and acceptance criteria", options: { bullet: true, breakLine: true, fontSize: 13, color: C.tan } },
    { text: "", options: { fontSize: 6, breakLine: true } },
    { text: "227-rule checklist extracted from source material before implementation", options: { bullet: true, breakLine: true, fontSize: 13, color: C.tan } },
    { text: "", options: { fontSize: 6, breakLine: true } },
    { text: "Every architectural decision traced back to the spec", options: { bullet: true, fontSize: 13, color: C.tan } },
  ], { x: 0.8, y: 2.0, w: 3.8, h: 2.8, fontFace: "Calibri", valign: "top", margin: 0 });

  // Right: Autonomous SDLC
  s3.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.2, w: 4.3, h: 3.8, fill: { color: C.bg2 }, shadow: cardShadow() });
  s3.addImage({ data: icons.cogs, x: 5.5, y: 1.4, w: 0.4, h: 0.4 });
  s3.addText("Autonomous SDLC", {
    x: 6.1, y: 1.4, w: 3.2, h: 0.4,
    fontSize: 16, fontFace: "Georgia", color: C.cream, bold: true, margin: 0,
  });
  s3.addText([
    { text: "One human director, one AI engineer", options: { bullet: true, breakLine: true, fontSize: 13, color: C.tan } },
    { text: "", options: { fontSize: 6, breakLine: true } },
    { text: "Zero manual coding \u2014 AI wrote every line, every test, every asset", options: { bullet: true, breakLine: true, fontSize: 13, color: C.tan } },
    { text: "", options: { fontSize: 6, breakLine: true } },
    { text: "Human set direction, reviewed output, made judgment calls", options: { bullet: true, breakLine: true, fontSize: 13, color: C.tan } },
    { text: "", options: { fontSize: 6, breakLine: true } },
    { text: "AI executed: planning, code, assets, tests, QA, docs, deployment", options: { bullet: true, fontSize: 13, color: C.tan } },
  ], { x: 5.5, y: 2.0, w: 3.8, h: 2.8, fontFace: "Calibri", valign: "top", margin: 0 });

  // =====================================================
  // SLIDE 4: PLANNING INVESTMENT (TIMELINE)
  // =====================================================
  const s4 = pres.addSlide();
  s4.background = { color: C.bg1 };

  s4.addText("THE PLANNING INVESTMENT", {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 28, fontFace: "Georgia", color: C.goldBright, bold: true, margin: 0,
  });
  s4.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 0.9, w: 2.5, h: 0.02, fill: { color: C.gold } });

  // Vertical timeline
  const timeline = [
    { day: "Day 1", label: "Concept + Brainstorm + Full Spec Locked", accent: true },
    { day: "Day 2", label: "7 Phase Plans Written \u2192 Coding Begins" },
    { day: "Day 3", label: "Engine + Multiplayer + Player + Host Views" },
    { day: "Days 4\u20135", label: "Audio Integration + Narrator + Visual Polish" },
    { day: "Day 6", label: "3-Round QA Audit (29 Agents, 46 Issues Found)" },
    { day: "Days 7\u20138", label: "Polish + Security + E2E Across 4 Browsers" },
  ];

  // Gold vertical line
  s4.addShape(pres.shapes.RECTANGLE, { x: 2.3, y: 1.2, w: 0.03, h: 3.9, fill: { color: C.darkGold } });

  timeline.forEach((t, i) => {
    const ty = 1.2 + i * 0.65;
    // Dot
    s4.addShape(pres.shapes.OVAL, { x: 2.18, y: ty + 0.1, w: 0.27, h: 0.27, fill: { color: t.accent ? C.goldBright : C.gold } });
    // Day label
    s4.addText(t.day, {
      x: 0.5, y: ty, w: 1.6, h: 0.45,
      fontSize: 13, fontFace: "Georgia", color: t.accent ? C.goldBright : C.cream, bold: true,
      align: "right", valign: "middle", margin: 0,
    });
    // Description
    s4.addText(t.label, {
      x: 2.8, y: ty, w: 6.5, h: 0.45,
      fontSize: 13, fontFace: "Calibri", color: t.accent ? C.cream : C.tan,
      valign: "middle", margin: 0,
    });
  });

  // Horizontal bar ratio visualization
  const barY = 5.0;
  const barH = 0.22;
  const maxW = 8.8;
  const total = 10000 + 14000 + 17000;
  const planW = (10000 / total) * maxW;
  const codeW = (14000 / total) * maxW;
  const testW = (17000 / total) * maxW;

  s4.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: barY, w: planW, h: barH, fill: { color: C.goldBright } });
  s4.addShape(pres.shapes.RECTANGLE, { x: 0.6 + planW, y: barY, w: codeW, h: barH, fill: { color: C.darkGold } });
  s4.addShape(pres.shapes.RECTANGLE, { x: 0.6 + planW + codeW, y: barY, w: testW, h: barH, fill: { color: C.gold } });

  // Labels below bars
  s4.addText("Planning ~10k", { x: 0.6, y: barY + 0.25, w: planW, h: 0.3, fontSize: 9, fontFace: "Calibri", color: C.goldBright, align: "center", margin: 0 });
  s4.addText("Code ~14k", { x: 0.6 + planW, y: barY + 0.25, w: codeW, h: 0.3, fontSize: 9, fontFace: "Calibri", color: C.tan, align: "center", margin: 0 });
  s4.addText("Tests ~17k", { x: 0.6 + planW + codeW, y: barY + 0.25, w: testW, h: 0.3, fontSize: 9, fontFace: "Calibri", color: C.cream, align: "center", margin: 0 });

  // =====================================================
  // SLIDE 5: THE RESULTS (BIG NUMBERS)
  // =====================================================
  const s5 = pres.addSlide();
  s5.background = { color: C.bg1 };

  s5.addText("THE RESULTS", {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 28, fontFace: "Georgia", color: C.goldBright, bold: true, margin: 0,
  });
  s5.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 0.9, w: 1.8, h: 0.02, fill: { color: C.gold } });

  // Big stat cards - 2x2 grid
  const stats = [
    { num: "1,260", label: "Total Tests Passing", sub: "760 unit + 500 cross-browser E2E" },
    { num: "209/209", label: "Rules Verified", sub: "Every rule from source material" },
    { num: "0", label: "Architectural Defects", sub: "Engine correct from day one" },
    { num: "~10,000", label: "Lines of Planning", sub: "Nearly as much planning as code (~14k)" },
  ];

  stats.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = 0.5 + col * 4.7;
    const sy = 1.2 + row * 2.0;

    s5.addShape(pres.shapes.RECTANGLE, { x: sx, y: sy, w: 4.3, h: 1.7, fill: { color: C.bg2 }, shadow: cardShadow() });
    // Gold left accent
    s5.addShape(pres.shapes.RECTANGLE, { x: sx, y: sy, w: 0.06, h: 1.7, fill: { color: C.gold } });

    s5.addText(s.num, {
      x: sx + 0.3, y: sy + 0.15, w: 3.7, h: 0.7,
      fontSize: 40, fontFace: "Georgia", color: i === 2 ? C.green : C.goldBright, bold: true, margin: 0,
    });
    s5.addText(s.label, {
      x: sx + 0.3, y: sy + 0.85, w: 3.7, h: 0.35,
      fontSize: 14, fontFace: "Calibri", color: C.cream, bold: true, margin: 0,
    });
    s5.addText(s.sub, {
      x: sx + 0.3, y: sy + 1.2, w: 3.7, h: 0.35,
      fontSize: 11, fontFace: "Calibri", color: C.tan, margin: 0,
    });
  });

  // =====================================================
  // SLIDE 6: QA — THE PUNCHLINE
  // =====================================================
  const s6 = pres.addSlide();
  s6.background = { color: C.bg1 };

  s6.addText("QA DEFECT ANALYSIS", {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 28, fontFace: "Georgia", color: C.goldBright, bold: true, margin: 0,
  });
  s6.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 0.9, w: 2.2, h: 0.02, fill: { color: C.gold } });

  // Headline
  s6.addText("3-round automated QA audit. 29 agents. 46 issues found.", {
    x: 0.6, y: 1.1, w: 8.8, h: 0.4,
    fontSize: 14, fontFace: "Calibri", color: C.tan, margin: 0,
  });

  // Defect table
  const tableHeader = [
    { text: "Category", options: { fill: { color: C.bg3 }, color: C.gold, bold: true, fontSize: 12, fontFace: "Calibri", align: "left" } },
    { text: "Issues", options: { fill: { color: C.bg3 }, color: C.gold, bold: true, fontSize: 12, fontFace: "Calibri", align: "center" } },
    { text: "Severity", options: { fill: { color: C.bg3 }, color: C.gold, bold: true, fontSize: 12, fontFace: "Calibri", align: "center" } },
  ];

  const defectRows = [
    ["Cosmetic / UI", "19", "Font sizes, CSS clipping, alignment"],
    ["UX Polish", "13", "Toasts, banners, kick flows"],
    ["Security Hardening", "6", "Dev gates, data stripping"],
    ["Audio Wiring", "4", "Narrator cue timing"],
    ["Dead Code", "4", "Unused exports, stale files"],
    ["Architectural", "0", "\u2014"],
    ["Game Logic", "0", "\u2014"],
  ];

  const tableData = [tableHeader];
  defectRows.forEach((row) => {
    const isZero = row[1] === "0";
    tableData.push([
      { text: row[0], options: { color: isZero ? C.green : C.cream, fontSize: 12, fontFace: "Calibri", align: "left" } },
      { text: row[1], options: { color: isZero ? C.green : C.goldBright, fontSize: 12, fontFace: "Georgia", bold: true, align: "center" } },
      { text: row[2], options: { color: C.tan, fontSize: 11, fontFace: "Calibri", align: "left" } },
    ]);
  });

  s6.addTable(tableData, {
    x: 0.6, y: 1.6, w: 8.8,
    colW: [2.5, 1.2, 5.1],
    rowH: 0.38,
    border: { pt: 0.5, color: C.bg3 },
    fill: { color: C.bg2 },
  });

  // Punchline callout
  s6.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.6, w: 9.0, h: 0.7, fill: { color: C.bg2 }, shadow: cardShadow() });
  s6.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.6, w: 0.06, h: 0.7, fill: { color: C.goldBright } });
  s6.addText("Zero architectural defects. Zero game logic defects. The spec was right \u2014 so the code was right.", {
    x: 0.8, y: 4.6, w: 8.5, h: 0.7,
    fontSize: 14, fontFace: "Georgia", color: C.cream, italic: true,
    valign: "middle", margin: 0,
  });

  // =====================================================
  // SLIDE 7: CLOSING
  // =====================================================
  const s7 = pres.addSlide();
  s7.background = { color: C.bg1 };

  // Top gold line
  s7.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0.8, w: 10, h: 0.02, fill: { color: C.gold } });

  s7.addText("THE TAKEAWAY", {
    x: 0.5, y: 1.2, w: 9, h: 0.7,
    fontSize: 32, fontFace: "Georgia", color: C.goldBright, bold: true,
    align: "center", margin: 0,
  });

  s7.addText("Rigorous upfront planning meant the build phase was execution, not discovery.", {
    x: 1.0, y: 2.1, w: 8.0, h: 0.6,
    fontSize: 17, fontFace: "Georgia", color: C.cream, italic: true,
    align: "center", margin: 0,
  });

  // Three pillars
  const pillars = [
    { title: "Plan It Right", body: "Locked spec, 7 phase plans,\n227-rule checklist" },
    { title: "Build It Once", body: "Autonomous execution,\nzero rework on fundamentals" },
    { title: "Prove It Works", body: "1,260 tests, 4 browsers,\n209/209 rules verified" },
  ];

  pillars.forEach((p, i) => {
    const px = 0.6 + i * 3.15;
    s7.addShape(pres.shapes.RECTANGLE, { x: px, y: 3.0, w: 2.8, h: 1.8, fill: { color: C.bg2 }, shadow: cardShadow() });
    s7.addText(p.title, {
      x: px + 0.2, y: 3.15, w: 2.4, h: 0.45,
      fontSize: 16, fontFace: "Georgia", color: C.goldBright, bold: true, align: "center", margin: 0,
    });
    s7.addText(p.body, {
      x: px + 0.2, y: 3.65, w: 2.4, h: 0.9,
      fontSize: 12, fontFace: "Calibri", color: C.tan, align: "center", valign: "top", margin: 0,
    });
  });

  // Bottom gold line
  s7.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.0, w: 10, h: 0.02, fill: { color: C.gold } });

  // =====================================================
  // WRITE FILE
  // =====================================================
  const outPath = path.join(__dirname, "..", "docs", "UMB-Executive-Summary.pptx");
  await pres.writeFile({ fileName: outPath });
  console.log(`Deck written to: ${outPath}`);
}

buildDeck().catch((err) => { console.error(err); process.exit(1); });

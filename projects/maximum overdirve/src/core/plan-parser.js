/**
 * plan-parser.js — Reads and parses plan files
 * 
 * Plans are markdown files in .planning/phases/phase-N/
 * Each plan has metadata (wave, dependencies, acceptance criteria, file targets)
 * Plans are organized into waves for parallel execution.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class PlanParser {
  constructor(planningDir) {
    this.planningDir = planningDir;
  }

  /**
   * Get the directory for a phase's plans
   */
  phaseDir(phaseNumber) {
    return path.join(this.planningDir, 'phases', `phase-${phaseNumber}`);
  }

  /**
   * List all plan files for a phase
   */
  listPlans(phaseNumber) {
    const dir = this.phaseDir(phaseNumber);
    if (!fs.existsSync(dir)) return [];

    return fs.readdirSync(dir)
      .filter(f => f.match(/^plan-\d+\.md$/))
      .sort()
      .map(f => ({
        filename: f,
        filepath: path.join(dir, f),
        id: f.replace('.md', ''),
        number: parseInt(f.match(/plan-(\d+)/)[1]),
      }));
  }

  /**
   * List strengthened plan files for a phase
   */
  listStrengthenedPlans(phaseNumber) {
    const dir = this.phaseDir(phaseNumber);
    if (!fs.existsSync(dir)) return [];

    return fs.readdirSync(dir)
      .filter(f => f.match(/^plan-\d+-strengthened\.md$/))
      .sort()
      .map(f => ({
        filename: f,
        filepath: path.join(dir, f),
        id: f.replace('-strengthened.md', ''),
        number: parseInt(f.match(/plan-(\d+)/)[1]),
      }));
  }

  /**
   * Read and parse a single plan file
   * Plans have YAML frontmatter with metadata
   */
  readPlan(filepath) {
    const raw = fs.readFileSync(filepath, 'utf8');
    return this._parsePlan(raw, filepath);
  }

  /**
   * Parse the roadmap file created during init
   */
  readRoadmap() {
    const roadmapPath = path.join(this.planningDir, 'roadmap.md');
    if (!fs.existsSync(roadmapPath)) return null;
    return fs.readFileSync(roadmapPath, 'utf8');
  }

  /**
   * Organize plans into waves based on dependencies
   * Plans in the same wave can run in parallel.
   * Plans in different waves run serially.
   */
  organizeIntoWaves(plans) {
    const waves = {};

    for (const plan of plans) {
      const parsed = this.readPlan(plan.filepath);
      const wave = parsed.metadata?.wave || 1;
      if (!waves[wave]) waves[wave] = [];
      waves[wave].push({ ...plan, parsed });
    }

    // Return as sorted array of wave groups
    return Object.entries(waves)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([waveNum, wavePlans]) => ({
        wave: parseInt(waveNum),
        plans: wavePlans,
      }));
  }

  /**
   * Extract file references from a plan (for gate checking)
   */
  extractFileReferences(planContent) {
    const refs = [];

    // Known file extensions that indicate actual file paths
    const fileExtensions = /\.(ts|js|tsx|jsx|json|yaml|yml|md|css|scss|html|svg|png|jpg|jpeg|gif|mp3|wav|ogg|ttf|otf|woff|woff2|toml|env|sh|py|rb|go|rs|sql|graphql)$/i;
    
    // Match common file reference patterns
    const patterns = [
      /`([^`]+\.[a-z]+)`/g,           // backtick-wrapped file paths
      /\bsrc\/[^\s,)]+/g,              // src/ paths
      /\bassets\/[^\s,)]+/g,           // assets/ paths
      /\bpublic\/[^\s,)]+/g,          // public/ paths
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(planContent)) !== null) {
        const ref = match[1] || match[0];
        if (ref.includes('.') && !ref.includes('..') && ref.length < 200) {
          // For backtick matches, require path-like structure: either contains a /
          // or ends with a known file extension. This avoids matching error.message, console.log, etc.
          if (match[1]) {
            // This was a backtick match — apply stricter filtering
            if (ref.includes('/') || fileExtensions.test(ref)) {
              refs.push(ref);
            }
          } else {
            // Path-prefix match (src/, assets/, public/) — already specific enough
            refs.push(ref);
          }
        }
      }
    }

    return [...new Set(refs)]; // dedupe
  }

  /**
   * Count plans in a phase
   */
  countPlans(phaseNumber) {
    return this.listPlans(phaseNumber).length;
  }

  /**
   * Count strengthened plans in a phase
   */
  countStrengthenedPlans(phaseNumber) {
    return this.listStrengthenedPlans(phaseNumber).length;
  }

  /**
   * Write the roadmap to disk
   */
  writeRoadmap(content) {
    const roadmapPath = path.join(this.planningDir, 'roadmap.md');
    fs.mkdirSync(path.dirname(roadmapPath), { recursive: true });
    fs.writeFileSync(roadmapPath, content, 'utf8');
    return roadmapPath;
  }

  /**
   * Write a plan file
   */
  writePlan(phaseNumber, planNumber, content) {
    const dir = this.phaseDir(phaseNumber);
    fs.mkdirSync(dir, { recursive: true });
    const filepath = path.join(dir, `plan-${String(planNumber).padStart(2, '0')}.md`);
    fs.writeFileSync(filepath, content, 'utf8');
    return filepath;
  }

  /**
   * Write a strengthened plan file
   */
  writeStrengthenedPlan(phaseNumber, planNumber, content) {
    const dir = this.phaseDir(phaseNumber);
    fs.mkdirSync(dir, { recursive: true });
    const filepath = path.join(dir, `plan-${String(planNumber).padStart(2, '0')}-strengthened.md`);
    fs.writeFileSync(filepath, content, 'utf8');
    return filepath;
  }

  // --- Internal ---

  _parsePlan(raw, filepath) {
    // Try to extract YAML frontmatter
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    let metadata = {};
    let content = raw;

    if (fmMatch) {
      try {
        metadata = yaml.load(fmMatch[1]) || {};
      } catch (e) {
        // Bad YAML, just treat as content
      }
      content = fmMatch[2];
    }

    return {
      filepath,
      metadata,
      content,
      raw,
    };
  }
}

module.exports = PlanParser;

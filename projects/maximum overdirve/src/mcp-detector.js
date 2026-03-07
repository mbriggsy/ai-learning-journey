/**
 * mcp-detector.js — Discovers available MCP servers
 * 
 * Checks multiple sources:
 * 1. User config: ~/.claude.json
 * 2. Project config: .mcp.json  
 * 3. Claude settings: .claude/settings.json
 * 4. Live check: `claude mcp list` (most authoritative)
 * 5. overdrive config: .overdrive.yaml
 * 
 * Returns which MCP servers are available so the strengthen prompt
 * can instruct agents to USE them for world-class research.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Known MCP servers we care about and what they do
const KNOWN_SERVERS = {
  'context7': {
    description: 'Live, version-specific framework and library documentation',
    strengthenRole: 'research',
    tools: ['resolve-library-id', 'get-library-docs'],
    detectNames: ['context7', 'context-7'],
  },
  'sequential-thinking': {
    description: 'Structured step-by-step reasoning for complex analysis',
    strengthenRole: 'reasoning',
    tools: ['sequentialthinking'],
    detectNames: ['sequential-thinking', 'sequentialthinking', 'sequential_thinking', 'sequentialthinking-tools'],
  },
  'serena': {
    description: 'Semantic code navigation and analysis',
    strengthenRole: 'code-analysis',
    tools: ['find-symbol', 'find-references'],
    detectNames: ['serena'],
  },
};

class McpDetector {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this._cache = null;
  }

  /**
   * Detect all available MCP servers. Returns a structured report.
   * Caches result for the lifetime of this instance.
   */
  detect() {
    if (this._cache) return this._cache;

    const detected = {};
    const sources = [];

    // Source 1: User config (~/.claude.json)
    const userConfig = this._readUserConfig();
    if (userConfig) {
      sources.push('~/.claude.json');
      this._mergeServers(detected, userConfig);
    }

    // Source 2: Project config (.mcp.json)
    const projectConfig = this._readProjectConfig();
    if (projectConfig) {
      sources.push('.mcp.json');
      this._mergeServers(detected, projectConfig);
    }

    // Source 3: Claude settings (.claude/settings.json)
    const claudeSettings = this._readClaudeSettings();
    if (claudeSettings) {
      sources.push('.claude/settings.json');
      this._mergeServers(detected, claudeSettings);
    }

    // Source 4: overdrive config
    const asdlcConfig = this._readAsdlcConfig();
    if (asdlcConfig) {
      sources.push('.overdrive.yaml');
      for (const name of asdlcConfig) {
        if (!detected[name]) detected[name] = { source: '.overdrive.yaml' };
      }
    }

    // Source 5: Live check (most authoritative, but may be slow)
    const liveServers = this._liveCheck();
    if (liveServers) {
      sources.push('claude mcp list');
      for (const name of liveServers) {
        if (detected[name]) {
          detected[name].live = true;
        } else {
          detected[name] = { source: 'claude mcp list', live: true };
        }
      }
    }

    // Map to known servers
    const result = {
      sources,
      servers: detected,
      hasContext7: this._hasServer(detected, 'context7'),
      hasSequentialThinking: this._hasServer(detected, 'sequential-thinking'),
      hasSerena: this._hasServer(detected, 'serena'),
      knownServers: {},
    };

    // Build known server details
    for (const [key, info] of Object.entries(KNOWN_SERVERS)) {
      if (this._hasServer(detected, key)) {
        result.knownServers[key] = {
          ...info,
          available: true,
        };
      }
    }

    this._cache = result;
    return result;
  }

  /**
   * Generate the MCP enhancement block for the strengthen prompt.
   * This tells the agents what tools are available and how to use them.
   */
  generatePromptEnhancement() {
    const detection = this.detect();
    const blocks = [];

    if (!detection.hasContext7 && !detection.hasSequentialThinking && !detection.hasSerena) {
      blocks.push([
        '## MCP Research Tools',
        '',
        'No MCP research servers detected. Agents will rely on training knowledge',
        'for API validation and code analysis. For world-class strengthening, install:',
        '',
        '- **Context7** — live, version-specific framework docs:',
        '  `claude mcp add context7 --type http --url https://mcp.context7.com/mcp`',
        '- **Sequential Thinking** — structured reasoning for complex analysis:',
        '  `claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking`',
        '- **Serena** — semantic code navigation (ground truth for existing code):',
        '  `claude mcp add serena -- npx -y @anthropic/serena`',
      ].join('\n'));
      return blocks.join('\n\n');
    }

    blocks.push('## MCP Research Tools — AVAILABLE');
    blocks.push('The following MCP research tools are available to the Strike Team. **USE THEM.** These are not optional nice-to-haves — they are force multipliers that make the difference between "probably correct" and "verified correct."');

    if (detection.hasContext7) {
      blocks.push([
        '### Context7 — Live Framework Documentation 📡',
        '',
        'Context7 provides **live, version-specific documentation** for frameworks and libraries.',
        'This is not hallucinated knowledge from training data. This is the actual current docs.',
        '',
        '**Which agents MUST use Context7:**',
        '- 🔬 **The Surgeon** — Before flagging any API issue, verify against Context7 docs. Don\'t trust training data for method signatures, parameter types, or return values. Look it up.',
        '- 🔎 **The Researcher** — This is your primary research tool. Every library, framework, and tool used in the plan should be verified against Context7\'s live docs. Check for deprecations, version-specific behavior, breaking changes.',
        '- 📐 **The Accountant** — Use Context7 to verify that naming conventions, data shapes, and API contracts match the library\'s documented expectations.',
        '- 🛡️ **The Guardian** (if active) — Verify ORM/database library behavior against current docs. Query builders, migration APIs, and connection management change between versions.',
        '- 🗺️ **The Cartographer** (if active) — Validate API design patterns against the framework\'s recommended practices.',
        '',
        '**How to use:** When reviewing any API call, library usage, or framework pattern, use the `resolve-library-id` tool to find the library, then `get-library-docs` to fetch the specific documentation section. Cross-reference every API call in the plan against the live docs.',
        '',
        '**Critical rule:** If Context7 docs contradict the plan\'s API usage, Context7 wins. Always. Training data goes stale. Live docs don\'t.',
      ].join('\n'));
    }

    if (detection.hasSequentialThinking) {
      blocks.push([
        '### Sequential Thinking — Structured Reasoning Chains 🧠',
        '',
        'Sequential Thinking provides **structured step-by-step reasoning** for complex analysis.',
        'Use it when a review requires tracing multi-step logic, dependency chains, or race conditions.',
        '',
        '**Which agents MUST use Sequential Thinking:**',
        '- 🏗️ **The Architect** — Use structured reasoning to trace dependency chains across modules. Walk through the import graph step by step. Verify boundary integrity systematically, not by gut feel.',
        '- 🕵️ **The Saboteur** — Use sequential thinking to trace failure propagation. Start with a failure condition, then step through every code path it touches. Document each step.',
        '- ⏱️ **The Timekeeper** (if active) — This is CRITICAL. Race conditions are nearly impossible to reason about without structured step-by-step analysis. Use sequential thinking to interleave possible execution orderings and identify conflicts.',
        '- 🔮 **The Oracle** — Use structured reasoning to trace how today\'s interface decisions propagate into future phase requirements. Walk through each consuming module step by step.',
        '- 🧹 **The Janitor** (if active) — Trace error propagation paths step by step. For each operation that can fail, walk through the catch → recover → retry → propagate chain.',
        '',
        '**How to use:** For any analysis that involves multi-step reasoning, causation chains, or temporal ordering, invoke the `sequentialthinking` tool. Break the analysis into explicit numbered steps. Each step should build on the previous one. Revise earlier steps if later analysis reveals errors.',
        '',
        '**Critical rule:** If an analysis involves more than 3 logical steps (A causes B, B triggers C, C conflicts with D), use Sequential Thinking. Human-style "hold it all in your head" reasoning misses interactions. Structured chains catch them.',
      ].join('\n'));
    }

    if (detection.hasSerena) {
      blocks.push([
        '### Serena — Semantic Code Navigation & Ground Truth 🔍',
        '',
        'Serena provides **semantic code navigation** — finding symbols, references, implementations,',
        'and usages across the actual codebase. This is not grepping filenames. This is understanding',
        'the code the way an IDE does: resolving types, tracing call chains, finding every consumer',
        'of an interface.',
        '',
        '**Why this matters:** The other MCP tools verify the plan against EXTERNAL truth (docs, reasoning).',
        'Serena verifies the plan against INTERNAL truth — the actual current state of the codebase.',
        'Without Serena, agents review the plan in isolation and hope it matches reality.',
        'With Serena, they KNOW.',
        '',
        '**Context-activation rule:** Serena\'s value scales with codebase size. Phase 1 of a greenfield',
        'project has little to navigate. By Phase 2+, Serena becomes critical — plans modify existing',
        'code, and agents need to verify what\'s actually there before assessing proposed changes.',
        '',
        '**Which agents MUST use Serena (when codebase exists):**',
        '',
        '- 🏗️ **The Architect** — This is your ground truth tool. Don\'t review architectural boundaries',
        '  by reading the plan\'s claims about what imports exist. USE SERENA to trace actual imports.',
        '  `find-references` on a module\'s exports reveals every consumer. `find-symbol` on a type',
        '  reveals where it\'s defined and whether the plan\'s understanding of its shape matches reality.',
        '  If the plan says "Module A doesn\'t import from Module B" — verify it. Trust but verify.',
        '',
        '- 📐 **The Accountant** — Use Serena to verify naming consistency across the REAL codebase,',
        '  not just within the plan. `find-symbol` on a function name reveals if the same name is used',
        '  elsewhere with different casing, different parameter types, or different semantics. Find every',
        '  place a data structure is referenced to confirm all consumers agree on field names and types.',
        '  The plan might be internally consistent but inconsistent with existing code — Serena catches that.',
        '',
        '- 🔮 **The Oracle** — Before assessing integration impact, use Serena to map the ACTUAL dependency',
        '  graph. `find-references` on an interface reveals every module that depends on it TODAY — not what',
        '  the plan thinks depends on it. This grounds the integration impact assessment in reality.',
        '  When the plan changes an interface, Serena tells you exactly how many consumers need to update.',
        '',
        '- 🛡️ **The Guardian** (if active) — Use Serena to trace data model references across the codebase.',
        '  Before reviewing a migration or schema change, find every query, every model reference, every',
        '  serializer that touches the affected table. The plan might list 3 files that need updating;',
        '  Serena might reveal 7.',
        '',
        '- ⚡ **The Profiler** — Use Serena to find all call sites of a function being analyzed for performance.',
        '  A function that looks fine when called once might be called inside a loop somewhere the plan',
        '  doesn\'t mention. `find-references` reveals the actual call frequency and context.',
        '',
        '- 🔒 **The Sentinel** — Use Serena to trace data flow from trust boundaries into the codebase.',
        '  `find-references` on an input parameter reveals everywhere that unsanitized data flows.',
        '  If the plan claims input is validated at the boundary, verify that no other code path',
        '  bypasses that validation by accepting the raw value directly.',
        '',
        '**How to use:** When reviewing any plan that modifies or depends on existing code, use `find-symbol`',
        'to verify the current state of types, functions, and modules referenced in the plan. Use',
        '`find-references` to discover all consumers of any interface being changed. The plan describes',
        'what SHOULD exist; Serena shows what DOES exist. Discrepancies are bugs.',
        '',
        '**Critical rule:** If Serena\'s findings contradict the plan\'s assumptions about the existing codebase,',
        'Serena wins. The plan was written from a spec and a roadmap. Serena reads the actual files.',
        'When they disagree, the code is right and the plan is wrong.',
      ].join('\n'));
    }

    return blocks.join('\n\n');
  }

  /**
   * Get the list of MCP server names to pass to claude CLI
   */
  getServerNames() {
    const detection = this.detect();
    return Object.keys(detection.servers);
  }

  /**
   * Print a detection report to console
   */
  printReport() {
    const chalk = require('chalk');
    const detection = this.detect();

    console.log(chalk.bold('\n🔌 MCP Server Detection\n'));
    console.log(chalk.gray(`   Sources checked: ${detection.sources.join(', ') || 'none'}`));

    const serverCount = Object.keys(detection.servers).length;
    if (serverCount === 0) {
      console.log(chalk.yellow('   No MCP servers detected.'));
      console.log(chalk.gray('   Install for world-class strengthening:'));
      console.log(chalk.gray('     claude mcp add context7 --type http --url https://mcp.context7.com/mcp'));
      console.log(chalk.gray('     claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking'));
      console.log(chalk.gray('     claude mcp add serena -- npx -y @anthropic/serena'));
    } else {
      for (const [name, info] of Object.entries(detection.servers)) {
        const known = Object.entries(KNOWN_SERVERS).find(([_, v]) => v.detectNames.includes(name));
        const label = known ? known[1].description : 'Unknown server';
        const liveTag = info.live ? chalk.green(' [live]') : chalk.gray(' [configured]');
        console.log(`   ${chalk.cyan('•')} ${name}${liveTag} — ${label}`);
      }
    }

    // Summary
    const c7 = detection.hasContext7 ? chalk.green('✓') : chalk.red('✗');
    const st = detection.hasSequentialThinking ? chalk.green('✓') : chalk.red('✗');
    const sr = detection.hasSerena ? chalk.green('✓') : chalk.gray('–');

    console.log(`\n   Context7: ${c7}  Sequential Thinking: ${st}  Serena: ${sr}`);
    console.log('');
  }

  // --- Internal detection methods ---

  _readUserConfig() {
    const configPath = path.join(os.homedir(), '.claude.json');
    return this._extractServers(configPath);
  }

  _readProjectConfig() {
    const configPath = path.join(this.projectRoot, '.mcp.json');
    return this._extractServers(configPath);
  }

  _readClaudeSettings() {
    const configPath = path.join(this.projectRoot, '.claude', 'settings.json');
    return this._extractServers(configPath);
  }

  _readAsdlcConfig() {
    try {
      const configPath = path.join(this.projectRoot, '.overdrive.yaml');
      if (!fs.existsSync(configPath)) return null;
      const yaml = require('js-yaml');
      const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
      return config?.mcp_servers || null;
    } catch { return null; }
  }

  _extractServers(configPath) {
    try {
      if (!fs.existsSync(configPath)) return null;
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const servers = config.mcpServers || config.mcp_servers || {};
      if (Object.keys(servers).length === 0) return null;
      return servers;
    } catch { return null; }
  }

  _liveCheck() {
    try {
      const output = execSync('claude mcp list 2>/dev/null', {
        encoding: 'utf8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      // Parse output — typically "name: status" per line
      const servers = [];
      for (const line of output.split('\n')) {
        const match = line.match(/^\s*[•\-*]?\s*(\S+)/);
        if (match && match[1] && !match[1].includes(':') && match[1].length > 1) {
          servers.push(match[1].toLowerCase());
        }
        // Also catch "name: connected" format
        const kvMatch = line.match(/^\s*[•\-*]?\s*(\S+)\s*:\s*(connected|running|ready)/i);
        if (kvMatch) {
          servers.push(kvMatch[1].toLowerCase());
        }
      }
      return servers.length > 0 ? servers : null;
    } catch {
      // claude CLI not available or command failed — that's fine
      return null;
    }
  }

  _mergeServers(detected, servers) {
    for (const name of Object.keys(servers)) {
      const lower = name.toLowerCase();
      if (!detected[lower]) {
        detected[lower] = { source: 'config', config: servers[name] };
      }
    }
  }

  _hasServer(detected, knownKey) {
    const info = KNOWN_SERVERS[knownKey];
    if (!info) return false;
    return info.detectNames.some(name => 
      Object.keys(detected).some(d => d.toLowerCase().includes(name))
    );
  }
}

module.exports = McpDetector;

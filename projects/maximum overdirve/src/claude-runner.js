/**
 * claude-runner.js — Wraps `claude` CLI invocations
 * 
 * The atomic unit: one `claude` invocation = one fresh 200K context window = one focused task.
 * Each execSync/spawn call = new process = guaranteed fresh context.
 * This is THE fundamental architectural advantage over slash commands.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ClaudeRunner {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.models = options.models || {};
    this.mcpServers = options.mcpServers || [];
    this.timeouts = options.timeouts || {};
    this.logsDir = options.logsDir || path.join(this.projectRoot, '.planning', 'logs');
    this.logger = options.logger || null;

    // Ensure logs directory exists
    fs.mkdirSync(this.logsDir, { recursive: true });
  }

  /**
   * Run a Claude invocation synchronously (blocks until complete)
   * 
   * @param {string} prompt - The full prompt text
   * @param {object} options
   * @param {string[]} options.contextFiles - Files to pass as --context
   * @param {string[]} options.allowedTools - Tools to enable (Bash, Read, Write, Edit)
   * @param {number} options.timeout - Timeout in ms
   * @param {string} options.model - Model override
   * @param {string} options.logLabel - Label for log file
   * @returns {object} { output, exitCode, duration }
   */
  run(prompt, options = {}) {
    const {
      contextFiles = [],
      allowedTools = [],
      timeout = 300000,
      model = null,
      logLabel = 'claude-run',
      mcpServers = [],
    } = options;

    const args = this._buildArgs(prompt, { contextFiles, allowedTools, model, mcpServers });
    const cmd = `claude ${args.join(' ')}`;

    const startTime = Date.now();
    let output = '';
    let exitCode = 0;

    try {
      output = execSync(cmd, {
        timeout,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB
        cwd: this.projectRoot,
        env: { ...process.env },
      });
    } catch (err) {
      exitCode = err.status || 1;
      output = (err.stdout || '') + '\n' + (err.stderr || '');
    }

    const duration = Date.now() - startTime;

    // Write log
    this._writeLog(logLabel, { cmd, output, exitCode, duration });

    return { output: output.trim(), exitCode, duration };
  }

  /**
   * Run a Claude invocation for execution tasks (needs tool access, captures full output)
   * Uses spawn for streaming + logging
   */
  runExecution(prompt, options = {}) {
    const {
      contextFiles = [],
      allowedTools = ['Bash', 'Read', 'Write', 'Edit'],
      timeout = 600000,
      model = null,
      logLabel = 'code',
      mcpServers = [],
    } = options;

    return new Promise((resolve, reject) => {
      const args = this._buildArgs(prompt, { contextFiles, allowedTools, model, mcpServers });
      const child = spawn('claude', args, {
        cwd: this.projectRoot,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      const startTime = Date.now();

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Timeout handler
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Claude invocation timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        const duration = Date.now() - startTime;
        const output = stdout + (stderr ? '\n--- STDERR ---\n' + stderr : '');

        this._writeLog(logLabel, {
          cmd: `claude ${args.join(' ')}`,
          output,
          exitCode: code,
          duration,
        });

        resolve({
          output: output.trim(),
          exitCode: code || 0,
          duration,
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * Run multiple Claude invocations in parallel (for wave execution)
   * Each one gets its own fresh context window — that's the whole point.
   */
  async runWave(tasks) {
    const promises = tasks.map(task =>
      this.runExecution(task.prompt, {
        contextFiles: task.contextFiles || [],
        allowedTools: task.allowedTools || ['Bash', 'Read', 'Write', 'Edit'],
        timeout: task.timeout || 600000,
        logLabel: task.logLabel || 'wave-task',
      })
    );

    return Promise.all(promises);
  }

  /**
   * Fill a prompt template with variables
   */
  fillTemplate(templatePath, variables) {
    let template = fs.readFileSync(templatePath, 'utf8');
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      template = template.replaceAll(placeholder, value);
    }
    
    // Detect unreplaced placeholders — this is how C-02 went undetected
    const unreplaced = template.match(/\{\{[A-Z_]+\}\}/g);
    if (unreplaced) {
      const unique = [...new Set(unreplaced)];
      console.warn(`  ⚠ Unreplaced placeholders in ${path.basename(templatePath)}: ${unique.join(', ')}`);
      if (this.logger) {
        this.logger.append({
          action: 'template-warning',
          detail: `Unreplaced placeholders in ${path.basename(templatePath)}: ${unique.join(', ')}`,
          level: 'warn',
        });
      }
    }
    
    return template;
  }

  /**
   * Load and fill a prompt from the prompts directory
   * Resolves from tool's install directory first, with projectRoot fallback for overrides
   */
  loadPrompt(promptName, variables = {}) {
    // Try tool's own prompts directory first (works with global install)
    const toolPromptPath = path.join(__dirname, '..', 'prompts', `${promptName}.md`);
    // Then check project root for overrides
    const projectPromptPath = path.join(this.projectRoot, 'prompts', `${promptName}.md`);

    let promptPath;
    if (fs.existsSync(projectPromptPath)) {
      promptPath = projectPromptPath; // Project override wins
    } else if (fs.existsSync(toolPromptPath)) {
      promptPath = toolPromptPath; // Fall back to bundled prompt
    } else {
      throw new Error(`Prompt template not found: checked ${projectPromptPath} and ${toolPromptPath}`);
    }

    return this.fillTemplate(promptPath, variables);
  }

  // --- Internal ---

  _buildArgs(prompt, { contextFiles = [], allowedTools = [], model = null, mcpServers = [] }) {
    const args = ['-p', JSON.stringify(prompt), '--output-format', 'text'];

    // Model selection
    if (model) {
      args.push('--model', model);
    }

    // Context files — only include files that exist
    for (const file of contextFiles) {
      const resolved = path.isAbsolute(file) ? file : path.join(this.projectRoot, file);
      if (fs.existsSync(resolved)) {
        args.push('--context', resolved);
      }
    }

    // Allowed tools
    if (allowedTools.length > 0) {
      args.push('--allowedTools', allowedTools.join(','));
    }

    // MCP servers — merge global config + per-invocation
    const allMcp = [...new Set([...this.mcpServers, ...mcpServers])];
    for (const server of allMcp) {
      args.push('--mcp', server);
    }

    return args;
  }

  _writeLog(label, { cmd, output, exitCode, duration }) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const logFile = path.join(this.logsDir, `${label}-${timestamp}.log`);
    
    const logContent = [
      `# Claude Invocation Log`,
      ``,
      `**Label:** ${label}`,
      `**Timestamp:** ${new Date().toISOString()}`,
      `**Duration:** ${(duration / 1000).toFixed(1)}s`,
      `**Exit Code:** ${exitCode}`,
      ``,
      `## Command`,
      '```',
      cmd,
      '```',
      ``,
      `## Output`,
      '```',
      output,
      '```',
    ].join('\n');

    fs.writeFileSync(logFile, logContent, 'utf8');
  }
}

module.exports = ClaudeRunner;

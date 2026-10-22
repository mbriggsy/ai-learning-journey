# Firecrawl — Deep Dive

Turn any website into clean, LLM-ready data. The web data engine for Claude Code.

---

## What Is Firecrawl?

Firecrawl is an official Claude Code plugin that gives Claude reliable web access for scraping, crawling, searching, and extracting structured data from the web. It handles the hard parts automatically — JavaScript rendering, anti-bot detection, proxy rotation — and outputs clean markdown or structured JSON that Claude can actually reason about.

**By:** Firecrawl  
**License:** AGPL-3.0 (self-hostable)  
**GitHub:** [github.com/firecrawl/firecrawl-claude-plugin](https://github.com/firecrawl/firecrawl-claude-plugin)  
**API Key:** Free at [firecrawl.dev/app/api-keys](https://firecrawl.dev/app/api-keys) (500 free credits)

---

## The Problem It Solves

Getting usable web data into Claude is painful. JavaScript-heavy sites don't render with a simple fetch. Anti-bot measures block scrapers. Raw HTML is token-wasteful garbage Claude can't parse well. And if you do manage to scrape something, you've got formatting artifacts, nav bars, cookie notices, and ad markup mixed in with the actual content.

Firecrawl handles all of this and outputs clean, structured data. Claude just describes what it wants and gets it.

---

## Commands

| Command | What It Does |
|---|---|
| `/firecrawl:scrape` | Extract a single webpage as clean markdown |
| `/firecrawl:crawl` | Crawl and extract content from an entire website |
| `/firecrawl:search` | Search the web and get scraped results back |
| `/firecrawl:map` | Discover all URLs on a site |
| `/firecrawl:agent` | Describe data you need in plain language; AI autonomously finds and extracts it |
| `/firecrawl:setup` | Configure your API key |

### The Agent Command

The standout feature. Instead of providing URLs, you describe what data you need in natural language and Firecrawl's AI agent autonomously searches, navigates, and gathers data from multiple sites — finding information in hard-to-reach places without you doing any site mapping or URL construction.

```
Use Firecrawl agent to find the most recent research papers
on browser automation and reference it in my article
```

---

## How It Works

Firecrawl operates via both a CLI and MCP server. When installed as a plugin, Claude Code can use Firecrawl tools automatically — just ask naturally:

- "Scrape the pricing page at example.com"
- "Crawl the React docs and summarize the new features"
- "Search for recent AI benchmarks and extract the data"
- "Map all URLs on competitor.com"

### Context Management

Results are saved to a `.firecrawl/` directory in your project rather than dumped into Claude's context window:

```
.firecrawl/search-react_server_components.json
.firecrawl/docs.github.com-actions-overview.md
.firecrawl/firecrawl.dev.md
```

This keeps Claude's context clean — it reads from the files as needed instead of having raw web content bloating the conversation.

### Output Formats

- **Markdown** — Clean, structured text (default)
- **HTML** — Full page markup
- **Screenshots** — Full-page captures of any URL
- **Structured JSON** — Extract specific fields using custom schemas
- **Links** — URL discovery and site mapping

---

## Use Cases

**Documentation Aggregation** — Crawl an entire framework's doc site before a migration. Get all the content locally so Claude can reference it without repeated web calls.

**Competitive Research** — Scrape competitor pricing pages, feature lists, and positioning. Extract structured data for comparison.

**Lead Enrichment** — Pull company info, tech stacks, contact data from business websites.

**Content Monitoring** — Track changes across web pages over time by scraping periodically and having Claude diff the results.

**Research Agents** — Autonomous multi-source data gathering for reports, articles, or analysis.

---

## Installation

### Plugin Method (Recommended)

```bash
# Search and install from marketplace
/plugin marketplace add firecrawl
/plugin install firecrawl

# Configure API key
/firecrawl:setup
```

### CLI Method

```bash
npm install -g @anthropic-ai/firecrawl
firecrawl auth
```

### CLI Usage (Direct)

```bash
# Scrape a page to markdown
firecrawl scrape https://example.com/pricing --format markdown -o pricing.md

# Crawl an entire website
firecrawl crawl https://example.com --wait --progress -o example-crawl.json

# Map a domain
firecrawl map https://example.com -o sitemap.json

# Search and scrape results
firecrawl search "AI agent benchmarks 2026" --scrape --limit 5 -o results/
```

### Self-Hosting

Firecrawl can be self-hosted. Set the custom API endpoint:

```bash
export FIRECRAWL_API_URL=https://your-firecrawl-instance.com
```

---

## Benchmarks

Firecrawl claims >80% coverage on their benchmark evaluations, outperforming other web scraping providers tested. Methodology: checked 1,000 URLs for content recall against the `firecrawl scrape-content-dataset-v1` dataset.

---

## Pairs Well With

- **Context7** — Context7 fetches library docs; Firecrawl fetches everything else on the web
- **Compound Engineering** — Scrape research for the Plan phase, capture learnings in the Compound phase
- **Ralph Wiggum** — Autonomous loops that need web research as part of their execution

---

## Watch Out For

- **Credits add up** — 500 free credits is good for testing, but heavy crawling burns through them fast. Monitor usage.
- **Self-host for volume** — If you're doing heavy research, self-hosting eliminates per-call costs
- **Not a substitute for web search** — Firecrawl scrapes known URLs and crawls sites. For discovery of unknown sources, use the search command or pair with web search tools.

---

*Last updated: February 2026*

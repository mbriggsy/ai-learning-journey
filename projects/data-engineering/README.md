---
aliases: [data-engineering, data-eng, DE]
tags: [project, focus-area]
---

# Data Engineering

Focus area declared 2026-04-17. Home for all projects targeting the Azure data-engineering stack:

- **ADF** — Azure Data Factory
- **Azure Databricks** — Spark compute, notebooks, jobs
- **Unity Catalog** — governance, lineage, permissions
- **ADLS Gen2** — Azure Data Lake Storage
- **Delta Lake** — storage format (ACID, time travel, OPTIMIZE/VACUUM)

## Projects

| Project | Status | Purpose |
|---|---|---|
| [atc](./atc/) | Methodology v1.0 + viz shipped | An agentic SDLC for data engineering builds. PRD → Plans → Deepen → Execute → Review → Evidence. |
| [etl-reverse-engineering](./etl-reverse-engineering/) | Pre-plan | Claude Code skill that reverse-engineers shit-show ETL jobs into rebuild-ready PRDs. Feeds ATC Chapter 1. |

For the at-a-glance intro to ATC, open [`atc/viz/index.html`](./atc/viz/index.html) — single-page visual summary of the methodology.

## Project Map

> Internal docs surfaced for the Obsidian graph.

- **ATC methodology:** [[atc/README|atc/README]] · [[atc/01-prd|01 PRD]] · [[atc/02-plan|02 Plan]] · [[atc/03-execute|03 Execute]] · [[atc/04-review|04 Review]] · [[atc/05-evidence|05 Evidence]] · [[atc/skills|skills]] · [[atc/TODO
# Architecture Overview

## System Design

DataPipe is built around a pipeline-of-stages model. Each stage wraps a transform and handles schema validation, error handling, and logging.

```
Pipeline
├── Stage 1: Extract
│   ├── Transform (CsvReader)
│   ├── Input Schema (optional)
│   └── Output Schema (optional)
├── Stage 2: Transform
│   ├── Transform (RowFilter)
│   ├── Input Schema
│   └── Output Schema
└── Stage 3: Load
    ├── Transform (CsvWriter)
    └── Input Schema
```

## Core Components

### Pipeline

The `Pipeline` class is the top-level orchestrator. It:
- Loads configuration (YAML or Python)
- Validates the stage graph
- Manages execution (sequential or parallel)
- Collects metrics and logs

### Stage

A `Stage` wraps a single transform with:
- Input/output schema validation (via Pydantic v2)
- Error handling and retry logic
- Timing and row count metrics

### Transform

The `Transform` base class defines the interface:
- `execute(data, params?)` — the core logic
- `validate(data)` — optional pre-execution check
- `cleanup()` — optional post-execution teardown

### Registry

The `Registry` maps string names to transform classes. Built-in transforms are registered at import time. Plugins register via entry points.

## Tech Stack

- **Language**: Python 3.10+
- **Schema validation**: Pydantic v2
- **Parallel execution**: concurrent.futures
- **Configuration**: PyYAML + Pydantic
- **Testing**: pytest + hypothesis
- **Type checking**: mypy (strict mode)

## Data Flow

```
Input → [Schema Validate] → [Transform] → [Schema Validate] → Output
                                                    ↓
                                              Next Stage
```

Each stage receives the output of the previous stage. Stages can also branch (fan-out) or merge (fan-in) using the DAG configuration.

## Error Strategy

Errors are categorized:
- **Validation errors**: Schema mismatches, caught before transform runs
- **Transform errors**: Runtime failures in user code
- **System errors**: OOM, disk full, network timeouts

All errors are wrapped in `PipelineError` with stage context, making debugging straightforward.

## See Also

- [Design Decisions](design-decisions.md) — why we made the choices we did
- [Plugin System](plugin-system.md) — how the plugin architecture works

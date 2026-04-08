# Design Decisions

This document captures key architectural decisions and their rationale.

## DD-001: Pydantic for Schema Validation

**Decision**: Use Pydantic v1 for schema validation at pipeline stages.

**Rationale**: Pydantic provides runtime type checking with minimal boilerplate. It integrates naturally with our YAML config loading (YAML → dict → Pydantic model) and gives clear error messages.

**Alternatives considered**:
- `marshmallow` — more verbose, less Python-native
- `attrs` + `cattrs` — good but less ecosystem support
- Plain dataclasses — no runtime validation

## DD-002: concurrent.futures over asyncio

**Decision**: Use `concurrent.futures` for parallel execution instead of asyncio.

**Rationale**: Most data transforms are CPU-bound, not I/O-bound. `ThreadPoolExecutor` and `ProcessPoolExecutor` are simpler to reason about for batch processing. Users don't need to think about `async/await`.

**Alternatives considered**:
- `asyncio` — adds complexity, better for I/O-bound
- `multiprocessing` directly — lower-level, more error-prone
- `dask` — heavyweight dependency (planned for Phase 4)

## DD-003: YAML-first Configuration

**Decision**: YAML as the primary config format, with Python as an escape hatch.

**Rationale**: YAML configs are version-controllable, diffable, and readable by non-engineers. Python API exists for dynamic pipeline construction.

## DD-004: Plugin Registry via Entry Points

**Decision**: Use Python entry points for plugin discovery.

**Rationale**: Standard Python packaging mechanism. No custom discovery needed. Users install plugins with `pip install datapipe-plugin-foo` and they're automatically available.

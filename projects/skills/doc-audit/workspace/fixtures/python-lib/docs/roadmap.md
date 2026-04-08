# DataPipe Roadmap

## Phase 1: Core Pipeline Engine (COMPLETE)

- [x] Pipeline class with stage orchestration
- [x] YAML configuration loading
- [x] Sequential execution
- [x] Basic error handling
- [x] Schema validation with Pydantic v1
- [x] Logging framework

**Status**: Released in v0.1.0

## Phase 2: Plugin System and Built-in Transforms (COMPLETE)

- [x] Transform registry
- [x] Entry point-based plugin discovery
- [x] Built-in transforms: csv_reader, csv_writer, json_reader, json_writer, row_filter, column_select, aggregator, joiner
- [x] Custom transform base class
- [x] Testing utilities

**Status**: Released in v0.5.0

## Phase 3: Streaming Support (IN PROGRESS)

- [ ] Streaming pipeline mode for large datasets
- [ ] Chunk-based processing
- [ ] Memory usage controls
- [ ] Backpressure handling
- [ ] Progress reporting

**Status**: Implementation started. Target: v1.0.0

## Phase 4: Distributed Execution (PLANNED)

- [ ] Dask integration for distributed execution
- [ ] Cluster configuration
- [ ] Task scheduling and fault tolerance
- [ ] Performance benchmarks vs. local execution

**Status**: Research phase. Depends on Phase 3 completion.

## Tech Stack

- **Language**: Python 3.10+
- **Schema validation**: Pydantic v1
- **Parallel execution**: concurrent.futures
- **Configuration**: PyYAML + Pydantic
- **Testing**: pytest + hypothesis

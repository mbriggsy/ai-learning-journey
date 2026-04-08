# DataPipe

A Python library for building declarative data transformation pipelines.

[![PyPI version](https://badge.fury.io/py/datapipe.svg)](https://pypi.org/project/datapipe/)
[![Tests](https://github.com/example/datapipe/actions/workflows/test.yml/badge.svg)](https://github.com/example/datapipe/actions)

## Features

- Declarative pipeline definitions with YAML or Python
- Built-in transforms for common operations (filter, map, aggregate, join)
- Plugin system for custom transforms
- Parallel execution with configurable thread/process pools
- Schema validation at each pipeline stage
- Comprehensive logging and error reporting

## Installation

```bash
pip install datapipe
```

For development:

```bash
pip install datapipe[dev]
```

## Quick Example

```python
from datapipe import Pipeline

pipeline = Pipeline.from_yaml("pipeline.yml")
result = pipeline.run(input_data)
```

See [docs/guides/getting-started.md](docs/guides/getting-started.md) for a full walkthrough.

## Documentation

- [Getting Started](docs/guides/getting-started.md)
- [Pipeline Configuration](docs/guides/configuration.md)
- [Writing Custom Transforms](docs/guides/custom-transforms.md)
- [Architecture Overview](docs/architecture/overview.md)
- [API Reference](docs/api-reference.md)
- [Changelog](CHANGELOG.md)

## Current Status

DataPipe is in active development. We're currently working on:

- [ ] Phase 3: Streaming support for large datasets
- [ ] Phase 4: Distributed execution via Dask
- [x] Phase 1: Core pipeline engine
- [x] Phase 2: Plugin system and built-in transforms

## Tech Stack

- **Language**: Python 3.10+
- **Schema validation**: Pydantic v1
- **Parallel execution**: concurrent.futures
- **Configuration**: PyYAML + Pydantic
- **Testing**: pytest + hypothesis

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Apache 2.0

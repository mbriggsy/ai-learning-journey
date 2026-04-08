# Pipeline Configuration

## YAML Configuration

The simplest way to define a pipeline is with YAML:

```yaml
name: etl-pipeline
version: "1.0"
settings:
  parallel: true
  max_workers: 4
  log_level: INFO
stages:
  - name: extract
    transform: csv_reader
    params:
      path: data/raw.csv
  - name: transform
    transform: row_filter
    params:
      condition: "status == 'active'"
  - name: load
    transform: csv_writer
    params:
      path: data/clean.csv
```

## Python Configuration

For dynamic pipelines, use the Python API:

```python
from datapipe import Pipeline, Stage
from datapipe.transforms import CsvReader, RowFilter, CsvWriter

pipeline = Pipeline(
    name="etl-pipeline",
    stages=[
        Stage("extract", CsvReader(path="data/raw.csv")),
        Stage("filter", RowFilter(condition="status == 'active'")),
        Stage("load", CsvWriter(path="data/clean.csv")),
    ],
    settings={"parallel": True, "max_workers": 4}
)
```

## Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `parallel` | bool | `false` | Enable parallel stage execution |
| `max_workers` | int | `4` | Thread/process pool size |
| `log_level` | str | `INFO` | Logging verbosity |
| `schema_strict` | bool | `true` | Fail on schema violations |
| `retry_count` | int | `0` | Retries per failed stage |
| `retry_delay` | float | `1.0` | Seconds between retries |

## Environment Variables

Override any setting with `DATAPIPE_` prefix:

```bash
DATAPIPE_MAX_WORKERS=8 python run_pipeline.py
```

## Validation

Configuration is validated at load time using Pydantic. Invalid configs raise `ConfigValidationError` with details about what's wrong.

See the architecture doc at docs/architecture/design-decisions.md for why we chose Pydantic for configuration validation.

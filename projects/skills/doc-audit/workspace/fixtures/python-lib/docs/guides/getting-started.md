# Getting Started with DataPipe

## Installation

Install DataPipe from PyPI:

```bash
pip install datapipe
```

You'll also need Python 3.10 or higher.

## Your First Pipeline

Create a file called `pipeline.yml`:

```yaml
name: my-first-pipeline
stages:
  - name: load
    transform: csv_reader
    params:
      path: data/input.csv
  - name: filter
    transform: row_filter
    params:
      condition: "age > 18"
  - name: output
    transform: csv_writer
    params:
      path: data/output.csv
```

Run it:

```python
from datapipe import Pipeline

pipeline = Pipeline.from_yaml("pipeline.yml")
result = pipeline.run()
print(f"Processed {result.row_count} rows")
```

## Pipeline Configuration

Pipelines can also be defined in Python for more flexibility. See the configuration guide at docs/guides/configuration.md for details.

## Built-in Transforms

DataPipe ships with these transforms out of the box:

| Transform | Description |
|-----------|-------------|
| `csv_reader` | Read CSV files |
| `csv_writer` | Write CSV files |
| `json_reader` | Read JSON files |
| `json_writer` | Write JSON files |
| `row_filter` | Filter rows by condition |
| `column_select` | Select specific columns |
| `aggregator` | Group-by aggregations |
| `joiner` | Join two datasets |

For custom transforms, see docs/guides/custom-transforms.md.

## Schema Validation

DataPipe validates data at each pipeline stage using Pydantic models. Define schemas inline or reference external files:

```yaml
stages:
  - name: validate
    transform: schema_validator
    params:
      schema: schemas/user.py:UserSchema
```

## Next Steps

- Read the [configuration guide](configuration.md) for advanced pipeline options
- Learn about [custom transforms](custom-transforms.md)
- Check the [architecture overview](../architecture/overview.md) for how it all fits together

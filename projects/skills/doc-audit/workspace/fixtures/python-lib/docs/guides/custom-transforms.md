# Writing Custom Transforms

## Overview

Custom transforms let you extend DataPipe with your own data processing logic. Every transform is a Python class that inherits from `BaseTransform`.

## Basic Transform

```python
from datapipe.transforms import BaseTransform

class UpperCase(BaseTransform):
    """Convert all string columns to uppercase."""

    def execute(self, data):
        for col in data.string_columns:
            data[col] = data[col].str.upper()
        return data
```

## Registering Transforms

Register custom transforms so they can be referenced by name in YAML configs:

```python
from datapipe.registry import register

@register("uppercase")
class UpperCase(BaseTransform):
    ...
```

Then use in YAML:

```yaml
stages:
  - name: normalize
    transform: uppercase
```

## Transform Parameters

Use Pydantic models for typed parameters:

```python
from pydantic import BaseModel

class FilterParams(BaseModel):
    column: str
    min_value: float
    max_value: float | None = None

class RangeFilter(BaseTransform):
    params_model = FilterParams

    def execute(self, data, params: FilterParams):
        mask = data[params.column] >= params.min_value
        if params.max_value is not None:
            mask &= data[params.column] <= params.max_value
        return data[mask]
```

## Testing Transforms

```python
from datapipe.testing import make_test_data

def test_uppercase():
    data = make_test_data({"name": ["alice", "bob"]})
    result = UpperCase().execute(data)
    assert result["name"].tolist() == ["ALICE", "BOB"]
```

## Plugin Distribution

Package your transforms as a pip-installable plugin. See docs/architecture/plugin-system.md for the plugin spec.

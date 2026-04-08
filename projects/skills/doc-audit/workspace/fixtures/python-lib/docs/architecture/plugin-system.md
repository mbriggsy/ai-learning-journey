# Plugin System

## Overview

DataPipe's plugin system lets you distribute custom transforms as pip-installable packages. Plugins are discovered automatically via Python entry points.

## Creating a Plugin

### 1. Package Structure

```
datapipe-plugin-geo/
├── pyproject.toml
├── src/
│   └── datapipe_geo/
│       ├── __init__.py
│       └── transforms.py
└── tests/
    └── test_transforms.py
```

### 2. Entry Point Configuration

In `pyproject.toml`:

```toml
[project.entry-points."datapipe.transforms"]
geocode = "datapipe_geo.transforms:Geocode"
distance = "datapipe_geo.transforms:Distance"
```

### 3. Transform Implementation

```python
from datapipe.transforms import BaseTransform
from pydantic import BaseModel

class GeocodeParams(BaseModel):
    address_column: str
    api_key: str

class Geocode(BaseTransform):
    params_model = GeocodeParams

    def execute(self, data, params):
        # geocoding logic here
        return data
```

## Plugin Discovery

At import time, DataPipe scans entry points in the `datapipe.transforms` group. Each entry point maps a name to a transform class.

```python
# This happens automatically
from importlib.metadata import entry_points

eps = entry_points(group="datapipe.transforms")
for ep in eps:
    registry.register(ep.name, ep.load())
```

## Testing Plugins

Use the `datapipe.testing` module:

```python
from datapipe.testing import make_test_data, run_transform

def test_geocode():
    data = make_test_data({"address": ["123 Main St"]})
    result = run_transform("geocode", data, {"address_column": "address", "api_key": "test"})
    assert "latitude" in result.columns
```

## Publishing

Publish to PyPI like any Python package. Users install with:

```bash
pip install datapipe-plugin-geo
```

The transform is then immediately available in pipeline configs by name.

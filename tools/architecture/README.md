# Circle OS Scaffold Suite

This package includes:

- `circle_operating_system_architecture.md`
- `circle_system_build_map.json`
- `generate_circle_suite_scaffold.py`
- `report_circle_suite_drift.py`
- `generate_nested_python_tool_suite.py`

## Commands

```powershell
python generate_circle_suite_scaffold.py --repo-root . --build-map circle_system_build_map.json
python report_circle_suite_drift.py --repo-root . --build-map circle_system_build_map.json
python generate_nested_python_tool_suite.py --output tools/generated_circle_tools --build-map circle_system_build_map.json
```

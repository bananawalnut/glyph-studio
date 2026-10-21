"""Export the native schemas for the read-only Codex MCP adapter."""
from pathlib import Path
import json
import runpy
root=Path(__file__).resolve().parents[1]
tools=runpy.run_path(str(root/'hermes/plugin/glyph-studio/schemas.py'))['TOOLS']
(root/'dist/agent-tools.json').write_text(json.dumps(tools,indent=2)+'\n')
print('Exported '+str(len(tools))+' studio tool definitions')

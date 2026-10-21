"""Hermes native tool/skill plugin. No model provider or gateway override."""
from pathlib import Path
import json
from .client import call
from .schemas import TOOLS

def register(ctx):
    for schema in TOOLS:
        def handler(args, _name=schema['name'], **kwargs):
            return json.dumps(call(_name,args))
        ctx.register_tool(name=schema['name'],toolset='glyph_studio',schema=schema,handler=handler,description=schema['description'])
    ctx.register_skill('design',Path(__file__).parent/'skills'/'glyph-studio'/'SKILL.md',description='Compose independent surfaces, glyph layers and motion in Glyph Studio.')

    for name in ["glyph-surfaces","glyph-biomotion","glyph-review","glyph-flow"]:
        ctx.register_skill(name,Path(__file__).parent/"skills"/name/"SKILL.md",description=name.replace("glyph-", "Studio ").replace("-"," "))

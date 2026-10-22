"""Assemble the dependency-free browser player; Rust rebuild is optional."""
from pathlib import Path
import argparse,subprocess,shutil,gzip,json
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--rust',action='store_true');args=p.parse_args()
if args.rust:
    subprocess.run(['cargo','build','--manifest-path',str(root/'rust/glyph-core/Cargo.toml'),'--release','--target','wasm32-unknown-unknown','--offline'],check=True,cwd=root)
    shutil.copyfile(root/'rust/glyph-core/target/wasm32-unknown-unknown/release/glyph_core.wasm',root/'dist/glyph-core.wasm')
subprocess.run(['node',str(root/'scripts/build-design.cjs')],check=True)
source='/* Glyph Studio player — native Web Components + WebGL2, no dependencies. */\n'+'\n'.join((root/'player'/f).read_text() for f in ['geometry.js','renderer.js','component.js'])
(root/'dist/glyph-player.js').write_text(source)
flow='/* Glyph Flow — optional functional content and animated transfers. */\n'+'\n'.join((root/'player'/f).read_text() for f in ['flow-core.js','flow-model.js','flow-component.js','flow-document.js'])
(root/'dist/glyph-flow.js').write_text(flow)
program='/* Glyph Program — optional parametric geometry and code-defined composition. */\n'+'\n'.join((root/'player'/f).read_text() for f in ['program.js','program-component.js'])
(root/'dist/glyph-program.js').write_text(program)
runtime={'player':'\n'.join((root/'player'/f).read_text() for f in ['geometry.js','renderer.js']),'worker':'\n'.join((root/'player'/f).read_text() for f in ['program.js','flow-core.js','program-worker.js'])}
(root/'dist/program-runtime.json').write_text(json.dumps(runtime))
agent='/* Glyph Component Agent Interface — optional discovery, contracts and addressed invocation. */\nif(!globalThis.GlyphFlowCore){\n'+(root/'player/flow-core.js').read_text()+'\n}\n'+(root/'player/component-agent.js').read_text()
(root/'dist/glyph-agent.js').write_text(agent)
(root/'dist/exchange-model.js').write_text((root/'player/exchange-model.js').read_text())
sizes={f:{'bytes':(root/'dist'/f).stat().st_size,'gzip_bytes':len(gzip.compress((root/'dist'/f).read_bytes(),mtime=0))} for f in ['glyph-player.js','glyph-core.wasm','glyph-flow.js','glyph-design.js','presets.js','glyph-program.js','glyph-agent.js']}
(root/'dist/player-sizes.json').write_text(json.dumps(sizes,indent=2)+'\n');print(json.dumps(sizes))

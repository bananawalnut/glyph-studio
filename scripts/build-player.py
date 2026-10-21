"""Assemble the dependency-free browser player; Rust rebuild is optional."""
from pathlib import Path
import argparse,subprocess,shutil,gzip,json
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--rust',action='store_true');args=p.parse_args()
if args.rust:
    subprocess.run(['cargo','build','--manifest-path',str(root/'rust/glyph-core/Cargo.toml'),'--release','--target','wasm32-unknown-unknown','--offline'],check=True,cwd=root)
    shutil.copyfile(root/'rust/glyph-core/target/wasm32-unknown-unknown/release/glyph_core.wasm',root/'dist/glyph-core.wasm')
source='/* Glyph Studio player — native Web Components + WebGL2, no dependencies. */\n'+'\n'.join((root/'player'/f).read_text() for f in ['geometry.js','renderer.js','component.js'])
(root/'dist/glyph-player.js').write_text(source)
flow='/* Glyph Flow — optional functional content and animated transfers. */\n'+'\n'.join((root/'player'/f).read_text() for f in ['flow-core.js','flow-component.js'])
(root/'dist/glyph-flow.js').write_text(flow)
sizes={f:{'bytes':(root/'dist'/f).stat().st_size,'gzip_bytes':len(gzip.compress((root/'dist'/f).read_bytes(),mtime=0))} for f in ['glyph-player.js','glyph-core.wasm','glyph-flow.js']}
(root/'dist/player-sizes.json').write_text(json.dumps(sizes,indent=2)+'\n');print(json.dumps(sizes))

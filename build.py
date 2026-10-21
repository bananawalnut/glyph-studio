"""Build portable releases using only files contained in this repository."""
import argparse
from pathlib import Path
import shutil
import subprocess
import sys
import zipfile
from urllib.parse import quote

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,help='Export directory (default: releases/ in this checkout)')
args=parser.parse_args()
site=Path(__file__).resolve().parent
root=(args.output or site/'releases').expanduser().resolve()
root.mkdir(parents=True,exist_ok=True)
subprocess.run([sys.executable,str(site/'scripts/build-player.py')],check=True)
subprocess.run([sys.executable,str(site/'scripts/export-agent-tools.py')],check=True)
dist=site/'dist'
hermes=site/'hermes'
skill=hermes/'plugin'/'glyph-studio'/'skills'/'glyph-studio'
(skill/'references').mkdir(parents=True,exist_ok=True)
(skill/'scripts').mkdir(parents=True,exist_ok=True)
for source,name in [('agent-guide.txt','scene-contract.txt'),('scene.schema.json','scene.schema.json'),('example-scene.json','example-scene.json')]:
    shutil.copyfile(dist/source,skill/'references'/name)
shutil.copyfile(hermes/'plugin'/'glyph-studio'/'client.py',skill/'scripts'/'client.py')
html=(dist/'index.html').read_text().replace('<link rel="stylesheet" href="agent-panel.css">','<style>'+(dist/'agent-panel.css').read_text()+'</style>').replace('<link rel="stylesheet" href="style.css">','<style>'+(dist/'style.css').read_text()+'</style>')
for name in ['scene.js','glyph-player.js','app.js','agent-panel.js']:
    html=html.replace('<script defer src="'+name+'"></script>','')
html=html.replace('</body>',''.join('<script>'+(dist/name).read_text()+'</script>' for name in ['scene.js','glyph-player.js','app.js','agent-panel.js'])+'</body>')
html=html.replace('href="components.html"','href="https://github.com/bananawalnut/glyph-studio/blob/main/docs/web-components.md"')
html=html.replace('href="agent-guide.txt"','href="data:text/plain;charset=utf-8,'+quote((dist/'agent-guide.txt').read_text())+'"').replace('href="./"','href="Glyph%20Studio.html"')
html=html.replace('href="betta.html"','href="Betta%20-%20Glyph%20Study.html"').replace('href="life.html"','href="Anima%20-%20Living%20Glyph%20Studies.html"')
(root/'Glyph Studio.html').write_text(html)
betta=(dist/'betta.html').read_text()
for name in ['betta-geometry.js','betta.js']:
    betta=betta.replace('<script defer src="'+name+'"></script>','<script>'+(dist/name).read_text()+'</script>')
betta=betta.replace('href="/"','href="Glyph%20Studio.html"')
(root/'Betta - Glyph Study.html').write_text(betta)
life=(dist/'life.html').read_text().replace('<link rel="stylesheet" href="life-lab.css">','<style>'+(dist/'life-lab.css').read_text()+'</style>')
for name in ['betta-geometry.js','life-geometry.js','life-motion.js','life-player.js','life-lab.js']:
    life=life.replace('<script defer src="'+name+'"></script>','')
life=life.replace('</body>',''.join('<script>'+(dist/name).read_text()+'</script>' for name in ['betta-geometry.js','life-geometry.js','life-motion.js','life-player.js','life-lab.js'])+'</body>')
life=life.replace('href="/"','href="Glyph%20Studio.html"').replace('href="betta.html"','href="Betta%20-%20Glyph%20Study.html"')
(root/'Anima - Living Glyph Studies.html').write_text(life)
(root/'Zenith Open Consultancy.html').write_text((dist/'zenith.html').read_text().replace('<script defer src="scene.js"></script>','<script>'+(dist/'scene.js').read_text()+'</script>').replace('<script defer src="glyph-player.js"></script>','<script>'+(dist/'glyph-player.js').read_text()+'</script>').replace('<link rel="stylesheet" href="agent-panel.css">','<style>'+(dist/'agent-panel.css').read_text()+'</style>').replace('<script defer src="agent-panel.js"></script>','<script>'+(dist/'agent-panel.js').read_text()+'</script>'))
shutil.copyfile(dist/'presets'/'zenith.scene.json',root/'zenith-open-consultancy.scene.json')
(root/'Glyph Studio - Read me.txt').write_text('Run the source with npm run dev, or npm run dev:agent for on-device Hermes.\nSee glyph-studio/README.md for setup. Standalone HTML works offline without the agent.\n')
def public(file):
    return file.is_file() and not any(x in file.parts for x in ('__pycache__','.runtime','.hermes-home','.openai','target')) and file.suffix!='.pyc' and file.name!='connection.path'
source=[site/'README.md',site/'package.json',site/'.gitignore',site/'build.py',site/'.cargo/config.toml',*sorted(site.glob('test-*.js')),*sorted(site.glob('test-*.cjs')),*sorted(dist.rglob('*')),*sorted(hermes.rglob('*')),*sorted((site/'player').rglob('*')),*sorted((site/'scripts').rglob('*')),*sorted((site/'rust').rglob('*')),*sorted((site/'docs').rglob('*'))]
with zipfile.ZipFile(root/'glyph-studio.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for file in [root/'Glyph Studio.html',root/'Zenith Open Consultancy.html',root/'Betta - Glyph Study.html',root/'Anima - Living Glyph Studies.html',root/'zenith-open-consultancy.scene.json',root/'Glyph Studio - Read me.txt']:
        archive.write(file,file.name)
    for file in source:
        if public(file): archive.write(file,Path('glyph-studio')/file.relative_to(site))
with zipfile.ZipFile(root/'glyph-studio-hermes.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for file in source:
        if public(file): archive.write(file,Path('glyph-studio')/file.relative_to(site))
print('Built standalone pages and portable source/plugin ZIPs in '+str(root))

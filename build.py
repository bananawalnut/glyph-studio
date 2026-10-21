"""Build portable releases using only files contained in this repository."""
import argparse
from pathlib import Path
import shutil
import zipfile
from urllib.parse import quote

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,help='Export directory (default: releases/ in this checkout)')
args=parser.parse_args()
site=Path(__file__).resolve().parent
root=(args.output or site/'releases').expanduser().resolve()
root.mkdir(parents=True,exist_ok=True)
dist=site/'dist'
hermes=site/'hermes'
skill=hermes/'plugin'/'glyph-studio'/'skills'/'glyph-studio'
(skill/'references').mkdir(parents=True,exist_ok=True)
(skill/'scripts').mkdir(parents=True,exist_ok=True)
for source,name in [('agent-guide.txt','scene-contract.txt'),('scene.schema.json','scene.schema.json'),('example-scene.json','example-scene.json')]:
    shutil.copyfile(dist/source,skill/'references'/name)
shutil.copyfile(hermes/'plugin'/'glyph-studio'/'client.py',skill/'scripts'/'client.py')
html=(dist/'index.html').read_text().replace(
    '<link rel="stylesheet" href="style.css"><script defer src="scene.js"></script><script defer src="app.js"></script>',
    '<style>'+(dist/'style.css').read_text()+'</style>')
html=html.replace('</body>','<script>'+(dist/'scene.js').read_text()+'</script><script>'+(dist/'app.js').read_text()+'</script></body>')
html=html.replace('href="agent-guide.txt"','href="data:text/plain;charset=utf-8,'+quote((dist/'agent-guide.txt').read_text())+'"').replace('href="./"','href="Glyph%20Studio.html"')
(root/'Glyph Studio.html').write_text(html)
(root/'Zenith Open Consultancy.html').write_text((dist/'zenith.html').read_text().replace('<script defer src="scene.js"></script>','<script>'+(dist/'scene.js').read_text()+'</script>'))
shutil.copyfile(dist/'presets'/'zenith.scene.json',root/'zenith-open-consultancy.scene.json')
(root/'Glyph Studio - Read me.txt').write_text('Run the source with npm run dev, or npm run dev:agent for on-device Hermes.\nSee glyph-studio/README.md for setup. Standalone HTML works offline without the agent.\n')
def public(file):
    return file.is_file() and not any(x in file.parts for x in ('__pycache__','.runtime','.hermes-home','.openai')) and file.suffix!='.pyc' and file.name!='connection.path'
source=[site/'README.md',site/'package.json',site/'.gitignore',site/'build.py',*sorted(site.glob('test-*.js')),*sorted(dist.rglob('*')),*sorted(hermes.rglob('*'))]
with zipfile.ZipFile(root/'glyph-studio.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for file in [root/'Glyph Studio.html',root/'Zenith Open Consultancy.html',root/'zenith-open-consultancy.scene.json',root/'Glyph Studio - Read me.txt']:
        archive.write(file,file.name)
    for file in source:
        if public(file): archive.write(file,Path('glyph-studio')/file.relative_to(site))
with zipfile.ZipFile(root/'glyph-studio-hermes.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for file in source:
        if public(file): archive.write(file,Path('glyph-studio')/file.relative_to(site))
print('Built standalone pages and portable source/plugin ZIPs in '+str(root))

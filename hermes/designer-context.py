"""Assemble this project's maintained identity and relevant skills, for either provider."""
import json
from pathlib import Path
import re
import sys

PLUGIN=Path(__file__).resolve().parent/'plugin'/'glyph-studio'
def context(prompt,provider,plugin=PLUGIN,target=None):
    plugin=Path(plugin)
    profile=json.loads((plugin/'designer'/'profile.json').read_text())
    selected=[]
    for skill in profile['skills']:
        terms=[skill['id'],*skill['triggers']]
        if target=='typescript':
            include=skill['id']=='glyph-typescript'
        elif skill['id']=='glyph-typescript':
            include=False
        elif target=='flow':
            include=skill['id']=='glyph-flow'
        else:
            include=skill['id']!='glyph-flow' and (skill['always'] or any(re.search(r'(?<!\w)'+re.escape(term)+r'(?!\w)',prompt,re.I) for term in terms))
        if include:
            selected.append(skill['id'])
    pieces=[(plugin/'designer'/name).read_text() for name in [profile['identity'],profile['workflow']]]
    pieces+=['RUNTIME: '+profile['execution'][provider]]
    pieces += [(plugin/'skills'/name/'SKILL.md').read_text() for name in selected]
    return {'profile':profile['id'],'name':profile['name'],'skills':selected,'text':'\n\n'.join(pieces)}
if __name__=='__main__':
    request=json.load(sys.stdin)
    print(json.dumps(context(request.get('prompt',''),request.get('provider','hermes'),request.get('plugin',PLUGIN),request.get('target'))))

"""Restricted local Hermes turn using an on-device model."""
import contextlib
import json
import os
import importlib.util
from pathlib import Path
import sys

# The installed Hermes virtualenv owns its source tree, not this deliverable.
sys.path.insert(0, str(Path(sys.executable).absolute().parents[2]))
ROOT = Path(__file__).absolute().parent

def emit(data):
    sys.__stdout__.write('GLYPH_EVENT ' + json.dumps(data) + '\n')
    sys.__stdout__.flush()

# No hosted fallback: the worker is restricted to loopback sockets, including
# optional Hermes auxiliary calls. Model weights and scene data stay on-device.
import ipaddress
import socket
_connect = socket.socket.connect
_connect_ex = socket.socket.connect_ex
def local_address(address):
    if isinstance(address, str):
        return # Unix domain socket
    host = address[0]
    if host == 'localhost':
        return
    if not ipaddress.ip_address(host).is_loopback:
        raise PermissionError('The Zenith designer permits only on-device connections.')
def connect(sock, address):
    local_address(address)
    return _connect(sock, address)
def connect_ex(sock, address):
    local_address(address)
    return _connect_ex(sock, address)
socket.socket.connect = connect
socket.socket.connect_ex = connect_ex

try:
    request = json.loads(sys.stdin.read())
    config = request['config']
    target = request.get('target', 'scene')
    if target not in ('scene', 'flow', 'preset', 'program'):
        raise RuntimeError('Unknown designer target.')
    from urllib.parse import urlparse
    url = urlparse(config['base_url'])
    if url.scheme != 'http' or url.hostname != '127.0.0.1' or url.username or url.password:
        raise RuntimeError('Configure a loopback-only on-device model endpoint.')
    credentials = {'provider':'custom','api_mode':'chat_completions','base_url':config['base_url'],'api_key':'local'}
    with contextlib.redirect_stdout(sys.stderr):
        from hermes_cli.plugins import PluginManager
        from tools.registry import registry
        manager = PluginManager()
        plugin = Path(os.environ['HERMES_HOME'])/'plugins'/'glyph-studio'
        manifest = manager._parse_manifest(plugin/'plugin.yaml', plugin, 'user', '')
        manager._load_plugin(manifest)
        loaded = manager._plugins['glyph-studio']
        if not loaded.enabled:
            raise RuntimeError('Glyph Studio plugin could not load.')
        profile=json.loads((plugin/'designer'/'profile.json').read_text())
        if set(loaded.tools_registered)!=set(profile['tools']['hermes']):
            raise RuntimeError('Glyph Studio plugin could not load.')
        from run_agent import AIAgent
        guide = (ROOT.parent/'dist'/('flow-guide.txt' if target == 'flow' else 'agent-guide.txt')).read_text()
        spec=importlib.util.spec_from_file_location('studio_designer_context',ROOT/'designer-context.py')
        designer=importlib.util.module_from_spec(spec);spec.loader.exec_module(designer)
        active=designer.context(request['prompt'],'hermes',plugin,target)
        system=active['text']+'\nDESIGN CONTRACT:\n'+guide
        if target == 'program':
            system=(ROOT.parent/'dist'/'program-guide.txt').read_text()+'\nYou are the Studio Designer. Return ONLY one JSON object with message and source_js. No tools.\nCURRENT_SOURCE_DATA:\n'+json.dumps(request['source'])+'\nPREVIEW_FEEDBACK_DATA:\n'+json.dumps(request.get('preview_feedback',''))
        if target == 'preset':
            system+='\nPRESET WORKSPACE: You create NEW reusable objects or motions in an isolated scene draft. Read the draft first. Prefer glyph_studio_update with minimal changes for variations; do not rebuild existing layers using directives. Use glyph_studio_library to get a complete preset scene when starting a new composition, then glyph_studio_apply or glyph_studio_add/update to customize it. Use existing surfaces, mapped curves and free cubic paths to build new compositions; no arbitrary code. To start fresh remove glyph objects then their hosts, or apply a complete scene. Changes are staged until completion. Only update motions/glyph mode/rate for a motion-only request. The user reviews and saves afterward; never claim already saved. New geometry must compose the supported primitives. Read glyph_studio_library for reusable building blocks.'
        system+='\nYou are scoped to '+target+'. Use only the advertised tools. For flows every edit and method call is staged until this turn completes; read the draft first. Preserve unrelated current state. A queued call needs a browser receipt before delivery. Never claim a screenshot review.'
        agent = AIAgent(model=config['model'], **credentials, enabled_toolsets=['glyph_studio'],
                        max_iterations=2 if target=='program' else 12, max_tokens=6000 if target=='program' else 2400, quiet_mode=True,
                        skip_context_files=True, skip_memory=True, load_soul_identity=False,
                        checkpoints_enabled=False, save_trajectories=False,
                        tool_start_callback=lambda _id, name, *args, **kwargs: emit({'type':'tool','name':name}))
        allowed=set() if target=='program' else {n for n in profile['tools']['hermes'] if n.startswith('glyph_flow_') == (target == 'flow')}
        agent.tools=[t for t in agent.tools if t.get('function',t).get('name') in allowed]
        names = {t.get('function',t).get('name') for t in agent.tools}
        agent.valid_tool_names=names
        if names != allowed:
            raise RuntimeError('Agent tool isolation check failed.')
        emit({'type':'ready','profile':active['profile'],'skills':active['skills']})
        result = agent.run_conversation(request['prompt'], system_message=system)
    response = result.get('final_response') or ''
    if result.get('error') or result.get('failed') or not response:
        raise RuntimeError('Hermes did not complete this request. Try a smaller change.')
    if target == 'program':
        text=response.strip()
        if text.startswith('```'):
            text=text.split('\n',1)[1].rsplit('```',1)[0]
        proposal=json.loads(text)
        emit({'type':'candidate','source':proposal['source_js'],'message':str(proposal.get('message','Program source proposed.'))[:6000]})
    else:
        emit({'type':'complete','message':response[:6000]})
except Exception as exc:
    import traceback
    diagnostic={'exception':type(exc).__name__,'frames':[{'file':Path(f.filename).name,'line':f.lineno,'function':f.name} for f in traceback.extract_tb(exc.__traceback__)]}
    target=ROOT.parent/'.runtime'/'agent-diagnostic.json'
    target.write_text(json.dumps(diagnostic));target.chmod(0o600)
    # Never forward provider exceptions: they can contain credential-bearing URLs.
    safe = str(exc) if isinstance(exc, RuntimeError) else 'Local Hermes could not complete this turn. Check its model connection and retry.'
    emit({'type':'error','message':safe})
    sys.exit(1)

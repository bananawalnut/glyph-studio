"""Start the Zenith tool with local Hermes and an on-device llama.cpp model."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import urllib.request
from urllib.parse import urlparse

ROOT=Path(__file__).absolute().parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--python',type=Path,help='Hermes virtualenv Python (detected from hermes launcher)')
parser.add_argument('--port',type=int,default=8788)
parser.add_argument('--model',default='zenith-qwen-local')
parser.add_argument('--model-label',default='Qwen3.5 9B')
parser.add_argument('--model-file',type=Path,default=Path.home()/'Models'/'Qwen3.5-9B-Q4_K_M.gguf')
parser.add_argument('--base-url',default='http://127.0.0.1:8789/v1')
parser.add_argument('--configure-only',action='store_true',help='Write local configuration without starting services')
args=parser.parse_args()
url=urlparse(args.base_url)
if url.scheme!='http' or url.hostname!='127.0.0.1' or url.username or url.password or url.path!='/v1':
    parser.error('--base-url must be an http://127.0.0.1:PORT/v1 on-device endpoint')
python=args.python
if not python:
    launcher=shutil.which('hermes')
    if not launcher: parser.error('Hermes is not installed. Supply --python to its virtualenv Python.')
    first=Path(launcher).read_text().splitlines()[0]
    if not first.startswith('#!') or ' ' in first[2:]: parser.error('Supply --python to the Hermes virtualenv Python.')
    python=Path(first[2:])
directory=ROOT.parent/'.runtime';directory.mkdir(mode=0o700,exist_ok=True);os.chmod(directory,0o700)
home=ROOT.parent/'.hermes-home'
subprocess.run([str(python),str(ROOT/'attach.py'),'--home',str(home),'--connection',str(directory/'connection.json'),'--replace'],check=True)
settings={'model':args.model,'model_label':args.model_label,'provider':'custom','python':str(python),'home':str(home),'base_url':args.base_url}
file=directory/'agent.json';file.write_text(json.dumps(settings,indent=2));os.chmod(file,0o600)
# Dedicated home contains no copied provider credentials, global memories or plugins.
config=json.loads(subprocess.check_output([str(python),'-c',"import yaml,json,sys;print(json.dumps(yaml.safe_load(open(sys.argv[1])) or {}))",str(home/'config.yaml')],text=True))
config['model']={'default':args.model,'provider':'custom','base_url':args.base_url,'context_length':65536}
config['tools']={'tool_search':{'enabled':'off'}}
(home/'config.yaml').write_text(json.dumps(config,indent=2))
print('Attached local Hermes / on-device model: '+args.model,flush=True)
if args.configure_only: sys.exit(0)
server=None;bridge=None
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def models():
    return json.loads(opener.open(args.base_url+'/models',timeout=2).read())
try:
    try: available=models()
    except Exception:
        binary=shutil.which('llama-server')
        if not binary or not args.model_file.is_file(): parser.error('Supply an existing --model-file GGUF and install llama-server, or run your local OpenAI-compatible server first.')
        server=subprocess.Popen([binary,'--model',str(args.model_file),'--alias',args.model,'--host','127.0.0.1','--port',str(url.port or 80),'--ctx-size','65536','--parallel','1','--jinja','--reasoning','off','--cache-ram','0'])
        for _ in range(120):
            if server.poll() is not None: raise RuntimeError('Local model server exited.')
            try: available=models();break
            except Exception: time.sleep(1)
        else: raise RuntimeError('Local model server did not become ready.')
    if args.model not in [m['id'] for m in available.get('data',[])]: raise RuntimeError('The on-device server does not offer --model '+args.model)
    bridge=subprocess.Popen(['node',str(ROOT/'bridge.cjs'),'--port',str(args.port),'--preset','zenith'])
    print('Open http://127.0.0.1:'+str(args.port)+'/zenith',flush=True)
    bridge.wait()
finally:
    for child in (bridge,server):
        if child and child.poll() is None:
            child.terminate()
            try: child.wait(timeout=10)
            except subprocess.TimeoutExpired: child.kill()

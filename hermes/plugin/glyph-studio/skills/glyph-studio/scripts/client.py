"""Dependency-free loopback client, also usable as a skill's CLI helper."""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import stat
import sys
import urllib.error
import urllib.parse
import urllib.request

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def connection():
    filename = os.environ.get('GLYPH_STUDIO_CONNECTION', '').strip()
    pointer = Path(__file__).with_name('connection.path')
    if not filename and pointer.is_file():
        filename = pointer.read_text().strip()
    if not filename:
        raise ValueError('No local bridge attached. Set GLYPH_STUDIO_CONNECTION to its connection.json path, or run the attach helper.')
    file = Path(filename).expanduser()
    info = file.stat()
    if not stat.S_ISREG(info.st_mode) or info.st_size > 8192:
        raise ValueError('Invalid bridge connection file')
    if os.name == 'posix' and (stat.S_IMODE(info.st_mode) & 0o077):
        raise ValueError('Bridge connection file must be private (chmod 600)')
    data = json.loads(file.read_text())
    url = urllib.parse.urlsplit(data.get('url', ''))
    if url.scheme != 'http' or url.hostname != '127.0.0.1' or not url.port or url.username or url.password or url.path not in ('', '/') or url.query or url.fragment:
        raise ValueError('Only an authenticated 127.0.0.1 HTTP bridge is supported')
    token = data.get('token')
    if data.get('version') != 1 or not isinstance(token, str) or len(token) != 64 or any(c not in '0123456789abcdef' for c in token):
        raise ValueError('Invalid bridge credential')
    return data['url'].rstrip('/'), token

def call(name, arguments=None):
    try:
        scope=os.environ.get('GLYPH_STUDIO_SCOPE')
        if scope=='flow' and not name.startswith('glyph_flow_') or scope=='scene' and name.startswith('glyph_flow_'):
            return {'ok':False,'error':{'code':'target_denied','message':'Tool belongs to a different designer target.'}}
        url, token = connection()
        context={'job_id':os.environ['GLYPH_STUDIO_JOB']} if scope=='flow' and os.environ.get('GLYPH_STUDIO_JOB') else {}
        req = urllib.request.Request(url + '/api/tool', data=json.dumps({'name':name,'arguments':arguments or {},'context':context}).encode(), headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'}, method='POST')
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
        try:
            with opener.open(req, timeout=8) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            try:
                value = json.load(error)
                if isinstance(value, dict):
                    return value
            except (ValueError, OSError):
                pass
            return {'ok':False,'error':{'code':'bridge_http_error','message':f'Bridge returned HTTP {error.code}'}}
    except (OSError, ValueError, KeyError, urllib.error.URLError) as error:
        return {'ok':False,'error':{'code':'bridge_unavailable','message':str(error)}}

def main():
    parser=argparse.ArgumentParser(description='Call Glyph Studio functions without the Hermes plugin. Arguments are read as JSON from stdin.')
    parser.add_argument('tool', choices=['glyph_studio_read','glyph_studio_compile','glyph_studio_apply','glyph_studio_update','glyph_studio_add','glyph_studio_remove','glyph_studio_preview','glyph_studio_audit','glyph_studio_library','glyph_flow_read','glyph_flow_validate','glyph_flow_apply','glyph_flow_edit','glyph_flow_invoke'])
    args=parser.parse_args()
    try:
        data=json.load(sys.stdin) if not sys.stdin.isatty() else {}
        if not isinstance(data,dict):
            raise ValueError('Tool arguments must be a JSON object')
        result=call(args.tool,data)
    except ValueError as error:
        result={'ok':False,'error':{'code':'invalid_arguments','message':str(error)}}
    print(json.dumps(result))
    return 0 if result.get('ok') else 1

if __name__=='__main__':
    raise SystemExit(main())

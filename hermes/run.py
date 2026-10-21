"""Launch Hermes against an explicit home; no default profile or model changes."""
import argparse
import os
from pathlib import Path
import shutil

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--home',required=True)
parser.add_argument('command',nargs=argparse.REMAINDER)
args=parser.parse_args()
home=Path(args.home).expanduser().resolve()
if not (home/'plugins'/'glyph-studio'/'plugin.yaml').is_file():
    parser.error('Attach the Glyph Studio plugin to this home first.')
executable=shutil.which('hermes')
if not executable:
    parser.error('Hermes is not on PATH.')
command=args.command
if command and command[0]=='--':
    command=command[1:]
env=dict(os.environ,HERMES_HOME=str(home))
os.execvpe(executable,[executable,*(command or ['chat'])],env)

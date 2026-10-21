"""Connect an existing local Whisper runtime and checkpoint. No downloads."""
import argparse, json, shutil, subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--python',required=True,type=Path)
p.add_argument('--model',required=True,type=Path)
p.add_argument('--ffmpeg',default=shutil.which('ffmpeg'),type=Path)
p.add_argument('--state-dir',default=Path(__file__).resolve().parent.parent/'.runtime',type=Path)
a=p.parse_args()
for file in (a.python,a.model,a.ffmpeg):
    if not file or not file.is_file(): p.error('Supply existing Python, Whisper checkpoint and ffmpeg files.')
if a.model.suffix!='.pt':p.error('Use an existing Whisper .pt checkpoint.')
subprocess.run([str(a.python),'-c','import whisper, torch, numpy'],check=True)
a.state_dir.mkdir(mode=0o700,parents=True,exist_ok=True)
file=a.state_dir/'voice.json'
file.write_text(json.dumps({k:str(getattr(a,k).absolute()) for k in ('python','model','ffmpeg')}))
file.chmod(0o600)
print('Connected on-device Whisper dictation. Audio is deleted after transcription; text is inserted for review.')

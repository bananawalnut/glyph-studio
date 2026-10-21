"""Bounded, offline transcription. Explicit local checkpoint; no model download."""
import sys, json, socket, subprocess, contextlib
from pathlib import Path
# Block all network, including implicit model downloads. ffmpeg receives a local file only.
def denied(*args, **kwargs):
    raise PermissionError('Offline dictation does not allow network access.')
socket.socket.connect=denied
socket.socket.connect_ex=denied
try:
    audio, model, ffmpeg = sys.argv[1:]
    if not Path(model).is_file() or not model.endswith('.pt'):
        raise ValueError('Configure an existing Whisper .pt checkpoint.')
    import numpy as np
    import torch
    import whisper
    torch.set_num_threads(4)
    raw=subprocess.run([ffmpeg,'-nostdin','-v','error','-protocol_whitelist','file,pipe','-format_whitelist','matroska,webm,mov,mp4,m4a,3gp,3g2,mj2,ogg,wav','-i',audio,'-t','61','-f','s16le','-ac','1','-ar','16000','pipe:1'],capture_output=True,check=True,timeout=20).stdout
    samples=np.frombuffer(raw,np.int16).astype(np.float32)/32768.0
    if not len(samples) or len(samples)>60*16000:
        raise ValueError('Record between one and sixty seconds.')
    with contextlib.redirect_stdout(sys.stderr):
        engine=whisper.load_model(model, device='cpu')
        result=engine.transcribe(samples,fp16=False,verbose=False,condition_on_previous_text=False)
    print(json.dumps({'text':result['text'].strip()}))
except Exception:
    print(json.dumps({'error':'Local transcription failed.'}))
    sys.exit(1)

# Preset workshop and dictation

The `/presets` workshop uses the same scene engine and Studio Designer profile as the main studio. Start from a built-in object, copy the current scene, or open a saved preset copy. Prompt Hermes or Codex for distinct geometry compositions and motion. Supported carrier surfaces, mapped curves, free cubic paths, transforms and existing motion channels define the design space. Arbitrary generated JavaScript, shaders and new renderer types are not executed. A new renderer primitive still needs a programmer implementation.

Both providers use target `preset`. Hermes scene tools operate on an isolated in-memory `SceneDraft`; Codex has read-only tools scoped to that same draft and returns one complete candidate. Successful completion validates and commits the draft only if its starting revision still matches. Failure/cancellation discards staged edits; undo restores the previous draft with a revision check. The live scene and functional flow are separate. Library content and glyph text remain untrusted data.

## Saving and reuse

A custom preset is closed, versioned JSON:

```js
{version:1, kind:'object', id:'custom-example', name:'Example',
 description:'A reusable variation', scene: expandedV2Scene}
```

`kind` is `object` or `motion`. IDs use the `custom-` namespace; names are at most 80 characters, descriptions 500, and each validated entry is at most 100 KB. The local store holds at most 100 entries. The UI saves a new ID for each variation and never overwrites an existing preset implicitly. It uses both library and draft revisions, and the saved scene must exactly match the previewed draft. Storage is private `.runtime/presets.json`, persisted atomically. Restart preserves it; runtime data and voice configuration are excluded from public source ZIPs. Export selected JSON to deliberately share a preset.

The optional `presets.js` module exports pure `GlyphPresets.create`, `validate`, `append` and `animate`. Object append remaps host/layer IDs, preserves current scene clock/camera/seed and layers, and validates capacity before returning. Motion reuse preserves receiver geometry, transforms, text, materials, loop length and seed. It copies carrier, free-object and mapped-layer tracks by role, cycling multiple tracks in source order. Glyph mode/rate and path flow transfer independently of carrier rotation/bob. Fallback uses the first source glyph track where a role has no corresponding track. Path flow has a visible effect only on receiving path geometry; glyph cadence depends on the receiver's material. Full-scene validation still applies. Unequal loop durations change real-time speed. Exported baked scenes require no preset runtime.

Authenticated bridge APIs:

- `GET /api/presets`: `{version, revision, presets, draft:{scene,revision}}`.
- `POST /api/presets/draft`: `{scene,expected_revision}` seeds or replaces the isolated draft.
- `POST /api/agent`: existing API, with additive `target:'preset'`.
- `POST /api/presets/save`: `{preset,expected_revision,expected_draft_revision}`.
- `glyph_studio_library`: additive `customPresets` in library responses; stored scenes and existing tool names remain compatible.

The built-in catalog is unchanged and custom entries cannot shadow it. Both provider adapters retain their existing scoped tool lists. Neither rendering bundle loads custom-preset UI, agent or ASR code on a component consumer's page.

## Voice-to-text

`npm run connect:voice -- --python /absolute/venv/bin/python --model /absolute/model.pt` checks an existing local `openai-whisper` environment and checkpoint, then writes private `.runtime/voice.json`. `--ffmpeg` selects an existing binary. The current installation uses the cached multilingual tiny checkpoint, with editable transcripts; accuracy can improve with a larger local model at the cost of compute. This integration follows [Whisper's Python API](https://github.com/openai/whisper#python-usage). It does not use browser speech recognition, whose default can use remote processing ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally)).

`GET /api/voice` reports readiness without paths or secrets. `POST /api/voice` accepts authenticated, same-origin webm/mp4/ogg/wav audio up to 10 MB. A private temporary file feeds a subprocess with all Python socket connections blocked, an explicit local checkpoint (no download), ffmpeg limited to file/pipe protocols, and decoded audio at most 60 seconds. Only one transcription runs at a time, with a two-minute timeout. Temp audio is removed on success/error and normal shutdown. No transcript history is persisted by the ASR endpoint. The browser releases mic tracks after Finish, Discard, errors and page exit. Capture never starts on load. Review/edit the appended transcript and explicitly submit to the selected designer. Existing typed text is preserved; oversized transcripts are shown for manual reduction.

The frontend requires MediaRecorder and getUserMedia on localhost, plus browser microphone permission. Unsupported clients keep typed/system dictation available. No external speech fallback is used. Tests use synthetic speech and mocked mic events; they do not capture the user's microphone.


The included examples `dist/presets/floating-ribbon.preset.json` and `dist/presets/slow-orbit-and-float.preset.json` were generated and saved through the live local Hermes workflow. `dist/presets/signal-buoy.preset.json` was created from a fresh composition prompt through the actual Codex adapter, then reviewed and saved: a rotating torus, separate text band and spatially still cubic antenna with flowing light. They are portable JSON assets, independent of the private runtime library. Load one from your own asset URL and use `GlyphPresets.append(currentScene, preset)` or `animate(currentScene, preset)`.

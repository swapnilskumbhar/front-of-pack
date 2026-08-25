# Demo video production

For the final cinematic cut, start with [cinematic-storyboard.md](cinematic-storyboard.md)
and [elevenlabs-prompts.md](elevenlabs-prompts.md). The existing deterministic
renderer remains the reproducible fallback and supplies real product footage.

The final submission cut is rendered locally and deliberately excluded from Git.

## Outputs

- `output/front-of-pack-cinematic-v3.mp4` — recommended model-agnostic 1:20 Start-with-WHY submission cut
- `output/cinematic-v3-captions.srt` — matching captions for the recommended model-agnostic cut
- `output/cinematic-v3-manifest.json` — recommended model-agnostic cut timing and voice metadata
- `output/front-of-pack-cinematic-v2.mp4` — recommended 1:20 Start-with-WHY ad cut with faster pacing and corrected friend framing
- `output/cinematic-v2-captions.srt` — matching captions for the recommended cut
- `output/cinematic-v2-manifest.json` — recommended-cut timing and voice metadata
- `output/front-of-pack-cinematic.mp4` — final 1:51 story-led cut with ElevenLabs video, narration, score and burned captions
- `output/cinematic-captions.srt` — matching captions for the cinematic cut
- `output/cinematic-manifest.json` — cinematic scene timing and voice metadata
- `output/front-of-pack-demo.mp4` — final 1920×1080, 30 fps, H.264/AAC cut with burned captions
- `output/captions.srt` — matching subtitle file
- `output/thumbnail.png` — upload thumbnail
- `output/manifest.json` — duration, selected voice and per-scene timings
- `output/front-of-pack-animatic.mp4` — silent fixed-timing review cut

## Secret setup

Copy `.dev.vars.example` to `.dev.vars` and set `ELEVENLABS_API_KEY`. The file is ignored. An optional `ELEVENLABS_VOICE_ID` pins a voice; otherwise the script selects a suitable available English voice and records the choice in the manifest.

## Rebuild

```powershell
$env:PYTHONPATH = "E:\projects\front-of-pack\video\.python-packages"
& "C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" "E:\projects\front-of-pack\video\produce.py"
```

`produce.py --animatic` builds without ElevenLabs. Existing voice clips are reused on subsequent final renders, avoiding unnecessary API usage.

Before submission, watch the MP4 once with sound and once muted, then upload it to a public URL that works while signed out.

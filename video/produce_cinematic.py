"""Assemble the cinematic FoP demo from generated b-roll and real UI proof."""

from __future__ import annotations

import json
import re
import subprocess
import wave
from dataclasses import dataclass
from pathlib import Path

from elevenlabs.client import ElevenLabs
from produce import FFMPEG, Scene, read_env, synthesize_scene


ROOT = Path(__file__).resolve().parent
WORK = ROOT / "work" / "cinematic-v2"
GENERATED = ROOT / "work" / "generated"
CAPTURES = ROOT / "work" / "captures"
ORIGINAL_SCENES = ROOT / "work" / "scenes"
OUTPUT = ROOT / "output"
VOICE_ID = "8Ln42OXYupYsag45MAUy"


@dataclass(frozen=True)
class Cut:
    slug: str
    duration: float
    source: Path
    source_type: str
    narration: str
    source_start: float = 0


CUTS = [
    Cut("01-why", 6, GENERATED / "clip-a.mp4", "video",
        "Because shoppers deserve to know what they are truly buying—before packaging makes the choice for them."),
    Cut("02-claim", 6, GENERATED / "clip-b.mp4", "video",
        "A confident claim and bright colours can decide the purchase in seconds."),
    Cut("03-friend", 6, GENERATED / "clip-c.mp4", "video",
        "Front of Pack puts evidence back into that moment.", 2),
    Cut("04-whatsapp", 9, CAPTURES / "09-whatsapp.png", "image",
        "Send one photo on WhatsApp. The answer returns in your language, linked to the image."),
    Cut("05-reveal", 12, CAPTURES / "04-alofrut.png", "image",
        "It reveals the whole-pack reality: thirty-one point five grams of added sugar—about sixty-three percent of the daily reference—plus six hundred seventy-eight milligrams of sodium."),
    Cut("06-choice", 6, GENERATED / "clip-d.mp4", "video",
        "Now the shopper chooses for her priorities—not the packaging's."),
    Cut("07-web", 6, CAPTURES / "01-home.png", "image",
        "The same shopper brief works on the web."),
    Cut("08-cart", 9, CAPTURES / "03-cart-results.png", "image",
        "And one cart screenshot compares up to six products, with every result clearly separated."),
    Cut("09-method-v2", 9, CAPTURES / "06-method-rating.png", "image",
        "The system reads and researches. Published rules calculate whole-pack warnings, claim checks and rating deductions."),
    Cut("10-architecture", 7, ORIGINAL_SCENES / "06-architecture.png", "image",
        "One response, strict evidence validation, and a versioned engine—consistent across web and WhatsApp."),
    Cut("11-close", 4, ORIGINAL_SCENES / "09-close.png", "image",
        "See the pack. Understand the choice. Front of Pack."),
]

TOTAL_DURATION = sum(cut.duration for cut in CUTS)


def run(*args: str) -> None:
    subprocess.run([str(FFMPEG), "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as source:
        return source.getnframes() / source.getframerate()


def make_voice(cut: Cut, key: str) -> Path:
    audio_dir = WORK / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    mp3 = audio_dir / f"{cut.slug}.mp3"
    raw = audio_dir / f"{cut.slug}-raw.wav"
    fitted = audio_dir / f"{cut.slug}.wav"
    if not mp3.exists():
        scene = Scene(cut.slug, "", "", cut.narration)
        synthesize_scene(key, VOICE_ID, scene, mp3)
    run("-i", str(mp3), "-ar", "48000", "-ac", "2", str(raw))
    original = wav_duration(raw)
    usable = cut.duration - 0.45
    filters: list[str] = []
    if original > usable:
        ratio = original / usable
        while ratio > 2:
            filters.append("atempo=2")
            ratio /= 2
        filters.append(f"atempo={ratio:.6f}")
    filters.extend(["apad", f"atrim=0:{cut.duration:.3f}"])
    run("-i", str(raw), "-af", ",".join(filters), "-ar", "48000", "-ac", "2", str(fitted))
    return fitted


def make_visual(cut: Cut) -> Path:
    visual_dir = WORK / "visual"
    visual_dir.mkdir(parents=True, exist_ok=True)
    output = visual_dir / f"{cut.slug}.mp4"
    if cut.source_type == "video":
        run("-ss", str(cut.source_start), "-i", str(cut.source), "-t", str(cut.duration),
            "-vf", "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,format=yuv420p",
            "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", output.as_posix())
    else:
        run("-loop", "1", "-i", str(cut.source), "-t", str(cut.duration),
            "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xF4F0E7,fps=30,format=yuv420p",
            "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", output.as_posix())
    return output


def make_scene(cut: Cut, key: str) -> Path:
    scenes = WORK / "scenes"
    scenes.mkdir(parents=True, exist_ok=True)
    visual = make_visual(cut)
    voice = make_voice(cut, key)
    output = scenes / f"{cut.slug}.mp4"
    run("-i", str(visual), "-i", str(voice), "-t", str(cut.duration),
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", str(output))
    return output


def timestamp(seconds: float) -> str:
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3_600_000)
    minutes, millis = divmod(millis, 60_000)
    secs, millis = divmod(millis, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"


def write_captions() -> Path:
    path = OUTPUT / "cinematic-v3-captions.srt"
    entries: list[str] = []
    cursor = 0.0
    index = 1
    for cut in CUTS:
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", cut.narration) if s.strip()]
        span = cut.duration / max(1, len(sentences))
        for position, sentence in enumerate(sentences):
            start = cursor + position * span
            end = min(cursor + cut.duration, cursor + (position + 1) * span)
            entries.append(f"{index}\n{timestamp(start)} --> {timestamp(end)}\n{sentence}\n")
            index += 1
        cursor += cut.duration
    path.write_text("\n".join(entries), encoding="utf-8")
    return path


def make_music(key: str) -> Path:
    music = WORK / "front-of-pack-score-v2.mp3"
    if music.exists():
        return music
    client = ElevenLabs(api_key=key)
    audio = client.music.compose(
        prompt=(
            "Punchy instrumental underscore for an eighty-second Indian public-interest technology advertisement. "
            "Modern organic percussion, crisp soft synth pulse, warm bass and concise melodic hooks at 116 BPM. "
            "Open with immediate curiosity, lift decisively at eighteen seconds when the product is introduced, "
            "add momentum through the evidence reveal, then resolve with a confident clean final sting. Keep the "
            "arrangement light beneath narration. No vocals, no dramatic drops, no corporate jingle or stereotypes."
        ),
        music_length_ms=int(TOTAL_DURATION * 1000),
        model_id="music_v2",
        force_instrumental=True,
        output_format="mp3_48000_192",
    )
    with music.open("wb") as destination:
        for chunk in audio:
            destination.write(chunk)
    return music


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    env = read_env(ROOT / ".dev.vars")
    key = env.get("ELEVENLABS_API_KEY")
    if not key:
        raise RuntimeError("ELEVENLABS_API_KEY is missing from video/.dev.vars")
    for cut in CUTS:
        if not cut.source.exists():
            raise FileNotFoundError(cut.source)
    rendered = [make_scene(cut, key) for cut in CUTS]
    concat = WORK / "concat.txt"
    concat.write_text("\n".join(f"file '{p.as_posix()}'" for p in rendered), encoding="utf-8")
    base = OUTPUT / "front-of-pack-cinematic-v3-base.mp4"
    run("-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", "-movflags", "+faststart", str(base))
    captions = write_captions()
    music = make_music(key)
    final = OUTPUT / "front-of-pack-cinematic-v3.mp4"
    subtitle_path = captions.resolve().as_posix().replace(":", "\\:")
    style = "FontName=Arial,FontSize=17,PrimaryColour=&H00FFFFFF,OutlineColour=&H0018251D,BorderStyle=3,Outline=1,Shadow=0,MarginV=45,Alignment=2"
    audio_mix = (
        "[0:a]loudnorm=I=-16:LRA=7:TP=-1.0[voice];"
        "[1:a]loudnorm=I=-24:LRA=8:TP=-2,volume=-10dB,"
        f"atrim=0:{TOTAL_DURATION},afade=t=in:st=0:d=1,afade=t=out:st={TOTAL_DURATION - 3}:d=3[music];"
        "[voice][music]amix=inputs=2:duration=first:dropout_transition=2,alimiter=limit=0.891[aout]"
    )
    run("-i", str(base), "-i", str(music),
        "-vf", f"subtitles=filename='{subtitle_path}':force_style='{style}'",
        "-filter_complex", audio_mix, "-map", "0:v:0", "-map", "[aout]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", str(final))
    manifest = {"duration_seconds": TOTAL_DURATION, "voice_id": VOICE_ID,
                "scenes": [{"slug": c.slug, "duration": c.duration} for c in CUTS]}
    (OUTPUT / "cinematic-v3-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(final)


if __name__ == "__main__":
    main()

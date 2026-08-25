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
WORK = ROOT / "work" / "cinematic"
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


CUTS = [
    Cut("01-seconds", 8, GENERATED / "clip-a.mp4", "video",
        "Most shopping decisions happen in seconds. And the front of a pack is designed to win those seconds."),
    Cut("02-claim", 8, GENERATED / "clip-b.mp4", "video",
        "A confident claim, bright colours, a familiar promise. The shopper chooses before seeing what the whole pack contains."),
    Cut("03-friend", 8, GENERATED / "clip-c.mp4", "video",
        "Her friend asks one simple question: before you decide, why not check the evidence?"),
    Cut("04-whatsapp", 12, CAPTURES / "09-whatsapp.png", "image",
        "Send one photo to Front of Pack on WhatsApp. The answer stays linked to the image and returns in the shopper's chosen language."),
    Cut("05-reveal", 16, CAPTURES / "04-alofrut.png", "image",
        "Here, Front of Pack calculates bottle reality: thirty-one point five grams of added sugar, about sixty-three percent of the daily reference, plus six hundred seventy-eight milligrams of sodium."),
    Cut("06-choice", 8, GENERATED / "clip-d.mp4", "video",
        "Now she can choose for her priorities using evidence, not packaging."),
    Cut("07-web", 8, CAPTURES / "01-home.png", "image",
        "The same concise shopper brief works on the web with one upload."),
    Cut("08-cart", 12, CAPTURES / "03-cart-results.png", "image",
        "A cart screenshot can analyse up to six products, separating every result so comparison stays clear."),
    Cut("09-method", 14, CAPTURES / "06-method-rating.png", "image",
        "The model reads and researches. Published rules calculate whole-pack percentages, claim checks and rating deductions, with sources and uncertainty kept visible."),
    Cut("10-architecture", 12, ORIGINAL_SCENES / "06-architecture.png", "image",
        "One Terra response, strict evidence validation, then a versioned decision engine. Web and WhatsApp render the same stored result."),
    Cut("11-close", 5, ORIGINAL_SCENES / "09-close.png", "image",
        "One photo. Clearer choices. Front of Pack."),
]


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
        run("-i", str(cut.source), "-t", str(cut.duration),
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
    path = OUTPUT / "cinematic-captions.srt"
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
    music = WORK / "front-of-pack-score.mp3"
    if music.exists():
        return music
    client = ElevenLabs(api_key=key)
    audio = client.music.compose(
        prompt=(
            "Instrumental underscore for a one-minute-fifty-one-second Indian public-interest technology demo. "
            "Warm modern organic percussion, soft synth texture and restrained melodic pulses. Begin curious "
            "and understated, gently reveal insight after twenty-four seconds, become hopeful around fifty-two "
            "seconds, then use a precise light technology pulse before a clean resolved ending. Leave generous "
            "space for narration. No vocals, no dramatic drops, no corporate jingle, no genre stereotypes."
        ),
        music_length_ms=111_000,
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
    base = OUTPUT / "front-of-pack-cinematic-base.mp4"
    run("-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", "-movflags", "+faststart", str(base))
    captions = write_captions()
    music = make_music(key)
    final = OUTPUT / "front-of-pack-cinematic.mp4"
    subtitle_path = captions.resolve().as_posix().replace(":", "\\:")
    style = "FontName=Arial,FontSize=17,PrimaryColour=&H00FFFFFF,OutlineColour=&H0018251D,BorderStyle=3,Outline=1,Shadow=0,MarginV=45,Alignment=2"
    audio_mix = (
        "[0:a]loudnorm=I=-16:LRA=7:TP=-1.0[voice];"
        "[1:a]loudnorm=I=-24:LRA=8:TP=-2,volume=-10dB,"
        "atrim=0:111,afade=t=in:st=0:d=2,afade=t=out:st=107:d=4[music];"
        "[voice][music]amix=inputs=2:duration=first:dropout_transition=2,alimiter=limit=0.891[aout]"
    )
    run("-i", str(base), "-i", str(music),
        "-vf", f"subtitles=filename='{subtitle_path}':force_style='{style}'",
        "-filter_complex", audio_mix, "-map", "0:v:0", "-map", "[aout]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", str(final))
    manifest = {"duration_seconds": sum(c.duration for c in CUTS), "voice_id": VOICE_ID,
                "scenes": [{"slug": c.slug, "duration": c.duration} for c in CUTS]}
    (OUTPUT / "cinematic-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(final)


if __name__ == "__main__":
    main()

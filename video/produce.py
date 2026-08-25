from __future__ import annotations

import argparse
import json
import math
import os
import re
import struct
import subprocess
import sys
import urllib.parse
import urllib.request
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent
WORK = ROOT / "work"
CAPTURES = WORK / "captures"
SCENES = WORK / "scenes"
AUDIO = WORK / "audio"
OUTPUT = ROOT / "output"
PYTHON_PACKAGES = ROOT / ".python-packages"
sys.path.insert(0, str(PYTHON_PACKAGES))

try:
    import imageio_ffmpeg
except ImportError as exc:
    raise SystemExit("Run the documented imageio-ffmpeg task-local install first.") from exc

FFMPEG = Path(imageio_ffmpeg.get_ffmpeg_exe())

WIDTH, HEIGHT, FPS = 1920, 1080, 30
CREAM = "#F4F0E7"
INK = "#18251D"
GREEN = "#125943"
LIME = "#C6FF3D"
ORANGE = "#F06435"
RED = "#D83125"
AMBER = "#F39A18"
MUTED = "#69736D"
LINE = "#D8D1C4"

FONT_REGULAR = Path("C:/Windows/Fonts/arial.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/arialbd.ttf")
FONT_SERIF = Path("C:/Windows/Fonts/georgia.ttf")
FONT_SERIF_ITALIC = Path("C:/Windows/Fonts/georgiai.ttf")


@dataclass(frozen=True)
class Scene:
    slug: str
    eyebrow: str
    title: str
    narration: str
    capture: str | None = None
    accent: str = GREEN
    crop: tuple[int, int, int, int] | None = None


SCENE_DATA = [
    Scene(
        "01-hook", "ONE PHOTO · THE WHOLE-PACK PICTURE",
        "The label shows one serving.\nSee what the whole pack means.",
        "A package label shows one serving. But shoppers need to understand the whole pack—and the evidence behind every warning.",
        "01-home.png", GREEN,
    ),
    Scene(
        "02-cart", "MULTI-PRODUCT · ONE INPUT",
        "Five products. One shopper brief.",
        "Front of Pack accepts one product photo or cart screenshot and identifies up to six products. This cached five-item demonstration appears instantly and makes no model call during recording.",
        "03-cart-results.png", ORANGE,
    ),
    Scene(
        "03-alofrut", "WHOLE-PACK REALITY",
        "31.5 g added sugar · ~63%\n678 mg sodium · ~33.8%",
        "Here, the label presents one serving. Front of Pack calculates the bottle reality: thirty-one point five grams of added sugar—about sixty-three percent of the daily reference—and six hundred seventy-eight milligrams of sodium. The absolute amount, percentage, source, and uncertainty stay together.",
        "04-alofrut.png", RED,
    ),
    Scene(
        "04-whatsapp", "LIVE ACCESS CHANNEL",
        "The same answer, on WhatsApp.",
        "The same concise answer works on WhatsApp. English is the default; choose another language once, and future replies remember it.",
        "09-whatsapp.png", GREEN, (0, 0, 1227, 690),
    ),
    Scene(
        "05-method", "OPEN DECISION LOGIC",
        "Warnings are named.\nAuthority is visible.",
        "The model reads the image, researches an exact product match, and writes the explanation. Published code—not model prose—raises red warnings, calculates whole-pack values, and applies fixed rating deductions.",
        "06-method-rating.png", ORANGE,
    ),
    Scene(
        "06-architecture", "ONE RESPONSE · VALIDATED · REPRODUCIBLE",
        "Simple architecture. Clear authority.",
        "A fresh image uses one GPT-5.6 Terra response with hosted search. The result passes strict evidence validation, then a versioned decision engine calculates the shopper signals. Web and WhatsApp render the same stored result. An exact cache hit uses zero additional model calls.",
        None, GREEN,
    ),
    Scene(
        "07-boundary", "HONEST PUBLIC-SERVICE BOUNDARY",
        "Synthetic registry. Editable draft.\nNo fake government connection.",
        "This is an independent prototype. Registry examples are synthetic. Grievance assistance creates an editable draft, but never logs into a government system, files a complaint, or invents a docket.",
        "07-registry.png", AMBER,
    ),
    Scene(
        "08-codex", "BUILT WITH CODEX",
        "Product direction · typed contracts · tested release",
        "Codex helped turn the product constraint into typed contracts, privacy boundaries, deterministic rules, Cloudflare infrastructure, and a regression suite covering the failures we found along the way.",
        None, ORANGE,
    ),
    Scene(
        "09-close", "FRONT OF PACK",
        "One photo. Clearer choices.",
        "One photo. Clearer choices. Front of Pack.",
        None, GREEN,
    ),
]

FALLBACK_DURATIONS = [9.0, 12.0, 21.0, 12.0, 16.0, 18.0, 14.0, 9.0, 4.0]


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def wrapped_lines(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.splitlines() or [""]:
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        current = words[0]
        for word in words[1:]:
            candidate = f"{current} {word}"
            if draw.textbbox((0, 0), candidate, font=face)[2] <= width:
                current = candidate
            else:
                lines.append(current)
                current = word
        lines.append(current)
    return lines


def draw_text_block(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, face: ImageFont.FreeTypeFont,
                    fill: str, width: int, spacing: int = 12) -> int:
    x, y = xy
    for line in wrapped_lines(draw, text, face, width):
        draw.text((x, y), line, font=face, fill=fill)
        box = draw.textbbox((x, y), line or "Ag", font=face)
        y += (box[3] - box[1]) + spacing
    return y


def round_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def fit_capture(path: Path, box: tuple[int, int], crop: tuple[int, int, int, int] | None = None) -> Image.Image:
    source = Image.open(path).convert("RGB")
    if crop:
        source = source.crop(crop)
    source_ratio = source.width / source.height
    target_ratio = box[0] / box[1]
    if source_ratio > target_ratio:
        new_height = box[1]
        new_width = round(new_height * source_ratio)
    else:
        new_width = box[0]
        new_height = round(new_width / source_ratio)
    source = source.resize((new_width, new_height), Image.Resampling.LANCZOS)
    left = max(0, (new_width - box[0]) // 2)
    top = max(0, (new_height - box[1]) // 2)
    return source.crop((left, top, left + box[0], top + box[1]))


def base_canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), CREAM)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 14), fill=INK)
    draw.ellipse((58, 45, 116, 103), fill=GREEN)
    draw.text((87, 75), "F", font=font(FONT_SERIF_ITALIC, 36), fill=LIME, anchor="mm")
    draw.text((136, 60), "Front of Pack", font=font(FONT_BOLD, 29), fill=INK)
    return image, draw


def add_capture_card(image: Image.Image, capture: Image.Image, y: int = 280, height: int = 690) -> None:
    x, width = 70, 1780
    shadow = Image.new("RGBA", (width + 30, height + 30), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((15, 15, width + 15, height + 15), radius=28, fill=(23, 35, 28, 36))
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    image.paste(shadow, (x - 15, y - 10), shadow)
    card = capture.resize((width, height), Image.Resampling.LANCZOS)
    mask = round_mask((width, height), 24)
    image.paste(card, (x, y), mask)
    ImageDraw.Draw(image).rounded_rectangle((x, y, x + width, y + height), radius=24, outline=LINE, width=2)


def render_capture_scene(scene: Scene) -> Image.Image:
    image, draw = base_canvas()
    draw.text((70, 132), scene.eyebrow, font=font(FONT_BOLD, 20), fill=scene.accent)
    title_face = font(FONT_SERIF, 50 if "\n" not in scene.title else 43)
    title_bottom = draw_text_block(draw, (70, 172), scene.title, title_face, INK, 1780, 6)
    capture_height = 700 if title_bottom < 265 else 640
    capture = fit_capture(CAPTURES / scene.capture, (1780, capture_height), scene.crop)
    add_capture_card(image, capture, y=max(285, title_bottom + 20), height=capture_height)
    return image


def box(draw: ImageDraw.ImageDraw, rect: tuple[int, int, int, int], heading: str, detail: str,
        accent: str, number: str | None = None) -> None:
    draw.rounded_rectangle(rect, radius=24, fill="#FFFFFF", outline=LINE, width=2)
    x1, y1, x2, _ = rect
    if number:
        draw.text((x1 + 28, y1 + 25), number, font=font(FONT_BOLD, 17), fill=accent)
        heading_y = y1 + 66
    else:
        heading_y = y1 + 30
    draw.text((x1 + 28, heading_y), heading, font=font(FONT_BOLD, 24), fill=INK)
    draw_text_block(draw, (x1 + 28, heading_y + 45), detail, font(FONT_REGULAR, 19), MUTED, x2 - x1 - 56, 6)


def render_architecture(scene: Scene) -> Image.Image:
    image, draw = base_canvas()
    draw.text((70, 142), scene.eyebrow, font=font(FONT_BOLD, 20), fill=scene.accent)
    draw.text((70, 190), scene.title, font=font(FONT_SERIF, 54), fill=INK)
    labels = [
        ("01", "ONE IMAGE", "Original bytes and selected language"),
        ("02", "READ + RESEARCH", "One structured response + product search"),
        ("03", "VALIDATE", "Strict schema, evidence and source links"),
        ("04", "DECISION ENGINE", "RDA, whole-pack, claims and rating"),
        ("05", "DELIVER", "Web + WhatsApp from one stored result"),
    ]
    x_positions = [70, 425, 780, 1135, 1490]
    for index, (num, heading, detail) in enumerate(labels):
        box(draw, (x_positions[index], 360, x_positions[index] + 300, 600), heading, detail, scene.accent, num)
        if index < len(labels) - 1:
            draw.line((x_positions[index] + 305, 480, x_positions[index + 1] - 5, 480), fill=scene.accent, width=5)
            draw.polygon([(x_positions[index + 1] - 17, 469), (x_positions[index + 1] - 5, 480), (x_positions[index + 1] - 17, 491)], fill=scene.accent)
    draw.rounded_rectangle((70, 690, 1850, 865), radius=24, fill="#E5F3E9", outline="#C4DCCB", width=2)
    draw.text((105, 730), "CACHE HIT", font=font(FONT_BOLD, 20), fill=GREEN)
    draw.text((105, 780), "Exact image + language + versions", font=font(FONT_BOLD, 30), fill=INK)
    draw.text((850, 780), "→", font=font(FONT_BOLD, 36), fill=GREEN)
    draw.text((940, 780), "ZERO ADDITIONAL MODEL CALLS", font=font(FONT_BOLD, 30), fill=GREEN)
    return image


def render_boundary(scene: Scene) -> Image.Image:
    image, draw = base_canvas()
    draw.text((70, 130), scene.eyebrow, font=font(FONT_BOLD, 20), fill=scene.accent)
    draw_text_block(draw, (70, 170), scene.title, font(FONT_SERIF, 49), INK, 1760, 4)
    registry = fit_capture(CAPTURES / "07-registry.png", (850, 570))
    grievance = fit_capture(CAPTURES / "08-grievance.png", (850, 570))
    for x, capture, label in [(70, registry, "SYNTHETIC DEMONSTRATION"), (1000, grievance, "EDITABLE DRAFT ONLY")]:
        mask = round_mask((850, 570), 24)
        image.paste(capture, (x, 365), mask)
        draw.rounded_rectangle((x, 365, x + 850, 935), radius=24, outline=LINE, width=2)
        draw.rounded_rectangle((x + 24, 390, x + 300, 432), radius=21, fill=INK)
        draw.text((x + 162, 411), label, font=font(FONT_BOLD, 14), fill="#FFFFFF", anchor="mm")
    return image


def render_codex(scene: Scene) -> Image.Image:
    image, draw = base_canvas()
    draw.text((70, 145), scene.eyebrow, font=font(FONT_BOLD, 20), fill=scene.accent)
    draw.text((70, 195), scene.title, font=font(FONT_SERIF, 49), fill=INK)
    items = [
        ("01", "PRODUCT DIRECTION", "One call, multiple products, warning-first output"),
        ("02", "TYPED CONTRACTS", "Schema v4, explicit evidence and authority boundaries"),
        ("03", "SECURE DELIVERY", "Cloudflare Queues, private media and direct Meta transport"),
        ("04", "REGRESSION SUITE", "160 checks across reasoning, security and presentation"),
    ]
    positions = [(70, 345), (970, 345), (70, 650), (970, 650)]
    for (num, heading, detail), (x, y) in zip(items, positions):
        box(draw, (x, y, x + 820, y + 240), heading, detail, scene.accent, num)
    draw.text((70, 960), "Human direction + Codex execution + review-driven fixes", font=font(FONT_BOLD, 24), fill=GREEN)
    return image


def render_close(scene: Scene) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), GREEN)
    draw = ImageDraw.Draw(image)
    draw.ellipse((860, 135, 1060, 335), fill=INK)
    draw.text((960, 235), "F", font=font(FONT_SERIF_ITALIC, 116), fill=LIME, anchor="mm")
    draw.text((960, 410), "FRONT OF PACK", font=font(FONT_BOLD, 24), fill=LIME, anchor="mm")
    draw.text((960, 505), scene.title, font=font(FONT_SERIF, 64), fill="#FFFFFF", anchor="mm")
    draw.text((960, 650), "front-of-pack.front-of-pack-jobs-worker.workers.dev", font=font(FONT_BOLD, 24), fill="#FFFFFF", anchor="mm")
    draw.rounded_rectangle((675, 725, 1245, 795), radius=35, fill="#FFFFFF")
    draw.text((960, 760), "WhatsApp  ·  +91 93258 35971", font=font(FONT_BOLD, 23), fill=GREEN, anchor="mm")
    draw.text((960, 940), "Independent educational prototype · Not a government service", font=font(FONT_REGULAR, 18), fill="#CDE5D7", anchor="mm")
    return image


def render_scenes() -> None:
    SCENES.mkdir(parents=True, exist_ok=True)
    for scene in SCENE_DATA:
        if scene.slug == "06-architecture":
            image = render_architecture(scene)
        elif scene.slug == "07-boundary":
            image = render_boundary(scene)
        elif scene.slug == "08-codex":
            image = render_codex(scene)
        elif scene.slug == "09-close":
            image = render_close(scene)
        else:
            image = render_capture_scene(scene)
        image.save(SCENES / f"{scene.slug}.png", quality=95)


def read_env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def api_json(url: str, key: str) -> dict:
    request = urllib.request.Request(url, headers={"xi-api-key": key, "accept": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def select_voice(key: str, explicit: str | None) -> tuple[str, dict]:
    if explicit:
        return explicit, {"voice_id": explicit, "name": "Configured voice", "selection": "explicit"}
    data = api_json("https://api.elevenlabs.io/v2/voices?page_size=100&include_total_count=false", key)
    voices = data.get("voices") or []
    if not voices:
        raise RuntimeError("No ElevenLabs voices are available for this account.")

    def score(voice: dict) -> tuple[int, str]:
        labels = {str(k).lower(): str(v).lower() for k, v in (voice.get("labels") or {}).items()}
        searchable = " ".join([voice.get("name") or "", voice.get("description") or "", *labels.values()]).lower()
        points = 0
        if "indian" in searchable or "india" in searchable:
            points += 100
        if any(term in searchable for term in ("narration", "documentary", "educational", "news", "professional")):
            points += 35
        if voice.get("category") in ("professional", "high_quality"):
            points += 25
        if any(term in searchable for term in ("calm", "confident", "warm", "clear")):
            points += 15
        if (voice.get("name") or "").lower() in ("daniel", "george", "rachel", "adam"):
            points += 5
        return points, voice.get("name") or ""

    selected = sorted(voices, key=score, reverse=True)[0]
    return selected["voice_id"], {
        "voice_id": selected["voice_id"],
        "name": selected.get("name"),
        "category": selected.get("category"),
        "labels": selected.get("labels") or {},
        "selection": "automatic",
    }


def synthesize_scene(key: str, voice_id: str, scene: Scene, destination: Path) -> None:
    query = urllib.parse.urlencode({"output_format": "mp3_44100_128"})
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{urllib.parse.quote(voice_id)}?{query}"
    payload = json.dumps({
        "text": scene.narration,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.58,
            "similarity_boost": 0.78,
            "style": 0.12,
            "use_speaker_boost": True,
        },
    }).encode("utf-8")
    request = urllib.request.Request(url, data=payload, method="POST", headers={
        "xi-api-key": key,
        "content-type": "application/json",
        "accept": "audio/mpeg",
    })
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            destination.write_bytes(response.read())
    except urllib.error.HTTPError as error:
        message = error.read(500).decode("utf-8", errors="replace")
        raise RuntimeError(f"ElevenLabs TTS failed for {scene.slug}: HTTP {error.code}: {message}") from error


def run(command: list[str], *, capture: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=True, text=True, capture_output=capture)


def mp3_to_wav(source: Path, destination: Path) -> None:
    run([str(FFMPEG), "-y", "-hide_banner", "-loglevel", "error", "-i", str(source),
         "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", str(destination)])


def build_narration(env: dict[str, str]) -> tuple[Path, list[float], dict]:
    key = env.get("ELEVENLABS_API_KEY", "")
    if not key:
        raise RuntimeError("ELEVENLABS_API_KEY is missing from video/.dev.vars")
    AUDIO.mkdir(parents=True, exist_ok=True)
    explicit_voice = env.get("ELEVENLABS_VOICE_ID") or None
    existing_manifest = OUTPUT / "manifest.json"
    all_clips_exist = all((AUDIO / f"{scene.slug}.mp3").exists() for scene in SCENE_DATA)
    if not explicit_voice and all_clips_exist and existing_manifest.exists():
        previous_voice = json.loads(existing_manifest.read_text(encoding="utf-8")).get("voice") or {}
        voice_id = previous_voice.get("voice_id")
        if not voice_id:
            voice_id, voice_meta = select_voice(key, None)
        else:
            voice_meta = previous_voice
            voice_meta["selection"] = "reused"
    else:
        voice_id, voice_meta = select_voice(key, explicit_voice)
    durations: list[float] = []
    pcm_parts: list[bytes] = []
    sample_rate = 44100
    pause_seconds = 0.32
    for index, scene in enumerate(SCENE_DATA):
        mp3 = AUDIO / f"{scene.slug}.mp3"
        wav_path = AUDIO / f"{scene.slug}.wav"
        if not mp3.exists():
            synthesize_scene(key, voice_id, scene, mp3)
        mp3_to_wav(mp3, wav_path)
        with wave.open(str(wav_path), "rb") as handle:
            if handle.getnchannels() != 1 or handle.getsampwidth() != 2 or handle.getframerate() != sample_rate:
                raise RuntimeError("Unexpected decoded narration format")
            frames = handle.readframes(handle.getnframes())
            duration = handle.getnframes() / sample_rate
        padding = pause_seconds if index < len(SCENE_DATA) - 1 else 0.0
        pcm_parts.append(frames)
        pcm_parts.append(b"\x00\x00" * round(sample_rate * padding))
        durations.append(duration + padding)

    narration = AUDIO / "narration.wav"
    with wave.open(str(narration), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        output.writeframes(b"".join(pcm_parts))
    return narration, durations, voice_meta


def timestamp(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def write_srt(durations: list[float]) -> Path:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / "captions.srt"
    start = 0.0
    blocks = []
    subtitle_index = 1
    for scene, duration in zip(SCENE_DATA, durations):
        words = scene.narration.split()
        chunks: list[list[str]] = []
        cursor = 0
        while cursor < len(words):
            remaining = len(words) - cursor
            take = min(11, remaining)
            if remaining - take in (1, 2, 3):
                take = max(7, take - (4 - (remaining - take)))
            chunks.append(words[cursor:cursor + take])
            cursor += take
        total_words = max(1, sum(len(chunk) for chunk in chunks))
        scene_cursor = start
        for chunk_index, chunk in enumerate(chunks):
            chunk_duration = duration * len(chunk) / total_words
            chunk_end = start + duration if chunk_index == len(chunks) - 1 else scene_cursor + chunk_duration
            blocks.append(
                f"{subtitle_index}\n{timestamp(scene_cursor)} --> {timestamp(chunk_end)}\n{' '.join(chunk)}\n"
            )
            subtitle_index += 1
            scene_cursor = chunk_end
        start += duration
    path.write_text("\n".join(blocks), encoding="utf-8")
    return path


def render_scene_clips(durations: list[float]) -> list[Path]:
    clips_dir = WORK / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)
    clips: list[Path] = []
    for scene, duration in zip(SCENE_DATA, durations):
        source = SCENES / f"{scene.slug}.png"
        output = clips_dir / f"{scene.slug}.mp4"
        frames = max(1, math.ceil(duration * FPS))
        zoom = "min(zoom+0.00012,1.025)"
        video_filter = (
            f"zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
            f":d={frames}:s={WIDTH}x{HEIGHT}:fps={FPS},format=yuv420p"
        )
        run([str(FFMPEG), "-y", "-hide_banner", "-loglevel", "error", "-loop", "1", "-i", str(source),
             "-vf", video_filter, "-frames:v", str(frames), "-an", "-c:v", "libx264", "-preset", "medium",
             "-crf", "18", "-movflags", "+faststart", str(output)])
        clips.append(output)
    return clips


def concat_video(clips: Iterable[Path]) -> Path:
    manifest = WORK / "concat.txt"
    manifest.write_text("".join(f"file '{path.as_posix()}'\n" for path in clips), encoding="utf-8")
    destination = WORK / "silent.mp4"
    run([str(FFMPEG), "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0",
         "-i", str(manifest), "-c", "copy", "-movflags", "+faststart", str(destination)])
    return destination


def escape_subtitle_path(path: Path) -> str:
    value = path.resolve().as_posix()
    value = value.replace(":", r"\:").replace("'", r"\'")
    return value


def mux_final(video: Path, narration: Path | None, captions: Path, filename: str) -> Path:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    destination = OUTPUT / filename
    subtitle_filter = (
        f"subtitles='{escape_subtitle_path(captions)}':"
        "force_style='FontName=Arial,FontSize=16,PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&H0018251D,BorderStyle=3,BackColour=&HCC18251D,Outline=1,"
        "Shadow=0,MarginV=28,Alignment=2'"
    )
    command = [str(FFMPEG), "-y", "-hide_banner", "-loglevel", "error", "-i", str(video)]
    if narration:
        command += ["-i", str(narration)]
    command += ["-vf", subtitle_filter, "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
    if narration:
        command += ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
                    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,volume=3dB", "-shortest"]
    else:
        command += ["-an"]
    command.append(str(destination))
    run(command)
    return destination


def duration_seconds(path: Path) -> float:
    process = subprocess.run([str(FFMPEG), "-hide_banner", "-i", str(path)], text=True, capture_output=True)
    match = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", process.stderr)
    if not match:
        return 0.0
    return int(match.group(1)) * 3600 + int(match.group(2)) * 60 + float(match.group(3))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--animatic", action="store_true", help="Build a silent fixed-timing draft without ElevenLabs")
    args = parser.parse_args()
    render_scenes()
    if args.animatic:
        durations = FALLBACK_DURATIONS
        narration = None
        voice_meta = {"selection": "none", "name": None, "voice_id": None}
        filename = "front-of-pack-animatic.mp4"
    else:
        narration, durations, voice_meta = build_narration(read_env(ROOT / ".dev.vars"))
        filename = "front-of-pack-demo.mp4"
    captions = write_srt(durations)
    clips = render_scene_clips(durations)
    silent = concat_video(clips)
    final = mux_final(silent, narration, captions, filename)
    total = duration_seconds(final)
    manifest = {
        "file": str(final),
        "duration_seconds": total,
        "resolution": f"{WIDTH}x{HEIGHT}",
        "fps": FPS,
        "voice": voice_meta,
        "scenes": [{"slug": scene.slug, "duration_seconds": duration} for scene, duration in zip(SCENE_DATA, durations)],
    }
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(manifest, indent=2, ensure_ascii=False))
    if not args.animatic and total > 119.0:
        raise SystemExit("Rendered video exceeds the two-minute limit; tighten narration before submission.")


if __name__ == "__main__":
    main()

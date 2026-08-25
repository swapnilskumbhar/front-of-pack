"""Generate approved cinematic b-roll through the ElevenLabs Image & Video API.

Outputs are written under video/work/generated and remain ignored by Git.
The API key is loaded only from video/.dev.vars.
"""

from __future__ import annotations

import argparse
import os
import time
from pathlib import Path

import requests
from dotenv import dotenv_values
from elevenlabs import ImageReference_Asset, VideoGenerationRequest_Veo31FastGenerate001
from elevenlabs.client import ElevenLabs


ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT / "work" / "generated"

CONTINUITY = """
Contemporary premium supermarket in Pune, India, warm natural commercial
lighting, realistic documentary advertising style. An adult Indian shopper
with shoulder-length wavy black hair wears a mustard yellow casual shirt, blue
jeans, and a canvas tote. Her movement and expression are natural and subtle.
The colourful packages use simple abstract graphic designs. Keep shelves,
products, hands and camera movement visually coherent. Do not include captions,
logos or readable packaging text.
""".strip()

CLIPS = {
    "a": """
Smooth waist-height tracking shot following the shopper walking slowly down a
packaged-food aisle. She stops, studies two colourful products and reaches
toward the one with a large clean front graphic. Her expression shows mild
uncertainty, not comedy. Camera moves from medium-wide to over-the-shoulder.
Leave the phone out of frame.
""".strip(),
    "b": """
Continue the same shot as the shopper reaches the shelf. Move into a natural
over-the-shoulder close shot. She takes one colourful package, notices a second
option beside it, and compares their front designs for a moment. She begins to
place the first package into her basket. Keep her appearance, clothing, tote,
aisle and lighting unchanged. The package graphics remain abstract.
""".strip(),
    "c": """
Continue in the same supermarket aisle with the same shopper. Her friend, who
has tied-back black hair and wears a teal overshirt over a white top, enters the
frame and stands beside her. They smile and look at the product together. The
friend makes a small conversational gesture toward the shopper's phone, and the
shopper looks curious. Calm friendly interaction with no spoken words and a
slow documentary push-in.
""".strip(),
    "d": """
Continue with the same two women in the same aisle. The shopper thoughtfully
turns the second package around, examines its back panel, compares it with the
first package, and places the option that fits her priorities into the basket.
The friend gives a small approving nod. The moment feels informed and natural,
not celebratory. Preserve wardrobe, faces, aisle and lighting.
""".strip(),
}


def load_client() -> ElevenLabs:
    key = dotenv_values(ROOT / ".dev.vars").get("ELEVENLABS_API_KEY")
    if not key:
        raise RuntimeError("ELEVENLABS_API_KEY is missing from video/.dev.vars")
    return ElevenLabs(api_key=key)


def generate(clip: str, start_frame: Path | None = None) -> Path:
    client = load_client()
    prompt = f"{CLIPS[clip]}\n\n{CONTINUITY}"
    frame_reference = None
    if start_frame:
        with start_frame.open("rb") as frame:
            asset = client.assets.create(asset=frame, name=start_frame.name)
        frame_reference = ImageReference_Asset(asset_id=asset.asset_id)
        print(f"uploaded continuity frame {asset.asset_id}", flush=True)
    generation = client.flows.video.create(
        request=VideoGenerationRequest_Veo31FastGenerate001(
            prompt=prompt,
            start_frame=frame_reference,
            duration_secs=8,
            aspect_ratio="16:9",
            resolution="1080p",
            generate_audio=False,
        )
    )
    print(f"queued generation {generation.id}", flush=True)

    delay = 10
    started = time.monotonic()
    while True:
        time.sleep(delay)
        result = client.flows.video.get(generation.id)
        elapsed = int(time.monotonic() - started)
        print(f"status={result.status} elapsed={elapsed}s", flush=True)
        if result.status in ("completed", "failed"):
            break
        if elapsed > 900:
            raise TimeoutError("Generation did not finish within 15 minutes")
        delay = min(delay * 2, 60)

    if result.status == "failed":
        raise RuntimeError(
            f"{result.failure_reason}: {getattr(result, 'error_message', '')}"
        )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output = OUTPUT_DIR / f"clip-{clip}.mp4"
    response = requests.get(result.content_url, timeout=180)
    response.raise_for_status()
    output.write_bytes(response.content)
    print(f"saved {output} ({output.stat().st_size} bytes)", flush=True)
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("clip", choices=sorted(CLIPS))
    parser.add_argument("--start-frame", type=Path)
    args = parser.parse_args()
    generate(args.clip, args.start_frame)

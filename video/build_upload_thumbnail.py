"""Build the 1280×720 upload thumbnail from real FoP film assets."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont


ROOT = Path(__file__).resolve().parent
WORK = ROOT / "work" / "upload"
OUTPUT = ROOT / "output"
FONT_BOLD = Path("C:/Windows/Fonts/arialbd.ttf")


def cover(image: Image.Image, size: tuple[int, int], focus_x: float = 0.5) -> Image.Image:
    ratio = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize((round(image.width * ratio), round(image.height * ratio)), Image.Resampling.LANCZOS)
    left = round((resized.width - size[0]) * focus_x)
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def main() -> None:
    frame = Image.open(WORK / "friends.png").convert("RGB")
    result = Image.open(ROOT / "work" / "captures" / "04-alofrut.png").convert("RGB")
    canvas = Image.new("RGB", (1280, 720), "#13241c")
    canvas.paste(cover(frame, (790, 720), 0.42), (0, 0))
    result_panel = cover(result, (570, 720), 0.2)
    result_panel = ImageEnhance.Contrast(result_panel).enhance(1.04)
    canvas.paste(result_panel, (710, 0))

    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rectangle((0, 0, 760, 720), fill=(10, 25, 18, 75))
    draw.rounded_rectangle((45, 44, 680, 302), radius=26, fill=(17, 36, 27, 218))
    draw.rounded_rectangle((45, 622, 655, 682), radius=28, fill=(198, 255, 61, 235))
    draw.rectangle((705, 0, 716, 720), fill=(198, 255, 61, 255))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(canvas)
    headline = ImageFont.truetype(str(FONT_BOLD), 72)
    small = ImageFont.truetype(str(FONT_BOLD), 26)
    badge = ImageFont.truetype(str(FONT_BOLD), 28)
    draw.text((76, 70), "WHAT'S REALLY", font=headline, fill="white", stroke_width=1, stroke_fill="#13241c")
    draw.text((76, 155), "IN THE PACK?", font=headline, fill="#C6FF3D", stroke_width=1, stroke_fill="#13241c")
    draw.text((76, 255), "One photo. Whole-pack truth.", font=small, fill="#E9EEE9")
    draw.text((78, 637), "FRONT OF PACK  •  WEB + WHATSAPP", font=badge, fill="#143426")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    destination = OUTPUT / "front-of-pack-thumbnail-v3.png"
    canvas.convert("RGB").save(destination, optimize=True)
    print(destination)


if __name__ == "__main__":
    main()

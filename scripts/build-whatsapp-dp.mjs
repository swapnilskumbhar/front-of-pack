import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = fileURLToPath(
  new URL("../assets/whatsapp-business-dp.svg", import.meta.url),
);
const output = fileURLToPath(
  new URL("../public/whatsapp-business-dp.png", import.meta.url),
);

await sharp(source, { density: 192 })
  .resize(192, 192, { fit: "fill" })
  .png({ compressionLevel: 9 })
  .toFile(output);

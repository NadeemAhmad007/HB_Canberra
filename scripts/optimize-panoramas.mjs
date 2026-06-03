// scripts/optimize-panoramas.mjs
// Compresses panoramas to web-friendly sizes and renames to URL slugs
import sharp from "sharp";
import { readdir, stat, mkdir } from "node:fs/promises";
import { join } from "node:path";

const SRC = "C:/Users/H68618/Downloads/360 Houseboat canberra";
const OUT = "C:/Users/H68618/Downloads/HB_Canberra/hb-canberra/public/panoramas";

const SLUG_MAP = {
  "Bed Room 1 Dressing.JPG.jpeg": "bedroom-1-dressing",
  "Bed Room 1.JPG.jpeg": "bedroom-1",
  "Bedroom 1.JPG.jpeg": "bedroom-1-alt",
  "Bedroom 2.JPG.jpeg": "bedroom-2",
  "Bedroom 3.1.JPG.jpeg": "bedroom-3",
  "Bedroom Dressing 3.JPG.jpeg": "bedroom-3-dressing",
  "Bedrooom 2.1.JPG.jpeg": "bedroom-2-alt",
  "Corridor 1.1.JPG.jpeg": "corridor-1-alt",
  "Corridor 1.JPG.jpeg": "corridor-1",
  "Corridor 2.JPG.jpeg": "corridor-2",
  "corridor 3.JPG.jpeg": "corridor-3",
  "Corridor.JPG.jpeg": "corridor-main",
  "Deck .JPG.jpeg": "deck",
  "Deck 1.1.JPG.jpeg": "deck-1-alt",
  "Deck.JPG.jpeg": "deck-main",
  "Dinning room 2.JPG.jpeg": "dining-2",
  "Dinning Room.JPG.jpeg": "dining",
  "Garden 1.1.JPG.jpeg": "garden-1-alt",
  "Garden 1.JPG.jpeg": "garden-1",
  "Garden 2.JPG.jpeg": "garden-2",
  "Living Room 2.JPG.jpeg": "living-2",
  "Living room.JPG.jpeg": "living",
  "Washroom 1.JPG.jpeg": "washroom-1",
  "Washroom 2.JPG.jpeg": "washroom-2",
  "Washroom 3.JPG.jpeg": "washroom-3",
};

await mkdir(OUT, { recursive: true });

const files = await readdir(SRC);
let total = 0;
for (const f of files) {
  const slug = SLUG_MAP[f];
  if (!slug) {
    console.log("SKIP", f);
    continue;
  }
  const src = join(SRC, f);
  const out = join(OUT, `${slug}.jpg`);
  const orig = (await stat(src)).size;
  await sharp(src)
    .resize({ width: 4096, withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true, progressive: true })
    .toFile(out);
  const optimized = (await stat(out)).size;
  total += optimized;
  console.log(`${f} -> ${slug}.jpg  ${(orig/1e6).toFixed(1)}MB -> ${(optimized/1e6).toFixed(1)}MB`);
}
console.log(`\nTotal: ${(total/1e6).toFixed(1)}MB`);

// Serverless /api/validate (multipart) using busboy.
// Accepts: form-data key "files" with one or more .zip files.
// Returns: { bundleId, manifests:[...], issues:[...], maxPackFormat }

import Busboy from "busboy";
import AdmZip from "adm-zip";
import sharp from "sharp";
import { customAlphabet } from "nanoid";

// ---- helpers ---------------------------------------------------------------

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 10);

const CATEGORY = {
  HUD: "HUD & GUI",
  BLOCKS: "Blocks",
  ITEMS: "Items",
  ENTITIES: "Entities",
  OTHER: "Other",
};

function parseMultipartToBuffers(req) {
  return new Promise((resolve, reject) => {
    try {
      const bb = Busboy({ headers: req.headers });
      /** @type {{filename:string, buffer:Buffer}[]} */
      const files = [];
      let hasFile = false;

      bb.on("file", (_name, stream, info) => {
        hasFile = true;
        const chunks = [];
        stream.on("data", (d) => chunks.push(d));
        stream.on("limit", () => reject(new Error("File too large")));
        stream.on("end", () => {
          files.push({ filename: info.filename, buffer: Buffer.concat(chunks) });
        });
      });

      bb.on("error", reject);
      bb.on("finish", () => {
        if (!hasFile) return reject(new Error("No files provided"));
        resolve(files);
      });

      req.pipe(bb);
    } catch (e) {
      reject(e);
    }
  });
}

const detectPackFormat = (zip) => {
  try {
    const entry = zip.getEntry("pack.mcmeta");
    if (!entry) return null;
    const raw = zip.readAsText(entry);
    const j = JSON.parse(raw);
    return j?.pack?.pack_format ?? null;
  } catch {
    return null;
  }
};

const classifyPath = (p) => {
  if (/^assets\/[^/]+\/textures\/gui\/icons\.png$/i.test(p)) return CATEGORY.HUD;
  if (/^assets\/[^/]+\/textures\/gui\/widgets\.png$/i.test(p)) return CATEGORY.HUD;
  if (/^assets\/[^/]+\/textures\/block\/.+\.png$/i.test(p)) return CATEGORY.BLOCKS;
  if (/^assets\/[^/]+\/textures\/item\/.+\.png$/i.test(p)) return CATEGORY.ITEMS;
  if (/^assets\/[^/]+\/textures\/entity\/.+\.png$/i.test(p)) return CATEGORY.ENTITIES;
  if (/^assets\/[^/]+\/textures\/gui\/.+\.png$/i.test(p)) return CATEGORY.HUD;
  return CATEGORY.OTHER;
};

async function featureChipsForIcons(buf) {
  try {
    await sharp(buf).metadata(); // validates image exists / is an image
    // We can get smarter later (crop regions), but keep the same chips for now:
    return [
      "hotbar", "hearts", "hearts_poison", "hearts_wither", "absorption",
      "xp_bar", "xp_orb",
      "armor",
      "food", "food_poisoned",
      "horse_hearts", "horse_jump_bar"
    ];
  } catch {
    return [];
  }
}

async function listZipToManifest(buffer, fallbackName) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  const manifest = {
    packName: fallbackName,
    packFormat: detectPackFormat(zip) ?? 34, // sensible default for 1.20.x
    assets: [],
  };

  const tasks = entries.map(async (e) => {
    if (e.isDirectory) return;

    const path = e.entryName.replace(/\\/g, "/");
    const size = e.header.size;

    if (!/^assets\/[^/]+\/.+/.test(path) && path !== "pack.mcmeta") return;

    const nsMatch = path.match(/^assets\/([^/]+)\//);
    const packNamespace = nsMatch ? nsMatch[1] : "minecraft";
    const category = classifyPath(path);

    let features = [];
    if (/textures\/gui\/icons\.png$/i.test(path)) {
      const img = zip.readFile(e);
      features = await featureChipsForIcons(img);
    }

    manifest.assets.push({ path, category, packNamespace, size, features });
  });

  await Promise.all(tasks);
  return manifest;
}

function findConflicts(manifests) {
  const map = new Map(); // path -> [{packIndex, path}]
  manifests.forEach((m, packIndex) => {
    m.assets.forEach((a) => {
      const arr = map.get(a.path) || [];
      arr.push({ packIndex, path: a.path });
      map.set(a.path, arr);
    });
  });

  const issues = [];
  for (const [path, arr] of map.entries()) {
    if (arr.length > 1) {
      issues.push({
        type: "CONFLICT",
        message: `Multiple packs provide '${path}'. User must choose one.`,
        paths: arr.map((x) => x.path),
      });
    }
  }
  return issues;
}

// ---- serverless handler ----------------------------------------------------

export const config = {
  api: {
    bodyParser: false, // we stream multipart with busboy
    maxDuration: 15,   // seconds (adjust if needed)
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const files = await parseMultipartToBuffers(req);

    const manifests = [];
    for (const f of files) {
      manifests.push(await listZipToManifest(f.buffer, f.filename.replace(/\.zip$/i, "")));
    }

    const issues = findConflicts(manifests);
    const maxPackFormat = Math.max(...manifests.map((m) => m.packFormat).filter(Boolean), 0);

    return res.status(200).json({
      bundleId: nanoid(),
      manifests,
      issues,
      maxPackFormat,
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: String(err?.message || err) });
  }
}

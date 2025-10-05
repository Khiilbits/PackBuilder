const express = require("express");
const multer = require("multer");
const AdmZip = require("adm-zip");
const sharp = require("sharp");
const { z } = require("zod");
const { customAlphabet } = require("nanoid");

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 10);
const upload = multer({ limits: { fileSize: 1024 * 1024 * 200 } }); // 200MB
const app = express();
app.use(express.json({ limit: "5mb" }));

// --- helpers -------------------------------------------------------

const CATEGORY = {
  HUD: "HUD & GUI",
  BLOCKS: "Blocks",
  ITEMS: "Items",
  ENTITIES: "Entities",
  OTHER: "Other",
};

const featureChipsForIcons = async (buf) => {
  // Optionally inspect dimensions; for now, assume standard mapping
  // Return a fixed set (upgrade later with actual sprite slicing)
  try {
    await sharp(buf).metadata(); // validates image
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

const detectPackFormat = (zip) => {
  try {
    const entry = zip.getEntry("pack.mcmeta");
    if (!entry) return null;
    const raw = zip.readAsText(entry);
    const json = JSON.parse(raw);
    return json?.pack?.pack_format ?? null;
  } catch {
    return null;
  }
};

const listZip = async (buf, packNameFallback) => {
  const zip = new AdmZip(buf);
  const entries = zip.getEntries();

  const manifest = {
    packName: packNameFallback,
    packFormat: detectPackFormat(zip) ?? 34, // reasonable default for 1.20.x
    assets: [],
  };

  const promises = entries.map(async (e) => {
    if (e.isDirectory) return;
    const path = e.entryName.replace(/\\/g, "/");
    const size = e.header.size;

    if (!/^assets\/[^/]+\/.+/.test(path) && path !== "pack.mcmeta") return;

    const packNamespaceMatch = path.match(/^assets\/([^/]+)\//);
    const packNamespace = packNamespaceMatch ? packNamespaceMatch[1] : "minecraft";
    const category = classifyPath(path);

    let features = [];
    if (/textures\/gui\/icons\.png$/i.test(path)) {
      const buf = zip.readFile(e);
      features = await featureChipsForIcons(buf);
    }

    manifest.assets.push({ path, category, packNamespace, size, features });
  });

  await Promise.all(promises);
  return manifest;
};

const findConflicts = (manifests) => {
  const map = new Map(); // path -> [packIndex...]
  manifests.forEach((m, idx) => {
    m.assets.forEach((a) => {
      const arr = map.get(a.path) || [];
      arr.push({ packIndex: idx, path: a.path });
      map.set(a.path, arr);
    });
  });
  const issues = [];
  for (const [path, arr] of map) {
    if (arr.length > 1) {
      issues.push({
        type: "CONFLICT",
        message: `Multiple packs provide '${path}'. User must choose one.`,
        paths: arr.map((x) => x.path),
      });
    }
  }
  return issues;
};

// --- routes --------------------------------------------------------

app.post("/api/validate", upload.array("files"), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: "No files provided" });
    }
    const manifests = [];
    for (const f of req.files) {
      const manifest = await listZip(f.buffer, f.originalname.replace(/\.zip$/i, ""));
      manifests.push(manifest);
    }
    const issues = findConflicts(manifests);
    const maxPackFormat = Math.max(...manifests.map((m) => m.packFormat).filter(Boolean), 0);

    return res.json({
      bundleId: nanoid(),
      manifests,
      issues,
      maxPackFormat,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Validation failed", detail: String(err?.message || err) });
  }
});

app.post("/api/create-preview", async (req, res) => {
  const Body = z.object({
    branch: z.string().default("main"),
    bundleId: z.string().optional(),
  });
  const body = Body.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid body", detail: body.error.flatten() });
  }

  // Stub: pretend we created a preview build
  const buildId = `build_${nanoid()}`;
  const previewUrl = `https://preview.example.com/${buildId}`;

  return res.json({ buildId, previewUrl });
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`PackBuilder Actions listening on ${PORT}`));

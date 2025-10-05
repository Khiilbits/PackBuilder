// Serverless /api/create-preview (JSON body: { branch?, bundleId? })
// Stubbed to return a fake preview URL; swap in your CI call when ready.

import { z } from "zod";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const Body = z.object({
    branch: z.string().default("main"),
    bundleId: z.string().optional(),
  });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", detail: parsed.error.flatten() });
  }

  const buildId = `build_${Math.random().toString(36).slice(2, 10)}`;
  const previewUrl = `https://preview.example.com/${buildId}`;
  return res.status(200).json({ buildId, previewUrl });
}

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } }
};

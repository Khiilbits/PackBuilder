import JSZip from 'jszip'
import type { PackFile, SourcePack } from '../types'

export async function readZip(file: File): Promise<SourcePack> {
  const zip = await JSZip.loadAsync(file)
  const entries = Object.values(zip.files)
  const files: PackFile[] = []
  for (const e of entries) {
    if (e.dir) continue
    const path = e.name.replace(/\\/g,'/')
    if (!(path.startsWith('assets/') || path.endsWith('pack.mcmeta') || path.endsWith('pack.png'))) continue
    const bytes = await e.async('uint8array')
    files.push({ path, bytes, sourcePackId: file.name })
  }
  let packFormat: number|undefined = undefined
  const mcmetaEntry = entries.find(e => e.name.toLowerCase().endsWith('pack.mcmeta'))
  if (mcmetaEntry) {
    try {
      const txt = await mcmetaEntry.async('text')
      const j = JSON.parse(txt)
      packFormat = j.pack?.pack_format
    } catch {}
  }
  return { id: crypto.randomUUID(), name: file.name, files, packFormat }
}

export async function buildZip(outFiles: {path:string, bytes:Uint8Array}[]) {
  const zip = new JSZip()
  zip.file('pack.mcmeta', JSON.stringify({ pack:{ pack_format:22, description:'PackBuilder export' }}, null, 2))
  for (const f of outFiles) zip.file(f.path, f.bytes)
  return await zip.generateAsync({type:'blob'})
}

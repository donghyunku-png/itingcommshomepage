import { readFile } from 'node:fs/promises';
import path from 'node:path';

export function validateArticleImage(meta, filename = 'article') {
  const fields = ['image_alt', 'image_caption', 'image_width', 'image_height'];
  if (!meta.image) {
    if (fields.some(field => meta[field])) throw new Error(`${filename}: image metadata requires image`);
    return;
  }
  if (!/^\/assets\/blog\/[a-z0-9/_-]+\.(png|jpe?g|webp)$/i.test(meta.image) || meta.image.includes('..')) throw new Error(`${filename}: image must be a local /assets/blog/ PNG, JPEG, or WebP path`);
  for (const field of fields) if (!String(meta[field] || '').trim()) throw new Error(`${filename}: ${field} is required with image`);
  for (const field of ['image_width','image_height']) if (!/^\d+$/.test(String(meta[field])) || Number(meta[field]) < 1 || Number(meta[field]) > 12000) throw new Error(`${filename}: ${field} must be a positive pixel dimension up to 12000`);
}

export async function checkArticleImageFile(meta, root, filename) {
  validateArticleImage(meta, filename);
  if (meta.image) {
    let bytes;
    try { bytes = await readFile(path.join(root, meta.image)); }
    catch { throw new Error(`${filename}: image does not exist: ${meta.image}`); }
    const dimensions = imageDimensions(bytes);
    if (!dimensions) throw new Error(`${filename}: image bytes are not a supported PNG, JPEG, or WebP`);
    const extension = meta.image.split('.').pop().toLowerCase().replace('jpg','jpeg');
    if (dimensions.type !== extension) throw new Error(`${filename}: image type does not match extension`);
    if (dimensions.width !== Number(meta.image_width) || dimensions.height !== Number(meta.image_height)) throw new Error(`${filename}: declared image dimensions do not match file (${dimensions.width}x${dimensions.height})`);
  }
}

const esc = value => String(value || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function articleImage(meta, { hero = false } = {}) {
  if (!meta.image) return '';
  const img = `<img src="${esc(meta.image)}" alt="${esc(meta.image_alt)}" width="${meta.image_width}" height="${meta.image_height}" ${hero ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  return hero ? `<figure class="article-cover">${img}<figcaption>${esc(meta.image_caption)}</figcaption></figure>` : `<div class="article-thumbnail">${img}</div>`;
}

export function imageMetadata(meta, siteUrl) {
  const url = `${siteUrl}${meta.image || '/assets/logo.png'}`;
  return `<meta property="og:image" content="${esc(url)}"><meta property="og:image:alt" content="${esc(meta.image_alt || 'ITING Communications logo')}">${meta.image ? `<meta property="og:image:width" content="${meta.image_width}"><meta property="og:image:height" content="${meta.image_height}">` : ''}<meta name="twitter:image" content="${esc(url)}"><meta name="twitter:image:alt" content="${esc(meta.image_alt || 'ITING Communications logo')}">`;
}

// Read only the format headers needed to validate author-supplied dimensions.
export function imageDimensions(b) {
  if (b.length >= 24 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && b.toString('ascii',12,16)==='IHDR') return {type:'png',width:b.readUInt32BE(16),height:b.readUInt32BE(20)};
  if (b.length >= 12 && b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP') {
    for (let pos=12;pos+8<=b.length;) {
      const type=b.toString('ascii',pos,pos+4), size=b.readUInt32LE(pos+4), start=pos+8;
      if (start+size>b.length) return null;
      if (type==='VP8X' && size>=10) return {type:'webp',width:1+b.readUIntLE(start+4,3),height:1+b.readUIntLE(start+7,3)};
      if (type==='VP8 ' && size>=10 && b[start+3]===157 && b[start+4]===1 && b[start+5]===42) return {type:'webp',width:b.readUInt16LE(start+6)&16383,height:b.readUInt16LE(start+8)&16383};
      if (type==='VP8L' && size>=5 && b[start]===47) { const bits=b.readUInt32LE(start+1);return {type:'webp',width:1+(bits&16383),height:1+((bits>>>14)&16383)}; }
      pos=start+size+(size%2);
    }
  }
  if (b.length>4 && b[0]===255 && b[1]===216) {
    let pos=2;
    while(pos+4<=b.length) {
      if(b[pos]!==255) return null;
      while(b[pos]===255) pos++;
      const marker=b[pos++];
      if(marker===217||marker===218) break;
      if(marker===1||(marker>=208&&marker<=215)) continue;
      if(pos+2>b.length) break;
      const length=b.readUInt16BE(pos);
      if(length<2||pos+length>b.length) return null;
      if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&length>=7) return {type:'jpeg',width:b.readUInt16BE(pos+5),height:b.readUInt16BE(pos+3)};
      pos+=length;
    }
  }
  return null;
}

import assert from 'node:assert/strict';
import { mkdtemp, cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { imageDimensions, checkArticleImageFile } from './article-images.mjs';
const root=process.cwd();
const temp=await mkdtemp(path.join(tmpdir(),'iting-image-build-'));
try {
  for (const entry of ['scripts','content','assets','css','js','index.html','privacy.html','terms.html','robots.txt','llms.txt','favicon.png']) await cp(path.join(root,entry),path.join(temp,entry),{recursive:true});
  const bytes=await readFile(path.join(root,'assets/logo.png'));
  const size=imageDimensions(bytes);
  assert.equal(size.type,'png');
  await mkdir(path.join(temp,'assets/blog/test'),{recursive:true});
  await writeFile(path.join(temp,'assets/blog/test/hero.png'),bytes);
  const meta={image:'/assets/blog/test/hero.png',image_alt:'Test fixture',image_caption:'Test fixture, not publication content.',image_width:String(size.width),image_height:String(size.height)};
  await checkArticleImageFile(meta,temp,'test');
  await assert.rejects(()=>checkArticleImageFile({...meta,image_width:'1'},temp,'test'),/dimensions/);
  for(const folder of ['content/blog','content/blog/en']) {
    const file=path.join(temp,folder,'ai-search-clicks-measurement.md');
    const source=await readFile(file,'utf8');
    await writeFile(file,source.replace('\ndraft: false','\n'+Object.entries(meta).map(([k,v])=>`${k}: "${v}"`).join('\n')+'\ndraft: false'));
  }
  execFileSync(process.execPath,['scripts/build-site.mjs'],{cwd:temp,stdio:'pipe'});
  for (const locale of ['', 'en/']) {
    const article=await readFile(path.join(temp,locale,'blog/ai-search-clicks-measurement/index.html'),'utf8');
    for(const token of ['class="article-cover"','og:image:width','twitter:image','"@type":"ImageObject"',meta.image,meta.image_caption]) assert(article.includes(token),`article ${locale} missing ${token}`);
    for(const page of ['index.html','blog/index.html']) assert((await readFile(path.join(temp,locale,page),'utf8')).includes('src="'+meta.image+'"'),`${locale}${page}: thumbnail missing`);
  }
  execFileSync(process.execPath,['scripts/check-site.mjs'],{cwd:temp,stdio:'pipe'});
  console.log('Image build integration passed: both languages, article cover, lists, homepage, OG, Twitter, schema, and actual dimensions.');
} finally {
  await rm(temp,{recursive:true,force:true});
}

import {execFileSync} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export const HOST='www.itingcomms.com';
const INITIAL='cbc161c03ff8de8f6f2024fb37e3b4f0c8875605';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
export function sitemapURLs(xml){return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);}
export function fileForURL(url){const u=new URL(url);if(u.origin!==`https://${HOST}`||u.search||u.hash)throw Error('Noncanonical URL');return decodeURIComponent(u.pathname).replace(/^\//,'')+(u.pathname.endsWith('/')?'index.html':'');}
export function changedURLs(before,after,changed){return [...new Set([...before,...after])].filter(u=>changed.has(fileForURL(u)));}
export async function submit(payload,request=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms))){
 for(let attempt=0;attempt<4;attempt++){
  let r;try{r=await request('https://api.indexnow.org/indexnow',{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});}catch(e){if(attempt===3)throw e;await sleep(2000*2**attempt);continue;}
  if(r.status===200||r.status===202)return r.status;
  if(r.status!==429&&r.status<500)throw Error(`IndexNow rejected: HTTP ${r.status}`);
  if(attempt===3)throw Error(`IndexNow unavailable: HTTP ${r.status}`);
  await sleep(Math.min(60000,Math.max(2000*2**attempt,Number(r.headers.get('retry-after')||0)*1000)));
 }
}
async function main(){
 const target=process.env.TARGET_SHA||git('rev-parse','HEAD'),baseline=process.env.BASELINE_SHA||INITIAL;
 if(!/^[a-f0-9]{40}$/.test(target)||!/^[a-f0-9]{40}$/.test(baseline))throw Error('Invalid commit SHA');
 try{git('merge-base','--is-ancestor',baseline,target);}catch{throw Error('Checkpoint is not ancestor; stop stale deployment');}
 const before=sitemapURLs(git('show',`${baseline}:sitemap.xml`)),after=sitemapURLs(git('show',`${target}:sitemap.xml`));
 const changed=new Set(git('diff','--name-only','--no-renames',baseline,target).split('\n'));
 const urls=changedURLs(before,after,changed);
 console.log(`Changed public URLs: ${urls.length}`);for(const u of urls)console.log(u);
 if(process.env.DRY_RUN==='1')return;
 const keyFiles=git('ls-tree','--name-only',target).split('\n').filter(x=>/^[a-f0-9]{32}\.txt$/.test(x));
 if(keyFiles.length!==1)throw Error('Expected exactly one key file');
 const key=git('show',`${target}:${keyFiles[0]}`);if(key!==keyFiles[0].slice(0,-4))throw Error('Key mismatch');
 const keyLocation=`https://${HOST}/${keyFiles[0]}`;
 const v=await fetch(keyLocation,{redirect:'error',signal:AbortSignal.timeout(30000)});
 if(v.status!==200||(await v.text()).trim()!==key)throw Error('Live key not deployed');
 for(let i=0;i<urls.length;i+=10000){const status=await submit({host:HOST,key,keyLocation,urlList:urls.slice(i,i+10000)});console.log(`IndexNow HTTP ${status}: received${status===202?' (key verification pending)':''}, not an indexing guarantee`);}
 await mkdir('/tmp/indexnow-checkpoint',{recursive:true});await writeFile('/tmp/indexnow-checkpoint/sha',target+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {headOfficeAddress, officeLocations, officeText} from './company-locations.mjs';
const paths=['index.html','en/index.html','about/index.html','en/about/index.html','services/geo-marketing/index.html','en/services/geo-marketing/index.html'];
for (const file of paths) {
  const html=await readFile(file,'utf8');
  const graphs=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>{const j=JSON.parse(m[1]);return j['@graph']||[j];});
  const org=graphs.find(n=>n['@id']==='https://www.itingcomms.com/#organization');
  assert(org,`${file}: organization`);
  assert.deepEqual(org.address,headOfficeAddress,`${file}: HQ address`);
  assert.deepEqual(org.location,officeLocations,`${file}: two distinct office locations`);
  if(file==='index.html'||file==='en/index.html'||file.includes('about/')) {
    const visible=html.slice(html.indexOf('<body')).replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');
    for(const address of Object.values(officeText[file.startsWith('en/')?'en':'ko'])) assert(visible.includes(address),`${file}: address visibly matches schema`);
  }
}
console.log('Company locations passed: consistent structured and visible HQ/Seoul addresses in Korean and English.');

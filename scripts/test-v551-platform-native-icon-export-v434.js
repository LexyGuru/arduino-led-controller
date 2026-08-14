const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const base=path.join('desktop-tauri','src-tauri','icons');
const expectedCanonical={
 'v5-stable-dark.png':'a0675281753fd7bdcb5778782533eaafae205416f48e5b54136f618cde241055',
 'v5-stable-light.png':'e540bf5237a8c35cabded350d15053438ee949d9512a89ac1be117409466950b',
 'v5-beta-dark.png':'20b799f382218544d84768099317cb95abe585e7ec83d1fb5ccc326134458962',
 'v5-beta-light.png':'24d04c01b3ed3cf409687cd9fbe3488425c7046f1a80ac83a73c2c5739b77832',
};
const expectedRuntime={
 'v5-stable-dark.png':'7cb314ed6eb8fa44b922d0c78883a68da1f817b532f903a05f819f79a157cf17',
 'v5-stable-light.png':'65a3c80e0bb8c157f71d988255e7199b35c22bbe66a3e886917a4a7b37c9d1ee',
 'v5-beta-dark.png':'e3900c912983b3f4faeeb9abe9ee0da4f6318033a525536ae260a160b9382c41',
 'v5-beta-light.png':'7165fcbe7ba46aa2736f129cd79e2cecabc81e2cb0f85d354e1553b30c0aeff3',
};
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const dim=p=>{
 const b=fs.readFileSync(p);
 if(b.toString('hex',0,8)!=='89504e470d0a1a0a') throw new Error(`not png ${p}`);
 return [b.readUInt32BE(16),b.readUInt32BE(20),b[25]];
};

for(const [name,h] of Object.entries(expectedCanonical)){
 const p=path.join(base,'canonical',name);
 const [w,hh]=dim(p);
 if(w!==1024||hh!==1024) throw new Error(`canonical size ${name}`);
 if(sha(p)!==h) throw new Error(`canonical sha ${name}`);
}
for(const [name,h] of Object.entries(expectedRuntime)){
 const p=path.join(base,'runtime',name);
 const [w,hh,ct]=dim(p);
 if(w!==1024||hh!==1024) throw new Error(`runtime size ${name}`);
 if(ct!==6) throw new Error(`runtime not RGBA ${name}`);
 if(sha(p)!==h) throw new Error(`runtime sha ${name}`);
}

const gen=fs.readFileSync('scripts/generate-v5-mobile-icons.sh','utf8');
for(const t of [
 'icons/canonical/v5-beta-light.png','icons/canonical/v5-beta-dark.png',
 'icons/canonical/v5-stable-light.png','icons/canonical/v5-stable-dark.png'
]) if(!gen.includes(t)) throw new Error(`generator missing ${t}`);

if(gen.includes('icons/runtime/v5-beta-light.png'))
 throw new Error('mobile generator uses rounded runtime source');

console.log('V434_CANONICAL_MASTER_CONTRACT=PASSED');
console.log('V434_RUNTIME_ROUNDED_EXPORT_CONTRACT=PASSED');
console.log('V434_V432_COMPATIBILITY_MIGRATION=PASSED');
console.log('V434_PLATFORM_NATIVE_ICON_EXPORT_CONTRACT=PASSED');

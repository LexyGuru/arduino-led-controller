function parse(v){
  const m=String(v??"").trim().replace(/^v/i,"").match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  return m?{core:[+m[1],+m[2],+m[3]],pre:m[4]?m[4].split("."):[]}:null;
}
function id(a,b){
  const an=/^\d+$/.test(a),bn=/^\d+$/.test(b);
  if(an&&bn)return +a-+b;if(an&&!bn)return -1;if(!an&&bn)return 1;return a.localeCompare(b);
}
export function compareReleaseVersions(a,b){
  a=parse(a);b=parse(b);if(!a||!b)return 0;
  for(let i=0;i<3;i++)if(a.core[i]!==b.core[i])return a.core[i]-b.core[i];
  if(!a.pre.length&&!b.pre.length)return 0;if(!a.pre.length)return 1;if(!b.pre.length)return -1;
  for(let i=0;i<Math.max(a.pre.length,b.pre.length);i++){
    if(a.pre[i]===undefined)return -1;if(b.pre[i]===undefined)return 1;if(a.pre[i]===b.pre[i])continue;
    const x=id(a.pre[i],b.pre[i]);if(x)return x;
  }return 0;
}
export function getUpdateRelation(available,installed){
  if(!parse(available)||!parse(installed))return "unknown";
  const x=compareReleaseVersions(available,installed);return x>0?"newer":x<0?"older":"same";
}

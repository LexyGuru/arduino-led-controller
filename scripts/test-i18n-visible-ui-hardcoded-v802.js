#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');

let ts;
let typescriptModule='';
try {
  if (process.env.V802_TYPESCRIPT_MODULE) {
    typescriptModule=process.env.V802_TYPESCRIPT_MODULE;
    ts=require(typescriptModule);
  } else {
    typescriptModule=require.resolve('typescript',{
      paths:[path.join(process.cwd(),'desktop-tauri')]
    });
    ts=require(typescriptModule);
  }
} catch (error) {
  console.error('V804J_ERROR: existing TypeScript compiler API could not be resolved');
  console.error(`V804J_TYPESCRIPT_RESOLUTION_BASE=${process.env.V802_TYPESCRIPT_MODULE || path.join(process.cwd(),'desktop-tauri')}`);
  throw error;
}
console.log(`V804J_AST_TYPESCRIPT_MODULE=${typescriptModule}`);

const ROOT=process.cwd();
const SRC=path.join(ROOT,'desktop-tauri','src');
const extensions=new Set(['.tsx','.jsx']);
const excludedPathParts=[
  `${path.sep}api${path.sep}generated${path.sep}`,
  `${path.sep}i18n${path.sep}locales${path.sep}`,
  `${path.sep}fixtures${path.sep}`,
];

const visibleAttrs=new Set([
  'title','placeholder','aria-label','aria-description','alt','label'
]);

const exactAllowlist=new Set([
  'Arduino','Arduino UNO R4 WiFi','UNO R4 WiFi','GitHub',
  'HTTP','HTTPS','API','API v2','OTA','OTA 2.0','IP','DDNS','URL',
  'JSON','CSV','PDF','Wi-Fi','UTC','CET','CEST','NTP','LXC',
  'Tauri','Rust','RGB','HEX','WS2812B','Direct API','Direct API v1',
  'Direct API 1.1','macOS','Windows','Linux','Beta','Stable',
  'UI 3.0','Core UI 3.0','LED','PIN','RGB(','px','s',
  'INFO','ACTION','SUCCESS','WARNING','ERROR','OK','N/A','READY','BUSY',
  'online','offline','spin','ok','bad','warning','error','unknown','unsupported',
  'recovering','degraded','ready','missing','notice','console-warning','ON','OFF',
  'passed','system','Candidate','Gate','Build:','Commit:','OpenAPI:','OTA:',
  'Cache SHA-256:','Revision','Checksum','· revision','· PIN','· Visual 3.1 · Core UI',
  'Theme Runtime','LED Controller','BETA','Beta 5 UI','Arduino LED Controller V5',
  'http://127.0.0.1:3000','/usr/local/bin/arduinoOTA',
  'UPDATE SYSTEM 2.0','OTA 2.0 ·','OTA 2.0 · ARDUINO FIRMWARE',
  'ARDUINO DIRECT API V1','Direct API 1.1','API v2','Bearer token','Session-cookie',
  'Dry-run','Last known good','Alpha.2 orchestration','Execution receipt-lánc',
  '—','–','•','×','+','-','…','...','/','%'
]);

const dynamicOrNonLanguage=/^(?:https?:\/\/|\/api\/|\/usr\/|#[0-9A-Fa-f]{3,8}$|[0-9]+(?:\.[0-9]+)*%?)$/;

function walk(dir,out=[]){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()){
      if(excludedPathParts.some(part=>(full+path.sep).includes(part))) continue;
      walk(full,out);
    } else if(extensions.has(path.extname(ent.name))) {
      out.push(full);
    }
  }
  return out;
}

function cleanText(value){
  return String(value).replace(/\s+/g,' ').trim();
}

function isCandidate(value){
  const text=cleanText(value);
  if(!text) return false;
  if(exactAllowlist.has(text)) return false;
  if(dynamicOrNonLanguage.test(text)) return false;
  if(!/[A-Za-zÀ-ž]/.test(text)) return false;
  if(/^[A-Za-z0-9_.-]+\.[A-Za-z0-9_.-]+$/.test(text)) return false;
  if(/^v?\d+(?:\.\d+)+(?:-[A-Za-z0-9.-]+)?$/i.test(text)) return false;
  return true;
}

function location(sourceFile,node){
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line+1;
}

function addFinding(findings,sourceFile,rel,node,kind,text){
  const cleaned=cleanText(text);
  if(!isCandidate(cleaned)) return;
  findings.push({rel,line:location(sourceFile,node),kind,text:cleaned});
}

function literalText(expr){
  if(!expr) return null;
  if(ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
  return null;
}

function collectRenderedExpressionStrings(expr,emit){
  if(!expr) return;
  const direct=literalText(expr);
  if(direct!==null){ emit(expr,direct); return; }

  if(ts.isConditionalExpression(expr)){
    collectRenderedExpressionStrings(expr.whenTrue,emit);
    collectRenderedExpressionStrings(expr.whenFalse,emit);
    return;
  }

  if(ts.isBinaryExpression(expr)){
    const op=expr.operatorToken.kind;
    if(op===ts.SyntaxKind.AmpersandAmpersandToken ||
       op===ts.SyntaxKind.BarBarToken ||
       op===ts.SyntaxKind.QuestionQuestionToken){
      collectRenderedExpressionStrings(expr.left,emit);
      collectRenderedExpressionStrings(expr.right,emit);
    }
    return;
  }

  if(ts.isParenthesizedExpression(expr)){
    collectRenderedExpressionStrings(expr.expression,emit);
  }
}

function scanFile(file){
  const source=fs.readFileSync(file,'utf8');
  const rel=path.relative(ROOT,file);
  const scriptKind=path.extname(file)==='.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.JSX;
  const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,scriptKind);
  const findings=[];

  function visit(node){
    if(ts.isJsxText(node)){
      addFinding(findings,sf,rel,node,'jsx-text',node.getText(sf));
    }

    if(ts.isJsxAttribute(node)){
      const name=node.name.getText(sf);
      if(visibleAttrs.has(name) && node.initializer){
        if(ts.isStringLiteral(node.initializer)){
          addFinding(findings,sf,rel,node,`attr:${name}`,node.initializer.text);
        } else if(ts.isJsxExpression(node.initializer)){
          const text=literalText(node.initializer.expression);
          if(text!==null) addFinding(findings,sf,rel,node,`attr:${name}`,text);
        }
      }
    }

    if(
      ts.isJsxExpression(node) &&
      node.expression &&
      !ts.isJsxAttribute(node.parent)
    ){
      collectRenderedExpressionStrings(node.expression,(literalNode,text)=>{
        addFinding(findings,sf,rel,literalNode,'jsx-expression',text);
      });
    }

    if(ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
       ['alert','confirm','prompt'].includes(node.expression.text) &&
       node.arguments.length){
      const text=literalText(node.arguments[0]);
      if(text!==null) addFinding(findings,sf,rel,node,'dialog',text);
    }

    ts.forEachChild(node,visit);
  }

  visit(sf);
  return findings;
}

const files=walk(SRC);
let findings=files.flatMap(scanFile);

const seen=new Set();
findings=findings.filter(f=>{
  const key=`${f.rel}:${f.line}:${f.kind}:${f.text}`;
  if(seen.has(key)) return false;
  seen.add(key);
  return true;
});

const codeLeakPatterns=[
  /\bReturnType\b/,/\buseState\b/,/\buseRef\b/,/\bRecord\b/,
  /\bset[A-Z][A-Za-z0-9_]*\b/,/=>/,/\bconst\b/,/\blet\b/,
  /^(?:active|page|true|false|secondary(?: active)?|day-active|is-(?:ok|warn|offline)|v5-[a-z0-9 -]+)$/i
];
const codeLeaks=findings.filter(f=>codeLeakPatterns.some(pattern=>pattern.test(f.text)));
if(codeLeaks.length){
  for(const f of codeLeaks){
    console.error(`V804J_SCANNER_CODE_LEAK=${f.rel}:${f.line}:${f.kind}:${JSON.stringify(f.text)}`);
  }
  console.error('V804J_ERROR: AST scanner emitted TypeScript-code false positives');
  process.exit(2);
}

if(findings.length){
  console.error(`V804J_HARDCODED_VISIBLE_UI_FINDING_COUNT=${findings.length}`);
  for(const f of findings){
    console.error(`V804J_HARDCODED_VISIBLE_UI=${f.rel}:${f.line}:${f.kind}:${JSON.stringify(f.text)}`);
  }
  console.error('V804J_ERROR: visible UI contains non-allowlisted hardcoded strings');
  process.exit(1);
}

console.log(`V804J_VISIBLE_UI_FILES_SCANNED=${files.length}`);
console.log('V804J_AST_SCANNER_CODE_FALSE_POSITIVES=ZERO');
console.log('V804J_HARDCODED_VISIBLE_UI_ZERO_OR_ALLOWLISTED=PASSED');

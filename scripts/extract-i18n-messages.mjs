/* Collect public presentation copy only; never export quiz correctOption/category metadata. */
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import ts from 'typescript';
const root = process.cwd();
const normalize = s => s.replace(/\s+/gu,' ').trim();
const decode = s => s.replace(/&apos;|&#39;/gu,"'").replace(/&quot;/gu,'"').replace(/&amp;/gu,'&').replace(/&lt;/gu,'<').replace(/&gt;/gu,'>');
const messages = new Set();
const add = (s, force = false) => {s=normalize(decode(s)); if (s && (force || /[A-Za-z]/u.test(s))) messages.add(s);};
const publicFiles = cp.execFileSync('git',['ls-tree','-r','--name-only','HEAD','src/app','src/lib/share'],{encoding:'utf8'}).trim().split('\n').filter(s=>/\.(tsx|ts)$/u.test(s));
// Client screens translate public wire errors on display; keep their exact source strings.
publicFiles.push('src/lib/identity/username.ts', 'src/server/quiz/http.ts', 'src/server/leaderboard/http.ts', 'src/server/security/mutation-origin.ts', 'src/server/http/json-body.ts');
const isCopy = text => {
 const s=normalize(text);
 return /[A-Za-z]/u.test(s) && (/\s/u.test(s) || /^[A-Z][A-Za-z-]+$/u.test(s)) && !/^(?:https?:|\/|\.|@|--|#|data:)/u.test(s) && !/[{}=;]|=>|\b(?:import|export|const|function)\b/u.test(s);
};
for (const file of publicFiles) {
 const original=cp.execFileSync('git',['show',`HEAD:${file}`],{encoding:'utf8'});
 const source=ts.createSourceFile(file,original,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const visit=node=>{
   if(ts.isJsxText(node)) add(node.text);
   if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)) {if(isCopy(node.text))add(node.text);}
   ts.forEachChild(node,visit);
 };visit(source);
}
function scan(file) {
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 function visit(n){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='t'&&n.arguments[0]&&(ts.isStringLiteral(n.arguments[0])||ts.isNoSubstitutionTemplateLiteral(n.arguments[0])))add(n.arguments[0].text, true);ts.forEachChild(n,visit);}visit(source);
}
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(/\.(tsx|ts)$/u.test(f))scan(f);}}
walk(path.join(root,'src/app'));scan(path.join(root,'src/lib/share/arena-result.ts'));
const bank=JSON.parse(fs.readFileSync(path.join(root,'data/quiz/rialo-community-quiz-89.json'),'utf8'));
for(const q of bank.questions){add(q.question, true);for(const value of Object.values(q.options))add(value, true);}
for(const text of ['Explorer','Operator','Architect','Visionary','Language','Select language','GAS','STORAGE','sec'])add(text);
const dictionary=Object.fromEntries([...messages].sort().map(text=>[text,text]));
const output=process.argv[2];if(!output)throw new Error('Usage: node scripts/extract-i18n-messages.mjs <output.json>');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(dictionary,null,2)+'\n');
console.log(JSON.stringify({messages:messages.size,questions:bank.questions.length,output}));

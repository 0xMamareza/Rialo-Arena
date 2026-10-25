// Run against a task-owned local server and isolated Chrome CDP session only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Source contract is also runnable without a browser/server: --layout-only.
function verifyHeaderLayout() {
 const read=file=>fs.readFileSync(path.join('src/app',file),'utf8');
 assert.doesNotMatch(read('layout.tsx'), /<LanguageSelector\b/, 'The root layout must not add a separate language row');
 assert.doesNotMatch(read('i18n.css'), /language-toolbar|padding-block-start|learnBar|chapterNav/, 'No reserved toolbar gap or global Learn offset overrides');
 for(const file of ['page.tsx','learn/_components/learn-navigation.tsx','quiz/quiz-player.tsx','leaderboard/leaderboard-view.tsx','_components/arena-intro.tsx']) {
  const source=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let integrated=false;
  function visit(node,inHeader=false) {
   const header=inHeader || (ts.isJsxElement(node) && node.openingElement.tagName.getText(source)==='header');
   if(header && ts.isJsxSelfClosingElement(node) && node.tagName.getText(source)==='LanguageSelector') integrated=true;
   ts.forEachChild(node,child=>visit(child,header));
  }
  visit(source);
  assert.ok(integrated, file+': the selector belongs inside the existing header');
 }
 const selector=read('_components/language-selector.tsx');
 assert.match(selector,/useId\(/,'Intro and home selectors need unique associated label IDs');
 assert.match(selector,/data-language-selector/,'Browser checks need a stable selector hook');
 assert.match(read('_components/arena-intro.tsx'),/inert=\{!platformIsReady \? true : undefined\}/,'Underlying home controls must stay unreachable during the intro');
 console.log('Integrated language-header source contract passed (5 surfaces, no toolbar gap).');
}
verifyHeaderLayout();
if(process.argv.includes('--layout-only')) process.exit(0);

const base=process.env.I18N_BASE_URL||'http://localhost:3017';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'Refuse to create QA records on a public site');
const evidence=process.env.I18N_EVIDENCE_DIR||process.argv[2];assert.ok(evidence,'Set I18N_EVIDENCE_DIR or pass a scratch evidence directory');
const output=path.resolve(evidence);fs.mkdirSync(output,{recursive:true});
const targets=await(await fetch('http://127.0.0.1:9337/json')).json();const target=targets.find(x=>x.type==='page');assert.ok(target,'Isolated Chrome must be started on port 9337');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let sequence=0;const pending=new Map();const errors=[];
ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const p=pending.get(message.id);if(p){pending.delete(message.id);if(message.error)p.reject(message.error);else p.resolve(message.result);}}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);});
const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(expression,timeout=30000)=>{const deadline=Date.now()+timeout;while(Date.now()<deadline){if(await evaluate(expression))return;await wait(150);}throw new Error('Timed out: '+expression);};
const screenshot=async name=>{const r=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(r.data,'base64'));};
const languageControl=`([...document.querySelectorAll('select[data-language-selector]')].find(x=>{if(x.closest('[inert], [aria-hidden="true"]'))return false;const r=x.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(x).visibility==='visible'&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===x}))`;
const navigate=async route=>{await cdp('Page.navigate',{url:base+route});await until(`document.readyState === "complete" && !!${languageControl}`,60000);await wait(650);};
const choose=async locale=>{await until(`!!${languageControl} && !${languageControl}.disabled`);await evaluate(`(()=>{const x=${languageControl};x.value=${JSON.stringify(locale)};x.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);await until(`document.documentElement.lang===${JSON.stringify(locale)} && ${languageControl}?.value===${JSON.stringify(locale)} && !${languageControl}?.disabled`);};
const visibleClick=async selector=>{const rect=await evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b)return null;const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);assert.ok(rect&&Number.isFinite(rect.x)&&Number.isFinite(rect.y),selector+' must be rendered');await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...rect,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',...rect,button:'left',clickCount:1});};
const results=[];
try{
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp('Network.deleteCookies',{name:'rialo_locale',url:base});await navigate('/');
 assert.equal(await evaluate(`${languageControl}.options.length`),15);
 const codes=['en','zh-CN','ko','vi','ru','uk','id','hi','tr','th','pt-BR','ur','bn','ar','fa'];
 for(const locale of codes){
  await choose(locale);
  const state=await evaluate('({lang:document.documentElement.lang,dir:document.documentElement.dir,hero:document.querySelector("#platform-title")?.parentElement.querySelector("p")?.textContent,width:innerWidth,scrollWidth:document.documentElement.scrollWidth})');
  assert.equal(state.dir,['fa','ur','ar'].includes(locale)?'rtl':'ltr');
  const dict=JSON.parse(fs.readFileSync(path.join('src/lib/i18n/messages',locale+'.json'),'utf8'));
  const source='The Rialo knowledge challenge';
  const expected=locale==='en'?source:dict[source];
  assert.equal(state.hero,expected,locale+': actual hero copy must translate, not just the serialized dictionary');
  const description='The competitive Rialo knowledge challenge: 15 questions, 20 seconds each, and up to 3,000 points.';
  await until(`document.querySelector('meta[name="description"]')?.content===${JSON.stringify(dict[description])}`);
  results.push({locale,dir:state.dir,translatedHome:true,translatedMetadata:true});
 }
 await screenshot('intro-fa-desktop');await visibleClick('section[data-phase] button');await until('!document.querySelector("section[data-phase]")');await screenshot('home-fa-desktop');const previousDocument=await evaluate('performance.timeOrigin');await cdp('Page.reload');await until(`performance.timeOrigin!==${previousDocument} && document.readyState==="complete" && document.documentElement.lang==="fa" && !!${languageControl}`);assert.equal(await evaluate(`${languageControl}.value`),'fa');
 await navigate('/learn');assert.equal(await evaluate('document.documentElement.lang'),'fa');assert.equal(await evaluate('document.querySelectorAll("[id^=chapter-]").length'),8);await screenshot('learn-fa-desktop');
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait(700);await screenshot('learn-fa-mobile');assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,'Persian Learn must not overflow horizontally');
 await navigate('/leaderboard');await until('document.body.innerText.length>150');await screenshot('leaderboard-fa-mobile');assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
 // Profile setup is a native modal: background header controls correctly become unreachable.
 await choose('en');await cdp('Page.navigate',{url:base+'/?quiz=1'});await until('document.readyState === "complete" && !!document.querySelector("dialog[open] #x-username")');
 await until('!!document.querySelector("#x-username")');await evaluate('(()=>{const x=document.querySelector("#x-username");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(x,"arena_i18n_qa");x.dispatchEvent(new Event("input",{bubbles:true}));return true})()');
 await wait(200);await evaluate('[...document.querySelectorAll("button")].find(x=>/find my profile/i.test(x.innerText)).click();true');await until('[...document.querySelectorAll("button")].some(x=>/yes, continue/i.test(x.innerText))');await evaluate('[...document.querySelectorAll("button")].find(x=>/yes, continue/i.test(x.innerText)).click();true');await until('location.pathname==="/quiz" && [...document.querySelectorAll("button")].some(x=>/start quiz/i.test(x.innerText))');
 await evaluate('[...document.querySelectorAll("button")].find(x=>/start quiz/i.test(x.innerText)).click();true');await until('new URL(location.href).searchParams.has("attempt") && !!document.querySelector("#current-question")');
 const before=await evaluate('({attempt:new URL(location.href).searchParams.get("attempt"),question:document.querySelector("#current-question").textContent})');await choose('fa');const after=await evaluate('({attempt:new URL(location.href).searchParams.get("attempt"),question:document.querySelector("#current-question").textContent,lang:document.documentElement.lang,dir:document.documentElement.dir})');assert.equal(after.attempt,before.attempt,'Switching must keep the active attempt');assert.equal(after.dir,'rtl');assert.notEqual(after.question,before.question,'Current question must translate without restarting');await screenshot('quiz-fa-mobile');
 const response=await evaluate('(async()=>{const u=new URL(location.href).searchParams.get("attempt");const r=await fetch("/api/quiz/attempt/"+u);return {status:r.status,state:await r.json()}})()');assert.equal(response.status,200);assert.equal(response.state.attemptId,before.attempt);assert.ok(!JSON.stringify(response.state).includes('correctOption'));
 results.push({activeAttemptPreserved:true,questionTranslated:true,attemptId:before.attempt});
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,results,runtimeExceptions:errors},null,2));console.log(JSON.stringify({passed:true,results,runtimeExceptions:errors,evidence:output},null,2));assert.equal(errors.length,0,'Browser runtime exceptions');
}finally{ws.close();}

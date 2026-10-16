const {chromium,_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
// Large plain-text paste in Formatted view: one conversion/save per paste, and the same result as Chromium's own insertText.
const native=process.argv.includes('--desktop');let host,page,profile,checks=0;
const corpus=['plain line','','  two leading spaces','a  b   c','tab\there','trailing space ','# not heading','- not bullet','1. not numbered','> not quote','**bold** and *it* ==hi== __u__ ~~s~~ `code`','https://example.com and www.example.org','<b>html</b> &amp; "q"','\\escaped','| a | b |','','last'];
const texts={lf:corpus.join('\n'),crlf:corpus.join('\r\n'),cr:'x\ry',single:'one line only',trailing:'a\nb\n',leading:'\na\nb',breaks:'\n\n\n',hashSpace:'first\n# \nthird'};
const notes={plain:'Before para\n\nAfter',mixed:'# Title\n\nSome **bold** text here\n\n- item one\n- item two\n\n> quoted\n\n```\ncode\n```\n\n| h1 | h2 |\n| --- | --- |\n| c1 | c2 |\n\nEnd ==mark== x',empty:''};
// [note, text to find, caret offset in it, optional selection end text and offset | 'bold' typing style]; 'all' selects everything.
const spots={empty:['empty'],mid:['plain','Before para',6],end:['plain','Before para',11],start:['plain','Before para',0],afterLast:['plain','After',5],
 boldInside:['mixed','bold',2],beforeBold:['mixed','Some ',3],heading:['mixed','Title',2],li:['mixed','item one',4],quote:['mixed','quoted',3],code:['mixed','code',2],cell:['mixed','c1',1],markEnd:['mixed','End ',2],
 selWithin:['plain','Before para',2,'Before para',8],selAcross:['plain','Before para',3,'After',2],selAllPlain:['plain','all'],selAllMixed:['mixed','all'],typingBold:['plain','Before para',6,'bold']};
function scenario({auto,spec,text,notes,reference}){
 prefs.autoMarkdown=auto;createNote('Large paste',notes[spec[0]]);setMode('rich');rich.focus();
 const find=t=>{const w=document.createTreeWalker(rich,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())if(n.data.includes(t))return [n,n.data.indexOf(t)];throw Error('Missing text: '+t)};
 const s=getSelection();
 if(spec[1]==='all'){const r=document.createRange();r.selectNodeContents(rich);s.removeAllRanges();s.addRange(r);}
 else if(spec[1]){const [n,i]=find(spec[1]);const r=document.createRange();r.setStart(n,i+spec[2]);r.collapse(true);s.removeAllRanges();s.addRange(r);
  if(spec[3]==='bold')document.execCommand('bold');else if(spec[3]){const [m,k]=find(spec[3]);s.extend(m,k+spec[4]);}}
 rememberRange();const before=editor.value;
 // The reference is the previous handler's insertion: Chromium's insertText for the whole text, then one conversion and save.
 if(reference){majorEditBoundary('Pasted text');pastingText=true;document.execCommand('insertText',false,text);pastingText=false;autoFormatRich();commitRich();}
 else{const data=new DataTransfer();data.setData('text/plain',text);rich.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));}
 const result={markdown:editor.value,text:rich.innerText,caret:caretOffset(),styles:['bold','italic','underline'].map(c=>document.queryCommandState(c)).join()};
 rich.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true,cancelable:true}));result.undo=editor.value===before;return result;
}
(async()=>{
 if(native){profile=path.join(__dirname,'test-profile','large-paste-'+Date.now());await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}),{flag:'wx'});host=await _electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await host.firstWindow();await page.waitForFunction(()=>typeof flushLibrary==='function');}
 else{host=await chromium.launch({channel:'msedge',headless:true});page=await host.newPage();await page.goto(pathToFileURL(path.resolve(__dirname,'../Rotepad.html')).href);}
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(`window.largePasteScenario=${scenario.toString()}`);

 // Same Markdown, visible text, caret, active styles and Undo as insertText, with automatic Markdown off and on.
 for(const auto of [false,true])for(const [spot,spec] of Object.entries(spots))for(const [name,text] of Object.entries(texts)){
  const args={auto,spec,text,notes};
  const expected=await page.evaluate(a=>largePasteScenario({...a,reference:true}),args),actual=await page.evaluate(a=>largePasteScenario({...a,reference:false}),args);
  assert.deepEqual(actual,expected,`auto ${auto}, ${spot}, ${name}`);assert.equal(actual.undo,true,`Undo after ${spot} ${name}`);checks++;
 }

 // A 5,000-line paste into a blank note converts and saves once and keeps every line (it took minutes before 2026-10-17).
 const lines=Array.from({length:5000},(_,i)=>'Line '+i+' of pasted text, with words and https://example.com/'+i+' for links.'),big=lines.join('\r\n');
 const run=await page.evaluate(text=>{prefs.autoMarkdown=false;createNote('Large paste','');setMode('rich');rich.focus();
  let commits=0;const original=commitRich;commitRich=function(){commits++;return original.apply(this,arguments);};
  const data=new DataTransfer();data.setData('text/plain',text);const start=performance.now();
  try{rich.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));}finally{commitRich=original;}
  return {ms:performance.now()-start,commits,markdown:editor.value,saved:activeNote().text,id:activeId,caret:caretOffset(),length:rich.textContent.length};},big);
 assert.equal(run.commits,1,'one conversion and save per paste');
 assert.equal(run.markdown,lines.map(line=>line.replace(/https:\S+/,url=>`[${url}](${url})`)).join('\n'),'every line kept; web addresses become links as when typed');assert.equal(run.saved,run.markdown);assert.equal(run.caret,run.length,'caret after the pasted text');
 assert.ok(run.ms<3000,`5,000-line paste took ${Math.round(run.ms)} ms`);checks++;
 if(native){await page.evaluate(()=>flushLibrary());const index=JSON.parse(await fs.readFile(path.join(profile,'managed-notes.json'),'utf8'));assert.equal(await fs.readFile(index[run.id].file,'utf8'),run.markdown);checks++;}
 await page.keyboard.type('!');assert.equal(await page.evaluate(()=>editor.value.endsWith('for links.!')),true,'typing continues after the paste');checks++;

 assert.deepEqual(errors,[]);
 console.log(`PASS ${checks} large-paste checks in ${native?'Electron':'Edge'}: paste matches insertText (Markdown, text, caret, styles, Undo) across ${Object.keys(spots).length} positions × ${Object.keys(texts).length} texts with auto-Markdown off/on; 5,000 lines saved once in ${Math.round(run.ms)} ms.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(host)await host.close();});

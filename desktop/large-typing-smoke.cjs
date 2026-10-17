const {chromium,_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
// Typing revisits only what an edit touched: the changed blocks in Formatted view, the changed lines of the Markdown link layer and the
// changed blocks of the preview. Each scenario is typed twice, once with the current code and once with the whole-note functions it
// replaced (0.12.6, below), and must save the same Markdown with the same visible note, preview, link layer and caret after every step.
const native=process.argv.includes('--desktop');let host,page,profile,checks=0;
const legacy=String.raw`({
render(){const t=editor.value;preview.innerHTML=t?markdown(t):'<p class="empty">Your formatted note will appear here.</p>';linkLayer.innerHTML=writingLinks(t);linkLayer.querySelectorAll('a').forEach(a=>{a.tabIndex=-1;a.title='Ctrl+click to open '+a.textContent});syncLinks();$('count').textContent=(t.trim()?t.trim().split(/\s+/).length:0)+' words · '+t.length+' characters';position()},
markAutoLinks(){rich.querySelectorAll('a').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer';a.title='Click for link options · Ctrl+click to open';const text=a.textContent;const url=safeURL(/^https?:\/\//i.test(text)?text:'https://'+text);if(url===a.href)a.dataset.auto='true'});rich.querySelectorAll('li[data-checked]').forEach(li=>{if(!li.querySelector('.task-box')){li.dataset.checked='false';const box=document.createElement('span');box.className='task-box';box.contentEditable='false';box.setAttribute('role','checkbox');box.setAttribute('aria-checked','false');box.setAttribute('aria-label','Mark task complete');box.tabIndex=0;box.textContent='☐';li.prepend(box)}})},
commitRich(){editor.value=richMarkdown();markAutoLinks();rememberRange();render();persist();recordRich()},
convert(){
 const selection=getSelection();if(!selection.isCollapsed||!rich.contains(selection.anchorNode))return;
 let offset=caretOffset();
 const bookmark=document.createElement('span');bookmark.dataset.caret='true';selection.getRangeAt(0).insertNode(bookmark);
 if(rich.childNodes.length&&![...rich.children].some(n=>/^(P|DIV|H[1-6]|UL|OL|BLOCKQUOTE|PRE|HR|TABLE)$/.test(n.tagName))){const p=document.createElement('p');p.append(...rich.childNodes);rich.append(p)}
 rich.querySelectorAll('a[data-auto]').forEach(a=>a.replaceWith(...a.childNodes));rich.normalize();
 const walker=document.createTreeWalker(rich,NodeFilter.SHOW_TEXT),nodes=[];let node;while(node=walker.nextNode())nodes.push(node);
 let originalPosition=0,removed=0,exitInline=null;
 for(const n of nodes){const text=n.data,start=originalPosition;originalPosition+=text.length;
  if(n.parentElement.closest('a,code,pre,.task-box,[data-no-link]'))continue;
  if(offset>start&&offset<start+text.length)continue;
  const html=inline(text);if(html===escapeHTML(text))continue;
  const temp=document.createElement('template');temp.innerHTML=html;
  if(start+text.length===offset&&/^(STRONG|EM|U|CODE)$/.test(temp.content.lastChild?.nodeName))exitInline=temp.content.lastChild;
  if(start+text.length<=offset)removed+=text.length-temp.content.textContent.length;
  n.replaceWith(temp.content);
 }
 const caret=document.createRange();caret.setStartBefore(bookmark);caret.collapse(true);bookmark.remove();selection.removeAllRanges();selection.addRange(caret);markAutoLinks();
 if(exitInline?.isConnected){const r=document.createRange();r.setStartAfter(exitInline);r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);for(const command of ['bold','italic','underline'])if(document.queryCommandState(command))document.execCommand(command,false,null);normalAfterMarkdown=true}
 const current=getSelection().anchorNode;const block=(current?.nodeType===3?current.parentElement:current)?.closest('p,div');
 if(block&&rich.contains(block)&&block!==rich&&/^(#{1,6}|1\.)[  ]$/.test(block.textContent)){
  const prefix=block.textContent.trim();
  if(prefix[0]==='#'){const next=document.createElement('h'+prefix.length);next.append(document.createElement('br'));block.replaceWith(next);const r=document.createRange();r.setStart(next,0);r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r)}
  else{block.textContent='';block.append(document.createElement('br'));const r=document.createRange();r.setStart(block,0);r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);document.execCommand('insertOrderedList')}
 }
 rememberRange();
},
revertable(){
 const before=rich.innerHTML,beforeText=rich.textContent,at=caretOffset();
 autoFormatRevert=null;this.convert();
 if(beforeText!==rich.textContent)autoFormatRevert={html:before,at,after:rich.innerHTML,caret:caretOffset(),id:activeId};
},
autoLinksOnly(){
 const s=getSelection();if(!s.rangeCount||!s.isCollapsed||!rich.contains(s.anchorNode))return;
 const marker=document.createElement('span');s.getRangeAt(0).insertNode(marker);
 if(rich.childNodes.length&&![...rich.children].some(n=>/^(P|DIV|H[1-6]|UL|OL|BLOCKQUOTE|PRE|HR|TABLE)$/.test(n.tagName))){const p=document.createElement('p');p.append(...rich.childNodes);rich.append(p);}
 rich.querySelectorAll('a[data-auto]').forEach(a=>a.replaceWith(...a.childNodes));rich.normalize();
 const walker=document.createTreeWalker(rich,NodeFilter.SHOW_TEXT),nodes=[];let n;while(n=walker.nextNode())nodes.push(n);
 for(const text of nodes){if(text.parentElement.closest('a,code,pre,.task-box,[data-no-link]'))continue;const html=writingLinks(text.data).slice(0,-1);if(html===escapeHTML(text.data))continue;const temp=document.createElement('template');temp.innerHTML=html;text.replaceWith(temp.content);}
 const r=document.createRange();r.setStartBefore(marker);r.collapse(true);marker.remove();s.removeAllRanges();s.addRange(r);markAutoLinks();rememberRange();
},
autoFormatRich(){if(prefs.autoMarkdown===true)legacyTyping.revertable();else{autoFormatRevert=null;normalAfterMarkdown=false;legacyTyping.autoLinksOnly();}}
})`;
// Swaps the per-key functions between the current code and the legacy whole-note versions.
function useLegacy(on){
 window.currentTyping??={render,markAutoLinks,commitRich,autoFormatRich};
 const set=on?{render:legacyTyping.render,markAutoLinks:legacyTyping.markAutoLinks,commitRich:legacyTyping.commitRich,autoFormatRich:legacyTyping.autoFormatRich}:currentTyping;
 render=set.render;markAutoLinks=set.markAutoLinks;commitRich=set.commitRich;autoFormatRich=set.autoFormatRich;window.legacyOn=on;
 // The legacy render replaces the preview and link layer wholesale, so the current code starts again from a full build.
 layerText=previewText=previewBlocks=null;previewStale=layerStale=false;if(on)render();else{renderPreview();renderLinkLayer();}
}
function start({text,auto,view='rich',name='Large typing'}){prefs.autoMarkdown=auto;autoFormatRevert=null;normalAfterMarkdown=false;createNote(name,text);setMode(view);if(view==='rich'){rich.focus();placeCaret(rich.textContent.length);}else editor.focus();}
// A click elsewhere: pointerdown ends pending automatic-Markdown state, then the caret moves to a text position.
function step(action){
 if(mode!=='rich'&&(action.caret!==undefined||action.select)){const text=editor.value,[needle,delta,length=0]=typeof action.caret==='number'?[]:action.select||action.caret,at=typeof action.caret==='number'?Math.floor(action.caret*text.length):text.indexOf(needle)+delta;if(at<0)throw Error('Missing text: '+needle);editor.focus();editor.setSelectionRange(at,at+length);}
 else if(action.caret){rich.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));const at=typeof action.caret==='number'?Math.floor(action.caret*rich.textContent.length):rich.textContent.indexOf(action.caret[0])+action.caret[1];if(at<0)throw Error('Missing text: '+action.caret[0]);placeCaret(at);}
 if(action.select){const text=rich.textContent,a=text.indexOf(action.select[0])+action.select[1];placeCaret(a);const s=getSelection(),r=s.getRangeAt(0).cloneRange();placeCaret(a+action.select[2]);r.setEnd(s.anchorNode,s.anchorOffset);s.removeAllRanges();s.addRange(r);rememberRange();}
 if(action.mode)setMode(action.mode);
 if(action.auto!==undefined){$('auto-markdown-setting').checked=action.auto;$('auto-markdown-setting').onchange();}
 if(action.find!==undefined){openFind();$('find-text').value=action.find;refreshFind();}
 if(action.paste!==undefined){const data=new DataTransfer();data.setData('text/plain',action.paste);rich.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));}
}
// Only what the view shows is compared: the preview in Split and Preview, the link layer (one span per line now) in Markdown and Split,
// with the position of its links and of Find highlights, and whether the layer is scrolled with the textarea.
function snapshot(){
 const layer=mode==='write'||mode==='split',box=r=>{const b=r.getBoundingClientRect();return Math.round(b.left)+','+Math.round(b.top)};
 return {markdown:editor.value,saved:activeNote().text,html:mode==='rich'?rich.innerHTML:null,preview:mode==='split'||mode==='preview'?preview.innerHTML:null,
  layer:layer?(legacyOn?linkLayer.innerHTML:[...linkLayer.children].map(line=>line.innerHTML).join('')):null,layerText:layer?linkLayer.textContent===editor.value+'\n':null,aligned:layer?linkLayer.scrollTop===editor.scrollTop&&linkLayer.scrollLeft===editor.scrollLeft:null,
  links:layer?[...linkLayer.querySelectorAll('a')].slice(0,6).map(a=>a.href+' '+box(a)):null,
  find:$('find-panel').hidden?null:[...(CSS.highlights.get('find-results')||[])].slice(0,6).map(r=>r.toString()+' '+box(r)),
  caret:mode==='rich'?caretOffset():editor.selectionStart};
}
const urls=n=>Array.from({length:n},(_,i)=>i%3?'Paragraph '+i+' with words and https://example.com/p'+i+' then www.site'+i+'.org.':'Plain paragraph '+i+' only words here.').join('\n');
const scenarios=[
 {name:'typing a web address',text:'Intro\n\nsee here\n\nEnd',caret:['see here',8],steps:[{type:' https://example.com/path.'},{press:'Backspace'},{press:'Backspace'},{type:'x'},{press:'Enter'},{type:'www.test.org'},{press:'Home'},{type:'a '},{press:'End'},{type:' done'}]},
 {name:'splitting and joining an address',text:'Visit www.example.com/abc today',caret:['www.exa',7],steps:[{press:'Enter'},{press:'Backspace'},{press:'Delete'},{type:'z'},{press:'ArrowRight'},{press:'ArrowRight'},{type:'.'},{press:'Control+Backspace'}]},
 {name:'editing a link address',text:'[www.a.com](https://www.a.com/) and https://b.org end',caret:['www.a',5],steps:[{type:'b'},{press:'ArrowRight'},{press:'ArrowRight'},{press:'ArrowRight'},{press:'Backspace'},{caret:['b.org',5]},{type:'/x'},{caret:['end',3]},{type:'!'}]},
 {name:'typing at a named link',text:'[Google](https://google.com) end',caret:['Google',6],steps:[{type:'x'},{press:'Backspace'},{type:' a'},{caret:['Google',0]},{type:'b'}]},
 {name:'moving between paragraphs',text:urls(30),caret:['Paragraph 4 ',12],steps:[{type:'www.new.com '},{caret:['www.site20.org',8]},{type:'x'},{caret:['Paragraph 4 ',14]},{type:'q'},{caret:['https://example.com/p7',22]},{type:'/'},{press:'Enter'},{type:'end'}]},
 {name:'lists',text:'- one\n- two https://x.com\n\n1. first\n2. second',caret:['two https://x.com',17],steps:[{type:'/p'},{press:'Enter'},{type:'three www.y.io'},{press:'Enter'},{press:'Enter'},{type:'after'},{caret:['second',6]},{press:'Enter'},{type:'third b.com'},{press:'Tab'},{type:'x'}]},
 {name:'tasks, quote, code and table',text:'- [ ] task www.t.com\n\n> quoted www.q.com\n\n```\ncode www.c.com\n```\n\n| h1 | h2 |\n| --- | --- |\n| c1 | c2 |',caret:['www.t.com',9],steps:[{type:'/a'},{caret:['quoted',6]},{type:' x.io'},{caret:['code',4]},{type:' y.com'},{caret:['c1',2]},{type:' www.cell.com'},{press:'Tab'},{type:'next'}]},
 // Enter after a ticked task copies the tick without its box; the box is restored, unticked, before the note is saved.
 {name:'new item after a ticked task',text:'- [ ] open\n- [x] done www.d.com\n\nafter',caret:['done',4],steps:[{press:'Enter'},{type:'next'},{caret:['www.d.com',9]},{press:'Enter'},{type:'x'},{caret:['after',5]},{type:'!'}]},
 {name:'undo, redo and selection',text:'alpha https://example.com/abc beta',caret:['beta',4],steps:[{type:' gamma'},{press:'Control+z'},{type:'d'},{press:'Control+y'},{select:['example',2,4]},{type:'X'},{select:['alpha',0,9]},{press:'Backspace'},{type:'new'}]},
 {name:'paste and views',text:'Start\n\nmiddle text',caret:['middle',6],steps:[{paste:'one www.p.com\ntwo\nthree https://q.org/x'},{type:' more'},{mode:'write'},{mode:'rich'},{caret:['two',3]},{type:' www.r.net'},{mode:'preview'},{mode:'rich'},{caret:['Start',5]},{type:'!'}]},
 {name:'empty note',text:'',caret:['',0],steps:[{type:'www.a.com b'},{press:'Enter'},{type:'next'},{press:'Control+a'},{type:'gone'}]},
 // Deleting a style's last character leaves the browser a pending typing style; each pass ended it by setting the caret again.
 {name:'typing after deleting styled text',text:'one **b** two ==m== three',caret:['one b',5],steps:[{press:'Backspace'},{type:'z'},{caret:['m',0]},{press:'Delete'},{type:'y'},{press:'Control+b'},{type:'w'},{press:'Backspace'},{type:'v'}]},
 {name:'settings change',text:'one\n\ntwo',caret:['one',3],steps:[{type:' **b** www.x.com'},{auto:true},{caret:['two',3]},{type:' y'},{auto:false},{caret:['one',3]},{type:' *i*'},{caret:['two',3]},{type:'z'}]}
];
// Automatic Markdown: inline styles, headings and numbers on typing, Backspace restoring the literal text.
const markdownScenarios=[
 {name:'automatic Markdown',text:'plain www.base.com',caret:['plain',5],steps:[{type:' **bold** and *it* ==hi== `code`'},{press:'Enter'},{type:'# '},{type:'Heading'},{press:'Enter'},{type:'1. '},{type:'num'},{press:'Enter'},{type:'x'},{caret:['base',4]},{type:'z'},{press:'End'},{type:' __u__'},{press:'Backspace'},{type:'q'}]}
];
// A seeded mix of letters, address pieces, Enter, Backspace, Delete, arrows and clicks in a 60-paragraph note.
function fuzz(seed,count){let x=seed;const r=()=>(x=(x*1103515245+12345)%2147483648)/2147483648;const pieces=['a','b',' ','.','/','www.','.com',' https://','x.org','**','*','=='],keys=['Enter','Backspace','Delete','ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Home','End'],steps=[];
 for(let i=0;i<count;i++){const k=r();steps.push(k<.5?{type:pieces[Math.floor(r()*pieces.length)]}:k<.85?{press:keys[Math.floor(r()*keys.length)]}:{caret:r()});}return steps;}
for(const [seed,auto] of [[7,false],[11,false],[13,true],[17,true]])(auto?markdownScenarios:scenarios).push({name:'random edits '+seed,text:urls(60),caret:['Paragraph 30 ',13],steps:fuzz(seed,70)});
// Markdown and Split views, typed in the source text with real keys.
const mixed=['# Title www.h.com','','Intro https://a.org/x and **bold** text','','- item www.one.com','- item two','    - nested x.io','','1. first','2. second b.com','','- [ ] task www.t.com','','> quote www.q.com','','```','code www.c.com','```','','| h1 | h2 |','| --- | --- |','| c1 www.cell.com | c2 |','','End ==mark== and *it*'].join('\n');
function sourceFuzz(seed,count){let x=seed;const r=()=>(x=(x*1103515245+12345)%2147483648)/2147483648;const pieces=['a',' ','.','/','www.','.com',' https://','x.org','```','- ','1. ','| a |','> ','# ','**'],keys=['Enter','Backspace','Delete','ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Home','End','Tab'],steps=[];
 for(let i=0;i<count;i++){const k=r();steps.push(k<.5?{type:pieces[Math.floor(r()*pieces.length)]}:k<.85?{press:keys[Math.floor(r()*keys.length)]}:{caret:r()});}return steps;}
const sourceScenarios=[
 {name:'Markdown view: addresses and lines',view:'write',text:urls(20),caret:['Paragraph 4 ',12],steps:[{type:'www.new.com '},{press:'Enter'},{type:'https://x.org/a'},{press:'Backspace'},{press:'Backspace'},{caret:['www.site8.org',8]},{press:'Delete'},{type:'x'},{press:'Home'},{press:'Backspace'},{press:'End'},{type:' end'},{insert:'one\ntwo www.p.com\n\nthree'},{select:['Paragraph 10',0,40]},{press:'Backspace'},{press:'Control+z'},{press:'Control+y'},{find:'www'},{type:'q'},{mode:'split'},{type:'w'},{press:'Enter'},{mode:'preview'},{mode:'write'},{type:'z'},{mode:'rich'},{mode:'write'},{type:'y'}]},
 {name:'Split view: lists, code and tables',view:'split',text:mixed,caret:['item two',8],steps:[{press:'Enter'},{type:'three'},{press:'Enter'},{press:'Enter'},{type:'after'},{caret:['Intro',0]},{type:'```'},{press:'Enter'},{type:'x'},{caret:['Intro',0]},{press:'Backspace'},{press:'Backspace'},{press:'Backspace'},{press:'Backspace'},{press:'Backspace'},{caret:['c1',2]},{type:' www.t.com'},{caret:['| h1',0]},{press:'Enter'},{caret:['# Title',0]},{press:'Delete'},{type:'#'},{caret:['> quote',0]},{press:'Delete'},{caret:['2. second',9]},{press:'Enter'},{type:'third'},{caret:['code www',4]},{press:'Enter'},{type:'- not a list'},{find:'item'},{type:'!'}]},
 ...[[23,'write',urls(40)],[29,'split',mixed],[31,'split',urls(40)],[37,'write',mixed]].map(([seed,view,text])=>({name:'random '+view+' edits '+seed,view,text,caret:[text.includes('Intro')?'Intro':'Paragraph 20 ',5],steps:sourceFuzz(seed,70)}))
];

async function play(scenario,auto,legacyRun){
 await page.evaluate(([on])=>useLegacy(on),[legacyRun]);
 await page.evaluate(s=>{start(s);step({caret:s.caret});},{text:scenario.text,auto,caret:scenario.caret,view:scenario.view});
 // After an earlier scenario the textarea scrolls its caret into view a frame after the note changes, with old and new code alike,
 // so where a pass starts depends on what ran before it. Both passes start from the top.
 if(scenario.view)await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(()=>{editor.scrollTop=0;resolve();}))));
 const shots=[];
 for(const action of scenario.steps){
  if(action.type)await page.keyboard.type(action.type);else if(action.insert)await page.keyboard.insertText(action.insert);else if(action.press)await page.keyboard.press(action.press);else await page.evaluate(a=>step(a),action);
  // A frame passes between keys, as when a person types: shortcuts use the caret remembered on the asynchronous selectionchange event.
  shots.push(await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(()=>resolve(snapshot()))))));
 }
 await page.evaluate(()=>{useLegacy(false);if(!$('find-panel').hidden)$('find-close').click();});return shots;
}
// Types 16 letters at the end of the middle line of a long note in a view and returns the first and median time per key.
async function budget(text,label,limit,view='rich'){
 // Each key saves the whole library, and six long notes would overfill the browser's storage, so only the newest long note is kept.
 await page.evaluate(([text,view])=>{start({text,auto:false,view,name:'Large typing budget'});notes=notes.filter(n=>n.id===activeId||n.name!=='Large typing budget');
  if(view==='rich'){const p=rich.children[Math.floor(rich.children.length/2)];const r=document.createRange();r.selectNodeContents(p);r.collapse(false);getSelection().removeAllRanges();getSelection().addRange(r);rememberRange();}
  else{const lines=text.split('\n'),at=lines.slice(0,Math.floor(lines.length/2)+1).join('\n').length;editor.setSelectionRange(at,at);}
  window.keyStart=0;if(!window.keyWatch){window.keyWatch=true;document.addEventListener('keydown',()=>{keyStart=performance.now()},true);}},[text,view]);
 const times=[];
 // From keydown to the next frame, so the browser's own editing, style and layout count too.
 for(let i=0;i<16;i++){await page.keyboard.type('x');times.push(await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>r(performance.now()-keyStart)))));}
 const result=await page.evaluate(([text])=>{const lines=text.split('\n'),middle=Math.floor(lines.length/2),expected=document.createElement('div');
  // Web addresses are saved in link form, as when the note is opened and saved again.
  const typed=lines.map((line,i)=>i===middle?line+'x'.repeat(16):line).join('\n');if(mode!=='rich')return {markdown:editor.value,expected:typed,saved:activeNote().text,id:activeId};
  expected.innerHTML=markdown(typed);return {markdown:editor.value,expected:richMarkdown(expected),saved:activeNote().text,id:activeId};},[text]);
 assert.equal(result.markdown,result.expected,`${label}: typed text saved in the middle line`);assert.equal(result.saved,result.markdown);
 const steady=times.slice(1).sort((a,b)=>a-b),median=steady[Math.floor(steady.length/2)];
 assert.ok(median<=limit,`${label}: median ${Math.round(median)} ms per key exceeds ${limit} ms`);checks++;
 if(native){await page.evaluate(()=>flushLibrary());const index=JSON.parse(await fs.readFile(path.join(profile,'managed-notes.json'),'utf8'));assert.equal(await fs.readFile(index[result.id].file,'utf8'),result.markdown);checks++;}
 return {first:Math.round(times[0]),median:Math.round(median)};
}
(async()=>{
 if(native){profile=path.join(__dirname,'test-profile','large-typing-'+Date.now());await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}),{flag:'wx'});host=await _electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await host.firstWindow();await page.waitForFunction(()=>typeof flushLibrary==='function');}
 else{host=await chromium.launch({channel:'msedge',headless:true});page=await host.newPage();await page.goto(pathToFileURL(path.resolve(__dirname,'../Rotepad.html')).href);}
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(`window.legacyTyping=${legacy};window.useLegacy=${useLegacy.toString()};window.start=${start.toString()};window.step=${step.toString()};window.snapshot=${snapshot.toString()}`);

 let steps=0;
 for(const [list,autos] of [[scenarios,[false,true]],[markdownScenarios,[true]],[sourceScenarios,[false]]])for(const scenario of list)for(const auto of autos){
  const expected=await play(scenario,auto,true),actual=await play(scenario,auto,false);
  let typedCaret=null;
  for(let i=0;i<expected.length;i++){const action=scenario.steps[i],where=`${scenario.name}, auto-Markdown ${auto}, step ${i+1} ${JSON.stringify(action)}`;
   // Returning to Formatted view restores the caret by node path. The whole-note code left the typed text split at the caret, so that
   // path could miss and the caret went to the end of the line; now it returns to where typing stopped.
   if(action.mode&&action.mode!=='rich'&&!typedCaret&&!scenario.view)typedCaret=actual[i-1].caret;
   if(action.mode==='rich'&&!scenario.view){assert.equal(actual[i].caret,typedCaret,where+': caret back where typing stopped');typedCaret=null;assert.deepEqual({...actual[i],caret:0},{...expected[i],caret:0},where);}
   else assert.deepEqual(actual[i],expected[i],where);
  }
  steps+=expected.length;checks++;
 }

 // Per-key budget in long notes. In headless Edge, 0.12.6 took about 210 ms at 10,000 lines and 960 ms with 5,000 lines of addresses in
 // Formatted view, 200 and 230 ms in Markdown view and 260 ms in Split view.
 const plain=Array.from({length:10000},(_,i)=>'Line '+i+' of a long note with some ordinary words in it.').join('\n'),links=Array.from({length:5000},(_,i)=>'Line '+i+' see https://example.com/'+i+' and www.site'+i+'.org too.').join('\n');
 const results={};
 for(const [view,name] of [['rich','Formatted'],['write','Markdown'],['split','Split']])for(const [label,text] of [['10,000 lines',plain],['5,000 lines of addresses',links]])results[name+' '+label]=await budget(text,name+', '+label,150,view);

 assert.deepEqual(errors,[]);
 console.log(`PASS ${checks} large-typing checks in ${native?'Electron':'Edge'}: ${steps} steps in ${scenarios.length*2+markdownScenarios.length+sourceScenarios.length} scenarios save the same Markdown, note, preview, link layer and caret as the whole-note code; per key `+Object.entries(results).map(([k,v])=>`${k} ${v.median} ms (first ${v.first} ms)`).join(', ')+'.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(host)await host.close();});

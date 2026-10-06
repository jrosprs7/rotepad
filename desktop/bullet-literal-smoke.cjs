const {chromium,_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const native=process.argv.includes('--desktop');let host,page,profile,checks=0;
async function fresh(text='',auto=false){await page.evaluate(({text,auto})=>{prefs.autoMarkdown=auto;createNote('Literal bullet regression',text);setMode('rich');rich.focus();},{text,auto});}
async function caretBefore(text){await page.evaluate(text=>{rich.focus();const w=document.createTreeWalker(rich,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())if(n.data.includes(text)){const r=document.createRange();r.setStart(n,n.data.indexOf(text));r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);rememberRange();return;}throw Error('Missing caret text: '+text);},text);}
async function blocks(){return page.evaluate(()=>[...rich.childNodes].map(n=>n.textContent).join('\n'));}
async function plain(text,label){assert.equal(await blocks(),text,label);assert.equal(await page.locator('#rich-editor li,#rich-editor ul,#rich-editor ol').count(),0,label);checks++;}
async function source(){return page.evaluate(()=>{commitRich();return editor.value;});}
async function roundtrip(){await page.evaluate(()=>{commitRich();setMode('write');setMode('preview');setMode('rich');});}
async function paste(text){await page.evaluate(text=>{const data=new DataTransfer();data.setData('text/plain',text);rich.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},text);}
const escaped=marker=>'\\'+marker;
(async()=>{
 if(native){profile=path.join(__dirname,'test-profile','bullet-literal-'+Date.now());await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}),{flag:'wx'});host=await _electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await host.firstWindow();await page.waitForFunction(()=>typeof flushLibrary==='function');}
 else{host=await chromium.launch({channel:'msedge',headless:true});page=await host.newPage();await page.goto(pathToFileURL(path.resolve(__dirname,'../Rotepad.html')).href);}
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Typed bullet markers stay text on space and Enter, with optional conversion off or on.
 for(const auto of [false,true])for(const marker of ['- ','* ','+ ']){
  const label=JSON.stringify({auto,marker});
  await fresh('',auto);await page.keyboard.type(marker+'text');await plain(marker+'text',label);
  await page.keyboard.press('Enter');await page.keyboard.type('next');await plain(marker+'text\nnext',label);
  assert.equal(await source(),escaped(marker)+'text\nnext',label);await roundtrip();await plain(marker+'text\nnext',label);
  // Enter in the middle splits paragraphs and leaves the caret at the moved text.
  await fresh('',auto);await page.keyboard.type(marker+'Alpha Beta');await caretBefore('Beta');await page.keyboard.press('Enter');await plain(marker+'Alpha \nBeta',label);
  assert.equal(await page.evaluate(()=>{const s=getSelection(),el=s.anchorNode.nodeType===3?s.anchorNode.parentElement:s.anchorNode;return el.closest('p,div')?.textContent;}),'Beta',label);
  // Backspace after the marker is ordinary deletion; an empty marker line is ordinary text.
  await fresh('',auto);await page.keyboard.type(marker+'Keep');await caretBefore('Keep');await page.keyboard.press('Backspace');await plain(marker.trim()+'Keep',label);
  await fresh('',auto);await page.keyboard.type(marker);await page.keyboard.press('Enter');await page.keyboard.type('after');await plain(marker+'\nafter',label);
  await fresh('',auto);await page.keyboard.type(marker+'undo me');await page.keyboard.press('Control+z');await plain('',label);await page.keyboard.press('Control+y');await plain(marker+'undo me',label);
  await fresh('',auto);await paste(marker+'pasted');await plain(marker+'pasted',label);await roundtrip();await plain(marker+'pasted',label);
 }
 // Neighbors: multiline paste after a paragraph, tabs, soft breaks, mid-line and repeated hyphens.
 await fresh();await page.keyboard.type('Intro');await page.keyboard.press('Enter');await paste('- one\n- two');await roundtrip();await plain('Intro\n- one\n- two');
 await fresh();await page.keyboard.press('Tab');await page.keyboard.type('- tabbed');await roundtrip();await plain('\t- tabbed');
 await fresh();await page.keyboard.type('Line');await page.keyboard.press('Shift+Enter');await page.keyboard.type('+ soft');await roundtrip();assert.equal(await page.locator('#rich-editor li').count(),0);assert.equal(await blocks(),'Line\n+ soft');assert.equal(await source(),'Line\n\\+ soft');checks++;
 await fresh();await page.keyboard.type('a - b + c');await page.keyboard.press('Enter');await page.keyboard.type('--- not a list');await page.keyboard.press('Enter');await page.keyboard.type('-dash');
 assert.equal(await source(),'a - b + c\n--- not a list\n-dash');await roundtrip();await plain('a - b + c\n--- not a list\n-dash');
 await fresh();await page.keyboard.type('- [ ] not a task');await page.keyboard.press('Enter');await plain('- [ ] not a task\n');await roundtrip();await plain('- [ ] not a task\n');
 // Deliberate lists are unchanged: numbered typing, the Bullet button, Markdown source and existing notes.
 for(const auto of [false,true]){await fresh('',auto);await page.keyboard.type('1. One');await page.keyboard.press('Enter');await page.keyboard.type('Two');assert.deepEqual(await page.locator('#rich-editor ol > li').allTextContents(),['One','Two']);checks++;}
 await fresh('',true);await page.keyboard.type('# Heading');assert.equal(await page.locator('#rich-editor h1').count(),1);checks++;
 await fresh();await page.locator('#more-format > summary').click();await page.locator('[data-format="list"]').click();await page.keyboard.type('Alpha');await page.keyboard.press('Enter');await page.keyboard.type('Beta');
 assert.deepEqual(await page.locator('#rich-editor ul > li').allTextContents(),['Alpha','Beta']);assert.equal(await source(),'- Alpha\n- Beta');await page.keyboard.press('Enter');await page.keyboard.press('Enter');await page.keyboard.type('Out');assert.equal(await page.locator('#rich-editor ul > li').count(),2);checks++;
 await fresh('- Existing\n* Star\n+ Plus');assert.deepEqual(await page.locator('#rich-editor ul > li').allTextContents(),['Existing','Star','Plus']);await roundtrip();assert.equal(await page.locator('#rich-editor ul > li').count(),3);checks++;
 await fresh();await page.evaluate(()=>{setMode('write');editor.focus();});await page.keyboard.type('- Source bullet');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>editor.value),'- Source bullet\n- ');await page.evaluate(()=>setMode('rich'));assert.equal(await page.locator('#rich-editor ul > li').first().textContent(),'Source bullet');checks++;
 await fresh('\\- escaped\n\\+ plus\n\\* star');await plain('- escaped\n+ plus\n* star');assert.equal(await source(),'\\- escaped\n\\+ plus\n\\* star');
 // Persisted literal text survives save and reload (and the managed Markdown file on desktop).
 await fresh();await page.keyboard.type('- saved literal');const saved=await page.evaluate(()=>{persist();return {id:activeId,text:editor.value};});
 assert.equal(saved.text,'\\- saved literal');if(native){await page.evaluate(()=>flushLibrary());const index=JSON.parse(await fs.readFile(path.join(profile,'managed-notes.json'),'utf8'));assert.equal(await fs.readFile(index[saved.id].file,'utf8'),saved.text);}
 await page.reload();await page.waitForFunction(()=>typeof rich!=='undefined'&&rich.textContent.includes('saved literal'));await plain('- saved literal');assert.deepEqual(errors,[]);
 console.log(`PASS ${checks} literal bullet checks in ${native?'Electron':'Edge'}: typed/pasted - * + with conversion off/on, Enter/split/Backspace, Undo/Redo, escapes, views/reload, Bullet button, numbered typing, source and existing lists.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(host)await host.close();});

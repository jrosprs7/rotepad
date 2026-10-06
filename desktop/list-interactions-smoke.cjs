const {chromium,_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const native=process.argv.includes('--desktop');let host,page,checks=0;
async function caretBefore(text){await page.evaluate(text=>{rich.focus();const w=document.createTreeWalker(rich,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())if(n.data.includes(text)){const r=document.createRange();r.setStart(n,n.data.indexOf(text));r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);rememberRange();return;}throw Error('Missing caret text: '+text);},text);}
async function fresh(text='',auto=false){await page.evaluate(({text,auto})=>{prefs.autoMarkdown=auto;createNote('List test',text);setMode('rich');rich.focus();},{text,auto});}
async function items(expected){assert.deepEqual(await page.locator('#rich-editor li').allTextContents(),expected);checks++;}
async function roundtrip(){const before=await page.evaluate(()=>editor.value);await page.evaluate(()=>{setMode('write');setMode('rich');commitRich();});assert.equal(await page.evaluate(()=>editor.value),before);checks++;}
(async()=>{
 if(native){const profile=path.join(__dirname,'test-profile','lists-'+Date.now());await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}),{flag:'wx'});host=await _electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await host.firstWindow();await page.waitForFunction(()=>typeof flushLibrary==='function');}
 else{host=await chromium.launch({channel:'msedge',headless:true});page=await host.newPage();await page.goto(pathToFileURL(path.resolve(__dirname,'../Rotepad.html')).href);}
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 // The user's precise middle-of-line reproduction: typed vs parsed, both settings.
 // Typed bullet prefixes stay literal text (bullet-literal-smoke.cjs); parsed Markdown bullets remain lists.
 for(const marker of ['1. ','4. ','- ','* ','+ '])for(const auto of [false,true])for(const creation of ['typed','parsed']){
  if(creation==='typed'&&!/^\d/.test(marker))continue;
  const text='Indictment Malachi asks the Priests';await fresh(creation==='parsed'?marker+text:'',auto);
  if(creation==='typed')await page.keyboard.type(marker+text);
  await caretBefore('Malachi');await page.keyboard.press('Enter');
  const result=await page.locator('#rich-editor li').allTextContents();assert.deepEqual(result.map(s=>s.trim()),['Indictment','Malachi asks the Priests'],`${marker} ${auto} ${creation}`);checks++;
  assert.equal(await page.evaluate(()=>{const s=getSelection(),el=s.anchorNode.nodeType===3?s.anchorNode.parentElement:s.anchorNode;return [...rich.querySelectorAll('li')].indexOf(el.closest('li'));}),1);
  await roundtrip();
 }
 // Prefix removal before a typed line has become semantic list markup.
 for(const marker of ['3. ']){await fresh();await page.keyboard.type(marker+'Keep all text');await caretBefore('Keep');await page.keyboard.press('Backspace');assert.equal(await page.locator('#rich-editor').innerText(),'Keep all text');assert.equal(await page.locator('#rich-editor li').count(),0);checks++;}
 for(const marker of ['1. ','- ']){
  // Menu-created list, start/middle/end split, empty exit, and live following numbers.
  await fresh();await page.evaluate(marker=>{rememberRange();if(marker==='1. ')$('numbered-list').click();else document.querySelector('[data-format=list]').click();},marker);
  await page.keyboard.type('Alpha Beta');await caretBefore('Beta');await page.keyboard.press('Enter');await items(['Alpha ','Beta']);
  await page.keyboard.press('Control+z');await items(['Alpha Beta']);await page.keyboard.press('Control+y');await items(['Alpha ','Beta']);
  await page.keyboard.press('End');await page.keyboard.press('Enter');await page.keyboard.press('Backspace');await page.keyboard.type('Outside');assert.equal(await page.locator('#rich-editor li').count(),2);checks++;
  await fresh(marker+'First\n'+(marker==='1. '?'2. ':'- ')+'Next');await caretBefore('First');await page.keyboard.press('Enter');await items(['','First','Next']);await roundtrip();
  await fresh(marker+'First');await caretBefore('First');await page.keyboard.press('Home');await page.keyboard.press('Backspace');assert.equal(await page.locator('#rich-editor li').count(),0);assert.equal(await page.locator('#rich-editor').innerText(),'First');checks++;
  await fresh(marker+'Alpha Beta');await caretBefore('Beta');await page.keyboard.press('Shift+Enter');assert.equal(await page.locator('#rich-editor li').count(),1);const soft=await page.locator('#rich-editor li').innerText();await roundtrip();assert.equal(await page.locator('#rich-editor li').innerText(),soft);assert.equal(await page.locator('#rich-editor li').count(),1);checks++;
 }
 // Existing text after the split must stay bold; selected text deletion stays native.
 await fresh('1. Alpha **Beta**');await caretBefore('Beta');await page.keyboard.press('Enter');assert.equal(await page.locator('#rich-editor li').count(),2);assert.equal(await page.locator('#rich-editor li').nth(1).locator('strong,b').innerText(),'Beta');await roundtrip();
 await fresh('1. Alpha Beta');await caretBefore('Beta');await page.keyboard.press('Control+Shift+ArrowRight');await page.keyboard.press('Backspace');assert.equal(await page.locator('#rich-editor li').count(),1);assert.equal(await page.locator('#rich-editor li').textContent(),'Alpha ');checks++;
 // beforeinput-only route must work; composition must not trigger conversion.
 await fresh();await page.keyboard.type('1. Alpha Beta');await caretBefore('Beta');await page.evaluate(()=>rich.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertParagraph',bubbles:true,cancelable:true})));await items(['Alpha ','Beta']);
 await fresh();await page.keyboard.type('1. Alpha Beta');await caretBefore('Beta');await page.evaluate(()=>rich.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true})));assert.equal(await page.locator('#rich-editor li').count(),0);checks++;
 // Source-mode bullets/tasks and fenced-code protection.
 for(const [input,expected]of [['- Alpha','- Alpha\n- '],['9. Ninth','9. Ninth\n10. '],['- [x] Done','- [x] Done\n- [ ] '],['```\n1. code','```\n1. code\n']]){await page.evaluate(text=>{setMode('write');editor.value=text;editor.focus();editor.setSelectionRange(text.length,text.length);},input);await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>editor.value),expected);checks++;}
 for(const literal of ['3.14 value','\\1. literal','**literal**']){await fresh();await page.keyboard.type(literal);await page.keyboard.press('Enter');assert.equal(await page.locator('#rich-editor li').count(),0);checks++;}
 // Pasted prefixes follow the same route as typed prefixes.
 await fresh();await page.evaluate(()=>{const data=new DataTransfer();data.setData('text/plain','1. Alpha Beta');rich.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});await caretBefore('Beta');await page.keyboard.press('Enter');await items(['Alpha ','Beta']);
 // Source Enter directly after a marker still numbers the moved text.
 await page.evaluate(()=>{setMode('write');editor.value='1. Alpha';editor.focus();editor.setSelectionRange(3,3);});await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>editor.value),'1. \n2. Alpha');checks++;
 // Nested empty items must move out one level, never create a paragraph inside OL.
 await fresh('1. Parent\n    1. Child');await caretBefore('Child');await page.keyboard.press('End');await page.keyboard.press('Enter');await page.keyboard.press('Enter');
 assert.equal(await page.locator('#rich-editor ol > p,#rich-editor ul > p').count(),0);assert.equal(await page.locator('#rich-editor > ol > li').count(),2);checks++;
 await fresh('1. Persisted first\n2. Persisted second');if(native)await page.evaluate(()=>{persist();return flushLibrary();});else await page.evaluate(()=>persist());await page.reload();await page.waitForFunction(()=>typeof rich!=='undefined'&&rich.textContent.includes('Persisted'));await caretBefore('second');await page.keyboard.press('Enter');assert.equal(await page.locator('#rich-editor li').count(),3);checks++;
 assert.deepEqual(errors,[]);console.log(`PASS ${checks} list interaction checks in ${native?'Electron':'Edge'} (split, caret, creation paths, styles, undo/redo, soft breaks, source, reload).`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(host)await host.close();});

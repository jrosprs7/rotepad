const {chromium,_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const native=process.argv.includes('--desktop');let host,page,profile;
async function fresh(text='',view='rich',auto=false){await page.evaluate(({text,view,auto})=>{prefs.autoMarkdown=auto;createNote('Dash regression',text);setMode(view);(view==='rich'?rich:editor).focus();},{text,view,auto});}
async function value(view){return page.evaluate(view=>view==='rich'?rich.textContent:editor.value,view);}
async function end(view){if(view==='rich')await page.keyboard.press('Control+End');else await page.evaluate(()=>editor.setSelectionRange(editor.value.length,editor.value.length));}
(async()=>{
 if(native){profile=path.join(__dirname,'test-profile','dashes-'+Date.now());await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}),{flag:'wx'});host=await _electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await host.firstWindow();await page.waitForFunction(()=>typeof flushLibrary==='function');}
 else{host=await chromium.launch({channel:'msedge',headless:true});page=await host.newPage();await page.goto(pathToFileURL(path.resolve(__dirname,'../Rotepad.html')).href);}
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const view of ['rich','write','split'])for(const auto of [false,true]){
  await fresh('',view,auto);await page.keyboard.type('--');assert.equal(await value(view),'--');await page.keyboard.type('-');assert.equal(await value(view),'---');await page.keyboard.type('-----');assert.equal(await value(view),'--------');
  await page.evaluate(()=>{setMode('write');setMode('rich');});assert.equal(await page.locator('#rich-editor hr').count(),0);assert.equal(await page.locator('#rich-editor').textContent(),'--------');
  await fresh('',view,auto);await page.keyboard.type('--');await page.keyboard.press('Backspace');assert.equal(await value(view),'-');await page.keyboard.type('--');assert.equal(await value(view),'---');
  await fresh('Before after',view,auto);await page.evaluate(view=>{if(view==='rich')placeCaret(7);else editor.setSelectionRange(7,7);},view);await page.keyboard.type('--');assert.equal(await value(view),'Before --after');await page.keyboard.type('-');assert.equal(await value(view),'Before ---after');
  await fresh('',view,auto);await page.keyboard.type('--');await page.keyboard.type(' text');await page.keyboard.press('Backspace');assert.equal(await value(view),'-- tex');
  await fresh('',view,auto);await page.keyboard.type('--');await page.keyboard.press('Control+z');assert.equal(await value(view),'');await page.keyboard.press('Control+y');assert.equal(await value(view),'--');
  await fresh('—',view,auto);await end(view);await page.keyboard.press('Backspace');assert.equal(await value(view),'');
 }
 for(const text of ['---','----','----------------','before --- after']){await fresh(text);assert.equal(await page.locator('#rich-editor hr').count(),0);assert.equal(await value('rich'),text);await page.evaluate(()=>{commitRich();loadRich();});assert.equal(await value('rich'),text);}
 // Bulk paste is literal, as are code and Markdown table delimiters.
 for(const text of ['--','---']){await fresh();await page.evaluate(text=>{const data=new DataTransfer();data.setData('text/plain',text);rich.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},text);assert.equal(await value('rich'),text);}
 await fresh('Prefix ');await end('rich');await page.evaluate(()=>{const data=new DataTransfer();data.setData('text/plain','--\n---');rich.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});assert.equal(await page.evaluate(()=>editor.value),'Prefix --\n---');
 await fresh('```\ncode\n```');await end('rich');await page.keyboard.type('--');assert.equal(await page.locator('#rich-editor code').textContent(),'code--');
 await fresh('```\ncode','write');await end('write');await page.keyboard.type('--');assert.equal(await value('write'),'```\ncode--');
 await fresh('`code` normal ','write');await end('write');await page.keyboard.type('--');assert.equal(await value('write'),'`code` normal --');
 await fresh('**bold-**');await end('rich');await page.keyboard.type('-');assert.equal(await page.locator('#rich-editor strong').textContent(),'bold--');await page.keyboard.press('Backspace');assert.equal(await page.locator('#rich-editor strong').textContent(),'bold-');
 await fresh();await page.keyboard.type('-');await page.evaluate(()=>rich.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:'-',isComposing:true,bubbles:true,cancelable:true})));assert.equal(await value('rich'),'-');
 await fresh('Selected');await page.keyboard.press('Control+a');await page.keyboard.type('-');assert.equal(await value('rich'),'-');
 await fresh('| A |\n| ','write');await end('write');await page.keyboard.type('--- |');assert.equal(await value('write'),'| A |\n| --- |');await page.evaluate(()=>setMode('rich'));assert.equal(await page.locator('#rich-editor table').count(),1);
 // Explicit divider insertion remains available and survives serialization.
 for(const view of ['rich','write']){await fresh('',view);await page.evaluate(()=>extraFormat('divider'));await page.evaluate(()=>{setMode('write');setMode('rich');});assert.equal(await page.locator('#rich-editor hr').count(),1);}
 // A line break must prevent separate hyphens from pairing across lines.
 await fresh();await page.keyboard.type('-');await page.keyboard.press('Shift+Enter');await page.keyboard.type('-');assert.equal(await page.locator('#rich-editor').textContent(),'-\n-');assert.ok(!(await value('rich')).includes('—'));
 await fresh();await page.keyboard.type('Before -- after');await page.keyboard.press('Enter');await page.keyboard.type('---');const saved=await page.evaluate(()=>{persist();return {id:activeId,text:editor.value,visible:rich.textContent};});
 if(native){await page.evaluate(()=>flushLibrary());const index=JSON.parse(await fs.readFile(path.join(profile,'managed-notes.json'),'utf8'));assert.equal(await fs.readFile(index[saved.id].file,'utf8'),saved.text);}await page.reload();assert.equal(await value('rich'),saved.visible);assert.equal(await page.locator('#rich-editor hr').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS dash checks in '+(native?'Electron':'Edge')+': literal --/---/long runs, ordinary Backspace, middle insertion, normal deletion, Undo/Redo, literal paste/import/code, tables, explicit dividers and reload.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(host)await host.close();});

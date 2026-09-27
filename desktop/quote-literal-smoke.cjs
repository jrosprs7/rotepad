const {chromium,_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const native=process.argv.includes('--desktop');let host,page,profile;
async function fresh(text='',auto=false){await page.evaluate(({text,auto})=>{prefs.autoMarkdown=auto;createNote('Literal quote regression',text);setMode('rich');rich.focus();},{text,auto});}
async function plain(text){assert.equal(await page.locator('#rich-editor').textContent(),text);assert.equal(await page.locator('#rich-editor blockquote').count(),0);}
async function roundtrip(){await page.evaluate(()=>{commitRich();setMode('write');setMode('preview');setMode('rich');});}
(async()=>{
 if(native){profile=path.join(__dirname,'test-profile','quote-literal-'+Date.now());await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}),{flag:'wx'});host=await _electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await host.firstWindow();await page.waitForFunction(()=>typeof flushLibrary==='function');}
 else{host=await chromium.launch({channel:'msedge',headless:true});page=await host.newPage();await page.goto(pathToFileURL(path.resolve(__dirname,'../Rotepad.html')).href);}
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Exact report, including view/reload conversion with auto-Markdown off or on.
 for(const auto of [false,true]){
  await fresh('',auto);await page.keyboard.type('> text');await plain('> text');await roundtrip();await plain('> text');
  await page.evaluate(()=>persist());if(native)await page.evaluate(()=>flushLibrary());await page.reload();await plain('> text');
  for(const text of ['>','> ', '>> text','1 > 0','> [text]']){
   await fresh('',auto);await page.keyboard.type(text);await plain(text);await roundtrip();await plain(text);
  }
  await fresh('',auto);await page.keyboard.type('First');await page.keyboard.press('Enter');await page.keyboard.type('> second');await page.keyboard.press('Enter');await page.keyboard.type('after');
  assert.equal(await page.evaluate(()=>editor.value),'First\n\\> second\nafter');await roundtrip();assert.equal(await page.locator('#rich-editor blockquote').count(),0);
  await fresh('',auto);await page.keyboard.type('> ');await page.keyboard.press('Backspace');await plain('>');await page.keyboard.type(' text');await plain('> text');
  await fresh('',auto);await page.keyboard.type('> text');await page.keyboard.press('Control+z');await plain('');await page.keyboard.press('Control+y');await plain('> text');
  await fresh('',auto);await page.evaluate(()=>{const data=new DataTransfer();data.setData('text/plain','> pasted');rich.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});await plain('> pasted');await roundtrip();await plain('> pasted');
 }
 // Explicit quotes remain supported, including a literal > inside their text.
 await fresh();await page.keyboard.type('> literal inside quote');await page.keyboard.press('Control+a');await page.locator('[data-format="quote"]').click();
 assert.equal(await page.locator('#rich-editor blockquote').textContent(),'> literal inside quote');await roundtrip();assert.equal(await page.locator('#rich-editor blockquote').textContent(),'> literal inside quote');
 await fresh('> Existing quote');assert.equal(await page.locator('#rich-editor blockquote').textContent(),'Existing quote');await roundtrip();assert.equal(await page.locator('#rich-editor blockquote').textContent(),'Existing quote');
 await fresh();await page.locator('[data-format="quote"]').click();assert.equal(await page.locator('#rich-editor blockquote').count(),1);await page.keyboard.press('Enter');assert.equal(await page.locator('#rich-editor blockquote').count(),0);
 await fresh();await page.evaluate(()=>{setMode('write');editor.focus();});await page.keyboard.type('> Source quote');await page.evaluate(()=>setMode('rich'));assert.equal(await page.locator('#rich-editor blockquote').textContent(),'Source quote');
 // Escapes must preserve styles, links, code and intentional quotes on serialization.
 await fresh('**bold > text** and *italic > text*');await roundtrip();assert.equal(await page.locator('#rich-editor strong').textContent(),'bold > text');assert.equal(await page.locator('#rich-editor em').textContent(),'italic > text');
 await fresh('[a > b](https://example.com/?a=b)');await roundtrip();assert.equal(await page.locator('#rich-editor a').textContent(),'a > b');assert.equal(await page.locator('#rich-editor a').getAttribute('href'),'https://example.com/?a=b');
 await fresh('```\n> code\n```');await roundtrip();assert.equal(await page.locator('#rich-editor code').textContent(),'> code');assert.equal(await page.locator('#rich-editor blockquote').count(),0);
 await fresh();await page.keyboard.type('> saved literal');const saved=await page.evaluate(()=>{persist();return {id:activeId,text:editor.value};});
 assert.equal(saved.text,'\\> saved literal');if(native){await page.evaluate(()=>flushLibrary());const index=JSON.parse(await fs.readFile(path.join(profile,'managed-notes.json'),'utf8'));assert.equal(await fs.readFile(index[saved.id].file,'utf8'),saved.text);}
 await page.reload();await plain('> saved literal');assert.deepEqual(errors,[]);
 console.log('PASS literal > typing/paste, both Markdown-conversion settings, boundaries, Enter/Backspace, Undo/Redo, views/reload, manual/source/existing quotes, quote exit, styles, links and code in '+(native?'Electron':'Edge')+'.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(host)await host.close();});

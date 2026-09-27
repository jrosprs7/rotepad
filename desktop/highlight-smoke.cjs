const {chromium,_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const native=process.argv.includes('--desktop');let host,page,profile;
async function launch(){if(native){host=await _electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await host.firstWindow();await page.waitForFunction(()=>typeof flushLibrary==='function');}else{host=await chromium.launch({channel:'msedge',headless:true});page=await host.newPage();await page.goto(pathToFileURL(path.resolve(__dirname,'../Rotepad.html')).href);}}
async function fresh(text='',auto=false){await page.evaluate(({text,auto})=>{prefs.autoMarkdown=auto;createNote('Highlight regression',text);setMode('rich');rich.focus();},{text,auto});}
async function plain(value){assert.equal(await page.locator('#rich-editor').textContent(),value);assert.equal(await page.locator('#rich-editor mark').count(),0);}
async function roundtrip(){await page.evaluate(()=>{commitRich();setMode('write');setMode('rich');});}
(async()=>{
 if(native){profile=path.join(__dirname,'test-profile','highlight-'+Date.now());await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}),{flag:'wx'});}
 await launch();let errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Exact regression: a typed divider must keep every equals sign after reopening.
 await fresh();await page.keyboard.type('======');await plain('======');await page.evaluate(()=>persist());if(native)await page.evaluate(()=>flushLibrary());await page.reload();await plain('======');
 for(const auto of [false,true])for(const input of ['=','==','===','=====','======','========','='.repeat(32),'before ====== after','== =='])for(const route of ['typed','paste','parsed']){
  await fresh(route==='parsed'?input:'',auto);
  if(route==='typed')await page.keyboard.type(input);
  if(route==='paste')await page.evaluate(input=>{const data=new DataTransfer();data.setData('text/plain',input);rich.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},input);
  await plain(input);await roundtrip();await plain(input);
 }
 // Optional conversion off must remain literal after serialization and reopening.
 await fresh();await page.keyboard.type('==literal==');await plain('==literal==');await roundtrip();await plain('==literal==');
 // Explicit source highlights and opt-in typing still work, including an inner equals sign.
 for(const auto of [false,true]){await fresh('==important== and ==a=b==',auto);assert.deepEqual(await page.locator('#rich-editor mark').allTextContents(),['important','a=b']);await roundtrip();assert.deepEqual(await page.locator('#rich-editor mark').allTextContents(),['important','a=b']);}
 await fresh('',true);await page.keyboard.type('==important==');assert.equal(await page.locator('#rich-editor mark').textContent(),'important');await page.keyboard.press('Backspace');await plain('==important==');await roundtrip();await plain('==important==');
 // Highlighting a divider deliberately via the toolbar must not be lost.
 await fresh();await page.keyboard.type('======');await page.keyboard.press('Control+a');await page.evaluate(()=>{rememberRange();extraFormat('highlight');});assert.equal(await page.locator('#rich-editor mark').textContent(),'======');await page.keyboard.press('Control+z');await plain('======');await page.keyboard.press('Control+y');assert.equal(await page.locator('#rich-editor mark').textContent(),'======');await roundtrip();assert.equal(await page.locator('#rich-editor mark').textContent(),'======');
 await fresh('`======` and `==literal==`');assert.equal(await page.locator('#rich-editor mark').count(),0);assert.deepEqual(await page.locator('#rich-editor code').allTextContents(),['======','==literal==']);
 await fresh('\\=\\=literal\\=\\=');await plain('==literal==');await roundtrip();await plain('==literal==');
 // Legacy file content stays unchanged until edited, then retains visible meaning.
 await fresh('[a=b](https://example.com/?a=b)');await roundtrip();assert.equal(await page.locator('#rich-editor a').textContent(),'a=b');assert.equal(await page.locator('#rich-editor a').getAttribute('href'),'https://example.com/?a=b');
 const legacy='Heading\n\n======\n\n==important==\n\n**bold** and __underlined__ plain';await fresh(legacy);assert.deepEqual(await page.locator('#rich-editor mark').allTextContents(),['important']);await page.keyboard.press('Control+End');await page.keyboard.type(' tail');const persisted=await page.evaluate(()=>{persist();return {id:activeId,text:editor.value,visible:rich.textContent};});
 if(native){await page.evaluate(()=>flushLibrary());const index=JSON.parse(await fs.readFile(path.join(profile,'managed-notes.json'),'utf8'));assert.equal(await fs.readFile(index[persisted.id].file,'utf8'),persisted.text);await host.close();await launch();page.on('pageerror',e=>errors.push(e.message));}else await page.reload();
 assert.equal(await page.locator('#rich-editor').textContent(),persisted.visible);assert.deepEqual(await page.locator('#rich-editor mark').allTextContents(),['important']);assert.equal(await page.locator('#rich-editor strong').textContent(),'bold');assert.equal(await page.locator('#rich-editor u').textContent(),'underlined');assert.deepEqual(errors,[]);
 console.log('PASS highlight/divider checks in '+(native?'Electron (managed file and restart)':'Edge (reload)')+': equals counts, typing/paste/import, conversion off/on, views, literal syntax, explicit highlighting, Backspace reversal and neighboring styles.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(host)await host.close();});

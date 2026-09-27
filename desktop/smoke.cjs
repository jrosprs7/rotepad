// Development smoke test with a separate disposable profile and mocked pickers.
const { _electron: electron } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs/promises'), path=require('node:path'), assert=require('node:assert/strict');
const profile=path.join(__dirname,'test-profile','run-'+Date.now());
const file=path.join(profile,'test-note.md');
async function launch(files=[]){return electron.launch({executablePath:require('electron'),args:[__dirname,...files],env:{...process.env,ROTEPAD_TEST_DATA:profile}});}
// Test restarts intentionally retain drafts; library-smoke.cjs covers quiet user exit and recovery.
async function stop(instance){const child=instance.process();await instance.evaluate(({app})=>app.exit(0)).catch(()=>{});if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));}
(async()=>{
 await fs.mkdir(profile,{recursive:true});
 let app=await launch();
 try {
  let page=await app.firstWindow();await page.waitForFunction(()=>typeof window.rotDesktop==='object'&&typeof saveToFile==='function');
  const setting=await page.evaluate(()=>window.rotDesktop.settings());assert.ok(setting.saveFolder);
  const chosen=path.join(profile,'chosen-folder');await fs.mkdir(chosen,{recursive:true});
  await app.evaluate(({dialog},chosen)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[chosen]});},chosen);
  assert.equal((await page.evaluate(()=>window.rotDesktop.chooseFolder())).saveFolder,chosen);
  await app.evaluate(({dialog},file)=>{global.saveCalls=0;dialog.showSaveDialog=async(_win,options)=>{global.saveCalls++;global.lastSaveDefault=options.defaultPath;return {canceled:false,filePath:file}};},file);
  const id=await page.evaluate(async()=>{createNote('test-note.md','First saved text');await saveToFile();return activeId;});
  assert.equal(await fs.readFile(file,'utf8'),'First saved text');
  assert.equal(await app.evaluate(()=>global.lastSaveDefault),path.join(chosen,'test-note.md'));
  await page.evaluate(async()=>{editor.value='Second saved text';await saveToFile();});
  assert.equal(await fs.readFile(file,'utf8'),'Second saved text');
  assert.equal(await app.evaluate(()=>global.saveCalls),2);
  await stop(app);app=await launch();page=await app.firstWindow();
  await page.waitForFunction(()=>typeof window.rotDesktop==='object'&&typeof activateNote==='function'&&typeof saveToFile==='function');
  assert.equal((await page.evaluate(()=>window.rotDesktop.settings())).saveFolder,chosen);
  await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},file);
  await page.evaluate(async id=>{activateNote(id);editor.value='Saved after restart';await saveToFile();},id);
  assert.equal(await fs.readFile(file,'utf8'),'Saved after restart');
  await app.evaluate(({dialog})=>{dialog.showSaveDialog=async()=>({canceled:true});});
  await page.evaluate(()=>saveToFile(true));
  assert.equal(await fs.readFile(file,'utf8'),'Saved after restart');
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
  await page.evaluate(()=>$('open').onclick());
  assert.equal(await page.evaluate(()=>editor.value),'Saved after restart');
  const faces=await page.evaluate(async()=>{await document.fonts.ready;return (await document.fonts.load('italic 700 16px "Iosevka SS03 Extended"')).length;});assert.equal(faces,1);
  const external=path.join(profile,'external note.md');await fs.writeFile(external,'Opened from Explorer');
  const openedWindow=app.waitForEvent('window');
  await app.evaluate(({app},file)=>app.emit('second-instance',{},[process.execPath,app.getAppPath(),file]),external);
  const externalPage=await openedWindow;await externalPage.waitForFunction(()=>typeof editor!=='undefined'&&editor.value==='Opened from Explorer');
  assert.notEqual(await page.evaluate(()=>editor.value),'Opened from Explorer');
  await page.evaluate(()=>{prefs.autoMarkdown=true;createNote('Formatting test.md','');setMode('rich');rich.focus();});
  await page.keyboard.type('*hello*');assert.equal(await page.locator('#rich-editor em').count(),1);
  await page.keyboard.press('Backspace');assert.equal(await page.locator('#rich-editor em').count(),0);assert.equal(await page.locator('#rich-editor').innerText(),'*hello*');
  await page.keyboard.type(' next');assert.equal(await page.locator('#rich-editor em').count(),0);
  await page.evaluate(()=>loadRich());assert.equal(await page.locator('#rich-editor em').count(),0);
  await page.evaluate(()=>{createNote('Bold test.md','');setMode('rich');rich.focus();});
  await page.keyboard.type('**bold**');assert.equal(await page.locator('#rich-editor strong').count(),1);
  await page.keyboard.press('Backspace');assert.equal(await page.locator('#rich-editor').innerText(),'**bold**');
  await page.evaluate(()=>{prefs.spellcheck=false;applyPrefs();});assert.equal(await page.evaluate(()=>rich.spellcheck),false);
  await stop(app);app=await launch([external]);page=await app.firstWindow();await page.waitForFunction(()=>typeof editor!=='undefined'&&editor.value==='Opened from Explorer');
  console.log('Desktop smoke passed: save folder and restart persistence, Markdown export, canceled export, Open, Explorer handoff, Backspace autoformat reversal, and embedded font.');
 } finally {await stop(app);}
})().catch(error=>{console.error(error);process.exitCode=1;});




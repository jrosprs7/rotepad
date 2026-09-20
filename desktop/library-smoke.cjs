const {_electron:electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const profile=path.join(__dirname,'test-profile','library-'+Date.now()),disk=path.join(profile,'library.json');
let app,page;
async function launch(){app=await electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await app.firstWindow();page.on('pageerror',error=>console.error('PAGE:',error));await page.waitForFunction(()=>typeof flushLibrary==='function');await page.evaluate(()=>flushLibrary());await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>{throw Error('Unexpected prompt');};dialog.showSaveDialog=async()=>{throw Error('Unexpected picker');};});}
async function close(){const child=app.process(),ended=app.waitForEvent('close');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());await ended;if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));}
async function stop(){if(!app)return;const child=app.process();await app.evaluate(({app})=>app.exit(0)).catch(()=>{});if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));}
(async()=>{
 await fs.mkdir(profile,{recursive:true});
 await launch();
 // Migrate a 0.4.x localStorage-only library without discarding history.
 await page.evaluate(()=>{activeNote().revisions=[{text:'Earlier version',name:'Untitled.md',at:Date.now()-300000}];persist();});await page.evaluate(()=>flushLibrary());
 await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem(libraryKey));delete data.desktopSavedAt;localStorage.setItem(libraryKey,JSON.stringify(data));});await stop();await fs.unlink(disk);await launch();
 assert.equal(await page.evaluate(()=>activeNote().revisions[0].text),'Earlier version');
 const initial=await page.evaluate(()=>activeId);
 const id=await page.evaluate(()=>{createNote('My note.md','first');return activeId;});
 await page.locator('#rich-editor').click();await page.keyboard.press('Control+End');await page.keyboard.type(' typed');
 await page.waitForFunction(()=>$('save-status').textContent==='Saved in Rotepad');
 assert.equal(JSON.parse(await fs.readFile(disk,'utf8')).notes.find(n=>n.id===id).text,'first typed');
 await page.keyboard.type(' immediately before exit');await close();
 await launch();assert.equal(await page.evaluate(()=>editor.value),'first typed immediately before exit');
 assert.equal(await page.evaluate(()=>activeId),id);
 await page.evaluate(()=>{setMode('write');editor.focus();editor.setSelectionRange(4,4);capturePosition();persist();});await close();await launch();
 assert.equal(await page.evaluate(()=>mode),'write');assert.equal(await page.evaluate(()=>editor.selectionStart),4);
 // Close one note: retain it in Library and hide from Open.
 await page.evaluate(id=>closeLibraryNote(id),id);assert.equal(await page.evaluate(id=>notes.find(n=>n.id===id).closed,id),true);
 assert.equal(await page.evaluate(id=>notes.find(n=>n.id===id).trashed,id),undefined);
 await page.evaluate(id=>closeLibraryNote(id),initial);assert.equal(await page.locator('#empty-workspace').isVisible(),true);
 await close();await launch();assert.equal(await page.locator('#empty-workspace').isVisible(),true);
 await page.locator('#show-notes').click();await page.locator('[data-note-id="'+id+'"] .note-row').click();assert.equal(await page.locator('#empty-workspace').isVisible(),false);
 assert.equal(await page.evaluate(()=>editor.value),'first typed immediately before exit');
 // Delete and restore remain separate from closing.
 await page.evaluate(id=>{manageNote(id);$('note-trash').click();},id);assert.equal(await page.evaluate(id=>Boolean(notes.find(n=>n.id===id).trashed),id),true);
 await page.evaluate(id=>{manageNote(id);$('note-restore').click();},id);assert.equal(await page.evaluate(id=>Boolean(notes.find(n=>n.id===id).trashed),id),false);
 // Disk library can restore after the browser cache is cleared.
 await page.evaluate(()=>flushLibrary());await page.evaluate(()=>localStorage.clear());await stop();await launch();assert.ok(await page.evaluate(id=>notes.some(n=>n.id===id&&n.text.includes('immediately')),id));
 // Simulate disk failure. No exit; retain text and allow a retry.
 await page.evaluate(id=>{activateNote(id);editor.value='Keep on write failure';persist();},id);
 await page.evaluate(()=>flushLibrary());await fs.rename(disk,disk+'.held');await fs.mkdir(disk);
 await page.evaluate(()=>{window.alert=message=>{window.testAlert=message;};editor.value='Failing edit';persist();});
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());
 await page.waitForFunction(()=>window.testAlert?.includes('stay open'));assert.equal(page.isClosed(),false);assert.equal(await page.evaluate(()=>editor.value),'Failing edit');
 await fs.rmdir(disk);await fs.rename(disk+'.held',disk);await page.evaluate(()=>save());await close();
 assert.equal(JSON.parse(await fs.readFile(disk,'utf8')).notes.find(n=>n.id===id).text,'Failing edit');
 console.log('PASS: automatic disk saving, immediate quiet exit, restored workspace, close/reopen note, empty workspace restart, Trash/restore, cache-independent recovery, failed-save blocking and retry.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>stop().catch(()=>{}));

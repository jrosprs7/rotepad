const {_electron:electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const profile=path.join(__dirname,'test-profile','md-files-'+Date.now());
let app,page;
async function launch(){app=await electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await app.firstWindow();await page.waitForFunction(()=>typeof flushLibrary==='function');await page.evaluate(()=>flushLibrary());}
async function close(){const process=app.process(),closed=app.waitForEvent('close');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());await closed;if(process.exitCode===null)await new Promise(resolve=>process.once('exit',resolve));}
async function records(){return JSON.parse(await fs.readFile(path.join(profile,'managed-notes.json'),'utf8'));}
(async()=>{
 await fs.mkdir(profile,{recursive:true});
 // Explicitly pin every test write inside this disposable profile, independent
 // of the application's Documents default or any real user settings.
 const testNotes=path.join(profile,'notes');
 await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:testNotes}),{flag:'wx'});
 await fs.writeFile(path.join(profile,'library.json'),JSON.stringify({version:2,activeId:'legacy-note',notes:[{id:'legacy-note',name:'Legacy',text:'Existing library note',revisions:[{text:'Earlier text',name:'Legacy',at:1}]}],prefs:{}}));
 await launch();const folder=(await page.evaluate(()=>rotDesktop.settings())).saveFolder;
 assert.equal(folder,testNotes,'Test save folder must be the explicit disposable folder');
 assert.equal(await fs.readFile(path.join(folder,'Legacy.md'),'utf8'),'Existing library note');
 assert.equal(JSON.parse(await fs.readFile(path.join(profile,'library-before-markdown.json'),'utf8')).notes[0].revisions[0].text,'Earlier text');
 assert.ok(folder.startsWith(profile),'Tests must never write to the real Documents folder');
 await fs.mkdir(folder,{recursive:true});await fs.writeFile(path.join(folder,'Shopping.md'),'Existing unrelated file');
 const id=await page.evaluate(async()=>{createNote('Shopping','Milk');await flushLibrary();return activeId;});
 let index=await records();assert.equal(path.basename(index[id].file),'Shopping (2).md');assert.equal(await fs.readFile(index[id].file,'utf8'),'Milk');
 assert.equal(await fs.readFile(path.join(folder,'Shopping.md'),'utf8'),'Existing unrelated file');
 const second=await page.evaluate(async()=>{createNote('Shopping','Bread');await flushLibrary();return activeId;});index=await records();assert.equal(path.basename(index[second].file),'Shopping (3).md');
 const old=index[id].file;
 await page.evaluate(async id=>{activateNote(id);filename.value='Groceries';editor.value='Milk and eggs';persist();await flushLibrary();},id);
 index=await records();assert.equal(path.basename(index[id].file),'Groceries.md');assert.equal(await fs.readFile(index[id].file,'utf8'),'Milk and eggs');await assert.rejects(fs.access(old));
 // Opening a managed file must reuse its note, not create a duplicate.
 const before=await page.evaluate(()=>notes.length);await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},index[id].file);await page.evaluate(()=>$('open').onclick());assert.equal(await page.evaluate(()=>notes.length),before);
 await page.evaluate(async()=>{manageNote(activeId);$('note-trash').click();await flushLibrary();});index=await records();assert.equal(path.basename(path.dirname(index[id].file)),'.Trash');assert.equal(await fs.readFile(index[id].file,'utf8'),'Milk and eggs');
 await page.evaluate(async id=>{manageNote(id);$('note-restore').click();await flushLibrary();},id);index=await records();assert.equal(path.dirname(index[id].file),folder);
 await page.evaluate(async()=>{createNote('CON','Reserved filename');await flushLibrary();});index=await records();assert.ok(Object.values(index).some(r=>path.basename(r.file)==='_CON.md'));
 await page.evaluate(()=>flushLibrary());
 await page.evaluate(id=>{const cached=JSON.parse(localStorage.getItem(libraryKey));cached.notes.find(n=>n.id===id).text='Unsaved cache conflict';cached.desktopSavedAt+=1000;localStorage.setItem(libraryKey,JSON.stringify(cached));},id);
 const child=app.process();await app.evaluate(({app})=>app.exit(0)).catch(()=>{});if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));
 index=await records();await fs.writeFile(index[id].file,'Content read from Markdown');await launch();assert.equal(await page.evaluate(id=>notes.find(n=>n.id===id).text,id),'Content read from Markdown');
 assert.ok(await page.evaluate(()=>notes.some(n=>n.name.endsWith('(recovered draft)')&&n.text==='Unsaved cache conflict')));
 // Recover a missing managed file from the separate recovery copy.
 await close();index=await records();await fs.unlink(index[id].file);await launch();assert.equal(await fs.readFile(index[id].file,'utf8'),'Content read from Markdown');
 // Changing the default only affects new notes.
 const chosen=path.join(profile,'new-notes-folder');await fs.mkdir(chosen);await app.evaluate(({dialog},chosen)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[chosen]});},chosen);await page.evaluate(()=>rotDesktop.chooseFolder());const third=await page.evaluate(async()=>{createNote('New place','Here');await flushLibrary();return activeId;});index=await records();assert.equal(path.dirname(index[third].file),chosen);assert.equal(path.dirname(index[id].file),folder);
 // Permission/write error simulation: replace a managed destination with a directory.
 const target=index[third].file;await fs.rename(target,target+'.held');await fs.mkdir(target);
 await page.evaluate(()=>{window.alert=message=>window.lastSaveAlert=message;editor.value='Preserve failed write';persist();});await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());await page.waitForFunction(()=>window.lastSaveAlert?.includes('stay open'));assert.equal(await page.evaluate(()=>editor.value),'Preserve failed write');
 await fs.rmdir(target);await fs.rename(target+'.held',target);await page.evaluate(()=>save());await close();assert.equal(await fs.readFile(target,'utf8'),'Preserve failed write');
 console.log('PASS: real Markdown autosave, no overwrite/collisions, rename, managed-file reopen, Trash/restore, safe filenames, file hydration, missing-file recovery, folder changes, failed write/quiet-exit retry.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(app)await app.evaluate(({app})=>app.exit(0)).catch(()=>{});});

const {_electron:electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const profile=path.join(__dirname,'test-profile','windows-'+Date.now()),disk=path.join(profile,'library.json');
let app,first,second;const errors=[];
async function ready(page){await page.waitForFunction(()=>typeof openNewWindow==='function');page.on('pageerror',e=>errors.push(e.message));await page.evaluate(()=>flushLibrary());}
async function launch(){app=await electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});first=await app.firstWindow();await ready(first);}
async function newWindow(page){const opened=app.waitForEvent('window');await page.locator('#compact-app-menu>summary').click();await page.locator('#file-menu>summary').click();await page.locator('#new-window').click();const next=await opened;await ready(next);return next;}
async function edit(page,id,text){await page.evaluate(({id,text})=>{activateNote(id);editor.value=text;loadRich();persist();clearTimeout(libraryTimer);},{id,text});}
async function settle(...pages){for(const page of pages)await page.evaluate(()=>flushLibrary());await Promise.all(pages.map(page=>page.waitForFunction(()=>!remoteLibrary&&!libraryWriting)));}
async function holdUpdates(){await app.evaluate(({BrowserWindow})=>{global.heldUpdates=[];for(const win of BrowserWindow.getAllWindows()){const wc=win.webContents;wc.originalSend=wc.send.bind(wc);wc.send=(channel,...args)=>channel==='library-changed'?global.heldUpdates.push([wc,channel,args]):wc.originalSend(channel,...args);}});}
async function releaseUpdates(){await app.evaluate(({BrowserWindow})=>{for(const win of BrowserWindow.getAllWindows()){const wc=win.webContents;wc.send=wc.originalSend;}for(const [wc,channel,args] of global.heldUpdates)if(!wc.isDestroyed())wc.send(channel,...args);});await settle(first,second);}
async function stop(){if(!app)return;const child=app.process();await app.evaluate(({app})=>app.exit(0)).catch(()=>{});if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));}
(async()=>{
 await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}));await launch();
 const ids=await first.evaluate(async()=>{createNote('Alpha','A');const a=activeId;createNote('Bravo','B');const b=activeId;activateNote(a);await flushLibrary();return {a,b};});
 // Actual keyboard entry point, then a third window through a repeated launch event.
 const opened=app.waitForEvent('window');await first.keyboard.press('Control+Shift+N');second=await opened;await ready(second);
 assert.equal((await app.windows()).length,2);assert.notEqual(await first.evaluate(()=>libraryKey),await second.evaluate(()=>libraryKey));assert.equal(await first.evaluate(()=>activeId),ids.a);
 await holdUpdates();await Promise.all([edit(first,ids.a,'A from first'),edit(second,ids.b,'B from second')]);await Promise.all([first.evaluate(()=>flushLibrary()),second.evaluate(()=>flushLibrary())]);await releaseUpdates();
 for(const page of [first,second])assert.deepEqual(await page.evaluate(ids=>[notes.find(n=>n.id===ids.a).text,notes.find(n=>n.id===ids.b).text],ids),['A from first','B from second']);
 // Both windows save a changed version of the same note from the same baseline.
 await Promise.all([first.evaluate(id=>activateNote(id),ids.a),second.evaluate(id=>activateNote(id),ids.a)]);await settle(first,second);await holdUpdates();
 await Promise.all([edit(first,ids.a,'Left concurrent version'),edit(second,ids.a,'Right concurrent version')]);await first.evaluate(()=>flushLibrary());
 // A metadata write fails after the managed files have saved; retry must reuse the conflict file.
 await fs.rename(disk,disk+'.held');await fs.mkdir(disk);await assert.rejects(second.evaluate(()=>flushLibrary()));
 const failedIndex=Object.keys(JSON.parse(await fs.readFile(path.join(profile,'managed-notes.json'),'utf8'))).sort();
 await fs.rmdir(disk);await fs.rename(disk+'.held',disk);await second.evaluate(()=>flushLibrary());
 assert.deepEqual(Object.keys(JSON.parse(await fs.readFile(path.join(profile,'managed-notes.json'),'utf8'))).sort(),failedIndex);await releaseUpdates();
 let saved=JSON.parse(await fs.readFile(disk,'utf8'));assert.ok(saved.notes.some(n=>n.text==='Left concurrent version'));assert.ok(saved.notes.some(n=>n.text==='Right concurrent version'));assert.equal(saved.notes.filter(n=>n.name.endsWith('(conflict copy)')).length,1);
 // Closing a note in one workspace must not close it in the other.
 await Promise.all([first.evaluate(id=>activateNote(id),ids.b),second.evaluate(id=>activateNote(id),ids.b)]);await settle(first,second);await first.evaluate(id=>closeLibraryNote(id),ids.b);await settle(first,second);assert.equal(await second.evaluate(id=>notes.find(n=>n.id===id).closed,ids.b),false);
 // Remote rename/Trash arrives without switching the other window's active note.
 await first.evaluate(async id=>{activateNote(id);filename.value='Renamed Alpha';persist();await flushLibrary();},ids.a);await second.waitForFunction(id=>notes.find(n=>n.id===id).name==='Renamed Alpha',ids.a);await settle(first,second);
 const activeBefore=await second.evaluate(()=>activeId);await first.evaluate(async id=>{manageNote(id);$('note-trash').click();await flushLibrary();},ids.a);await settle(first,second);assert.equal(await second.evaluate(id=>notes.find(n=>n.id===id).trashed,ids.a),true);assert.equal(await second.evaluate(()=>activeId),activeBefore);
 const eventWindow=app.waitForEvent('window'),env={...process.env,ROTEPAD_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
 const extra=require('node:child_process').spawn(require('electron'),[__dirname],{env,windowsHide:true,stdio:'ignore'}),extraExit=new Promise((resolve,reject)=>{extra.on('error',reject);extra.on('exit',resolve);});
 const third=await eventWindow;await ready(third);assert.equal(await extraExit,0);assert.equal((await app.windows()).length,3);
 // Remote changes to another note preserve the active source selection and Undo state.
 await second.evaluate(id=>{activateNote(id);setMode('write');editor.focus();editor.setSelectionRange(2,5);capturePosition();persist();},ids.b);await settle(first,second,third);
 const beforeSelection=await second.evaluate(()=>({id:activeId,start:editor.selectionStart,end:editor.selectionEnd,history:JSON.stringify(histories.get(activeId))}));
 await third.evaluate(async()=>{createNote('From third','Shared new note');await flushLibrary();});await second.waitForFunction(()=>notes.some(n=>n.name==='From third'));
 assert.deepEqual(await second.evaluate(()=>({id:activeId,start:editor.selectionStart,end:editor.selectionEnd,history:JSON.stringify(histories.get(activeId))})),beforeSelection);
 assert.equal(await second.evaluate(()=>notes.find(n=>n.name==='From third').closed),true);
 // File-open/bind tokens and PDF-preview tokens belong to their originating window.
 const imported=path.join(profile,'import.md');await fs.writeFile(imported,'Imported safely');await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},imported);
 const file=await first.evaluate(()=>rotDesktop.open());await assert.rejects(second.evaluate(file=>rotDesktop.bind({id:activeId,token:file.token}),file),/Invalid opened note/);await first.evaluate(file=>rotDesktop.bind({id:activeId,token:file.token}),file);
 const token=await first.evaluate(async()=>{preparePrint();return (await rotDesktop.printPreview({pageSize:'A4',landscape:false})).token;});await assert.rejects(second.evaluate(token=>rotDesktop.printOutput({token,action:'pdf',name:'Wrong window'}),token),/fresh print preview/);
 // A second window's unflushed cache is recovered after process interruption.
 await settle(first,second,third);await second.evaluate(id=>{activateNote(id);editor.value='Recover second-window draft';persist();clearTimeout(libraryTimer);},ids.b);await stop();await launch();
 assert.ok(await first.evaluate(()=>notes.some(n=>n.text==='Recover second-window draft')));await first.evaluate(()=>flushLibrary());
 second=await newWindow(first);await edit(second,ids.b,'Saved on second-window close');const secondClosed=second.waitForEvent('close');const secondWindow=await app.browserWindow(second);await secondWindow.evaluate(win=>win.close());await secondClosed;
 assert.equal(first.isClosed(),false);await settle(first);saved=JSON.parse(await fs.readFile(disk,'utf8'));assert.ok(saved.notes.some(n=>n.text==='Saved on second-window close'));
 const index=JSON.parse(await fs.readFile(path.join(profile,'managed-notes.json'),'utf8'));for(const note of saved.notes)if(index[note.id])assert.equal(await fs.readFile(index[note.id].file,'utf8'),note.text);
 assert.deepEqual(errors,[]);console.log('PASS multiple windows: keyboard/new launch, isolated workspace/cache, concurrent edits/conflict copies, rename/Trash, token isolation, crash recovery and independent close; managed files verified.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>stop());

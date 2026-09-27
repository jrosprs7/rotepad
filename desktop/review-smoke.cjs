// Exploratory audit of the packaged application payload; records observations.
const {_electron:electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path');
const profile=path.join(__dirname,'test-profile','review-'+Date.now());
const payload=path.resolve(__dirname,'../dist/win-unpacked/resources/app.asar');
let app,page;
async function launch(){app=await electron.launch({executablePath:require('electron'),args:[payload],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await app.firstWindow();await page.waitForFunction(()=>typeof flushLibrary==='function');await page.evaluate(()=>flushLibrary());}
async function close(){const child=app.process(),ended=app.waitForEvent('close');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());await ended;if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));}
async function log(label,fn){console.log(label+': '+JSON.stringify(await page.evaluate(fn)));}
(async()=>{
 await fs.mkdir(profile,{recursive:true});await launch();
 console.log('Payload '+await app.evaluate(({app})=>app.getVersion()));
 await page.evaluate(()=>{filename.value='Only note.md';editor.value='This note is closed, not open.';loadRich();persist();});
 await page.locator('.note-tab:has([aria-selected=true]) .note-tab-close').click();await page.waitForFunction(()=>activeNote().closed);
 await log('CLOSED workspace',()=>({empty:!$('empty-workspace').hidden,text:editor.value,printButtons:[...document.querySelectorAll('button')].filter(b=>/print/i.test(b.id)).map(b=>({id:b.id,disabled:b.disabled}))}));
 await page.evaluate(()=>{window.print=()=>{window.printCalled=true;};const button=[...document.querySelectorAll('button')].find(b=>/print/i.test(b.id));button?.click();});
 await log('PRINT with no open note',()=>({called:window.printCalled,text:$('print-document')?.textContent}));
 await page.evaluate(()=>{activateNote(activeId);manageNote(activeId);$('note-trash').click();});
 await log('ALL TRASH before restart',()=>({empty:!$('empty-workspace').hidden,notes:notes.map(n=>({id:n.id,name:n.name,trashed:n.trashed,closed:n.closed}))}));
 await page.evaluate(()=>{manageNote(activeId);$('note-restore').click();});
 await log('RESTORE last active note',()=>({empty:!$('empty-workspace').hidden,trashed:activeNote().trashed,closed:activeNote().closed}));
 await page.evaluate(()=>{manageNote(activeId);$('note-trash').click();});
 await close();await launch();
 await log('ALL TRASH after restart',()=>({empty:!$('empty-workspace').hidden,notes:notes.map(n=>({id:n.id,name:n.name,trashed:n.trashed,closed:n.closed}))}));
 await page.evaluate(()=>{prefs.sidebar=true;applyPrefs();setTrash(true);createNote('New while viewing Trash.md','New note text');});
 await log('CREATE while viewing Trash',()=>({filter:prefs.libraryFilter,active:activeNote().name,sidebar:$('notes-list').textContent}));
 // Corrupt-cache recovery should restore the durable library.
 await page.evaluate(()=>flushLibrary());await page.evaluate(()=>localStorage.setItem(libraryKey,'invalid JSON'));
 const child=app.process();await app.evaluate(({app})=>app.exit(0)).catch(()=>{});if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));await launch();
 await log('CORRUPT CACHE',()=>({bootstrapError:window.desktopLibraryBootstrapError,text:editor.value}));
 await close();console.log('Audit complete; user notes untouched.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(app)await app.evaluate(({app})=>app.exit(0)).catch(()=>{});});

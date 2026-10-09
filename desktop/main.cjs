const {app,BrowserWindow,ipcMain,dialog,shell,session,Menu,clipboard}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{randomUUID,createHash}=require('node:crypto');
const {MarkdownStore}=require('./markdown-store.cjs');
const {mergeDesktopLibrary}=require('./library-merge.cjs');
const windows=new Map(),busy=new Set();
let links=Object.create(null),linksPath,settingsPath,saveFolder,libraryPath,libraryData=null,markdownStore;
let libraryQueue=Promise.resolve(),linksQueue=Promise.resolve(),startupPaths=[];
// Files the user opened stay linked to their note: saves write back there (exports in `links` are separate copies).
let synced=Object.create(null),syncedPath,syncedQueue=Promise.resolve();const syncing=new Map();
const appURL=pathToFileURL(path.join(__dirname,'app','Rotepad.html')).href;
const requestedPaths=args=>args.filter(arg=>typeof arg==='string'&&!arg.startsWith('-')&&/\.(md|markdown|txt)$/i.test(arg)).map(file=>path.resolve(file));
startupPaths.push(...requestedPaths(process.argv.slice(app.isPackaged?1:2)));
app.setPath('userData',!app.isPackaged&&process.env.ROTEPAD_TEST_DATA?process.env.ROTEPAD_TEST_DATA:path.join(app.getPath('appData'),'Rotepad'));
const filters=[{name:'Markdown and text',extensions:['md','markdown','txt']}];
if(process.platform==='win32')app.setAppUserModelId('com.rotepad.editor');
function validateLibrary(text){const data=JSON.parse(text);if(data?.version!==2||!Array.isArray(data.notes)||!data.notes.every(n=>typeof n.id==='string'&&typeof n.name==='string'&&typeof n.text==='string')||new Set(data.notes.map(n=>n.id)).size!==data.notes.length)throw Error('Invalid note library');return data;}
function check(event){const state=windows.get(event.sender.id);if(!state||event.senderFrame!==state.win.webContents.mainFrame||event.senderFrame.url!==appURL)throw Error('Untrusted window');return state;}
async function atomicWrite(file,text){const temporary=path.join(path.dirname(file),'.'+path.basename(file)+'.'+randomUUID()+'.tmp');try{await fs.writeFile(temporary,text,{encoding:'utf8',flag:'wx'});await fs.rename(temporary,file);}finally{await fs.unlink(temporary).catch(()=>{});}}
function storeLinks(){const operation=linksQueue.catch(()=>{}).then(()=>atomicWrite(linksPath,JSON.stringify(links)));linksQueue=operation;return operation;}
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
function storeSynced(){const operation=syncedQueue.catch(()=>{}).then(()=>atomicWrite(syncedPath,JSON.stringify(synced)));syncedQueue=operation;return operation;}
// Only valid UTF-8 can be written back without corrupting the original; keep its BOM and line endings.
function fileFormat(file,buffer){let utf8=true;try{new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{utf8=false;}const bom=buffer[0]===0xef&&buffer[1]===0xbb&&buffer[2]===0xbf;return {file,kind:/\.txt$/i.test(file)?'txt':'md',utf8,bom,eol:buffer.includes('\r\n')?'\r\n':'\n',hash:digest(buffer)};}
async function openedFile(state,file){const buffer=await fs.readFile(file),text=buffer.toString('utf8'),token=randomUUID(),format=fileFormat(file,buffer);state.pending.set(token,format);const existingIds=new Set(Object.keys(links).filter(id=>links[id].toLowerCase()===file.toLowerCase()));for(const [id,record] of Object.entries(markdownStore?.records||{}))if(record.file.toLowerCase()===file.toLowerCase())existingIds.add(id);for(const [id,entry] of Object.entries(synced))if(entry.file.toLowerCase()===file.toLowerCase())existingIds.add(id);return {name:path.basename(file),text,token,kind:format.kind,writable:format.utf8,existingIds:[...existingIds]};}
async function sendQueued(state){if(!state.ready||state.closePending)return;for(const file of state.paths.splice(0))try{state.win.webContents.send('opened-note',await openedFile(state,file));}catch(error){dialog.showErrorBox('Could not open note',error.message);}}
function external(url){try{if(['https:','http:'].includes(new URL(url).protocol))void shell.openExternal(url);}catch{}}
// Electron shows no right-click menu by default. Offer spelling fixes, editing commands and http(s) link actions.
// Undo/Redo send the app's own shortcuts so its history stays authoritative; Paste already inserts plain text.
function shortcut(win,keyCode){for(const type of ['keyDown','keyUp'])win.webContents.sendInputEvent({type,keyCode,modifiers:['control']});}
function showContextMenu(win,params){
 const items=[],flags=params.editFlags,link=/^https?:/i.test(params.linkURL||'')?params.linkURL:'';
 if(params.isEditable&&params.misspelledWord){
  for(const word of params.dictionarySuggestions.slice(0,5))items.push({label:word,click:()=>win.webContents.replaceMisspelling(word)});
  if(!params.dictionarySuggestions.length)items.push({label:'No spelling suggestions',enabled:false});
  items.push({label:'Add to dictionary',click:()=>win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)},{type:'separator'});
 }
 if(params.isEditable)items.push({label:'Undo',click:()=>shortcut(win,'Z')},{label:'Redo',click:()=>shortcut(win,'Y')},{type:'separator'},{role:'cut',enabled:flags.canCut},{role:'copy',enabled:flags.canCopy},{role:'paste',enabled:flags.canPaste},{type:'separator'},{role:'selectAll'});
 else if(params.selectionText.trim())items.push({role:'copy'});
 if(link)items.push(...(items.length?[{type:'separator'}]:[]),{label:'Open link',click:()=>external(link)},{label:'Copy link address',click:()=>clipboard.writeText(link)});
 if(items.length)Menu.buildFromTemplate(items).popup({window:win});
}
function broadcast(channel,value,except){for(const state of windows.values())if(state!==except&&state.ready&&!state.win.isDestroyed())state.win.webContents.send(channel,value);}
async function createWindow(paths=[],initial=false){
 let slot=1;while([...windows.values()].some(s=>s.slot===slot))slot++;
 const win=new BrowserWindow({width:1250,height:850,minWidth:650,minHeight:450,title:'Rotepad',show:false,autoHideMenuBar:true,...(process.platform==='win32'?{titleBarStyle:'hidden',titleBarOverlay:{height:34,color:'#d6d6d3',symbolColor:'#0e0e0e'}}:{}),webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
 const state={win,slot,initial,initialized:false,ready:false,paths,pending:new Map(),conflictIds:new Map(),pickerBusy:false,printBusy:false,printPreview:null,closePending:false,allowClose:false};
 windows.set(win.webContents.id,state);const id=win.webContents.id;
 win.setIcon(path.join(__dirname,'app','rotepad.ico'));win.removeMenu();
 win.on('close',event=>{if(state.allowClose)return;event.preventDefault();if(!state.ready||state.closePending||state.pickerBusy||state.printBusy||busy.size)return;state.closePending=true;win.webContents.send('request-close');});
 win.on('closed',()=>windows.delete(id));
 win.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
 win.webContents.on('context-menu',(event,params)=>showContextMenu(win,params));
 win.webContents.on('will-navigate',(event,url)=>{if(url!==appURL){event.preventDefault();external(url);}});
 win.webContents.on('will-attach-webview',event=>event.preventDefault());
 await win.loadURL(appURL);win.show();return state;
}
if(!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(async()=>{
 await fs.mkdir(app.getPath('userData'),{recursive:true});libraryPath=path.join(app.getPath('userData'),'library.json');
 try{libraryData=await fs.readFile(libraryPath,'utf8');validateLibrary(libraryData);}catch(error){if(error.code!=='ENOENT'){dialog.showErrorBox('Could not load notes','Rotepad could not read its saved library. Your files have been left untouched.\n'+error.message);app.quit();return;}}
 linksPath=path.join(app.getPath('userData'),'note-files.json');settingsPath=path.join(app.getPath('userData'),'desktop-settings.json');
 saveFolder=!app.isPackaged&&process.env.ROTEPAD_TEST_DATA?path.join(app.getPath('userData'),'Documents','Rotepad Docs'):path.join(app.getPath('documents'),'Rotepad Docs');
 try{const settings=JSON.parse(await fs.readFile(settingsPath,'utf8'));if(typeof settings.saveFolder==='string'&&path.isAbsolute(settings.saveFolder))saveFolder=settings.saveFolder;}catch{}
 try{for(const [id,file] of Object.entries(JSON.parse(await fs.readFile(linksPath,'utf8'))))if(typeof file==='string'&&path.isAbsolute(file))links[id]=file;}catch{}
 syncedPath=path.join(app.getPath('userData'),'linked-files.json');
 try{for(const [id,entry] of Object.entries(JSON.parse(await fs.readFile(syncedPath,'utf8'))))if(typeof entry?.file==='string'&&path.isAbsolute(entry.file)&&['md','txt'].includes(entry.kind)&&['\n','\r\n'].includes(entry.eol)&&typeof entry.hash==='string')synced[id]={file:entry.file,kind:entry.kind,bom:entry.bom===true,eol:entry.eol,hash:entry.hash};}catch{}
 markdownStore=new MarkdownStore(path.join(app.getPath('userData'),'managed-notes.json'),atomicWrite);
 try{await markdownStore.load();if(libraryData){const data=validateLibrary(libraryData);await fs.writeFile(path.join(app.getPath('userData'),'library-before-markdown.json'),libraryData,{flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error;});libraryData=JSON.stringify(await markdownStore.hydrate(data));}}catch(error){dialog.showErrorBox('Could not load note files',error.message);app.quit();return;}
 session.defaultSession.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
 ipcMain.on('library-initial',event=>{const state=check(event);event.returnValue={library:libraryData,key:state.slot===1?'rotepad.library.v2':'rotepad.library.v2.window.'+state.slot,fresh:!state.initial&&!state.initialized,recover:state.initial&&!state.initialized};state.initialized=true;});
 ipcMain.handle('library-save',(event,request)=>{
  const state=check(event);if(typeof request?.text!=='string'||typeof request?.base!=='string')throw Error('Invalid note library');const local=validateLibrary(request.text),base=validateLibrary(request.base);
  const operation=libraryQueue.catch(()=>{}).then(async()=>{
   // Keep a conflict copy's identity across failed writes and retries.
   const merged=mergeDesktopLibrary(base,local,libraryData?validateLibrary(libraryData):base,{makeId:note=>{const key=JSON.stringify([note.id,note.name,note.text,Boolean(note.trashed)]);if(!state.conflictIds.has(key))state.conflictIds.set(key,randomUUID());return state.conflictIds.get(key);}});
   merged.data.desktopSavedAt=Math.max(Date.now(),(libraryData?validateLibrary(libraryData).desktopSavedAt||0:0)+1);delete merged.data.markdownRefresh;
   const text=JSON.stringify(merged.data);await markdownStore.save(merged.data,saveFolder);await atomicWrite(libraryPath,text);libraryData=text;state.conflictIds.clear();
   broadcast('library-changed',text,state);return {library:text,conflicts:merged.conflicts};
  });libraryQueue=operation;return operation;
 });
 ipcMain.handle('window-new',async event=>{check(event);await libraryQueue;await createWindow();return true;});
 ipcMain.handle('desktop-info',event=>{check(event);return {name:'Rotepad',version:app.getVersion(),copyright:'© 2026, J.E. Rosaroso'};});
 ipcMain.handle('titlebar-theme',(event,theme)=>{const state=check(event);if(!['light','dark'].includes(theme))throw Error('Invalid title bar theme');if(process.platform==='win32')state.win.setTitleBarOverlay({height:34,color:theme==='dark'?'#191b1e':'#d6d6d3',symbolColor:theme==='dark'?'#f3f4f6':'#0e0e0e'});});
 ipcMain.handle('desktop-default-apps',async event=>{check(event);if(process.platform!=='win32')throw Error('Default app settings are available on Windows.');await shell.openExternal(process.env.PORTABLE_EXECUTABLE_DIR?'ms-settings:defaultapps':'ms-settings:defaultapps?registeredAppMachine=Rotepad');});
 ipcMain.handle('close-finish',(event,approved)=>{const state=check(event);if(!state.closePending)return;state.closePending=false;if(approved===true){state.allowClose=true;state.win.close();}else void sendQueued(state);});
 ipcMain.handle('note-files',event=>{check(event);return Object.entries(links).map(([id,file])=>({id,name:path.basename(file)}));});
 ipcMain.handle('note-show-in-folder',async(event,id)=>{check(event);if(typeof id!=='string')throw Error('Invalid note');await libraryQueue;if(!libraryData||!validateLibrary(libraryData).notes.some(note=>note.id===id))throw Error('Note not found');const record=markdownStore.records[id];if(!record)return {error:'This empty note has no file yet. Start writing or give it a name first.'};if(!(await fs.stat(record.file)).isFile())throw Error('The note file could not be found.');shell.showItemInFolder(record.file);return {ok:true};});
 ipcMain.handle('desktop-settings',event=>{check(event);return {saveFolder};});
 ipcMain.handle('print-preview',async(event,options)=>{
  const state=check(event);if(state.printBusy)throw Error('Please wait for the current print operation.');
  if(!options||!['A4','Letter','Legal','A5'].includes(options.pageSize)||typeof options.landscape!=='boolean')throw Error('Invalid paper settings');
  state.printBusy=true;state.printPreview=null;
  try{const settings={pageSize:options.pageSize,landscape:options.landscape},pdf=await state.win.webContents.printToPDF({...settings,printBackground:true,preferCSSPageSize:false,displayHeaderFooter:false});const token=randomUUID();state.printPreview={token,pdf,settings};return {token,pdf};}finally{state.printBusy=false;}
 });
 ipcMain.handle('print-output',async(event,data)=>{
  const state=check(event),win=state.win;if(state.printBusy||state.pickerBusy)throw Error('Please wait for the current operation.');
  if(!state.printPreview||data?.token!==state.printPreview.token||!['pdf','print'].includes(data.action))throw Error('Please open a fresh print preview.');
  const preview=state.printPreview;state.printBusy=true;state.pickerBusy=true;
  try{if(data.action==='pdf'){const name=String(data.name||'Untitled').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,100);const result=await dialog.showSaveDialog(win,{title:'Save as PDF',defaultPath:path.join(saveFolder,name+'.pdf'),filters:[{name:'PDF document',extensions:['pdf']}]});if(result.canceled)return {canceled:true};await atomicWrite(result.filePath,preview.pdf);return {saved:true};}
   return await new Promise((resolve,reject)=>win.webContents.print({...preview.settings,silent:false,printBackground:true},(success,reason)=>{if(success)resolve({printed:true});else if(/cancel/i.test(reason))resolve({canceled:true});else reject(Error(reason||'Printing failed.'));}));
  }finally{state.printBusy=false;state.pickerBusy=false;}
 });
 ipcMain.handle('choose-folder',async event=>{const state=check(event);if(state.pickerBusy)return null;state.pickerBusy=true;try{const result=await dialog.showOpenDialog(state.win,{title:'Default save folder',defaultPath:saveFolder,properties:['openDirectory','createDirectory']});if(result.canceled)return null;const chosen=result.filePaths[0];await atomicWrite(settingsPath,JSON.stringify({saveFolder:chosen}));saveFolder=chosen;broadcast('settings-changed',{saveFolder});return {saveFolder};}finally{state.pickerBusy=false;}});
 ipcMain.handle('desktop-ready',event=>{const state=check(event);state.ready=true;void sendQueued(state);});
 ipcMain.handle('note-save',async(event,data)=>{
  const state=check(event);if(!data||typeof data.id!=='string'||typeof data.text!=='string'||typeof data.name!=='string')throw Error('Invalid note');if(busy.has(data.id)||state.pickerBusy)return null;busy.add(data.id);
  try{let file=data.saveAs?null:links[data.id];if(!file){state.pickerBusy=true;try{await fs.mkdir(saveFolder,{recursive:true});const result=await dialog.showSaveDialog(state.win,{title:'Save note',defaultPath:path.join(saveFolder,path.basename(data.name)||'Untitled.md'),filters});if(result.canceled)return null;file=result.filePath;}finally{state.pickerBusy=false;}}
   await atomicWrite(file,data.text);links[data.id]=file;await storeLinks();return {name:path.basename(file)};
  }finally{busy.delete(data.id);}
 });
 ipcMain.handle('note-open',async event=>{const state=check(event);if(state.pickerBusy)return null;state.pickerBusy=true;try{const result=await dialog.showOpenDialog(state.win,{title:'Open note',defaultPath:saveFolder,properties:['openFile'],filters});if(result.canceled)return null;return await openedFile(state,result.filePaths[0]);}finally{state.pickerBusy=false;}});
 ipcMain.handle('note-bind',async(event,data)=>{const state=check(event);if(typeof data?.id!=='string'||!state.pending.has(data.token))throw Error('Invalid opened note');const format=state.pending.get(data.token);state.pending.delete(data.token);links[data.id]=format.file;await storeLinks();
  // Reopening a linked note keeps the last known disk version, so outside edits since then are still detected.
  if(format.utf8){const previous=synced[data.id];synced[data.id]={file:format.file,kind:format.kind,bom:format.bom,eol:format.eol,hash:previous?.file.toLowerCase()===format.file.toLowerCase()?previous.hash:format.hash};}else delete synced[data.id];
  await storeSynced();return {linked:format.utf8,kind:format.kind,name:path.basename(format.file)};});
 ipcMain.handle('linked-files',event=>{check(event);return Object.entries(synced).map(([id,entry])=>({id,kind:entry.kind,name:path.basename(entry.file)}));});
 // Write a note back to the file it was opened from. Never recreate a missing file or overwrite outside changes unless forced.
 ipcMain.handle('note-sync',async(event,data)=>{check(event);if(typeof data?.id!=='string'||typeof data.text!=='string')throw Error('Invalid note');const entry=synced[data.id];if(!entry)return {status:'unlinked'};
  const run=(syncing.get(entry.file)||Promise.resolve()).catch(()=>{}).then(async()=>{
   let current;try{current=await fs.readFile(entry.file);}catch(error){if(error.code==='ENOENT')return {status:'missing'};throw error;}
   if(digest(current)!==entry.hash&&data.force!==true)return {status:'changed'};
   const output=Buffer.from((entry.bom?'﻿':'')+data.text.replace(/\r\n?/g,'\n').replace(/\n/g,entry.eol),'utf8');
   if(!output.equals(current))await atomicWrite(entry.file,output);
   entry.hash=digest(output);await storeSynced();return {status:'saved'};
  });
  syncing.set(entry.file,run);return run;
 });
 ipcMain.handle('note-unlink',async(event,id)=>{check(event);if(typeof id!=='string')throw Error('Invalid note');delete synced[id];await storeSynced();});
 await createWindow(startupPaths.splice(0),true);
});
app.on('second-instance',(_event,args)=>{const paths=requestedPaths(args.slice(app.isPackaged?1:2));if(!markdownStore)startupPaths.push(...paths);else void createWindow(paths);});
app.on('open-file',(event,file)=>{event.preventDefault();if(!markdownStore)startupPaths.push(file);else void createWindow([file]);});
app.on('window-all-closed',()=>app.quit());

const {app, BrowserWindow, ipcMain, dialog, shell, session} = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {randomUUID} = require('node:crypto');
const {MarkdownStore}=require('./markdown-store.cjs');
let win, links = Object.create(null), linksPath, settingsPath, saveFolder;
let queuedPaths=[], rendererReady=false;
const requestedPaths=args=>args.filter(arg=>typeof arg==='string'&&!arg.startsWith('-')&&/\.(md|markdown)$/i.test(arg)).map(file=>path.resolve(file));
queuedPaths.push(...requestedPaths(process.argv.slice(app.isPackaged?1:2)));
const pending = new Map();
const busy = new Set();
let pickerBusy = false;
let closePending=false, allowClose=false;
let libraryPath,libraryData=null,libraryQueue=Promise.resolve();
let markdownStore;
let printPreview=null,printBusy=false;
function validateLibrary(text){const data=JSON.parse(text);if(data?.version!==2||!Array.isArray(data.notes)||!data.notes.length||!data.notes.every(n=>typeof n.id==='string'&&typeof n.name==='string'&&typeof n.text==='string'))throw Error('Invalid note library');return data;}
const appURL = pathToFileURL(path.join(__dirname, 'app', 'Rotepad.html')).href;
// Stable storage location across portable builds and launches.
app.setPath('userData', !app.isPackaged && process.env.ROTEPAD_TEST_DATA ? process.env.ROTEPAD_TEST_DATA : path.join(app.getPath('appData'), 'Rotepad'));
const filters = [{name:'Markdown and text',extensions:['md','markdown','txt']}];
if(process.platform==='win32')app.setAppUserModelId('com.rotepad.editor');
function check(event) {
  if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame || event.senderFrame.url !== appURL) throw Error('Untrusted window');
}
async function atomicWrite(file, text) {
  const temporary = path.join(path.dirname(file), '.' + path.basename(file) + '.' + randomUUID() + '.tmp');
  try { await fs.writeFile(temporary, text, {encoding:'utf8', flag:'wx'}); await fs.rename(temporary, file); }
  finally { await fs.unlink(temporary).catch(()=>{}); }
}
async function storeLinks() { await atomicWrite(linksPath, JSON.stringify(links)); }
async function openedFile(file) {const text=await fs.readFile(file,'utf8'),token=randomUUID();pending.set(token,file);const existingIds=new Set(Object.keys(links).filter(id=>links[id].toLowerCase()===file.toLowerCase()));for(const [id,record] of Object.entries(markdownStore?.records||{}))if(record.file.toLowerCase()===file.toLowerCase())existingIds.add(id);return {name:path.basename(file),text,token,existingIds:[...existingIds]};}
async function sendQueued() {if(!rendererReady||closePending)return;const paths=queuedPaths.splice(0);for(const file of paths)try{win.webContents.send('opened-note',await openedFile(file));}catch(error){dialog.showErrorBox('Could not open note',error.message);}}
function external(url) { try { if (['https:','http:'].includes(new URL(url).protocol)) void shell.openExternal(url); } catch {} }
if (!app.requestSingleInstanceLock()) app.quit();
else app.whenReady().then(async()=>{
  await fs.mkdir(app.getPath('userData'), {recursive:true});
  libraryPath=path.join(app.getPath('userData'),'library.json');
  try{libraryData=await fs.readFile(libraryPath,'utf8');validateLibrary(libraryData);}catch(error){
    if(error.code!=='ENOENT'){dialog.showErrorBox('Could not load notes','Rotepad could not read its saved library. Your files have been left untouched.\n'+error.message);app.quit();return;}
  }
  linksPath = path.join(app.getPath('userData'), 'note-files.json');
  settingsPath=path.join(app.getPath('userData'),'desktop-settings.json');
  saveFolder=!app.isPackaged&&process.env.ROTEPAD_TEST_DATA?path.join(app.getPath('userData'),'Documents','Rotepad Docs'):path.join(app.getPath('documents'),'Rotepad Docs');
  try{const settings=JSON.parse(await fs.readFile(settingsPath,'utf8'));if(typeof settings.saveFolder==='string'&&path.isAbsolute(settings.saveFolder))saveFolder=settings.saveFolder;}catch{}
  try { const data=JSON.parse(await fs.readFile(linksPath,'utf8')); for(const [id,file] of Object.entries(data)) if(typeof file==='string'&&path.isAbsolute(file)) links[id]=file; } catch {}
  markdownStore=new MarkdownStore(path.join(app.getPath('userData'),'managed-notes.json'),atomicWrite);
  try{
    await markdownStore.load();
    if(libraryData){
      const data=validateLibrary(libraryData);
      // Keep a migration recovery copy before moving to per-note Markdown files.
      await fs.writeFile(path.join(app.getPath('userData'),'library-before-markdown.json'),libraryData,{flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error;});
      libraryData=JSON.stringify(await markdownStore.hydrate(data));
    }
  }catch(error){dialog.showErrorBox('Could not load note files',error.message);app.quit();return;}
  win = new BrowserWindow({width:1250,height:850,minWidth:650,minHeight:450,title:'Rotepad',show:false,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
  win.setIcon(path.join(__dirname,'app','rotepad.ico'));
  win.removeMenu();
  win.on('close',event=>{
    if(allowClose)return;
    event.preventDefault();
    if(!rendererReady||closePending||pickerBusy||printBusy||busy.size)return;
    closePending=true;win.webContents.send('request-close');
  });
  ipcMain.on('library-initial',event=>{check(event);event.returnValue=libraryData;});
  ipcMain.handle('library-save',(event,text)=>{
    check(event);if(typeof text!=='string')throw Error('Invalid note library');validateLibrary(text);
    const operation=libraryQueue.catch(()=>{}).then(async()=>{await markdownStore.save(validateLibrary(text),saveFolder);await atomicWrite(libraryPath,text);libraryData=text;return true;});
    libraryQueue=operation;return operation;
  });
  ipcMain.handle('close-finish',(event,approved)=>{
    check(event);if(!closePending)return;
    closePending=false;
    if(approved===true){allowClose=true;win.close();}else void sendQueued();
  });
  session.defaultSession.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
  win.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
  win.webContents.on('will-navigate',(event,url)=>{if(url!==appURL){event.preventDefault();external(url);}});
  win.webContents.on('will-attach-webview',event=>event.preventDefault());
  ipcMain.handle('note-files',event=>{check(event);return Object.entries(links).map(([id,file])=>({id,name:path.basename(file)}));});
  ipcMain.handle('note-show-in-folder',async(event,id)=>{
    check(event);
    if(typeof id!=='string')throw Error('Invalid note');
    await libraryQueue;
    if(!libraryData||!validateLibrary(libraryData).notes.some(note=>note.id===id))throw Error('Note not found');
    const record=markdownStore.records[id];
    if(!record)return {error:'This empty note has no file yet. Start writing or give it a name first.'};
    const stat=await fs.stat(record.file);
    if(!stat.isFile())throw Error('The note file could not be found.');
    shell.showItemInFolder(record.file);
    return {ok:true};
  });
  ipcMain.handle('desktop-settings',event=>{check(event);return {saveFolder};});
  ipcMain.handle('print-preview',async(event,options)=>{
    check(event);
    if(printBusy)throw Error('Please wait for the current print operation.');
    if(!options||!['A4','Letter','Legal','A5'].includes(options.pageSize)||typeof options.landscape!=='boolean')throw Error('Invalid paper settings');
    printBusy=true;printPreview=null;
    try{
      const settings={pageSize:options.pageSize,landscape:options.landscape};
      const pdf=await win.webContents.printToPDF({...settings,printBackground:true,preferCSSPageSize:false,displayHeaderFooter:false});
      const token=randomUUID();printPreview={token,pdf,settings};
      return {token,pdf};
    }finally{printBusy=false;}
  });
  ipcMain.handle('print-output',async(event,data)=>{
    check(event);
    if(printBusy||pickerBusy)throw Error('Please wait for the current operation.');
    if(!printPreview||data?.token!==printPreview.token||!['pdf','print'].includes(data.action))throw Error('Please open a fresh print preview.');
    const preview=printPreview;printBusy=true;pickerBusy=true;
    try{
      if(data.action==='pdf'){
        const name=String(data.name||'Untitled').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,100);
        const result=await dialog.showSaveDialog(win,{title:'Save as PDF',defaultPath:path.join(saveFolder,name+'.pdf'),filters:[{name:'PDF document',extensions:['pdf']}]});
        if(result.canceled)return {canceled:true};
        await atomicWrite(result.filePath,preview.pdf);return {saved:true};
      }
      return await new Promise((resolve,reject)=>win.webContents.print({...preview.settings,silent:false,printBackground:true},(success,reason)=>{
        if(success)resolve({printed:true});else if(/cancel/i.test(reason))resolve({canceled:true});else reject(Error(reason||'Printing failed.'));
      }));
    }finally{printBusy=false;pickerBusy=false;}
  });
  ipcMain.handle('choose-folder',async event=>{check(event);if(pickerBusy)return null;pickerBusy=true;try{const result=await dialog.showOpenDialog(win,{title:'Default save folder',defaultPath:saveFolder,properties:['openDirectory','createDirectory']});if(result.canceled)return null;const chosen=result.filePaths[0];await atomicWrite(settingsPath,JSON.stringify({saveFolder:chosen}));saveFolder=chosen;return {saveFolder};}finally{pickerBusy=false;}});
  ipcMain.handle('desktop-ready',event=>{check(event);rendererReady=true;void sendQueued();});
  ipcMain.handle('note-save',async(event,data)=>{
    check(event);
    if(!data||typeof data.id!=='string'||typeof data.text!=='string'||typeof data.name!=='string') throw Error('Invalid note');
    if(busy.has(data.id)||pickerBusy) return null;
    busy.add(data.id);
    try {
      let file = data.saveAs ? null : links[data.id];
      if(!file){pickerBusy=true;try {await fs.mkdir(saveFolder,{recursive:true});const result=await dialog.showSaveDialog(win,{title:'Save note',defaultPath:path.join(saveFolder,path.basename(data.name)||'Untitled.md'),filters});if(result.canceled)return null;file=result.filePath;}finally{pickerBusy=false;}}
      await atomicWrite(file,data.text);
      links[data.id]=file;
      await storeLinks();
      return {name:path.basename(file)};
    } finally {busy.delete(data.id);}
  });
  ipcMain.handle('note-open',async event=>{
    check(event);if(pickerBusy)return null;pickerBusy=true;
    try {const result=await dialog.showOpenDialog(win,{title:'Open note',defaultPath:saveFolder,properties:['openFile'],filters});if(result.canceled)return null;return await openedFile(result.filePaths[0]);}finally{pickerBusy=false;}
  });
  ipcMain.handle('note-bind',async(event,data)=>{check(event);if(typeof data?.id!=='string'||!pending.has(data.token))throw Error('Invalid opened note');links[data.id]=pending.get(data.token);pending.delete(data.token);await storeLinks();});
  await win.loadURL(appURL);
  win.show();
});
app.on('second-instance',(_event,args)=>{queuedPaths.push(...requestedPaths(args.slice(app.isPackaged?1:2)));void sendQueued();if(win){if(win.isMinimized())win.restore();win.focus();}});
app.on('open-file',(event,file)=>{event.preventDefault();queuedPaths.push(file);void sendQueued();});
app.on('window-all-closed',()=>app.quit());

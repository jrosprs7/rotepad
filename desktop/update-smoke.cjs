const {_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
// Updates from a local test feed in development Electron, with a disposable profile and download cache. The real check, download
// and checksum run; only the final hand-over to the installer is replaced by a recorder, because the downloaded file is not a real
// installer. Covers the startup check, Restart now (unsaved typing is saved before the hand-over), Later (installs on close),
// Help > Check for updates (current, newer, unreachable feed), the Settings switch, and a copy without updates.
const profile=path.join(__dirname,'test-profile','updates-'+Date.now()),settingsFile=path.join(profile,'desktop-settings.json');
const feedFile=path.join(profile,'dev-app-update.yml'),handOver=path.join(profile,'installer-started.json');
let app,child,page,server,feed={version:'0.13.1',status:200},requests=[],release,checks=0;
const installer=Buffer.from('Rotepad test update, not an installer\n'.repeat(200));
const sha512=createHash('sha512').update(installer).digest('base64');
// The feed answers only after the test has replaced the dialogs, so the startup check cannot outrun it.
let feedOpen=new Promise(resolve=>release=resolve);
function serve(){return new Promise(resolve=>{server=http.createServer(async(request,response)=>{const url=new URL(request.url,'http://localhost').pathname;requests.push(url);
 if(url==='/latest.yml'){await feedOpen;if(feed.status!==200){response.writeHead(feed.status);response.end();return;}
  response.writeHead(200,{'content-type':'text/yaml'});response.end(`version: ${feed.version}\nfiles:\n  - url: Rotepad-${feed.version}-Setup.exe\n    sha512: ${sha512}\n    size: ${installer.length}\npath: Rotepad-${feed.version}-Setup.exe\nsha512: ${sha512}\nreleaseDate: '2026-10-17T00:00:00.000Z'\n`);return;}
 if(url===`/Rotepad-${feed.version}-Setup.exe`){response.writeHead(200,{'content-type':'application/octet-stream','content-length':installer.length});response.end(installer);return;}
 response.writeHead(404);response.end();}).listen(0,'127.0.0.1',()=>resolve(server.address().port));});}
async function launch(withFeed=true){
 app=await _electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile,LOCALAPPDATA:path.join(profile,'local'),...(withFeed?{ROTEPAD_TEST_UPDATES:feedFile}:{ROTEPAD_TEST_UPDATES:''})}});
 child=app.process();page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));await page.waitForFunction(()=>typeof flushLibrary==='function'&&document.getElementById('check-updates'));
 // Message boxes answer from a queue and are recorded; the installer hand-over writes what it was asked to do.
 await app.evaluate(({dialog},[file,main])=>{const load=process.mainModule.require('node:module').createRequire(main),updater=load('electron-updater').autoUpdater,fs=load('node:fs');globalThis.boxes=[];globalThis.answers=[];
  dialog.showMessageBox=async(_win,options)=>{boxes.push({message:options.message,buttons:options.buttons});return {response:answers.length?answers.shift():options.buttons.length-1};};
  updater.doInstall=options=>{fs.writeFileSync(file,JSON.stringify(options));return true;};},[handOver,path.join(__dirname,'main.cjs')]);
 release();
}
const boxes=()=>app.evaluate(()=>boxes);
const answer=value=>app.evaluate((_electron,value)=>{answers.push(value);},value);
async function waitBoxes(count){for(let i=0;i<100&&(await boxes()).length<count;i++)await page.waitForTimeout(100);return boxes();}
async function exited(){if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));}
async function closeWindow(){const ended=app.waitForEvent('close');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());await ended;await exited();}
async function stop(){if(!app)return;await app.evaluate(({app})=>app.exit(0)).catch(()=>{});await exited();}
async function checkFromMenu(){await page.locator('#compact-app-menu>summary').click();await page.locator('#help-menu>summary').click();await page.locator('#check-updates').click();}
async function savedText(id){const index=JSON.parse(await fs.readFile(path.join(profile,'managed-notes.json'),'utf8'));return fs.readFile(index[id].file,'utf8');}
const errors=[],started=text=>{const {isSilent,isForceRunAfter}=JSON.parse(text);return {isSilent,isForceRunAfter};};
(async()=>{
 await fs.mkdir(profile,{recursive:true});await fs.writeFile(settingsFile,JSON.stringify({saveFolder:path.join(profile,'notes')}),{flag:'wx'});
 const port=await serve();await fs.writeFile(feedFile,`provider: generic\nurl: http://127.0.0.1:${port}/\nupdaterCacheDirName: rotepad-test-updater\n`);

 // Startup: the check runs once, downloads the newer version into the cache in the test profile and offers a restart. Later keeps working.
 await launch();
 let shown=await waitBoxes(1);
 assert.deepEqual(shown,[{message:'Rotepad 0.13.1 is ready to install.',buttons:['Restart now','Later']}]);
 // Without a block map (this feed has none) the whole file is downloaded once.
 assert.deepEqual(requests.filter(url=>url!=='/latest.yml'&&!url.endsWith('.blockmap')),['/Rotepad-0.13.1-Setup.exe']);assert.equal(requests.filter(url=>url==='/latest.yml').length,1);
 assert.deepEqual(await fs.readFile(path.join(profile,'local','rotepad-test-updater','pending','Rotepad-0.13.1-Setup.exe')),installer);checks++;
 // The Settings switch is shown and on by default; nothing has been written for it.
 assert.deepEqual(await page.evaluate(()=>[$('update-checks-setting').hidden,$('update-checks-setting').checked]),[false,true]);assert.equal(JSON.parse(await fs.readFile(settingsFile,'utf8')).updateChecks,undefined);checks++;

 // Restart now from Help > Check for updates: typing just before it is saved, every window closes, then the installer is started
 // silently and asked to start Rotepad again.
 const id=await page.evaluate(()=>{createNote('Update note.md','before');return activeId;});
 await page.locator('#rich-editor').click();await page.keyboard.press('Control+End');await page.keyboard.type(' typed just before restart');
 await answer(0);await checkFromMenu();await exited();
 assert.deepEqual(started(await fs.readFile(handOver,'utf8')),{isSilent:true,isForceRunAfter:true});
 assert.equal(await savedText(id),'before typed just before restart');checks++;
 await fs.unlink(handOver);

 // Later, then closing Rotepad normally: the update installs silently without starting Rotepad again.
 requests=[];feedOpen=new Promise(resolve=>release=resolve);await launch();shown=await waitBoxes(1);assert.equal(shown[0].message,'Rotepad 0.13.1 is ready to install.');
 await closeWindow();
 assert.deepEqual(started(await fs.readFile(handOver,'utf8')),{isSilent:true,isForceRunAfter:false});checks++;
 await fs.unlink(handOver);

 // Up to date, and an unreachable feed, from the menu. Turning the switch off is saved and stops the startup check.
 feed={version:'0.13.0',status:200};requests=[];feedOpen=new Promise(resolve=>release=resolve);await launch();
 for(let i=0;i<50&&!requests.includes('/latest.yml');i++)await page.waitForTimeout(100);await page.waitForTimeout(300);assert.deepEqual(await boxes(),[]);
 await checkFromMenu();shown=await waitBoxes(1);assert.deepEqual(shown,[{message:'Rotepad is up to date.',buttons:['OK']}]);checks++;
 feed.status=500;await checkFromMenu();shown=await waitBoxes(2);assert.deepEqual(shown[1],{message:'Could not check for updates.',buttons:['OK']});checks++;
 feed.status=200;
 await page.locator('#compact-app-menu>summary').click();await page.locator('#settings').click();await page.locator('#update-checks-setting').uncheck();await page.waitForTimeout(250);
 assert.equal(JSON.parse(await fs.readFile(settingsFile,'utf8')).updateChecks,false);assert.equal(JSON.parse(await fs.readFile(settingsFile,'utf8')).saveFolder,path.join(profile,'notes'));
 await assert.rejects(page.evaluate(()=>rotDesktop.setUpdateChecks('no')));checks++;
 await stop();requests=[];feedOpen=new Promise(resolve=>release=resolve);await launch();await page.waitForTimeout(1500);
 assert.deepEqual(requests,[]);assert.equal(await page.evaluate(()=>$('update-checks-setting').checked),false);
 // A manual check still works with the switch off.
 feed.version='0.13.2';await checkFromMenu();shown=await waitBoxes(2);
 assert.deepEqual(shown,[{message:'Rotepad 0.13.2 is downloading.',buttons:['OK']},{message:'Rotepad 0.13.2 is ready to install.',buttons:['Restart now','Later']}]);checks++;
 await stop();

 // A copy without updates (like the portable one) hides the switch and says so from the menu, without contacting the feed.
 requests=[];feedOpen=new Promise(resolve=>release=resolve);await launch(false);
 assert.equal(await page.evaluate(()=>$('update-checks-setting').hidden),true);
 await checkFromMenu();shown=await waitBoxes(1);assert.deepEqual(shown,[{message:'This copy of Rotepad does not update itself.',buttons:['OK']}]);assert.deepEqual(requests,[]);checks++;
 await stop();
 assert.deepEqual(errors,[]);
 console.log(`PASS ${checks} update checks: startup check and download to a test cache, Restart now saves typing before the silent installer, Later installs on close, up to date, unreachable feed, Settings switch off and manual check, no-update copy.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await stop().catch(()=>{});server?.close();});

const {_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
// View → Always on top: applies to every window, is remembered across restart, survives a save-folder change and rejects
// non-boolean values. Run after preparing desktop/app; it uses a disposable profile.
const profile=path.join(__dirname,'test-profile','on-top-'+Date.now()),settingsFile=path.join(profile,'desktop-settings.json');let app,checks=0;
const launch=async()=>{app=await _electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});const page=await app.firstWindow();await ready(page);return page;};
const ready=page=>page.waitForFunction(()=>typeof flushLibrary==='function'&&document.getElementById('always-on-top'));
const onTop=()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(w=>w.isAlwaysOnTop()));
const pressed=page=>page.locator('#always-on-top').getAttribute('aria-pressed');
const stored=async()=>JSON.parse(await fs.readFile(settingsFile,'utf8'));
async function choose(page){await page.locator('#compact-app-menu>summary').click();await page.locator('#view-menu>summary').click();await page.locator('#always-on-top').click();await page.waitForTimeout(250);}
async function quit(){const child=app.process(),ended=app.waitForEvent('close');await app.evaluate(({app})=>app.exit(0)).catch(()=>{});await ended;if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));}
(async()=>{
 await fs.mkdir(profile,{recursive:true});const notes=path.join(profile,'notes');await fs.writeFile(settingsFile,JSON.stringify({saveFolder:notes}),{flag:'wx'});
 let page=await launch();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 assert.deepEqual(await onTop(),[false]);assert.equal(await pressed(page),'false');checks++;
 // Turning it on from the menu pins the window, ticks the item, closes the menu and keeps the save folder in the settings file.
 await choose(page);assert.deepEqual(await onTop(),[true]);assert.equal(await pressed(page),'true');assert.equal(await page.locator('#compact-app-menu').evaluate(d=>d.open),false);
 assert.deepEqual(await stored(),{saveFolder:notes,alwaysOnTop:true});checks++;
 // A new window opens on top too; turning it off there releases both windows and updates the first window's menu.
 const opened=app.waitForEvent('window');await page.keyboard.press('Control+Shift+N');const second=await opened;await ready(second);await second.waitForTimeout(300);
 assert.deepEqual(await onTop(),[true,true]);assert.equal(await pressed(second),'true');checks++;
 await choose(second);assert.deepEqual(await onTop(),[false,false]);assert.equal(await pressed(page),'false');assert.equal((await stored()).alwaysOnTop,false);checks++;
 // Changing the save folder keeps the setting.
 await choose(page);const moved=path.join(profile,'moved');await fs.mkdir(moved);await app.evaluate(({dialog},chosen)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[chosen]});},moved);
 await page.evaluate(()=>window.rotDesktop.chooseFolder());assert.deepEqual(await stored(),{saveFolder:moved,alwaysOnTop:true});assert.deepEqual(await onTop(),[true,true]);checks++;
 // Only booleans are accepted.
 await assert.rejects(page.evaluate(()=>window.rotDesktop.setAlwaysOnTop('yes')));assert.deepEqual(await onTop(),[true,true]);checks++;
 assert.deepEqual(errors,[]);
 // Restart restores it.
 await quit();page=await launch();assert.deepEqual(await onTop(),[true]);assert.equal(await pressed(page),'true');checks++;
 await choose(page);assert.deepEqual(await onTop(),[false]);await quit();page=await launch();assert.deepEqual(await onTop(),[false]);assert.equal(await pressed(page),'false');checks++;
 console.log(`PASS ${checks} always-on-top checks: View menu toggle and tick, every window including new ones, settings file with save folder kept, invalid value rejected, restart on/off.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(app)await app.evaluate(({app})=>app.exit(0)).catch(()=>{});});

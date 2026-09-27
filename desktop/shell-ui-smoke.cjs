// Development Electron only: isolated profile; Windows Settings is mocked.
const {_electron:electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const profile=path.join(__dirname,'test-profile','shell-'+Date.now());let app,page;const errors=[];
async function ready(p){await p.waitForFunction(()=>!!document.getElementById('about-rotepad'));p.on('pageerror',e=>errors.push(e.message));}
async function bounds(){return page.evaluate(()=>{const r=n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,height:b.height};};const overlay=navigator.windowControlsOverlay;return {visible:overlay.visible,area:overlay.getTitlebarAreaRect().toJSON(),bar:r($('note-tabs-bar')),plus:r($('new-note-tab')),header:r(document.querySelector('header')),drag:getComputedStyle($('note-tabs-bar')).webkitAppRegion,noDrag:getComputedStyle($('new-note-tab')).webkitAppRegion,overflow:document.documentElement.scrollWidth>innerWidth};});}
(async()=>{
 await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}));
 const txt=path.join(profile,'first text note.TXT');await fs.writeFile(txt,'Text opened from Explorer\nSecond line');
 app=await electron.launch({executablePath:require('electron'),args:[__dirname,txt],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await app.firstWindow();await ready(page);
 await page.waitForFunction(()=>editor.value==='Text opened from Explorer\nSecond line');await page.evaluate(()=>flushLibrary());
 const firstId=await page.evaluate(()=>activeId);const info=await page.evaluate(()=>rotDesktop.info());assert.equal(info.name,'Rotepad');assert.equal(info.version,require('./package.json').version);assert.equal(info.copyright,'© 2026, J.E. Rosaroso');
 // The title bar shares tab space; native caption buttons retain their own safe area.
 for(const width of [650,850,1250])for(const theme of ['light','dark']){
  await app.evaluate(({BrowserWindow},{width})=>BrowserWindow.getAllWindows()[0].setSize(width,700),{width});await page.evaluate(theme=>{prefs.theme=theme;applyPrefs();},theme);await page.waitForTimeout(150);
  const g=await bounds();assert.equal(g.visible,true);assert.equal(g.bar.y,0);assert.equal(g.bar.height,34);assert.equal(g.header.y,34);assert.equal(g.header.height,38);assert.equal(g.overflow,false);
  assert.ok(g.bar.right<=g.area.x+g.area.width+1,JSON.stringify(g));assert.ok(g.plus.right<=g.bar.right-35,JSON.stringify(g));assert.equal(g.drag,'drag');assert.equal(g.noDrag,'no-drag');
 }
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].maximize());await page.waitForFunction(()=>navigator.windowControlsOverlay.getTitlebarAreaRect().width>1000);
 let g=await bounds();assert.ok(g.bar.right<=g.area.x+g.area.width+1,JSON.stringify(g));
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].unmaximize());await page.waitForTimeout(200);
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].minimize());assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isMinimized()),true);
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].restore());await page.waitForTimeout(200);
 await page.locator('#new-note-tab').click();assert.notEqual(await page.evaluate(()=>activeId),firstId);
 await page.evaluate(()=>focusMode(true));assert.equal(await page.locator('#note-tabs-bar').isVisible(),true);assert.equal(await page.locator('#new-note-tab').isVisible(),false);await page.keyboard.press('Escape');
 // Follow real menu controls to About; close and reopen with keyboard Escape.
 await page.locator('#compact-app-menu>summary').click();await page.locator('#compact-app-menu').getByText('Help',{exact:true}).click();await page.locator('#about-rotepad').click();
 assert.equal(await page.locator('#about-version').innerText(),'Version '+info.version);assert.equal(await page.locator('#about-copyright').innerText(),info.copyright);await page.locator('#about-rotepad-close').click();
 await page.evaluate(()=>$('about-rotepad').click());await page.waitForFunction(()=>$('about-rotepad-dialog').open);await page.keyboard.press('Escape');assert.equal(await page.locator('#about-rotepad-dialog').evaluate(el=>el.open),false);
 await app.evaluate(({shell})=>{global.defaultUrls=[];shell.openExternal=async url=>global.defaultUrls.push(url);});
 await page.locator('#compact-app-menu>summary').click();await page.locator('#settings').click();await page.locator('#choose-default-apps').click();
 assert.deepEqual(await app.evaluate(()=>global.defaultUrls),['ms-settings:defaultapps?registeredAppMachine=Rotepad']);await page.keyboard.press('Escape');
 assert.match(await page.evaluate(()=>rotDesktop.titlebarTheme('bad-theme').then(()=>'unexpected',error=>error.message)),/Invalid title bar theme/);
 // An additional TXT launch opens another window without replacing the first one.
 const another=path.join(profile,'another note.txt');await fs.writeFile(another,'Another text document');
 const opened=app.waitForEvent('window');await app.evaluate(({app},file)=>app.emit('second-instance',{},[process.execPath,app.getAppPath(),file]),another);
 const second=await opened;await ready(second);await second.waitForFunction(()=>editor.value==='Another text document');await second.evaluate(()=>flushLibrary());
 assert.notEqual(await page.evaluate(()=>editor.value),'Another text document');assert.equal(await fs.readFile(txt,'utf8'),'Text opened from Explorer\nSecond line');assert.equal(await fs.readFile(another,'utf8'),'Another text document');
 const files=await fs.readdir(path.join(profile,'notes'));assert.ok(files.filter(f=>f.endsWith('.md')).length>=2,'TXT imports become managed Markdown copies');
 await page.evaluate(()=>{prefs.theme='light';applyPrefs();for(let i=0;i<5;i++)createNote('Sample note '+(i+1),'Some writing');});await page.waitForTimeout(200);await page.screenshot({path:path.join(profile,'titlebar-light.png')});
 await page.evaluate(()=>{prefs.theme='dark';applyPrefs();});await page.waitForTimeout(100);await page.screenshot({path:path.join(profile,'titlebar-dark.png')});
 assert.deepEqual(errors,[]);console.log('PASS Windows shell: title-bar tabs/caption safe area/themes/resize/focus, maximize/minimize/restore, About, mocked default-app settings, invalid theme rejection and startup/second-instance TXT copies. Screenshots: '+profile);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(app)await app.evaluate(({app})=>app.exit(0)).catch(()=>{});});

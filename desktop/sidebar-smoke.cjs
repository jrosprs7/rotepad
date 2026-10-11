const {chromium,_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
// Narrow windows (under 900px) hide the notes sidebar without changing the saved preference; the toggle shows it until the window is
// narrowed again, and widening restores the preference. Add --desktop to run in isolated development Electron after preparing desktop/app.
const native=process.argv.includes('--desktop');let host,page,checks=0;
const state=()=>page.evaluate(()=>({shown:!$('notes-sidebar').hidden,expanded:$('toggle-notes').getAttribute('aria-expanded'),pref:prefs.sidebar}));
async function width(w){await page.setViewportSize({width:w,height:760});await page.waitForTimeout(150);}
async function expect(shown,pref,label){assert.deepEqual(await state(),{shown,expanded:String(shown),pref},label);checks++;}
const toggle=()=>page.click('#toggle-notes');
(async()=>{
 if(native){const profile=path.join(__dirname,'test-profile','sidebar-'+Date.now());await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}),{flag:'wx'});host=await _electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await host.firstWindow();await page.waitForFunction(()=>typeof flushLibrary==='function');}
 else{host=await chromium.launch({channel:'msedge',headless:true});page=await host.newPage();await page.goto(pathToFileURL(path.resolve(__dirname,'../Rotepad.html')).href);}
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await width(1200);await page.evaluate(()=>{createNote('Sidebar','Keep this text');setMode('rich');prefs.sidebar=true;applyPrefs();persist();});
 await expect(true,true,'wide window shows the sidebar the user left open');

 // Narrowing hides it; the preference stays on, so widening brings it back.
 await width(899);await expect(false,true,'899px hides the sidebar');
 await width(900);await expect(true,true,'900px shows it again');
 await width(700);await expect(false,true,'700px hides it');

 // While narrow the toggle shows/hides it without touching the preference.
 await toggle();await expect(true,true,'toggle shows it while narrow');
 await toggle();await expect(false,true,'toggle hides it again');
 await toggle();await width(1200);await expect(true,true,'widening keeps it shown');
 await width(700);await expect(false,true,'narrowing again hides it even after it was shown');

 // A closed preference: narrow toggle shows it temporarily, widening returns to closed.
 await width(1200);await toggle();await expect(false,false,'wide toggle still changes the preference');
 await width(700);await expect(false,false,'narrow stays hidden');await toggle();await expect(true,false,'narrow toggle shows it, preference unchanged');
 await width(1200);await expect(false,false,'widening returns to the closed preference');
 await toggle();await expect(true,true,'wide toggle reopens and saves');

 // Reload while narrow: hidden, with the preference kept for wide windows.
 await width(700);await page.reload();await page.waitForFunction(()=>typeof prefs!=='undefined'&&typeof rich!=='undefined');await page.waitForTimeout(150);
 await expect(false,true,'reload while narrow starts hidden');await width(1200);await expect(true,true,'and shows after widening');
 assert.equal(await page.evaluate(()=>activeNote().text),'Keep this text');checks++;

 if(native){
  // With no open note the desktop keeps the Library visible so a note can be reopened, also in a narrow window.
  await width(700);await page.evaluate(()=>{for(const n of notes)n.closed=true;renderNotes();});await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>!$('notes-sidebar').hidden),true,'empty workspace keeps the Library visible');
  await width(1200);await width(700);assert.equal(await page.evaluate(()=>!$('notes-sidebar').hidden),true,'also after crossing the breakpoint');checks++;
 }
 assert.deepEqual(errors,[]);
 console.log(`PASS ${checks} sidebar checks in ${native?'Electron':'Edge'}: hidden under 900px with the preference kept, narrow toggle, widening restores, closed preference, reload while narrow${native?', empty workspace':''}.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(host)await host.close();});

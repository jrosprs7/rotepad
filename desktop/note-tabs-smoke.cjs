const {_electron:electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const profile=path.join(__dirname,'test-profile','tabs-'+Date.now());let app,page;const errors=[];
const tab=id=>page.locator('.note-tab').filter({has:page.locator('[id="note-tab-'+id+'"]')});
async function ready(p){await p.waitForFunction(()=>typeof renderNoteTabs==='function');p.on('pageerror',e=>errors.push(e.message));await p.evaluate(()=>flushLibrary());}
async function launch(){app=await electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await app.firstWindow();await ready(page);}
async function stop(){if(!app)return;const child=app.process();await app.evaluate(({app})=>app.exit(0)).catch(()=>{});if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));}
async function state(){return page.evaluate(()=>({id:activeId,text:editor.value,order:prefs.tabOrder,closed:notes.filter(n=>n.closed).map(n=>n.id)}));}
async function choose(id){await tab(id).locator('[role=tab]').click();await page.waitForFunction(id=>activeId===id&&!restoringPosition,id);}
async function selectRich(text,start=0,end=text.length){await page.evaluate(({text,start,end})=>{rich.focus();const walker=document.createTreeWalker(rich,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode())if(n.data===text){const r=document.createRange();r.setStart(n,start);r.setEnd(n,end);getSelection().removeAllRanges();getSelection().addRange(r);rememberRange();updateFormatting();return;}throw Error('Missing selection text: '+text);},{text,start,end});}
(async()=>{
 await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}));await launch();
 const initial=await page.evaluate(()=>activeId);assert.equal(await page.locator('#note-tabs [role=tab]').count(),1);
 await page.locator('#new-note-tab').click();const a=await page.evaluate(()=>{filename.value='Alpha';editor.value='alpha body';loadRich();persist();return activeId;});
 await page.keyboard.press('Control+n');const b=await page.evaluate(()=>{filename.value='Bravo';editor.value='bravo body';loadRich();persist();return activeId;});
 assert.deepEqual((await state()).order,[initial,a,b]);assert.equal(await tab(b).locator('[role=tab]').innerText(),'Bravo');
 await choose(a);await page.evaluate(()=>{setMode('write');editor.focus();editor.setSelectionRange(2,5);capturePosition();persist();});await choose(b);await choose(a);
 assert.deepEqual(await page.evaluate(()=>[editor.selectionStart,editor.selectionEnd]),[2,5]);assert.equal((await state()).text,'alpha body');
 await page.keyboard.press('Control+Tab');assert.equal((await state()).id,b);await page.keyboard.press('Control+Shift+Tab');assert.equal((await state()).id,a);
 await tab(a).locator('[role=tab]').focus();await page.keyboard.press('ArrowRight');assert.equal((await state()).id,b);assert.equal(await tab(b).locator('[role=tab]').evaluate(el=>el===document.activeElement),true);
 // Close an inactive tab without changing current text, then reopen through Library.
 await tab(a).locator('.note-tab-close').click();await page.waitForFunction(id=>notes.find(n=>n.id===id).closed,a);assert.equal((await state()).id,b);assert.equal((await state()).text,'bravo body');
 await page.evaluate(id=>{$('notes-sidebar').hidden=false;libraryFilter('library');switchNote(id);},a);assert.deepEqual((await state()).order,[initial,b,a]);
 // Tab title changes follow the existing dialog; close selects the nearest remaining tab.
 await tab(a).locator('[role=tab]').dblclick();await page.locator('#note-name').fill('Alpha renamed.md');await page.locator('#note-rename').click();assert.equal(await tab(a).locator('[role=tab]').innerText(),'Alpha renamed');
 await tab(a).locator('.note-tab-close').click();await page.waitForFunction(id=>notes.find(n=>n.id===id).closed,a);assert.equal((await state()).id,b);
 await page.evaluate(async()=>{capturePosition();persist();await flushLibrary();});await stop();await launch();assert.deepEqual((await state()).order,[initial,b]);assert.equal((await state()).id,b);
 // Remove formatting from only part of a styled span, including undo and source mode.
 const formatted=await page.evaluate(()=>{createNote('Formatting','**hello world**');setMode('rich');return activeId;});await selectRich('hello world',0,5);
 assert.equal(await page.locator('#clear-format').isVisible(),true);assert.equal(await page.locator('#clear-format').isEnabled(),true);await page.locator('#clear-format').click();assert.equal(await page.locator('#rich-editor').innerText(),'hello world');
 assert.equal((await page.locator('#rich-editor strong,#rich-editor b').allInnerTexts()).join(''),' world');await page.keyboard.press('Control+z');assert.equal((await page.locator('#rich-editor strong,#rich-editor b').allInnerTexts()).join(''),'hello world');
 await page.evaluate(()=>{setMode('write');editor.focus();editor.setSelectionRange(0,editor.value.length);updateFormatting();});await page.locator('#clear-format').click();assert.equal((await state()).text,'hello world');await page.keyboard.press('Control+z');assert.equal((await state()).text,'**hello world**');
 await page.evaluate(()=>setMode('preview'));assert.equal(await page.locator('#clear-format').isDisabled(),true);await page.evaluate(()=>{setMode('rich');rich.focus();placeCaret(0);updateFormatting();});assert.equal(await page.locator('#clear-format').isDisabled(),true);
 // A second window shares notes but keeps its own tab set. Closing there cannot close here.
 const opened=app.waitForEvent('window');await page.keyboard.press('Control+Shift+n');const second=await opened;await ready(second);
 assert.equal(await second.locator('#note-tabs [role=tab]').count(),1);await second.evaluate(id=>switchNote(id),formatted);assert.equal(await second.locator('#note-tabs [role=tab]').count(),2);
 await second.evaluate(id=>closeLibraryNote(id),formatted);await second.evaluate(()=>flushLibrary());await page.waitForFunction(()=>!remoteLibrary&&!libraryWriting);assert.equal(await tab(formatted).count(),1);
 // Rename/Trash in another window updates this window's tabs.
 await second.evaluate(async id=>{activateNote(id);filename.value='Shared rename';persist();await flushLibrary();},formatted);await page.waitForFunction(id=>document.getElementById('note-tab-'+id)?.textContent==='Shared rename',formatted);
 await second.evaluate(async id=>{manageNote(id);$('note-trash').click();await flushLibrary();},formatted);await page.waitForFunction(id=>!document.getElementById('note-tab-'+id),formatted);
 // Many long names: one compact row, horizontal scrolling, visible active tab, light/dark contrast.
 await page.evaluate(()=>{for(let i=1;i<=12;i++)createNote('A long note title '+i,'Sample note '+i);prefs.sidebar=false;applyPrefs();});
 for(const width of [650,850,1250])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:700});await page.evaluate(theme=>{prefs.theme=theme;applyPrefs();},theme);await page.waitForTimeout(100);
  const g=await page.evaluate(()=>{const header=document.querySelector('header'),nav=$('note-tabs-bar'),active=$('note-tab-'+activeId),toggle=$('toggle-notes'),list=$('note-tabs');return {header:header.getBoundingClientRect().height,tabs:nav.getBoundingClientRect().height,overflow:document.body.scrollWidth>innerWidth,scroll:list.scrollWidth>list.clientWidth,toolbar:getComputedStyle(header).backgroundColor,paper:getComputedStyle(workspace).backgroundColor,first:header.firstElementChild===toggle,activeRight:active.getBoundingClientRect().right,listRight:list.getBoundingClientRect().right};});
  assert.equal(g.header,38);assert.equal(g.tabs,34);assert.equal(g.overflow,false);assert.equal(g.scroll,true);assert.equal(g.first,true);assert.notEqual(g.toolbar,g.paper);assert.ok(g.activeRight<=g.listRight+1,JSON.stringify(g));
  assert.ok(await page.evaluate(()=>$('note-tab-'+activeId).getBoundingClientRect().top>=$('note-tabs-bar').getBoundingClientRect().top),'Tab label must not be clipped vertically');
  assert.equal(await page.locator('#clear-format').isVisible(),true);await page.screenshot({path:path.join(profile,'tabs-'+width+'-'+theme+'.png')});
 }
 await page.evaluate(()=>focusMode(true));assert.equal(await page.locator('#note-tabs-bar').isVisible(),process.platform==='win32');assert.equal(await page.locator('#note-tabs').isVisible(),false);await page.keyboard.press('Escape');assert.equal(await page.locator('#note-tabs-bar').isVisible(),true);
 await page.emulateMedia({media:'print'});assert.equal(await page.locator('#note-tabs-bar').isVisible(),false);await page.emulateMedia({media:'screen'});
 // A failed close stays visibly open with its text; retry closes only after durable saving.
 await page.evaluate(()=>flushLibrary());const disk=path.join(profile,'library.json'),failedId=(await state()).id;
 await fs.rename(disk,disk+'.held');await fs.mkdir(disk);
 await page.evaluate(()=>{window.alert=message=>{window.tabAlert=message;};editor.value='Keep this failed-close text';loadRich();persist();clearTimeout(libraryTimer);});
 await tab(failedId).locator('.note-tab-close').click();await page.waitForFunction(()=>window.tabAlert?.includes('stay open')&&!closingTabs.size);
 assert.equal(await tab(failedId).count(),1);assert.equal((await state()).text,'Keep this failed-close text');
 await fs.rmdir(disk);await fs.rename(disk+'.held',disk);await tab(failedId).locator('.note-tab-close').click();await page.waitForFunction(id=>!document.getElementById('note-tab-'+id),failedId);
 assert.equal(await page.evaluate(id=>notes.find(n=>n.id===id).text,failedId),'Keep this failed-close text');
 // Close all tabs: retain the library and allow a fresh tab without deleting notes.
 await page.evaluate(async()=>{for(const note of [...notes].filter(n=>!n.closed&&!n.trashed))await closeLibraryNote(note.id);await flushLibrary();});assert.equal(await page.locator('#note-tabs [role=tab]').count(),0);assert.equal(await page.locator('#empty-workspace').isVisible(),true);
 await page.locator('#new-note-tab').click();assert.equal(await page.locator('#note-tabs [role=tab]').count(),1);assert.ok(await page.evaluate(id=>notes.some(n=>n.id===id&&n.text==='alpha body'),a));
 assert.deepEqual(errors,[]);console.log('PASS tabs: create/switch/close/reopen/rename/restart, caret, keyboard, multi-window state, selected formatting/undo, themes/overflow/focus/print and empty workspace. Screenshots: '+profile);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>stop());

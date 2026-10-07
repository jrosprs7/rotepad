const {_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
// Desktop right-click menu: Electron shows none by default. Native menus cannot be clicked by automation, so popups
// are captured in the main process and their items invoked there. The user's clipboard text is saved and restored.
let host,page,savedClipboard=null,checks=0;
const menu=()=>host.evaluate(()=>{const m=globalThis.__menus.at(-1);return m?m.items.map(i=>({label:i.label,role:i.role||'',enabled:i.enabled,type:i.type})):null;});
const labels=items=>items.filter(i=>i.type!=='separator').map(i=>i.label);
async function rightClick(x,y){await host.evaluate(()=>{globalThis.__menus=[];});await page.mouse.click(x,y,{button:'right'});await page.waitForTimeout(250);return menu();}
async function choose(label){await host.evaluate(({BrowserWindow},label)=>{const win=BrowserWindow.getAllWindows()[0],item=globalThis.__menus.at(-1).items.find(i=>i.label===label);if(!item)throw Error('Missing menu item '+label);item.click(undefined,win,win.webContents);},label);await page.waitForTimeout(250);}
const clip=()=>host.evaluate(({clipboard})=>clipboard.readText());
const source=()=>page.evaluate(()=>{if(mode==='rich')commitRich();return editor.value;});
async function wordBox(word){return page.evaluate(word=>{const w=document.createTreeWalker(rich,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())if(n.data.includes(word)){const r=document.createRange(),i=n.data.indexOf(word);r.setStart(n,i);r.setEnd(n,i+word.length);const b=r.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};}throw Error('Missing '+word);},word);}
(async()=>{
 const profile=path.join(__dirname,'test-profile','context-menu-'+Date.now());await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}),{flag:'wx'});
 host=await _electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await host.firstWindow();await page.waitForFunction(()=>typeof flushLibrary==='function');
 savedClipboard=await clip();await host.evaluate(({Menu})=>{globalThis.__menus=[];Menu.prototype.popup=function(){globalThis.__menus.push(this);};});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(()=>{createNote('Context menu','Alpha beta gamma\n\nVisit [Example](https://example.com/) now');setMode('rich');rich.focus();});

 // Editable text with no selection: editing commands, Cut/Copy disabled.
 let box=await wordBox('beta');await page.mouse.click(box.x,box.y);let items=await rightClick(box.x,box.y);
 assert.deepEqual(labels(items),['Undo','Redo','Cut','Copy','Paste','Select All']);assert.deepEqual(items.filter(i=>['cut','copy'].includes(i.role)).map(i=>i.enabled),[false,false]);checks++;
 // Selected word: Copy, Cut, Paste and Undo all act on the note through the app's own paths.
 await page.mouse.dblclick(box.x,box.y);if((await page.evaluate(()=>getSelection().toString())).endsWith(' '))await page.keyboard.press('Shift+ArrowLeft');
 items=await rightClick(box.x,box.y);assert.deepEqual(items.filter(i=>['cut','copy'].includes(i.role)).map(i=>i.enabled),[true,true]);
 await choose('Copy');assert.equal(await clip(),'beta');checks++;
 await choose('Cut');assert.equal(await source(),'Alpha  gamma\n\nVisit [Example](https://example.com/) now');assert.equal(await clip(),'beta');checks++;
 await rightClick(box.x,box.y);await choose('Undo');assert.equal(await source(),'Alpha beta gamma\n\nVisit [Example](https://example.com/) now','Undo restores through app history');checks++;
 await rightClick(box.x,box.y);await choose('Redo');assert.equal(await source(),'Alpha  gamma\n\nVisit [Example](https://example.com/) now');checks++;
 await host.evaluate(({clipboard})=>clipboard.writeText('pasted\nlines'));box=await wordBox('gamma');await page.mouse.click(box.x+40,box.y);await rightClick(box.x+40,box.y);await choose('Paste');
 assert.match(await source(),/^Alpha {2}gammapasted\nlines\n/,'Paste inserts plain text at the caret');checks++;
 await rightClick(box.x,box.y);await choose('Select All');assert.match(await page.evaluate(()=>getSelection().toString()),/Alpha[\s\S]*now/);checks++;

 // Links: open/copy for http(s) only; Open link uses the existing safe external opener (mocked).
 await host.evaluate(({shell})=>{globalThis.__opened=[];shell.openExternal=url=>{globalThis.__opened.push(url);return Promise.resolve();};});
 box=await wordBox('Example');items=await rightClick(box.x,box.y);assert.deepEqual(labels(items).slice(-2),['Open link','Copy link address']);
 await choose('Copy link address');assert.equal(await clip(),'https://example.com/');await rightClick(box.x,box.y);await choose('Open link');assert.deepEqual(await host.evaluate(()=>globalThis.__opened),['https://example.com/']);checks++;

 // Misspelled word: suggestions come first, then Add to dictionary, then editing commands. The spellchecker did not report
 // misspellings in development Electron here, so the event's documented misspelling fields are supplied directly.
 const spelling=async suggestions=>{await host.evaluate(({BrowserWindow},suggestions)=>{globalThis.__menus=[];const win=BrowserWindow.getAllWindows()[0];win.webContents.emit('context-menu',{},{isEditable:true,misspelledWord:'teh',dictionarySuggestions:suggestions,editFlags:{canCut:false,canCopy:false,canPaste:true},selectionText:'',linkURL:''});},suggestions);return labels(await menu());};
 assert.deepEqual(await spelling(['the','tech','ten']),['the','tech','ten','Add to dictionary','Undo','Redo','Cut','Copy','Paste','Select All']);
 assert.deepEqual((await spelling([])).slice(0,2),['No spelling suggestions','Add to dictionary']);checks++;

 // Markdown view textarea gets the same editing menu.
 await page.evaluate(()=>{setMode('write');editor.focus();editor.setSelectionRange(0,1);});const area=await page.locator('#editor').boundingBox();
 items=await rightClick(area.x+30,area.y+20);assert.deepEqual(labels(items).slice(0,2),['Undo','Redo']);assert.ok(labels(items).includes('Paste'));checks++;
 // Tabs keep their own right-click (note options); no Electron menu pops up there.
 await page.evaluate(()=>setMode('rich'));const tab=await page.locator('.note-tab').first().boundingBox();items=await rightClick(tab.x+30,tab.y+tab.height/2);
 assert.equal(items,null);assert.equal(await page.locator('#note-actions-dialog').evaluate(d=>d.open),true);await page.keyboard.press('Escape');checks++;
 // Non-editable chrome without a selection shows nothing.
 const status=await page.locator('footer').boundingBox();await page.evaluate(()=>getSelection().removeAllRanges());items=await rightClick(status.x+status.width-40,status.y+status.height/2);assert.equal(items,null);checks++;
 assert.deepEqual(errors,[]);
 console.log(`PASS ${checks} desktop context-menu checks: editing commands and states, Copy/Cut/Paste/Undo/Redo/Select All on the note, link open/copy, spelling suggestion, Markdown view, tab note options and plain chrome.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(host){if(savedClipboard!==null)await host.evaluate(({clipboard},text)=>clipboard.writeText(text),savedClipboard).catch(()=>{});await host.close();}});

const {_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
// Opened .txt/.md files are written back on save. Uses disposable files and an isolated development profile.
let host,page,checks=0;
const profile=path.join(__dirname,'test-profile','linked-'+Date.now()),files=path.join(profile,'files');
async function launch(args=[]){host=await _electron.launch({executablePath:require('electron'),args:[__dirname,...args],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await host.firstWindow();await page.waitForFunction(()=>typeof flushLibrary==='function'&&typeof linkedFilesReady!=='undefined');await page.evaluate(()=>linkedFilesReady);await page.evaluate(()=>{window.__dialogs=[];window.alert=m=>window.__dialogs.push(['alert',m]);window.__confirm=[];window.confirm=m=>{window.__dialogs.push(['confirm',m]);return window.__confirm.shift()??false;};});}
async function closeApp(){await host.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());await host.waitForEvent('close',{timeout:15000}).catch(()=>{});host=null;}
async function openWithPicker(file){await host.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);await page.evaluate(()=>$('open').click());await page.waitForFunction(name=>activeNote()?.name.startsWith(name),path.basename(file,path.extname(file)));await page.evaluate(()=>linkedFilesReady);await page.waitForTimeout(150);}
async function typeAtEnd(text){await page.evaluate(()=>{setMode('rich');rich.focus();const r=document.createRange();r.selectNodeContents(rich);r.collapse(false);getSelection().removeAllRanges();getSelection().addRange(r);rememberRange();});await page.keyboard.type(text);}
const save=()=>page.keyboard.press('Control+s').then(()=>page.waitForTimeout(500));
const bytes=file=>fs.readFile(file);
(async()=>{
 await fs.mkdir(files,{recursive:true});await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}),{flag:'wx'});
 const lines=['# TODO not a heading','1. step one','  3. indented step','- dash','* star','+ plus','> quote','```','***','---','===','a | b','|---|---|','--- | ---','**bold** _u_ ~~s~~ ==h== `code`','[link](https://e.example/)','back\\slash a\\.b \\- \\#','example.com notes.md www.site.md','tab\there','  leading','trailing  ','','emoji 😀 日本語 <b>tag</b> &amp;','    - indented','1) paren','2024. year','- [ ] task','12.5 value','*','#','#tag','>','|','1.','-'];
 const txt=path.join(files,'plain notes.txt'),original='﻿'+lines.join('\r\n')+'\r\n';await fs.writeFile(txt,original,'utf8');
 const md=path.join(files,'readme.md');await fs.writeFile(md,'# Title\n\nSome *text*.\n','utf8');
 const latin=path.join(files,'latin.txt');await fs.writeFile(latin,Buffer.from([0x63,0x61,0x66,0xe9,0x0a]));
 await launch([txt]);const errors=[];page.on('pageerror',e=>errors.push(e.message));

 // Literal text round trip, both directly and after the Formatted editor re-serializes the note.
 const trips=await page.evaluate(lines=>{const failures=[];const cases=[...lines.map(l=>l),lines.join('\n'),lines.join('\n')+'\n','','\n\na\n\n'];for(const raw of cases){const lit=literalMarkdown(raw);if(plainText(lit)!==raw)failures.push(['direct',raw,plainText(lit)]);const box=document.createElement('div');box.innerHTML=markdown(lit);const again=richMarkdown(box);if(plainText(again)!==raw)failures.push(['editor',raw,plainText(again)]);}return failures;},lines);
 assert.deepEqual(trips,[]);checks++;
 // The opened .txt shows literal lines and is not written before an edit.
 await page.waitForFunction(()=>activeNote()?.name.startsWith('plain notes'));
 assert.equal(await page.locator('#rich-editor h1,#rich-editor ol,#rich-editor ul,#rich-editor blockquote,#rich-editor table,#rich-editor pre').count(),0);
 assert.match(await page.locator('#linked-status').textContent(),/Also saves to plain notes\.txt/);await save();assert.equal((await bytes(txt)).toString('utf8'),original,'no write without an edit');checks++;
 // Ctrl+S writes the edit, keeping BOM, CRLF and every untouched line.
 await typeAtEnd('added line');await save();
 assert.equal((await bytes(txt)).toString('utf8'),'﻿'+[...lines,'added line'].join('\r\n'),'only the edit changes');checks++;
 // Autosave writes without Ctrl+S.
 await page.keyboard.type(' again');await page.waitForTimeout(1500);assert.match((await bytes(txt)).toString('utf8'),/added line again$/);checks++;
 // Formatting added in Rotepad cannot be stored in .txt; the text is written plainly.
 await page.keyboard.press('Enter');await page.keyboard.press('Control+b');await page.keyboard.type('bold words');await page.keyboard.press('Control+b');await save();
 assert.match((await bytes(txt)).toString('utf8'),/added line again\r\nbold words$/);checks++;
 // Outside change: Cancel stops linking and leaves the file alone.
 await fs.appendFile(txt,'\r\nchanged outside');await typeAtEnd(' local');await save();
 assert.equal((await page.evaluate(()=>window.__dialogs.pop()))[0],'confirm');assert.match((await bytes(txt)).toString('utf8'),/changed outside$/);
 assert.equal(await page.locator('#linked-status').isVisible(),false);await typeAtEnd(' more');await save();assert.match((await bytes(txt)).toString('utf8'),/changed outside$/);checks++;

 // Markdown file: Markdown written back with LF; outside change then OK overwrites.
 await openWithPicker(md);assert.equal(await page.locator('#rich-editor h1').textContent(),'Title');
 await typeAtEnd(' More.');await save();assert.equal((await bytes(md)).toString('utf8'),'# Title\n\nSome *text*.\n More.');checks++;
 await fs.writeFile(md,'# Title\n\nOutside edit\n','utf8');await page.evaluate(()=>window.__confirm.push(true));await typeAtEnd('!');await save();
 assert.equal((await page.evaluate(()=>window.__dialogs.pop()))[0],'confirm');assert.equal((await bytes(md)).toString('utf8'),'# Title\n\nSome *text*.\n More.!');checks++;
 // Missing file is never recreated.
 await fs.unlink(md);await typeAtEnd('?');await save();await assert.rejects(fs.access(md));assert.match(await page.locator('#linked-status').textContent(),/moved or deleted/);checks++;
 // Non-UTF-8 text is never written back.
 const latinBefore=await bytes(latin);await openWithPicker(latin);assert.match((await page.evaluate(()=>window.__dialogs.pop()))[1],/not UTF-8/);
 await typeAtEnd(' edited');await save();assert.deepEqual(await bytes(latin),latinBefore);assert.equal(await page.locator('#linked-status').isVisible(),false);checks++;

 // Restart: a fresh .txt link persists, an unchanged file is not prompted or rewritten, and the next edit saves.
 const second=path.join(files,'second.txt');await fs.writeFile(second,'one\ntwo\n','utf8');await openWithPicker(second);await typeAtEnd('three');await page.waitForTimeout(200);
 await closeApp();assert.equal((await bytes(second)).toString('utf8'),'one\ntwo\nthree','close flushes the linked file');
 await launch();await page.evaluate(id=>{},null);const secondId=await page.evaluate(()=>notes.find(n=>n.name.startsWith('second'))?.id);activateNoteById:{await page.evaluate(id=>activateNote(id),secondId);}
 await save();assert.deepEqual(await page.evaluate(()=>window.__dialogs),[]);assert.equal((await bytes(second)).toString('utf8'),'one\ntwo\nthree');
 await typeAtEnd(' four');await save();assert.equal((await bytes(second)).toString('utf8'),'one\ntwo\nthree four');checks++;
 assert.deepEqual(errors,[]);
 console.log(`PASS ${checks} linked-file checks: literal .txt round trips (direct and re-serialized), no write without edits, BOM/CRLF/untouched lines kept, autosave and Ctrl+S, plain text for formatting, outside-change Cancel/OK, Markdown write-back, missing file not recreated, non-UTF-8 protected, close flush and restart.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(host)await host.close();});

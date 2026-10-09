const {chromium,_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
// Regressions for the 2026-10-06 QA data-loss findings (docs/QA-2026-10-06.md D1-D7, F1-F2).
const native=process.argv.includes('--desktop');let host,page,profile,checks=0;
async function fresh(text='',view='rich'){await page.evaluate(({text,view})=>{prefs.autoMarkdown=false;createNote('Data safety',text);setMode(view);(view==='rich'?rich:editor).focus();},{text,view});}
async function caretBefore(text){await page.evaluate(text=>{rich.focus();const w=document.createTreeWalker(rich,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())if(n.data.includes(text)){const r=document.createRange();r.setStart(n,n.data.indexOf(text));r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);rememberRange();return;}throw Error('Missing caret text: '+text);},text);}
async function source(){return page.evaluate(()=>{if(mode==='rich')commitRich();return editor.value;});}
async function expectSource(expected,label){assert.equal(await source(),expected,label);checks++;}
async function roundtrip(){await page.evaluate(()=>{commitRich();setMode('write');setMode('rich');});}
async function paste(text){await page.evaluate(text=>{const data=new DataTransfer();data.setData('text/plain',text);rich.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},text);}
const selectedText=()=>page.evaluate(()=>getSelection().toString());
(async()=>{
 if(native){profile=path.join(__dirname,'test-profile','data-safety-'+Date.now());await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}),{flag:'wx'});host=await _electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await host.firstWindow();await page.waitForFunction(()=>typeof flushLibrary==='function');}
 else{host=await chromium.launch({channel:'msedge',headless:true});page=await host.newPage();await page.goto(pathToFileURL(path.resolve(__dirname,'../Rotepad.html')).href);}
 const errors=[];page.on('pageerror',e=>errors.push(e.message));

 // D1: Enter, ↓ and typing in Find never edit the note; Escape selects the current match in the note.
 for(const view of ['rich','write']){
  const text='one cat two cat three cat';await fresh('',view);if(view==='rich')await page.keyboard.type(text);else await page.evaluate(t=>{editor.value=t;change();},text);
  await page.keyboard.press('Control+f');await page.keyboard.type('cat');
  for(let i=0;i<3;i++)await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'find-text',view);await expectSource(text,view+' Enter in Find');
  assert.equal(await page.evaluate(()=>CSS.highlights.get('find-current')?.size),1,view+' current match painted');
  await page.locator('#find-next').click();await page.keyboard.type('z');await expectSource(text,view+' typing after ↓');
  await page.locator('#find-text').fill('cat');await page.keyboard.press('Enter');await page.keyboard.press('Escape');
  if(view==='rich'){assert.equal(await page.evaluate(()=>document.activeElement===rich),true);assert.equal(await selectedText(),'cat');}
  else assert.deepEqual(await page.evaluate(()=>[document.activeElement===editor,editor.value.slice(editor.selectionStart,editor.selectionEnd)]),[true,'cat']);
  checks++;
 }
 // Markdown view scrolls a wrapped, far-down match into view and paints it.
 await fresh('','write');await page.evaluate(()=>{editor.value=Array.from({length:40},(_,i)=>'Paragraph '+i+' '+'long words wrap across the line '.repeat(8)).join('\n')+'\nneedle';change();});
 await page.keyboard.press('Control+f');await page.keyboard.type('needle');await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>{const box=CSS.highlights.get('find-current').values().next().value.getBoundingClientRect(),view=editor.getBoundingClientRect();return box.height>0&&box.top>=view.top&&box.bottom<=view.bottom;}),true);checks++;
 await page.keyboard.press('Escape');

 // D2/D3: whole-item Shift+Tab/Tab with a selection, Undo and bullets; selection stays on the items.
 await fresh('1. aaa\n    1. bbb\n    2. ccc');await caretBefore('bbb');await page.keyboard.press('Shift+ArrowDown');await page.keyboard.press('Shift+End');
 await page.keyboard.press('Shift+Tab');await expectSource('1. aaa\n2. bbb\n3. ccc','selected nested items outdent');assert.match(await selectedText(),/bbb[\s\S]*ccc/);
 await page.keyboard.press('Tab');await expectSource('1. aaa\n    1. bbb\n    2. ccc','selected items indent again');
 await page.keyboard.press('Control+z');await expectSource('1. aaa\n2. bbb\n3. ccc','undo indent');await page.keyboard.press('Control+z');await expectSource('1. aaa\n    1. bbb\n    2. ccc','undo outdent');
 await fresh('1. aaa\n    1. bbb\n    2. ccc');await caretBefore('bb');await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Shift+Tab');
 await expectSource('1. aaa\n2. bbb\n    2. ccc','partial word selection outdents its item; later siblings become its children and keep their numbers');
 for(const [marker,next] of [['1. ',n=>n+'. '],['- ',()=>'- ']]){
  await fresh();await page.keyboard.type(marker+'aaa');await page.keyboard.press('Enter');await page.keyboard.type('bbb');await page.keyboard.press('Enter');await page.keyboard.type('ccc');
  if(marker==='- ')await page.evaluate(()=>{setMode('write');editor.value='- aaa\n- bbb\n- ccc';change();setMode('rich');});
  const flat=['aaa','bbb','ccc'].map((t,i)=>next(i+1)+t).join('\n');await caretBefore('ccc');await page.keyboard.press('End');await page.keyboard.press('Shift+ArrowUp');
  await page.keyboard.press('Tab');await expectSource(next(1)+'aaa\n    '+next(1)+'bbb\n    '+next(2)+'ccc',marker+' Tab on selected items');
  await page.keyboard.press('Control+z');await expectSource(flat,marker+' Undo after Tab');await roundtrip();await expectSource(flat,marker+' round trip');
 }
 await fresh('1. aaa\n2. bbb');await caretBefore('aaa');await page.keyboard.press('Shift+ArrowDown');await page.keyboard.press('Tab');await expectSource('1. aaa\n2. bbb','first item cannot indent');
 await fresh('1. aaa\n    1. bbb');await caretBefore('bbb');await page.keyboard.press('ArrowRight');await page.keyboard.press('Shift+Tab');await expectSource('1. aaa\n2. bbb','caret Shift+Tab');
 await page.keyboard.type('X');await expectSource('1. aaa\n2. bXbb','caret stays inside the moved item');

 // D4: code-block Enter, Shift+Enter and multiline paste keep their lines.
 for(const key of ['Enter','Shift+Enter']){await fresh('```\nline1\nline2\n```');await caretBefore('line1');await page.keyboard.press('End');await page.keyboard.press(key);await page.keyboard.type('inserted');
  await expectSource('```\nline1\ninserted\nline2\n```',key+' in code');await roundtrip();await expectSource('```\nline1\ninserted\nline2\n```',key+' code round trip');}
 await fresh('```\nline1\n```');await caretBefore('line1');await page.keyboard.press('End');await paste('\nalpha\nbeta');assert.match(await source(),/^```\nline1\nalpha\nbeta\n?```$/);checks++;

 // D5: Backspace at a task's text start removes the checkbox with the marker; no glyph reaches Markdown.
 await fresh('- [ ] Alpha\n- [ ] Beta');await caretBefore('Beta');await page.keyboard.press('Backspace');
 await expectSource('- [ ] Alpha\nBeta','task marker removed');assert.equal(await page.locator('#rich-editor p .task-box').count(),0);
 await page.keyboard.press('Backspace');await page.keyboard.press('Backspace');assert.doesNotMatch(await source(),/[☐☑]/);checks++;
 await page.keyboard.press('Control+z');await page.keyboard.press('Control+z');await page.keyboard.press('Control+z');await expectSource('- [ ] Alpha\n- [ ] Beta','undo task marker removal');
 await fresh('- [ ] Alpha\n- [x] Beta');await caretBefore('Alpha');await page.keyboard.press('End');await page.keyboard.press('Delete');assert.doesNotMatch(await source(),/[☐☑]/);checks++;
 await fresh('- [ ] Alpha\n- [x] Beta');await caretBefore('Beta');await page.keyboard.press('Control+Backspace');assert.doesNotMatch(await source(),/[☐☑]/);checks++;
 await fresh('- [ ] Alpha\n- [x] Beta');await caretBefore('pha');await page.keyboard.press('Shift+ArrowDown');await page.keyboard.press('Shift+Home');await page.keyboard.press('Delete');assert.doesNotMatch(await source(),/[☐☑]/);assert.match(await source(),/Al/);checks++;
 await fresh('1. Parent\n    - [ ] Child');await caretBefore('Child');await page.keyboard.press('Backspace');await expectSource('1. Parent\n2. [ ] Child','nested task outdents and stays a task');

 // D6: clearing or replacing formatted text never writes empty markers.
 await fresh('**boldword** rest');await caretBefore('word');for(let i=0;i<4;i++)await page.keyboard.press('Shift+ArrowRight');
 await page.evaluate(()=>{rememberRange();updateFormatting();$('clear-format').click();});await expectSource('**bold**word rest','clear end of bold word');
 await fresh('**bold** *ital* [lnk](https://e.example/)');await page.keyboard.press('Control+a');await page.evaluate(()=>{rememberRange();updateFormatting();$('clear-format').click();});await expectSource('bold ital lnk','clear whole line');
 await fresh('ab**cd**ef');await page.keyboard.press('Control+f');await page.keyboard.type('bcd');await page.evaluate(()=>{$('replace-text').value='X';replaceFound(true);});await expectSource('aXef','replace across bold boundary');await page.keyboard.press('Escape');

 // D7: multiline paste into a brand-new note keeps every line.
 for(const [text,expected] of [['First\nSecond\nThird','First\nSecond\nThird'],['alpha\n\nbeta','alpha\n\nbeta'],['--\n---','--\n---']]){await fresh();await paste(text);await expectSource(expected,'blank paste '+JSON.stringify(text));await roundtrip();await expectSource(expected,'blank paste round trip');}

 // Copy: typed lines go to the clipboard one line break apart (Chromium's default added a blank line between paragraphs); a typed blank line stays, and pasting the copy back keeps the same lines.
 const copied=()=>page.evaluate(()=>{const data=new DataTransfer();rich.dispatchEvent(new ClipboardEvent('copy',{clipboardData:data,bubbles:true,cancelable:true}));return {plain:data.getData('text/plain'),html:data.getData('text/html')};});
 await fresh();for(const [i,line] of ['Hello this is rotepad.','i pressed enter','','and the 3rd line'].entries()){if(i)await page.keyboard.press('Enter');await page.keyboard.type(line);}
 await page.keyboard.press('Control+A');let copy=await copied();assert.equal(copy.plain,'Hello this is rotepad.\ni pressed enter\n\nand the 3rd line');assert.match(copy.html,/i pressed enter/);checks++;
 await caretBefore('pressed');await page.keyboard.press('Shift+End');assert.equal((await copied()).plain,'pressed enter','a partial line copies as itself');checks++;
 await fresh();await paste('Hello this is rotepad.\ni pressed enter\n\nand the 3rd line');await expectSource('Hello this is rotepad.\ni pressed enter\n\nand the 3rd line','copied lines paste back unchanged');

 // F1/F2: typed # and ~~ stay literal through save/reopen; file names and typos are not auto-linked; web addresses still are.
 await fresh();await page.keyboard.type('# Not a heading');await page.keyboard.press('Enter');await page.keyboard.type('~~not struck~~');await page.keyboard.press('Enter');await page.keyboard.type('## two #tag');
 await expectSource('\\# Not a heading\n\\~\\~not struck\\~\\~\n\\## two #tag','literal # and ~~ escaped');await roundtrip();
 assert.equal(await page.locator('#rich-editor h1,#rich-editor h2,#rich-editor del').count(),0);assert.equal(await page.evaluate(()=>[...rich.childNodes].map(n=>n.textContent).join('\n')),'# Not a heading\n~~not struck~~\n## two #tag');checks++;
 await fresh('# Real heading\n~~real strike~~');assert.equal(await page.locator('#rich-editor h1').count(),1);assert.equal(await page.locator('#rich-editor del').count(),1);await roundtrip();await expectSource('# Real heading\n~~real strike~~','explicit heading/strike unchanged');
 await fresh();await page.keyboard.type('Open notes.md, file.txt, node.js, index.html and README.md. The end.Next by Mr.Smith');
 assert.equal(await page.locator('#rich-editor a').count(),0);await expectSource('Open notes.md, file.txt, node.js, index.html and README.md. The end.Next by Mr.Smith','file names stay text');
 await fresh();await page.keyboard.type('Visit example.com, claude.ai, www.site.md and https://x.md/a today');
 assert.deepEqual(await page.locator('#rich-editor a').allTextContents(),['example.com','claude.ai','www.site.md','https://x.md/a']);checks++;
 await fresh('See notes.md and [notes.md](https://notes.md/) and example.org');assert.deepEqual(await page.locator('#rich-editor a').allTextContents(),['notes.md','example.org']);checks++;

 // Persisted escapes survive save and reload (and the managed Markdown file on desktop).
 await fresh();await paste('First\nSecond');await page.keyboard.press('Enter');await page.keyboard.type('# literal');const saved=await page.evaluate(()=>{commitRich();persist();return {id:activeId,text:editor.value};});
 assert.equal(saved.text,'First\nSecond\n\\# literal');if(native){await page.evaluate(()=>flushLibrary());const index=JSON.parse(await fs.readFile(path.join(profile,'managed-notes.json'),'utf8'));assert.equal(await fs.readFile(index[saved.id].file,'utf8'),saved.text);}
 await page.reload();await page.waitForFunction(()=>typeof rich!=='undefined'&&rich.textContent.includes('literal'));assert.equal(await page.locator('#rich-editor h1').count(),0);assert.equal(await page.evaluate(()=>[...rich.childNodes].map(n=>n.textContent).join('\n')),'First\nSecond\n# literal');checks++;
 assert.deepEqual(errors,[]);
 console.log(`PASS ${checks} data-safety checks in ${native?'Electron':'Edge'}: Find keeps focus, selected list indent/outdent and Undo, code lines, task Backspace/Delete, empty markers, blank-note paste, single-spaced copy, literal # and ~~, file-name links and reload.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(host)await host.close();});

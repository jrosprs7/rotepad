const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto(pathToFileURL(path.resolve(__dirname,'../Rotepad.html')).href);
 // Backspace removes a marker at the start of nonempty items, preserving text.
 for(const source of ['4. **First**\n5. Second','1. First\n2. Second','- **First**\n- Second']){
  await page.evaluate(source=>{createNote('Start',source);setMode('rich');rich.focus();const r=document.createRange();r.setStart(rich.querySelector('li'),0);r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);rememberRange();},source);
  await page.keyboard.press('Backspace');assert.equal(await page.locator('#rich-editor > p').first().innerText(),'First');assert.equal(await page.locator('#rich-editor li').innerText(),'Second');
  if(source.startsWith('4.')){assert.equal(await page.locator('#rich-editor ol').getAttribute('start'),'5');assert.equal(await page.locator('#rich-editor strong').innerText(),'First');}
  const saved=await page.evaluate(()=>editor.value);await page.evaluate(()=>{setMode('write');setMode('rich');});assert.equal(await page.evaluate(()=>editor.value),saved);
 }
 await page.evaluate(()=>{createNote('Middle','1. First\n2. Second\n3. Third');rich.focus();const r=document.createRange();r.setStart(rich.querySelectorAll('li')[1],0);r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);rememberRange();});
 await page.keyboard.press('Backspace');assert.equal(await page.locator('#rich-editor > p').innerText(),'Second');assert.equal(await page.locator('#rich-editor ol').last().getAttribute('start'),'3');
 await page.keyboard.press('Control+z');assert.equal(await page.locator('#rich-editor li').count(),3);
 await page.evaluate(()=>{createNote('Nested','1. Parent\n    1. Child\n2. Next');rich.focus();const r=document.createRange();r.setStart(rich.querySelector('li li'),0);r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);rememberRange();});
 await page.keyboard.press('Backspace');assert.equal(await page.locator('#rich-editor li li').count(),0);assert.match(await page.locator('#rich-editor').innerText(),/Child/);
 await page.evaluate(()=>{prefs.autoMarkdown=false;createNote('Numbers','');rich.focus();});
 await page.keyboard.type('1. First');await page.keyboard.press('Enter');await page.keyboard.type('Second');await page.keyboard.press('Enter');await page.keyboard.type('Third');await page.keyboard.press('Enter');
 assert.equal(await page.locator('#rich-editor ol li').count(),4);
 await page.keyboard.press('Backspace');await page.keyboard.type('Normal');assert.equal(await page.locator('#rich-editor ol li').count(),3);assert.equal(await page.locator('#rich-editor p').last().innerText(),'Normal');
 await page.evaluate(()=>{createNote('Menu','');rich.focus();rememberRange();$('numbered-list').click();});await page.keyboard.type('Menu item');await page.keyboard.press('Enter');assert.equal(await page.locator('#rich-editor ol li').count(),2);await page.keyboard.press('Enter');await page.keyboard.type('Outside');assert.equal(await page.locator('#rich-editor ol li').count(),1);
 await page.evaluate(()=>{createNote('Literal','');rich.focus();});await page.keyboard.type('**literal**');assert.equal(await page.locator('#rich-editor strong').count(),0);
 await page.evaluate(()=>{setMode('write');editor.value='1. First';editor.focus();editor.setSelectionRange(editor.value.length,editor.value.length);});await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>editor.value),'1. First\n2. ');await page.keyboard.press('Backspace');assert.equal(await page.evaluate(()=>editor.value),'1. First\n');
 await page.evaluate(()=>{editor.value='9. Ninth';editor.setSelectionRange(8,8);});await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>editor.value),'9. Ninth\n10. ');
 await page.evaluate(()=>{editor.value='one\ntwo';editor.select();$('numbered-list').click();});assert.equal(await page.evaluate(()=>editor.value),'1. one\n2. two');
 await page.evaluate(()=>{prefs.autoMarkdown=true;createNote('Enabled','');setMode('rich');rich.focus();});await page.keyboard.type('1. First');await page.keyboard.press('Enter');assert.equal(await page.locator('#rich-editor ol li').count(),2);
 console.log('PASS numbered lists: default typed continuation, menu, Enter/Backspace exit, source continuation, 9 to 10, selection numbering, optional formatting on/off.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

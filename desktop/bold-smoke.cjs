const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto(pathToFileURL(path.resolve(__dirname,'../Rotepad.html')).href);
 await page.evaluate(()=>{prefs.autoMarkdown=true;});
 for(const value of ['**bold** normal','before **bold** after','**first** and **second** end','**two words** normal','*italic* normal','__underlined__ normal']){
  await page.evaluate(()=>{createNote('Bold test.md','');setMode('rich');rich.focus();});await page.keyboard.type(value);
  assert.equal(await page.evaluate(()=>editor.value),value);
  assert.equal(await page.evaluate(()=>document.queryCommandState('bold')),false);
  await page.evaluate(()=>loadRich());assert.equal(await page.evaluate(()=>richMarkdown()),value);
 }
 await page.evaluate(()=>{createNote('Middle.md','before  after');setMode('rich');rich.focus();placeCaret(7);});await page.keyboard.type('**bold**');
 assert.equal(await page.evaluate(()=>editor.value),'before **bold** after');
 await page.keyboard.type(' normal');assert.equal(await page.evaluate(()=>editor.value),'before **bold** normal after');
 await page.evaluate(()=>{createNote('Enter.md','');setMode('rich');rich.focus();});await page.keyboard.type('**bold**');await page.keyboard.press('Enter');await page.keyboard.type('normal');
 assert.equal(await page.locator('#rich-editor strong').innerText(),'bold');
 await page.evaluate(()=>{createNote('Canceled.md','');setMode('rich');rich.focus();});await page.keyboard.type('**literal**');await page.keyboard.press('Backspace');await page.keyboard.type(' **fresh** normal');
 assert.equal(await page.locator('#rich-editor strong').innerText(),'fresh');
 console.log('Bold typing passed: normal trailing text, multiple phrases, middle-of-line insertion, Enter, and Markdown round trips. Italic/underline trailing text also passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

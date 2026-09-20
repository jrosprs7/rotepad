const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto(pathToFileURL(path.resolve(__dirname,'../Rotepad.html')).href);
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

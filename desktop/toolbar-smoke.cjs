const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../Rotepad.html')).href);
 for(const width of [1400,850,700,360,1400]){
  await page.setViewportSize({width,height:800});await page.waitForTimeout(100);
  const layout=await page.evaluate(()=>{const bar=document.querySelector('.toolbar');return {height:bar.getBoundingClientRect().height,overflow:bar.scrollWidth>bar.clientWidth+1,hidden:document.querySelector('#overflow-controls').children.length,topMenu:!document.getElementById('compact-app-menu').hidden};});
  assert.ok(layout.height<=50,JSON.stringify({width,...layout}));assert.equal(layout.overflow,false);assert.equal(layout.topMenu,width<850);
  if(width===1400)assert.equal(layout.hidden,0);if(width===360)assert.ok(layout.hidden>=3);
 }
 await page.setViewportSize({width:360,height:800});await page.waitForTimeout(100);
 await page.evaluate(()=>{createNote('Toolbar test.md','select this');setMode('rich');rich.focus();const r=document.createRange();r.selectNodeContents(rich);getSelection().removeAllRanges();getSelection().addRange(r);rememberRange();});
 await page.locator('#more-format>summary').click();await page.locator('#link').click();assert.equal(await page.locator('#link-text').inputValue(),'select this');await page.locator('#cancel-link').click();
 await page.locator('#more-format>summary').click();await page.locator('#font').selectOption('Arial');assert.equal(await page.locator('#font').inputValue(),'Arial');
 await page.screenshot({path:path.resolve(__dirname,'../dist/toolbar-overflow.png')});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#more-format').getAttribute('open'),null);
 await page.locator('#compact-app-menu>summary').click();await page.locator('#settings').click();assert.equal(await page.locator('#settings-dialog').evaluate(e=>e.open),true);await page.keyboard.press('Escape');
 await page.screenshot({path:path.resolve(__dirname,'../dist/toolbar-narrow.png')});
 await page.setViewportSize({width:1400,height:800});await page.waitForTimeout(100);await page.screenshot({path:path.resolve(__dirname,'../dist/toolbar-wide.png')});
 // Real mouse: select a word, open », Clear formatting stays enabled and clears only that word (it used to grey out).
 for(const width of [1400,700,360]){
  await page.setViewportSize({width,height:800});await page.waitForTimeout(100);
  await page.evaluate(()=>{createNote('Clear test.md','Some **bold words** and *italic* text');setMode('rich');rich.focus();});
  const box=await page.evaluate(()=>{const s=rich.querySelector('strong').firstChild,r=document.createRange();r.setStart(s,5);r.setEnd(s,10);const b=r.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};});
  await page.mouse.dblclick(box.x,box.y);if((await page.evaluate(()=>getSelection().toString())).endsWith(' '))await page.keyboard.press('Shift+ArrowLeft');
  await page.locator('#more-format>summary').click();assert.equal(await page.locator('#more-format').getAttribute('open'),'');
  assert.equal(await page.locator('#clear-format').isEnabled(),true,'Clear formatting enabled at '+width);assert.equal(await page.evaluate(()=>getSelection().toString()),'words');
  await page.locator('#clear-format').click();assert.equal(await page.evaluate(()=>{commitRich();return editor.value;}),'Some **bold **words and *italic* text');
  assert.equal(await page.locator('#more-format').getAttribute('open'),null);
 }
 // Neighbors: another » command, a second click closing », keyboard opening, and Markdown view clearing.
 await page.evaluate(()=>{createNote('Strike test.md','plain words here');setMode('rich');rich.focus();});
 let box=await page.evaluate(()=>{const n=rich.querySelector('p').firstChild,r=document.createRange();r.setStart(n,6);r.setEnd(n,11);const b=r.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};});
 await page.mouse.dblclick(box.x,box.y);if((await page.evaluate(()=>getSelection().toString())).endsWith(' '))await page.keyboard.press('Shift+ArrowLeft');
 await page.locator('#more-format>summary').click();await page.locator('#more-format button',{hasText:'Strikethrough'}).click();assert.equal(await page.evaluate(()=>{commitRich();return editor.value;}),'plain ~~words~~ here');
 await page.locator('#more-format>summary').click();await page.locator('#more-format>summary').click();assert.equal(await page.locator('#more-format').getAttribute('open'),null);
 await page.mouse.dblclick(box.x,box.y);const kept=await page.evaluate(()=>getSelection().toString());await page.locator('#more-format>summary').click();await page.keyboard.press('Escape');
 assert.deepEqual(await page.evaluate(()=>[$('more-format').open,document.activeElement===rich,getSelection().toString()]),[false,true,kept]);
 await page.locator('#more-format>summary').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#more-format').getAttribute('open'),'');await page.keyboard.press('Escape');
 await page.evaluate(()=>{createNote('Source clear.md','Some **bold** text');setMode('write');editor.focus();editor.setSelectionRange(5,13);});
 await page.locator('#more-format>summary').click();assert.equal(await page.locator('#clear-format').isEnabled(),true);await page.locator('#clear-format').click();assert.equal(await page.evaluate(()=>editor.value),'Some bold text');
 assert.deepEqual(errors,[]);console.log('Responsive toolbar passed at 360, 700, 850 and 1400px; overflow selection/link, font, Escape, compact Settings, mouse-selected Clear formatting from » at 1400/700/360px, » Strikethrough/toggle/keyboard and Markdown-view clearing passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

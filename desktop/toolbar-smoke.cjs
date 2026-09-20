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
 assert.deepEqual(errors,[]);console.log('Responsive toolbar passed at 360, 700, 850 and 1400px; overflow selection/link, font, Escape and compact Settings passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

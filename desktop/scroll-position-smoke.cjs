const {chromium,_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
// Applying formatting from menus, dialogs and the Outline must not move the view (the browser scrolled to line 1 on refocus).
const native=process.argv.includes('--desktop');let host,page,checks=0;
const scrollTop=()=>page.evaluate(()=>{let el=rich;while(el&&!(el.scrollHeight>el.clientHeight+5&&/(auto|scroll)/.test(getComputedStyle(el).overflowY)))el=el.parentElement;return el?Math.round(el.scrollTop):-1;});
const more=async label=>{await page.locator('#more-format > summary').click();await page.locator('#more-format button',{hasText:label}).first().click();};
async function selectFar(text){
 await page.evaluate(text=>{prefs.autoMarkdown=false;createNote('Scroll position',text);setMode('rich');rich.focus();},text);
 // A newly opened note restores its saved scroll on the next animation frame; scroll only after that, as a user would.
 await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
 await page.evaluate(text=>{const w=document.createTreeWalker(rich,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())if(n.data.startsWith('Line 80 ')){n.parentElement.scrollIntoView({block:'center'});break;}},text);
 const box=await page.evaluate(()=>{const w=document.createTreeWalker(rich,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())if(n.data.startsWith('Line 80 ')){const r=document.createRange(),i=n.data.indexOf('words');r.setStart(n,i);r.setEnd(n,i+5);const b=r.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};}});
 // Windows double-click also selects the following space; trim it with Shift+Left as a user would.
 await page.mouse.dblclick(box.x,box.y);await page.waitForTimeout(100);if((await page.evaluate(()=>getSelection().toString())).endsWith(' '))await page.keyboard.press('Shift+ArrowLeft');
 assert.equal(await page.evaluate(()=>getSelection().toString()),'words');
 const top=await scrollTop();assert.ok(top>500,'note scrolled far down');return top;
}
(async()=>{
 if(native){const profile=path.join(__dirname,'test-profile','scroll-'+Date.now());await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}),{flag:'wx'});host=await _electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});page=await host.firstWindow();await page.waitForFunction(()=>typeof flushLibrary==='function');}
 else{host=await chromium.launch({channel:'msedge',headless:true});page=await host.newPage({viewport:{width:1250,height:760}});await page.goto(pathToFileURL(path.resolve(__dirname,'../Rotepad.html')).href);}
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const lines=Array.from({length:120},(_,i)=>'Line '+i+' some words here').join('\n');
 // Each » command keeps the view and formats the selected word, not a word at the top.
 for(const [label,selector] of [['Strikethrough','del,s,strike'],['Highlight','mark'],['Inline code','code']]){
  const before=await selectFar(lines);await more(label);await page.waitForTimeout(150);
  assert.equal(await scrollTop(),before,label+' kept the view');assert.equal(await page.locator(selector.split(',').map(tag=>'#rich-editor '+tag).join(',')).first().textContent(),'words',label+' formatted the selection');
  assert.match(await page.evaluate(()=>editor.value),label==='Strikethrough'?/Line 80 some ~~words~~ here/:label==='Highlight'?/Line 80 some ==words== here/:/Line 80 some `words` here/);checks++;
 }
 for(const label of ['Bullet list','Numbered list','Checkbox list','Increase indent','Horizontal divider','Insert date']){
  const before=await selectFar(lines);await more(label);await page.waitForTimeout(150);assert.equal(await scrollTop(),before,label+' kept the view');checks++;
 }
 let before=await selectFar(lines);await page.keyboard.press('Control+k');await page.locator('#link-url').fill('example.com');await page.keyboard.press('Enter');await page.waitForTimeout(150);
 assert.equal(await scrollTop(),before,'link dialog kept the view');assert.equal(await page.locator('#rich-editor a').first().textContent(),'words');checks++;
 before=await selectFar(lines);await more('Insert table');await page.locator('#table-form button[type=submit]').click();await page.waitForTimeout(150);assert.equal(await scrollTop(),before,'table dialog kept the view');checks++;
 before=await selectFar(lines);await more('Strikethrough');await page.waitForTimeout(150);await page.keyboard.press('Control+z');await page.waitForTimeout(150);assert.equal(await scrollTop(),before,'undo kept the view');checks++;
 // Neighbors that already kept the view stay that way.
 before=await selectFar(lines);await page.locator('[data-format=bold]').click();assert.equal(await scrollTop(),before);await page.locator('[data-format=quote]').first().click();assert.equal(await scrollTop(),before);checks++;
 // Outline scrolls to a far heading on the first click in Formatted view.
 await page.evaluate(()=>{createNote('Outline scroll','# Top\n'+Array.from({length:120},(_,i)=>'Line '+i).join('\n')+'\n## Target heading\nafter');setMode('rich');if($('outline-panel').hidden)$('outline-toggle').click();});
 await page.locator('#outline-panel button',{hasText:'Target heading'}).click();await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>{const h=[...rich.querySelectorAll('h2')].find(e=>e.textContent==='Target heading').getBoundingClientRect(),view=rich.getBoundingClientRect();return h.top>=view.top-1&&h.bottom<=view.bottom+1;}),true,'outline first click shows the heading');checks++;
 await page.locator('#outline-panel button',{hasText:'Top'}).click();await page.waitForTimeout(200);assert.ok(await scrollTop()<50,'outline returns to the top heading');checks++;
 assert.deepEqual(errors,[]);
 console.log(`PASS ${checks} scroll-position checks in ${native?'Electron':'Edge'}: » formatting/list/indent/insert commands, link and table dialogs, Undo, Bold/Quote, and Outline first-click scrolling keep or move the view correctly.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(host)await host.close();});

// Pixel checks catch font joining that character/DOM assertions cannot detect.
const {chromium,_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const native=process.argv.includes('--desktop'),family='Iosevka Fixed SS03 Extended';let host,page,profile,checks=0;
async function separate(selector,count,label){
 await page.evaluate(()=>document.fonts.ready);
 const clip=await page.locator(selector).evaluate(el=>{
  if(el instanceof HTMLTextAreaElement){
   const rect=el.getBoundingClientRect(),css=getComputedStyle(el),ctx=document.createElement('canvas').getContext('2d');
   ctx.font=`${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
   return {x:rect.x+parseFloat(css.paddingLeft),y:rect.y+parseFloat(css.paddingTop),width:ctx.measureText(el.value).width,height:parseFloat(css.lineHeight)};
  }
  const range=document.createRange();range.selectNodeContents(el);const rect=range.getBoundingClientRect();
  return {x:rect.x,y:rect.y,width:rect.width,height:rect.height};
 });
 const png=await page.screenshot({clip,caret:'hide'});
 const groups=await page.evaluate(async base64=>{
  const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
  let groups=0,previous=false;
  for(let x=0;x<canvas.width;x++){
   let ink=false;
   for(let y=0;y<canvas.height;y++){const i=(y*canvas.width+x)*4;if(data[i]<180&&data[i+1]<180&&data[i+2]<180)ink=true;}
   if(ink&&!previous)groups++;previous=ink;
  }
  return groups;
 },png.toString('base64'));
 assert.equal(groups,count,label+': each hyphen must have a visible gap');checks++;
}
(async()=>{
 if(native){
  profile=path.join(__dirname,'test-profile','fonts-'+Date.now());await fs.mkdir(profile,{recursive:true});
  await fs.writeFile(path.join(profile,'desktop-settings.json'),JSON.stringify({saveFolder:path.join(profile,'notes')}),{flag:'wx'});
  host=await _electron.launch({executablePath:require('electron'),args:[__dirname],env:{...process.env,ROTEPAD_TEST_DATA:profile}});
  page=await host.firstWindow();await page.waitForFunction(()=>typeof flushLibrary==='function');
 }else{host=await chromium.launch({channel:'msedge',headless:true});page=await host.newPage();await page.goto(pathToFileURL(path.resolve(__dirname,'../Rotepad.html')).href);}
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 assert.equal(await page.locator('#font').inputValue(),family,'Fresh default');
 const loaded=await page.evaluate(async family=>{const counts=[];for(const style of ['normal','italic'])for(const weight of [400,700])counts.push((await document.fonts.load(`${style} ${weight} 16px "${family}"`)).length);return counts;},family);
 assert.deepEqual(loaded,[1,1,1,1],'All four embedded faces load offline');
 await page.evaluate(()=>{prefs.theme='light';prefs.zoom=100;applyPrefs();fonts();createNote('Typed hyphens','');setMode('rich');rich.focus();});
 assert.equal(await page.locator('#rich-editor').evaluate(el=>getComputedStyle(el).fontVariantLigatures),'normal','Keep contextual joining enabled');
 for(const count of [2,3,4,5,8,16]){
  const current=await page.locator('#rich-editor').textContent();await page.keyboard.type('-'.repeat(count-current.length));
  assert.equal(await page.locator('#rich-editor').textContent(),'-'.repeat(count));await separate('#rich-editor p',count,'Typed '+count);
 }
 for(const marker of ['', '**', '*']){
  await page.evaluate(marker=>{createNote('Styled hyphens',marker+'----------------'+marker);setMode('rich');rich.blur();},marker);
  await separate('#rich-editor p',16,'Formatted '+marker);
  await page.evaluate(()=>setMode('preview'));await separate('#preview p',16,'Preview '+marker);
  await page.evaluate(()=>preparePrint());await page.emulateMedia({media:'print'});
  await separate('#print-document .preview p',16,'Print CSS '+marker);await page.emulateMedia({media:'screen'});
 }
 // Render a combined-style fixture; triple-asterisk parsing is a separate known issue.
 await page.evaluate(()=>{createNote('Bold italic hyphens','');setMode('rich');rich.innerHTML='<p><strong><em>----------------</em></strong></p>';rich.blur();});
 assert.deepEqual(await page.locator('#rich-editor').evaluate(el=>{const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())&&!node.length){}const css=getComputedStyle(node.parentElement);return [css.fontWeight,css.fontStyle];}),['700','italic']);
 await separate('#rich-editor p',16,'Bold italic face');
 await page.evaluate(()=>{createNote('Source hyphens','----------------');setMode('write');editor.focus();});
 await separate('#editor',16,'Markdown');await page.evaluate(()=>setMode('split'));
 await separate('#editor',16,'Split source');await separate('#preview p',16,'Split preview');
 // Upgrade either removed choice from a saved older workspace, preserving zoom.
 assert.equal(await page.locator('#font option').count(),7);
 for(const oldFont of ['Iosevka SS03 Extended','Iosevka Fixed SS03']){
  await page.evaluate(()=>{setMode('rich');prefs.zoom=125;fonts();});if(native)await page.evaluate(()=>flushLibrary());
  await page.evaluate(oldFont=>{const key=window.desktopLibraryKey||'rotepad.library.v2',cached=JSON.parse(localStorage.getItem(key));cached.font=oldFont;cached.prefs.iosevkaDefaultVersion=2;localStorage.setItem(key,JSON.stringify(cached));},oldFont);
  await page.reload();assert.equal(await page.locator('#font').inputValue(),family);assert.equal(await page.locator('#rich-editor').evaluate(el=>getComputedStyle(el).fontSize),'20px');
 }
 await separate('#rich-editor p',16,'Upgraded/reloaded note at 125%');
 await page.selectOption('#font','Consolas');if(native)await page.evaluate(()=>flushLibrary());await page.reload();
 assert.equal(await page.locator('#font').inputValue(),'Consolas','Standard font choice persists');assert.deepEqual(errors,[]);
 console.log('PASS '+checks+' glyph-gap checks in '+(native?'Electron':'Edge')+': Fixed Extended default, four faces, literal typed hyphens, views, print CSS, default upgrade, zoom and saved font choice.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(host)await host.close();});

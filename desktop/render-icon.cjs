// Render the vector source with transparent padding, then generate the Windows
// multi-resolution ICO using Pillow (supply PYTHON_EXE and PLAYWRIGHT_PATH).
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const path=require('node:path'),{pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const png=path.join(__dirname,'assets','rotepad.png'),ico=path.join(__dirname,'assets','rotepad.ico');
  try{
    const page=await browser.newPage({viewport:{width:512,height:512},deviceScaleFactor:2});
    await page.goto(pathToFileURL(path.join(__dirname,'assets','rotepad.svg')).href);
    await page.screenshot({path:png,omitBackground:true});
  }finally{await browser.close();}
  execFileSync(process.env.PYTHON_EXE||'python',['-c',"from PIL import Image; import sys; im=Image.open(sys.argv[1]).convert('RGBA'); im.save(sys.argv[2], sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])",png,ico]);
  console.log('Rendered PNG and multi-resolution ICO.');
})().catch(error=>{console.error(error);process.exitCode=1;});

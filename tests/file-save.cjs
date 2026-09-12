const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const js=fs.readFileSync(path.join(__dirname,'../Rotepad.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(js);
(async()=>{
 let picks=0,writes=[],closed=0,aborted=0;const note={id:'one',name:'Note.md'};
 const handle={name:'Note.md',queryPermission:async()=> 'granted',createWritable:async()=>({write:async text=>writes.push(text),close:async()=>closed++,abort:async()=>aborted++})};
 const c={window:{showSaveFilePicker:async()=>{picks++;return handle}},activeId:'one',activeNote:()=>note,editor:{value:'first'},filename:{value:'Note.md'},noteFiles:new Map(),fileSaveBusy:new Set(),filePickerBusy:false,rememberFile:async()=>{},persist:()=>{},renderNotes:()=>{},updateFileStatus:()=>{},textSignature:s=>s,alert:()=>{},$:()=>({}),savedText:''};vm.createContext(c);
 for(const [start,end] of [['function suggestedFilename','const saveAsButton'],['async function saveToFile','save=()=>saveToFile']])vm.runInContext(js.slice(js.indexOf(start),js.indexOf(end,js.indexOf(start))),c);
 await c.saveToFile();c.editor.value='second';await c.saveToFile();assert.equal(picks,1);assert.deepEqual(writes,['first','second']);assert.equal(closed,2);assert.equal(note.diskSignature,'second');
 await c.saveToFile(true);assert.equal(picks,2,'Save as requests a location again');
 c.window.showSaveFilePicker=async()=>{throw Object.assign(new Error('cancel'),{name:'AbortError'})};await c.saveToFile(true);assert.equal(c.noteFiles.get('one'),handle);assert.equal(writes.length,3);assert.equal(c.fileSaveBusy.size,0);
 handle.createWritable=async()=>({write:async()=>{throw Error('disk full')},close:async()=>closed++,abort:async()=>aborted++});c.editor.value='unsaved';await c.saveToFile();assert.equal(note.diskSignature,'second','failed write cannot mark new content saved');assert.equal(aborted,1);assert.equal(c.savedText,'second');
 assert.equal(c.suggestedFilename('hello'),'hello.md');assert.equal(c.suggestedFilename('hello.txt'),'hello.txt');
 console.log('File-save checks passed: same-file reuse, Save as, cancellation, and failed-write recovery.');
})().catch(e=>{console.error(e);process.exitCode=1});

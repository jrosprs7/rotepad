const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../Rotepad.html'),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(js);
const faces=[...html.matchAll(/@font-face\{font-family:"([^"]+)";font-style:(normal|italic);font-weight:(400|700);font-display:swap;src:url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\)/g)];
assert.equal(faces.length,12);
for(const family of ['Iosevka Fixed SS03 Extended','Iosevka SS03 Extended','Iosevka Fixed SS03'])for(const style of ['normal','italic'])for(const weight of ['400','700']){
 const face=faces.find(f=>f[1]===family&&f[2]===style&&f[3]===weight);assert.ok(face);
 assert.equal(Buffer.from(face[4],'base64').subarray(0,4).toString(),'wOF2');
 assert.equal(html.includes(`<option value="${family}">`),family==='Iosevka Fixed SS03 Extended');
}
const values={},selection={value:'Iosevka Fixed SS03 Extended'},context={document:{documentElement:{style:{setProperty(k,v){values[k]=v}}}},$:()=>selection,prefs:{zoom:150},appReady:true,textZoomSize:v=>16*v/100,persist(){}};
vm.createContext(context);vm.runInContext(js.slice(js.indexOf('function fonts()'),js.indexOf('\n',js.indexOf('function fonts()'))),context);
context.fonts();assert.equal(values['--size'],'24px');assert.equal(values['--font'],'"Iosevka Fixed SS03 Extended", monospace');
selection.value='Iosevka Fixed SS03';context.fonts();assert.equal(values['--size'],'24px');assert.equal(selection.value,'Iosevka Fixed SS03 Extended');
const start=js.indexOf('if((prefs.iosevkaDefaultVersion||0)<3)'),migration=js.slice(start,js.indexOf('\n',start));
assert.ok(start>0);
for(const version of [0,1,2])for(const value of ['','Iosevka SS03 Extended','Iosevka Fixed SS03','Consolas','Arial']){
 context.prefs.iosevkaDefaultVersion=version;selection.value=value;vm.runInContext(migration,context);
 assert.equal(selection.value,['Consolas','Arial'].includes(value)?value:'Iosevka Fixed SS03 Extended');assert.equal(context.prefs.iosevkaDefaultVersion,3);
}
assert.match(html,/SIL Open Font License/i);
console.log('Embedded font faces, default migration, and font/zoom checks passed.');

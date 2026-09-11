const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const js=fs.readFileSync(path.join(__dirname,'../Rotepad.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(js);const c={};vm.createContext(c);const start=js.indexOf('function emptyQuoteLine');vm.runInContext(js.slice(start,js.indexOf("rich.addEventListener('keydown'",start)),c);
assert.equal(c.emptyQuoteLine('quoted text\n\uE000\n'),true);
assert.equal(c.emptyQuoteLine('quoted text\uE000'),false);
assert.equal(c.emptyQuoteLine('\uE000following text'),false);
assert.equal(c.emptyQuoteLine('before\n  \uE000\u00a0\nnext'),true);
assert.equal(c.emptyQuoteLine('\uE000'),true);
console.log('Quote empty-line detection and JavaScript syntax checks passed.');

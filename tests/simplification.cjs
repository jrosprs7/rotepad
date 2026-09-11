const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../Rotepad.html'),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(js);
const c={};vm.createContext(c);
for(const [start,end] of [['function appendHistoryState','captureHistory=function'],['function paragraphLines','function applyParagraphStyle']])vm.runInContext(js.slice(js.indexOf(start),js.indexOf(end,js.indexOf(start))),c);
const state=(text,caret=text.length)=>({text,caret});
const h={items:[state('')],index:0};
c.appendHistoryState(h,state('a'),{kind:'insertText',mode:'rich',start:0},100);
c.appendHistoryState(h,state('ab'),{kind:'insertText',mode:'rich',start:1},200);
c.appendHistoryState(h,state('abc'),{kind:'insertText',mode:'rich',start:2},300);
assert.equal(h.items.length,2,'typing burst is one undo step');
assert.equal(h.items[0].text,'');assert.equal(h.items[1].text,'abc');
c.appendHistoryState(h,state('abcd'),{kind:'insertText',mode:'rich',start:3},1500);
assert.equal(h.items.length,3,'pause starts a new step');
c.appendHistoryState(h,state('**abcd**',4),null,1600);
assert.equal(h.items.length,4,'formatting is a separate action');
c.appendHistoryState(h,state('**abcde**',5),{kind:'insertText',mode:'rich',start:4},1700);
assert.equal(h.items.length,5,'typing after formatting starts a fresh group');
c.appendHistoryState(h,state('**abce**',3),{kind:'deleteContentBackward',mode:'rich',start:4},1750);
assert.equal(h.items.length,6,'deletion starts a separate group');
h.index=1;c.appendHistoryState(h,state('replacement'),null,1800);
assert.equal(h.items.length,3,'editing after undo discards redo branch');
assert.equal(c.paragraphLines('# Title\n> quote','p'),'Title\nquote');
assert.equal(c.paragraphLines('One\nTwo','h2'),'## One\n## Two');
assert.equal(c.paragraphLines('Text','blockquote'),'> Text');
const clear=js.slice(js.indexOf('function clearSelectedFormatting'),js.indexOf("$('clear-format').onclick=clearSelectedFormatting"));
assert.ok(!clear.includes('formatBlock'),'clear formatting never changes block type');
assert.ok(clear.includes('liftInlineNode'),'clear formatting operates on selected text nodes');
// Minimal mutable DOM fixtures exercise partial inline unwrapping independently of a browser.
class Element {
 constructor(tag){this.tagName=tag;this.childNodes=[];this.parentElement=null;this.attrs={};this.classList={contains:()=>false};this.dataset={}}
 get firstChild(){return this.childNodes[0]} get nextSibling(){const p=this.parentElement;return p?.childNodes[p.childNodes.indexOf(this)+1]}
 append(n){n.detach();this.childNodes.push(n);n.parentElement=this}
 detach(){if(this.parentElement){const p=this.parentElement;p.childNodes.splice(p.childNodes.indexOf(this),1);this.parentElement=null}}
 replaceWith(...nodes){const p=this.parentElement,index=p.childNodes.indexOf(this);for(const n of nodes)n.detach();const position=p.childNodes.indexOf(this);p.childNodes.splice(position,1,...nodes);this.parentElement=null;for(const n of nodes)n.parentElement=p}
 cloneNode(){return new Element(this.tagName)} removeAttribute(){}
}
class Text extends Element {constructor(text){super('#text');this.data=text}}
c.rich=new Element('DIV');c.document={createElement:t=>new Element(t.toUpperCase())};
vm.runInContext(js.slice(js.indexOf('function liftInlineNode'),js.indexOf('function clearSelectedFormatting')),c);
const quote=new Element('BLOCKQUOTE'),heading=new Element('H2'),bold=new Element('STRONG'),before=new Text('keep '),selected=new Text('clear'),after=new Text(' keep');
c.rich.append(quote);quote.append(heading);heading.append(bold);bold.append(before);bold.append(selected);bold.append(after);
c.liftInlineNode(selected);
assert.equal(quote.tagName,'BLOCKQUOTE');assert.equal(heading.parentElement,quote);
assert.equal(selected.parentElement,heading);assert.equal(before.parentElement.tagName,'STRONG');assert.equal(after.parentElement.tagName,'STRONG');
console.log('Simplification checks passed: grouped undo, action boundaries, paragraph styles, and partial inline clearing.');

const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const js=fs.readFileSync(path.join(__dirname,'../Rotepad.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(js);
const c={};vm.createContext(c);
for(const [a,b] of [['function textZoomSize',"$('settings-dialog').querySelector('label[for=zoom-setting]')"],['function isEmptyListItem','rich.addEventListener(\'keydown\',exitEmptyList']])vm.runInContext(js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a))),c);
class El{constructor(tag,text=''){this.tagName=tag;this.textContent=text;this.childNodes=[];this.parentElement=null;this.attrs={};this.nodeType=1}
 get children(){return this.childNodes}get nextSibling(){const p=this.parentElement;return p?.childNodes[p.childNodes.indexOf(this)+1]}
 append(n){n.remove();this.childNodes.push(n);n.parentElement=this}remove(){if(this.parentElement){const p=this.parentElement;p.childNodes.splice(p.childNodes.indexOf(this),1);this.parentElement=null}}
 after(n){const p=this.parentElement;n.remove();p.childNodes.splice(p.childNodes.indexOf(this)+1,0,n);n.parentElement=p}
 cloneNode(){const n=new El(this.tagName);n.attrs={...this.attrs};return n}removeAttribute(k){delete this.attrs[k]}getAttribute(k){return this.attrs[k]??null}setAttribute(k,v){this.attrs[k]=v}
 closest(tag){return this.tagName===tag.toUpperCase()?this:this.parentElement?.closest(tag)}contains(n){return n===this||this.children.some(c=>c.contains(n))}querySelector(){return null}}
function exercise(key,position){const root=new El('DIV'),list=new El('OL');root.append(list);const items=[new El('LI','one'),new El('LI','two'),new El('LI','three')];for(const n of items)list.append(n);const blank=new El('LI');if(position==='middle'){items[0].after(blank)}else list.append(blank);
 let prevented=false,commits=0;const selection={rangeCount:1,isCollapsed:true,anchorNode:blank,removeAllRanges(){},addRange(r){this.destination=r.node}};
 Object.assign(c,{rich:root,composing:false,getSelection:()=>selection,breakTypingGroup(){},majorEditBoundary(){},rememberRange(){},commitRich(){commits++},updateFormatting(){},document:{createElement:t=>new El(t.toUpperCase()),createRange:()=>({setStart(n){this.node=n},collapse(){}})}});
 c.exitEmptyList({key,preventDefault(){prevented=true},stopImmediatePropagation(){}});
 assert.equal(prevented,true);assert.equal(commits,1);assert.equal(selection.destination.tagName,'P');assert.equal(root.children[1].tagName,'P');
 if(position==='middle'){assert.equal(root.children.length,3);assert.equal(root.children[2].getAttribute('start'),'3');assert.equal(root.children[2].children.length,2)}else{assert.equal(list.children.length,3);assert.equal(list.children[2].textContent,'three')}
}
exercise('Backspace','end');exercise('Enter','end');exercise('Backspace','middle');
assert.equal(c.isEmptyListItem(new El('LI','some text')),false);assert.equal(c.isEmptyListItem(new El('LI',' \u00a0')),true);
assert.equal(c.textZoomSize('100'),16);assert.equal(c.textZoomSize('150'),24);assert.equal(c.textZoomSize('80'),12.8);
assert.ok(!js.includes('document.body.style.zoom=String(scale)'));
console.log('List exit and text-only zoom checks passed.');

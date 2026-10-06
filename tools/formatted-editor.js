// Embedded at the end of Rotepad.html's script.
function tableCells(line){
 const value=line.trim().replace(/^\|/,'').replace(/(?<!\\)\|$/,'');let cells=[],part='',escaped=false;
 for(const ch of value){if(escaped){part+='\\'+ch;escaped=false;}else if(ch==='\\')escaped=true;else if(ch==='|'){cells.push(part.trim());part='';}else part+=ch;}
 if(escaped)part+='\\';cells.push(part.trim());return cells;
}
function tableSeparator(line){return line.includes('|')&&tableCells(line).every(c=>/^:?-{3,}:?$/.test(c));}
function tableHTML(rows){return '<table><thead><tr>'+rows[0].map(c=>'<th>'+inline(c).replace(/&lt;br\s*\/?&gt;/gi,'<br>')+'</th>').join('')+'</tr></thead><tbody>'+rows.slice(1).map(row=>'<tr>'+rows[0].map((_,i)=>'<td>'+(inline(row[i]||'').replace(/&lt;br\s*\/?&gt;/gi,'<br>')||'<br>')+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}
function nestedListHTML(lines){
 const items=[];
 for(const line of lines){const m=/^(\s*)([-+*]|\d+\.)\s+(.*)$/.exec(line);
  if(m)items.push({depth:m[1].replace(/\t/g,'    ').length,type:/\d/.test(m[2])?'ol':'ul',number:parseInt(m[2],10)||1,text:m[3]});
  else if(items.length){const last=items.at(-1);last.text+='\n'+line.replace(/\t/g,'    ').slice(last.depth+4);}
 }let at=0;
 function group(depth){let html='';while(at<items.length&&items[at].depth>=depth){if(items[at].depth>depth){html+=group(items[at].depth);continue;}const type=items[at].type,start=items[at].number;html+='<'+type+(type==='ol'&&start!==1?' start="'+start+'"':'')+'>';while(at<items.length&&items[at].depth===depth&&items[at].type===type){const item=items[at++];let child='';if(at<items.length&&items[at].depth>depth)child=group(items[at].depth);const task=/^\[([ xX])\]\s?([\s\S]*)$/.exec(item.text);html+=task?taskHTML(task[2],task[1].toLowerCase()==='x').replace(/<\/li>$/,child+'</li>'):'<li>'+item.text.split('\n').map(line=>inline(line)).join('<br>')+child+'</li>';}
 html+='</'+type+'>';if(at<items.length&&items[at].depth<depth)break;}return html;}
 let result='';while(at<items.length)result+=group(items[at].depth);return result;
}
function autoLinksOnly(){
 const s=getSelection();if(!s.rangeCount||!s.isCollapsed||!rich.contains(s.anchorNode))return;
 const marker=document.createElement('span');s.getRangeAt(0).insertNode(marker);
 if(rich.childNodes.length&&![...rich.children].some(n=>/^(P|DIV|H[1-6]|UL|OL|BLOCKQUOTE|PRE|HR|TABLE)$/.test(n.tagName))){const p=document.createElement('p');p.append(...rich.childNodes);rich.append(p);}
 rich.querySelectorAll('a[data-auto]').forEach(a=>a.replaceWith(...a.childNodes));rich.normalize();
 const walker=document.createTreeWalker(rich,NodeFilter.SHOW_TEXT),nodes=[];let n;while(n=walker.nextNode())nodes.push(n);
 for(const text of nodes){if(text.parentElement.closest('a,code,pre,.task-box,[data-no-link]'))continue;const html=writingLinks(text.data).slice(0,-1);if(html===escapeHTML(text.data))continue;const temp=document.createElement('template');temp.innerHTML=html;text.replaceWith(temp.content);}
 const r=document.createRange();r.setStartBefore(marker);r.collapse(true);marker.remove();s.removeAllRanges();s.addRange(r);markAutoLinks();rememberRange();
}
const optionalAutoFormat=autoFormatRich;
autoFormatRich=function(){if(prefs.autoMarkdown===true)optionalAutoFormat();else{autoFormatRevert=null;normalAfterMarkdown=false;autoLinksOnly();}};
$('settings-dialog').querySelector('.settings-grid').insertAdjacentHTML('beforeend','<label for="auto-markdown-setting">Format Markdown as I type</label><input type="checkbox" id="auto-markdown-setting" title="Optional: turn typed Markdown markers into formatting. Buttons and shortcuts work either way.">');
const formattedPrefs=applyPrefs;applyPrefs=function(){formattedPrefs();$('auto-markdown-setting').checked=prefs.autoMarkdown===true;};
const formattedRestorePrefs=restoredPrefs;restoredPrefs=function(p){return {...formattedRestorePrefs(p),autoMarkdown:p.autoMarkdown===true};};
$('auto-markdown-setting').onchange=()=>{prefs.autoMarkdown=$('auto-markdown-setting').checked;autoFormatRevert=null;normalAfterMarkdown=false;persist();};
const modeSwitch=document.createElement('button');modeSwitch.id='editing-mode';document.querySelector('footer').insertBefore(modeSwitch,$('position'));
const formattedSetMode=setMode;setMode=function(value){formattedSetMode(value);modeSwitch.textContent={rich:'Formatted',write:'Markdown',split:'Split',preview:'Preview'}[value];modeSwitch.title=value==='rich'?'Switch to Markdown view':'Switch to Formatted view';$('position').hidden=value==='rich'||value==='preview';};
modeSwitch.onclick=()=>setMode(mode==='rich'?'write':'rich');document.querySelector('[data-mode=rich]').textContent='Formatted';
function editingAction(label,id,handler){const button=document.createElement('button');button.id=id;button.textContent=label;button.onmousedown=e=>{if(mode==='rich'){rememberRange();e.preventDefault();}};button.onclick=()=>{if(mode==='preview')return;breakTypingGroup();handler();};morePanel.append(button);return button;}
function insertEditingText(text){if(mode==='rich'){restoreRange();document.execCommand('insertText',false,text);commitRich();}else insert(text);}
function indentSelection(out=false){
 if(mode==='rich'){
  restoreRange();const s=getSelection(),node=s.anchorNode,el=node?.nodeType===3?node.parentElement:node;
  if(el?.closest('li')){
   // Move whole selected items one level and keep the selection; browser indent/outdent can nest LI in LI or a list in a list.
   const r=s.getRangeAt(0),own=li=>[...li.childNodes].some(c=>!['UL','OL'].includes(c.nodeName)&&r.intersectsNode(c));
   let items=s.isCollapsed?[el.closest('li')]:[...rich.querySelectorAll('li')].filter(own);
   items=items.filter(li=>!items.some(other=>other!==li&&other.contains(li)));
   if(!items.length||!out&&items[0].previousElementSibling?.tagName!=='LI')return;
   if(!out||items.some(li=>li.parentElement.parentElement?.closest('li'))){
    const marks=[document.createElement('span'),document.createElement('span')],end=r.cloneRange();end.collapse(false);end.insertNode(marks[1]);r.insertNode(marks[0]);
    for(const item of items){
     if(out){moveListItemOut(item);continue;}
     const previous=item.previousElementSibling;if(previous?.tagName!=='LI')continue;
     let list=previous.lastElementChild;
     if(list?.tagName!==item.parentElement.tagName){list=item.parentElement.cloneNode(false);list.removeAttribute('id');list.removeAttribute('start');previous.append(list);}
     list.append(item);
    }
    const kept=document.createRange();kept.setStartAfter(marks[0]);kept.setEndBefore(marks[1]);marks.forEach(mark=>mark.remove());s.removeAllRanges();s.addRange(kept);rememberRange();commitRich();return;
   }
   // Top-level items leave the list through the browser command.
   document.execCommand('outdent');
   const bookmark=s.isCollapsed?document.createElement('span'):null;if(bookmark)s.getRangeAt(0).insertNode(bookmark);
   for(const list of rich.querySelectorAll('ul>ul,ul>ol,ol>ul,ol>ol')){if(list.previousElementSibling?.tagName==='LI')list.previousElementSibling.append(list);}
   if(bookmark)caretAtBookmark(bookmark);commitRich();return;
  }
  const r=s.getRangeAt(0),blocks=[...rich.querySelectorAll('p,h1,h2,h3,blockquote,pre,td,th')].filter(b=>r.intersectsNode(b)&&!b.querySelector('p,blockquote'));
  if(!blocks.length){if(!out)insertEditingText('\t');return;}
  for(const block of blocks){if(out){const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);let first;while((first=walker.nextNode())&&!first.length){}const prefix=first?.data.match(/^(?:\t| {1,4})/);if(prefix){const remove=document.createRange();remove.setStart(first,0);remove.setEnd(first,prefix[0].length);remove.deleteContents();}}else block.prepend(document.createTextNode('\t'));}rememberRange();commitRich();
 }else{const a=editor.selectionStart,b=editor.selectionEnd,start=a?editor.value.lastIndexOf('\n',a-1)+1:0,last=b>a&&editor.value[b-1]==='\n'?b-1:b,boundary=editor.value.indexOf('\n',last),end=boundary<0?editor.value.length:boundary;insert(editor.value.slice(start,end).split('\n').map(l=>out?l.replace(/^(?:\t| {1,4})/,''):'\t'+l).join('\n'),start,end);}
}
editingAction('Increase indent','indent-note',()=>indentSelection(false));editingAction('Decrease indent','outdent-note',()=>indentSelection(true));
editingAction('Insert date and time (F5)','insert-datetime',()=>insertEditingText(new Date().toLocaleString(undefined,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})));
dialogMarkup('table-dialog','<button class="dialog-close" data-close="table-dialog" aria-label="Close">×</button><h2>Insert table</h2><form id="table-form"><div class="settings-grid"><label for="table-columns">Columns</label><input id="table-columns" type="number" min="1" max="8" value="3" required><label for="table-rows">Rows, including header</label><input id="table-rows" type="number" min="2" max="20" value="3" required></div><div class="actions"><button type="submit" class="primary">Insert table</button></div></form>');
let tableSelection=null;editingAction('Insert table…','insert-table',()=>{if(mode==='rich')rememberRange();tableSelection=[editor.selectionStart,editor.selectionEnd];$('table-dialog').showModal();$('table-columns').focus();});
$('table-form').onsubmit=e=>{e.preventDefault();const cols=Number($('table-columns').value),rows=Number($('table-rows').value);if(!Number.isInteger(cols)||cols<1||cols>8||!Number.isInteger(rows)||rows<2||rows>20)return;const values=[Array.from({length:cols},(_,i)=>'Column '+(i+1)),...Array.from({length:rows-1},()=>Array(cols).fill(''))];$('table-dialog').close();if(mode==='rich'){restoreRange();document.execCommand('insertHTML',false,tableHTML(values)+'<p><br></p>');commitRich();}else{const text=[values[0],Array(cols).fill('---'),...values.slice(1)].map(row=>'| '+row.join(' | ')+' |').join('\n');insert('\n'+text+'\n',...tableSelection);}};
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||mode==='preview')return;if(e.key==='F5'){e.preventDefault();$('insert-datetime').click();}if((e.ctrlKey||e.metaKey)&&['[',']'].includes(e.key)&&[editor,rich].includes(document.activeElement)){e.preventDefault();indentSelection(e.key==='[');}},true);
rich.addEventListener('keydown',e=>{if(e.key!=='Tab'||e.ctrlKey||e.metaKey||e.altKey)return;const n=getSelection().anchorNode,cell=(n?.nodeType===3?n.parentElement:n)?.closest('td,th');if(!cell)return;const table=cell.closest('table'),cells=[...table.querySelectorAll('th,td')],index=cells.indexOf(cell);let target=cells[index+(e.shiftKey?-1:1)];if(!target&&!e.shiftKey){const row=table.insertRow();for(let i=0;i<table.rows[0].cells.length;i++)row.insertCell().innerHTML='<br>';target=row.cells[0];commitRich();}if(target){e.preventDefault();const r=document.createRange();r.selectNodeContents(target);r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);rememberRange();}},true);
function editorTab(e){
 if(e.defaultPrevented||e.key!=='Tab'||e.ctrlKey||e.metaKey||e.altKey||e.isComposing||composing||document.querySelector('dialog[open]'))return;
 if(e.currentTarget===rich){
  if(document.activeElement!==rich)return;
  const s=getSelection();if(!s.rangeCount||!rich.contains(s.anchorNode)||!rich.contains(s.focusNode))return;
  const element=n=>n.nodeType===3?n.parentElement:n,r=s.getRangeAt(0),start=element(r.startContainer),end=element(r.endContainer);
  // Tables retain their existing cell navigation, including leaving the first cell.
  if(start.closest('td,th'))return;
  e.preventDefault();breakTypingGroup();rememberRange();
  const block=n=>n.closest('p,div,li,h1,h2,h3,blockquote,pre');
  if(e.shiftKey||start.closest('li')&&!start.closest('pre,code')||!s.isCollapsed&&block(start)!==block(end))indentSelection(e.shiftKey);
  else insertEditingText('\t');
 }else{
  e.preventDefault();breakTypingGroup();
  if(e.shiftKey||editor.value.slice(editor.selectionStart,editor.selectionEnd).includes('\n'))indentSelection(e.shiftKey);
  else insert('\t');
 }
}
rich.addEventListener('keydown',editorTab,true);editor.addEventListener('keydown',editorTab,true);
const formattedStyle=document.createElement('style');formattedStyle.textContent='.preview{tab-size:4}.preview table{border-collapse:collapse;width:100%;margin:8px 0;table-layout:fixed}.preview th,.preview td{border:1px solid var(--line);padding:6px 8px;min-width:40px;white-space:pre-wrap;overflow-wrap:anywhere}.preview th{background:var(--soft);text-align:left}footer #editing-mode{font-size:12px;min-height:24px;padding:2px 8px}';document.head.append(formattedStyle);
$('shortcuts-dialog').insertAdjacentHTML('beforeend','<p class="side-note">Tab inserts a tab in text, indents selected lines or nests a list item. Shift+Tab decreases indent. In tables, Tab/Shift+Tab moves between cells. Ctrl+[ / Ctrl+] decreases/increases indent. F5 inserts the current date and time. Use the bottom Formatted/Markdown button to switch views. Automatic Markdown conversion is optional in Settings.</p>');
applyPrefs();setMode('rich');

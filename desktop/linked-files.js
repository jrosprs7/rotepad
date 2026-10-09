// Notes opened from a file stay linked to it; the main process keeps the link and only writes files the user opened.
// After each library save, changed linked notes are written back: Markdown files as Markdown, text files as the plain
// text shown. Text files open literally, so a line such as "# TODO" or "1. step" stays as typed.
const linkedFiles=new Map();
function literalMarkdown(text){const box=document.createElement('div');for(const line of text.split('\n')){const p=document.createElement('p');if(line)p.textContent=line;else p.append(document.createElement('br'));box.append(p);}return richMarkdown(box);}
function plainOf(node){let text='';for(const child of node.childNodes){if(child.nodeType===3)text+=child.data;else if(child.nodeName==='BR')text+='\n';else if(child.nodeType===1&&!child.classList.contains('task-box')&&!['UL','OL'].includes(child.nodeName))text+=plainOf(child);}return text;}
function plainLines(root,depth=0){
 const lines=[],pad='    '.repeat(depth);
 for(const node of root.childNodes){
  if(node.nodeType===3){if(node.data)lines.push(...node.data.split('\n'));continue;}
  if(node.nodeType!==1)continue;const tag=node.nodeName;
  if(tag==='UL'||tag==='OL'){
   let number=Number(node.getAttribute('start'))||1;
   for(const item of node.children){
    const task=item.dataset.checked,marker=(tag==='OL'?(number++)+'. ':'- ')+(task===undefined?'':task==='true'?'[x] ':'[ ] ');
    const [first,...rest]=plainOf(item).split('\n');lines.push(pad+marker+first,...rest.map(line=>pad+'    '+line));
    for(const sub of item.children)if(['UL','OL'].includes(sub.nodeName)){const holder=document.createElement('div');holder.append(sub.cloneNode(true));lines.push(...plainLines(holder,depth+1));}
   }
   continue;
  }
  if(tag==='TABLE'){const rows=[...node.rows].map(row=>'| '+[...row.cells].map(cell=>plainOf(cell).replace(/\n/g,' ')).join(' | ')+' |');if(rows.length)lines.push(rows[0],'| '+[...node.rows[0].cells].map(()=>'---').join(' | ')+' |',...rows.slice(1));continue;}
  if(tag==='HR'){lines.push('***');continue;}
  const text=plainOf(node),own=text==='\n'?['']:text.split('\n');
  lines.push(...(tag==='BLOCKQUOTE'?own.map(line=>'> '+line):own));
 }
 return lines;
}
function plainText(markdownText){const box=document.createElement('div');box.innerHTML=markdown(markdownText);return plainLines(box).join('\n');}
const linkedContent=(link,note)=>link.kind==='txt'?plainText(note.text):note.text;

const linkedStatus=document.createElement('span');linkedStatus.id='linked-status';$('save-status').before(linkedStatus);
function showLinkedStatus(){const link=linkedFiles.get(activeId);linkedStatus.hidden=!link;if(!link)return;linkedStatus.textContent=link.notice||'Also saves to '+link.name;linkedStatus.title=link.notice?'Your edits are kept in Rotepad.':'Rotepad writes this note back to the file you opened.';}
const linkedActivate=activateNote;activateNote=function(id){linkedActivate(id);showLinkedStatus();};

let linkedSyncing=null;
function syncLinkedFiles(){
 if(linkedSyncing)return linkedSyncing;
 linkedSyncing=(async()=>{
  for(const [id,link] of [...linkedFiles]){
   const note=notes.find(n=>n.id===id);if(!note||note.trashed)continue;
   const text=linkedContent(link,note);if(text===link.written)continue;
   let result;
   try{result=await window.rotDesktop.syncFile({id,text});}catch(error){link.notice='Could not save to '+link.name+': '+error.message;continue;}
   if(result.status==='changed'&&!link.asked){
    link.asked=true;
    if(confirm('"'+link.name+'" was changed by another program since Rotepad last saved it.\n\nOK: replace it with your Rotepad version.\nCancel: stop saving this note to that file (your edits stay in Rotepad).'))result=await window.rotDesktop.syncFile({id,text,force:true});
    else{await window.rotDesktop.unlinkFile(id);linkedFiles.delete(id);continue;}
   }
   if(result.status==='saved'){link.written=text;link.notice=null;link.asked=false;}
   else if(result.status==='missing')link.notice=link.name+' was moved or deleted; edits stay in Rotepad';
   else if(result.status==='unlinked')linkedFiles.delete(id);
  }
 })().finally(()=>{linkedSyncing=null;showLinkedStatus();});
 return linkedSyncing;
}
const linkedLibraryFlush=flushLibrary;flushLibrary=async function(){await linkedLibraryFlush();await syncLinkedFiles();};

async function refreshLinkedFiles(written=new Map()){
 for(const entry of await window.rotDesktop.linkedFiles()){
  const note=notes.find(n=>n.id===entry.id);if(!note)continue;const known=linkedFiles.get(entry.id);
  linkedFiles.set(entry.id,{kind:entry.kind,name:entry.name,written:written.get(entry.id)??known?.written??linkedContent(entry,note),notice:known?.notice||null,asked:false});
 }
 showLinkedStatus();
}
const linkedFilesReady=refreshLinkedFiles();
const linkedOpenNote=openDesktopNote;
openDesktopNote=async function(file){
 if(!file)return;
 const raw=file.text.replace(/^﻿/,'').replace(/\r\n?/g,'\n');
 await linkedOpenNote(file.kind==='txt'?{...file,text:literalMarkdown(raw)}:file);
 if(file.writable===false)alert('"'+file.name+'" is not UTF-8 text, so Rotepad will not change the original file. Your edits are kept in Rotepad.');
 await linkedFilesReady;
 const note=activeNote(),fresh=note&&!linkedFiles.has(note.id)?new Map([[note.id,file.kind==='txt'?raw:note.text]]):new Map();
 await refreshLinkedFiles(fresh);
};

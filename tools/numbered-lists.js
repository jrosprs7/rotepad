// List continuation is independent of optional inline Markdown conversion.
editingAction('Numbered list','numbered-list',()=>{
 if(mode==='rich'){restoreRange();document.execCommand('insertOrderedList');commitRich();return;}
 const a=editor.selectionStart,b=editor.selectionEnd,start=a?editor.value.lastIndexOf('\n',a-1)+1:0;
 const last=b>a&&editor.value[b-1]==='\n'?b-1:b,tail=editor.value.indexOf('\n',last),end=tail<0?editor.value.length:tail;
 const lines=editor.value.slice(start,end).split('\n'),remove=lines.every(line=>/^\s*\d+\.\s/.test(line));
 insert(lines.map((line,i)=>{const match=/^(\s*)(.*)$/.exec(line);return match[1]+(remove?'':(i+1)+'. ')+match[2].replace(/^(?:\d+\.|[-+*])\s+/,'');}).join('\n'),start,end);
});
rich.addEventListener('keydown',event=>{
 if(event.defaultPrevented||event.key!=='Enter'||event.shiftKey||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||composing)return;
 const selection=getSelection();if(!selection.rangeCount||!selection.isCollapsed)return;
 const node=selection.anchorNode,element=node?.nodeType===3?node.parentElement:node;
 if(!element||element.closest('li,pre,code'))return;
 const block=element.closest('p,div');if(!block||block===rich||!rich.contains(block))return;
 const match=/^(\d+)\.[ \u00a0]+(\S[\s\S]*)$/.exec(block.textContent);if(!match)return;
 const tail=selection.getRangeAt(0).cloneRange();tail.setEnd(block,block.childNodes.length);if(tail.toString())return;
 event.preventDefault();event.stopImmediatePropagation();breakTypingGroup();
 // Remove only the marker, preserving bold, links and other inline content.
 const prefix=block.textContent.length-match[2].length,walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);
 let remaining=prefix,text;const marker=document.createRange();marker.setStart(block,0);
 while(text=walker.nextNode()){if(remaining<=text.length){marker.setEnd(text,remaining);break;}remaining-=text.length;}
 marker.deleteContents();const caret=document.createRange();caret.selectNodeContents(block);caret.collapse(false);selection.removeAllRanges();selection.addRange(caret);
 document.execCommand('insertOrderedList');const anchor=selection.anchorNode,list=(anchor.nodeType===3?anchor.parentElement:anchor).closest('ol');
 if(list&&Number(match[1])!==1)list.start=Number(match[1]);
 if(list){
  if(list.parentElement===block&&block.childNodes.length===1)block.replaceWith(list);
  const end=document.createRange();end.selectNodeContents(list.lastElementChild);end.collapse(false);selection.removeAllRanges();selection.addRange(end);
 }
 document.execCommand('insertParagraph');commitRich();
},true);
editor.addEventListener('keydown',event=>{
 if(event.defaultPrevented||event.key!=='Enter'||event.shiftKey||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||editor.selectionStart!==editor.selectionEnd)return;
 const at=editor.selectionStart,start=at?editor.value.lastIndexOf('\n',at-1)+1:0;
 const before=editor.value.slice(0,start);if((before.match(/^\s*```/gm)||[]).length%2)return;
 const match=/^(\s*)(\d+)\.[ \t]+\S.*$/.exec(editor.value.slice(start,at));if(!match)return;
 event.preventDefault();breakTypingGroup();insert('\n'+match[1]+(Number(match[2])+1)+'. ',at,at);
},true);

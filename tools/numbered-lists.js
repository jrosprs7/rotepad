// List continuation is independent of optional inline Markdown conversion.
// Only typed numbers start a list; typed -, * and + prefixes stay literal text.
function typedListContext(){
 const selection=getSelection();if(!selection.rangeCount||!selection.isCollapsed)return null;
 const node=selection.anchorNode,element=node?.nodeType===3?node.parentElement:node;
 if(!element||element.closest('li,pre,code,[data-literal-markdown]'))return null;
 const block=element.closest('p,div');if(!block||block===rich||!rich.contains(block))return null;
 const match=/^([1-9]\d{0,8}\.)[ \u00a0]+/.exec(block.textContent);if(!match)return null;
 const before=selection.getRangeAt(0).cloneRange();before.setStart(block,0);
 const offset=before.toString().length;if(offset<match[0].length)return null;
 return {block,prefix:match[0].length,number:parseInt(match[1],10),offset};
}
function removeTypedListPrefix(info){
 // Bookmark the actual DOM caret: text offsets alone lose inline boundaries.
 const selection=getSelection(),bookmark=document.createElement('span');
 selection.getRangeAt(0).insertNode(bookmark);
 const walker=document.createTreeWalker(info.block,NodeFilter.SHOW_TEXT),prefix=document.createRange();prefix.setStart(info.block,0);
 let left=info.prefix,node;
 while(node=walker.nextNode()){if(left<=node.length){prefix.setEnd(node,left);break;}left-=node.length;}
 prefix.deleteContents();return bookmark;
}
function caretAtBookmark(bookmark){const range=document.createRange();range.setStartBefore(bookmark);range.collapse(true);bookmark.remove();getSelection().removeAllRanges();getSelection().addRange(range);rememberRange();}
function moveListItemOut(item){
 const list=item.parentElement,parentItem=list.parentElement.closest('li');if(!parentItem)return false;
 const tail=list.cloneNode(false);tail.removeAttribute('id');
 if(list.tagName==='OL')tail.start=(Number(list.getAttribute('start'))||1)+[...list.children].indexOf(item)+1;
 while(item.nextSibling)tail.append(item.nextSibling);
 parentItem.after(item);if(tail.children.length)item.append(tail);if(!list.children.length)list.remove();
 if(!item.childNodes.length)item.append(document.createElement('br'));return true;
}
function outdentListItem(item){
 if(!moveListItemOut(item))return false;
 const caret=document.createRange();caret.setStart(item,0);caret.collapse(true);getSelection().removeAllRanges();getSelection().addRange(caret);rememberRange();commitRich();updateFormatting();return true;
}
function backspaceListStart(event){
 const backward=event.key==='Backspace'||event.inputType==='deleteContentBackward';
 if(!backward||event.defaultPrevented||event.shiftKey||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||composing)return;
 const selection=getSelection();if(!selection.rangeCount||!selection.isCollapsed)return;
 const node=selection.anchorNode,element=node?.nodeType===3?node.parentElement:node,item=element?.closest('li');
 if(!item){
  const typed=typedListContext();if(!typed||typed.offset!==typed.prefix)return;
  event.preventDefault();event.stopImmediatePropagation();breakTypingGroup();majorEditBoundary('Remove list marker');
  const bookmark=removeTypedListPrefix(typed);caretAtBookmark(bookmark);commitRich();updateFormatting();return;
 }
 if(!rich.contains(item)||isEmptyListItem(item))return;
 // A task's checkbox is part of its marker, not text before the caret.
 const before=selection.getRangeAt(0).cloneRange();before.setStart(item,0);const leading=before.cloneContents();leading.querySelectorAll('.task-box').forEach(box=>box.remove());
 if(leading.textContent.replace(/[\u200b\uFEFF]/g,'')||leading.querySelector('br,img,hr,table,ul,ol'))return;
 const list=item.parentElement;if(!['OL','UL'].includes(list.tagName))return;
 event.preventDefault();event.stopImmediatePropagation();breakTypingGroup();majorEditBoundary('Remove list marker');
 if(outdentListItem(item))return;
 const index=[...list.children].indexOf(item),after=list.cloneNode(false);after.removeAttribute('id');
 if(list.tagName==='OL')after.start=(Number(list.getAttribute('start'))||1)+index+1;
 while(item.nextSibling)after.append(item.nextSibling);
 const nested=[...item.children].filter(child=>['OL','UL'].includes(child.tagName));nested.forEach(child=>child.remove());
 item.querySelector(':scope>.task-box')?.remove();const paragraph=document.createElement('p');paragraph.append(...item.childNodes);item.remove();list.after(paragraph,...nested);
 if(after.children.length)(nested.at(-1)||paragraph).after(after);if(!list.children.length)list.remove();
 const caret=document.createRange();caret.setStart(paragraph,0);caret.collapse(true);selection.removeAllRanges();selection.addRange(caret);rememberRange();commitRich();updateFormatting();
}
rich.addEventListener('keydown',backspaceListStart,true);
rich.addEventListener('beforeinput',backspaceListStart,true);
// A deletion that merges a task item into the line before would flatten its checkbox into a literal ☐; drop that checkbox first.
function dropMergedTaskBox(event){
 if(event.defaultPrevented||composing||!/^(delete|insert)/.test(event.inputType))return;
 const s=getSelection();if(!s.rangeCount)return;const r=s.getRangeAt(0);if(!rich.contains(r.commonAncestorContainer))return;
 const backward=r.collapsed&&/Backward$/.test(event.inputType);if(r.collapsed&&!backward&&!/Forward$/.test(event.inputType))return;
 const boxes=[...rich.querySelectorAll('.task-box')],box=backward?boxes.filter(b=>r.comparePoint(b,0)<0).pop():boxes.find(b=>r.comparePoint(b,0)>0);if(!box)return;
 const gap=document.createRange();if(backward){gap.setStartAfter(box);gap.setEnd(r.startContainer,r.startOffset);}else{gap.setStart(r.endContainer,r.endOffset);gap.setEndBefore(box);}
 if(!gap.toString().trim()&&!gap.cloneContents().querySelector('br,img,hr,table'))box.remove();
}
rich.addEventListener('beforeinput',dropMergedTaskBox,true);
editingAction('Numbered list','numbered-list',()=>{
 if(mode==='rich'){restoreRange();document.execCommand('insertOrderedList');commitRich();return;}
 const a=editor.selectionStart,b=editor.selectionEnd,start=a?editor.value.lastIndexOf('\n',a-1)+1:0;
 const last=b>a&&editor.value[b-1]==='\n'?b-1:b,tail=editor.value.indexOf('\n',last),end=tail<0?editor.value.length:tail;
 const lines=editor.value.slice(start,end).split('\n'),remove=lines.every(line=>/^\s*\d+\.\s/.test(line));
 insert(lines.map((line,i)=>{const match=/^(\s*)(.*)$/.exec(line);return match[1]+(remove?'':(i+1)+'. ')+match[2].replace(/^(?:\d+\.|[-+*])\s+/,'');}).join('\n'),start,end);
});
function enterTypedList(event){
 if(event.defaultPrevented||!(event.key==='Enter'||event.inputType==='insertParagraph')||event.shiftKey||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||composing)return;
 const info=typedListContext();if(!info)return;
 event.preventDefault();event.stopImmediatePropagation();breakTypingGroup();majorEditBoundary('Continue list');
 const bookmark=removeTypedListPrefix(info);
 if(!info.block.textContent.trim()){caretAtBookmark(bookmark);info.block.replaceChildren(document.createElement('br'));const r=document.createRange();r.setStart(info.block,0);r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);commitRich();return;}
 const list=document.createElement('ol'),item=document.createElement('li');
 if(info.number!==1)list.start=info.number;
 item.append(...info.block.childNodes);list.append(item);info.block.replaceWith(list);caretAtBookmark(bookmark);
 const tail=getSelection().getRangeAt(0).cloneRange();tail.setEnd(item,item.childNodes.length);
 const next=document.createElement('li');next.append(tail.extractContents());
 if(!item.childNodes.length)item.append(document.createElement('br'));if(!next.childNodes.length)next.append(document.createElement('br'));
 item.after(next);const caret=document.createRange();caret.setStart(next,0);caret.collapse(true);getSelection().removeAllRanges();getSelection().addRange(caret);rememberRange();commitRich();updateFormatting();
}
rich.addEventListener('keydown',enterTypedList,true);
rich.addEventListener('beforeinput',enterTypedList,true);
editor.addEventListener('keydown',event=>{
 if(event.defaultPrevented||event.key!=='Enter'||event.shiftKey||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||editor.selectionStart!==editor.selectionEnd)return;
 const at=editor.selectionStart,start=at?editor.value.lastIndexOf('\n',at-1)+1:0;
 const before=editor.value.slice(0,start);if((before.match(/^\s*```/gm)||[]).length%2)return;
 const end=editor.value.indexOf('\n',start),line=editor.value.slice(start,end<0?editor.value.length:end);
 const match=/^(\s*)(\d+\.|[-+*])[ \t]+(?:\[([ xX])\][ \t]+)?/.exec(line);if(!match||at-start<match[0].length||!line.slice(match[0].length).trim())return;
 const marker=/^\d/.test(match[2])?(parseInt(match[2],10)+1)+'.':match[2];
 event.preventDefault();breakTypingGroup();insert('\n'+match[1]+marker+' '+(match[3]===undefined?'':'[ ] '),at,at);
},true);

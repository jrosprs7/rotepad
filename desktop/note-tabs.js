// Tabs expose this window's existing Open workspace; closing a tab never deletes a note.
const noteTabsStyle=document.createElement('style');
noteTabsStyle.textContent=`
@media screen{
 .single-row-ui header>.brand,.single-row-ui header>#filename,.single-row-ui header>#close-note{display:none!important}
 #note-tabs-bar{display:flex;align-items:center;gap:4px;flex:0 0 34px;height:34px;min-width:0;padding:0 8px;box-sizing:border-box;background:var(--tab-strip)}
 #note-tabs{display:flex;align-items:start;gap:3px;flex:0 1 auto;min-width:0;height:34px;padding-top:3px;box-sizing:border-box;overflow-x:auto;overflow-y:hidden}
 #note-tabs::-webkit-scrollbar{height:4px}#note-tabs::-webkit-scrollbar-thumb{background:var(--line);border-radius:2px}
 .note-tab{display:flex;align-items:center;flex:0 1 190px;min-width:110px;max-width:220px;height:27px;border-radius:6px 6px 0 0;background:transparent}
 .note-tab:has([aria-selected=true]){background:var(--paper)}
 .note-tab:hover{background:var(--chrome)}
 .note-tab:has([aria-selected=true]):hover{background:var(--paper)}
 #note-tabs-bar button{border:0;background:transparent;color:var(--ink);min-height:0;padding:0;border-radius:4px;box-sizing:border-box}
 #note-tabs .note-tab-select{flex:1;min-width:0;height:27px;padding:0 9px;text-align:left;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 #note-tabs .note-tab-close{flex:0 0 24px;height:24px;margin-right:3px;font-size:16px;line-height:1}
 #note-tabs-bar #new-note-tab{flex:0 0 28px;width:28px;height:28px;font-size:22px}
 #note-tabs-bar .note-tab-close:hover,#note-tabs-bar #new-note-tab:hover{background:var(--toolbar-hover)}
 #note-tabs-bar button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
 .single-row-ui.focus-mode #note-tabs-bar{display:none}
}
@media print{#note-tabs-bar{display:none!important}}
`;
document.head.append(noteTabsStyle);
const noteTabsBar=document.createElement('nav');noteTabsBar.id='note-tabs-bar';noteTabsBar.setAttribute('aria-label','Note tabs');
const noteTabs=document.createElement('div');noteTabs.id='note-tabs';noteTabs.setAttribute('role','tablist');noteTabs.setAttribute('aria-label','Open notes');
const newNoteTab=document.createElement('button');newNoteTab.id='new-note-tab';newNoteTab.textContent='+';newNoteTab.title='New note (Ctrl+N)';newNoteTab.setAttribute('aria-label','New note');newNoteTab.onclick=()=>createNote();
noteTabsBar.append(noteTabs,newNoteTab);document.querySelector('header').before(noteTabsBar);
workspace.id='desktop-note-panel';workspace.setAttribute('role','tabpanel');
const tabNodes=new Map(),closingTabs=new Set();let lastVisibleTab=null;
function selectNoteTab(id,keyboard=false){
 const note=notes.find(n=>n.id===id);if(!note||note.closed||note.trashed)return;
 if(activeId!==id)switchNote(id);
 if(keyboard)tabNodes.get(activeId)?.select.focus();else if(mode==='rich')rich.focus();else if(mode!=='preview')editor.focus();
}
async function closeNoteTab(id){
 if(closingTabs.has(id))return;closingTabs.add(id);renderNoteTabs();
 const hadTabFocus=noteTabs.contains(document.activeElement);
 try{await closeLibraryNote(id);}finally{closingTabs.delete(id);renderNoteTabs();if(hadTabFocus)(tabNodes.get(activeId)?.select||newNoteTab).focus();}
}
function renderNoteTabs(){
 const open=notes.filter(n=>!n.closed&&!n.trashed),openIds=new Set(open.map(n=>n.id));
 const order=Array.isArray(prefs.tabOrder)?prefs.tabOrder:[];
 prefs.tabOrder=[...new Set([...order.filter(id=>openIds.has(id)),...open.map(n=>n.id)])];
 for(const [id,node] of tabNodes)if(!openIds.has(id)){node.row.remove();tabNodes.delete(id);}
 for(const [index,id] of prefs.tabOrder.entries()){
  const note=open.find(n=>n.id===id);let node=tabNodes.get(id);
  if(!node){
   const row=document.createElement('div');row.className='note-tab';row.dataset.noteId=id;row.setAttribute('role','presentation');
   const select=document.createElement('button');select.className='note-tab-select';select.id='note-tab-'+id;select.setAttribute('role','tab');select.setAttribute('aria-controls',workspace.id);
   const close=document.createElement('button');close.className='note-tab-close';close.textContent='×';
   select.onclick=()=>selectNoteTab(id);select.ondblclick=()=>{manageNote(id);$('note-name').focus();$('note-name').select();};
   row.oncontextmenu=event=>{event.preventDefault();manageNote(id);};
   row.onauxclick=event=>{if(event.button===1){event.preventDefault();void closeNoteTab(id);}};
   close.onclick=()=>void closeNoteTab(id);
   row.append(select,close);node={row,select,close};tabNodes.set(id,node);
  }
  const selected=id===activeId;
  node.select.textContent=note.name||'Untitled';node.select.title=(note.name||'Untitled')+' — double-click for note options';
  node.select.setAttribute('aria-selected',String(selected));node.select.tabIndex=selected?0:-1;
  node.close.title='Close '+(note.name||'Untitled')+' — keep in Library';node.close.setAttribute('aria-label','Close '+(note.name||'Untitled'));node.close.tabIndex=selected?0:-1;node.close.disabled=closingTabs.has(id);
  if(noteTabs.children[index]!==node.row)noteTabs.insertBefore(node.row,noteTabs.children[index]||null);
 }
 if(openIds.has(activeId)){workspace.setAttribute('aria-labelledby','note-tab-'+activeId);if(lastVisibleTab!==activeId){lastVisibleTab=activeId;tabNodes.get(activeId)?.row.scrollIntoView({block:'nearest',inline:'nearest'});}}
 else{workspace.removeAttribute('aria-labelledby');lastVisibleTab=null;}
}
noteTabs.addEventListener('keydown',event=>{
 const tab=event.target.closest('[role=tab]');if(!tab)return;
 const order=prefs.tabOrder,index=order.indexOf(tab.closest('.note-tab').dataset.noteId);
 let next;if(event.key==='ArrowRight')next=order[(index+1)%order.length];else if(event.key==='ArrowLeft')next=order[(index+order.length-1)%order.length];else if(event.key==='Home')next=order[0];else if(event.key==='End')next=order.at(-1);
 else if(event.key==='F2'){event.preventDefault();manageNote(order[index]);$('note-name').focus();$('note-name').select();return;}
 if(next){event.preventDefault();selectNoteTab(next,true);}
});
noteTabs.addEventListener('wheel',event=>{if(!event.ctrlKey&&!event.shiftKey&&Math.abs(event.deltaY)>Math.abs(event.deltaX)&&noteTabs.scrollWidth>noteTabs.clientWidth){event.preventDefault();noteTabs.scrollLeft+=event.deltaY;}},{passive:false});
new ResizeObserver(()=>tabNodes.get(activeId)?.row.scrollIntoView({block:'nearest',inline:'nearest'})).observe(noteTabs);
window.addEventListener('keydown',event=>{
 if((event.ctrlKey||event.metaKey)&&event.key==='Tab'&&!event.altKey&&!event.isComposing&&!document.querySelector('dialog[open]')){
  const order=prefs.tabOrder||[];if(!order.length)return;event.preventDefault();event.stopImmediatePropagation();
  const index=order.indexOf(activeId);selectNoteTab(order[(index+(event.shiftKey?order.length-1:1))%order.length]);
 }
},true);
const renderNotesWithTabs=renderNotes;renderNotes=function(){renderNotesWithTabs();renderNoteTabs();};
libraryShortcuts.insertAdjacentHTML('beforeend','<dt>Next / previous note tab</dt><dd><kbd>Ctrl + Tab</kbd> / <kbd>Ctrl + Shift + Tab</kbd></dd>');
renderNoteTabs();fitToolbar();

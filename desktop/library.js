// Desktop note lifecycle. Managed Markdown files hold note content; app data
// stores history, workspace metadata and a recovery copy.
function noteTitle(name){return name.replace(/\.(?:md|markdown|txt)$/i,'');}
const titledNewNote=newNote;
newNote=function(name='Untitled',text=''){return titledNewNote(noteTitle(name)||'Untitled',text);};
function normalizeNoteTitles(){
  filename.value=noteTitle(filename.value);
  for(const note of notes)note.name=noteTitle(note.name);
}
normalizeNoteTitles();filename.setAttribute('aria-label','Note title');
let libraryTimer,libraryPending='',libraryWritten='',libraryWriting=null,libraryError='';
let libraryStamp=Date.now(),libraryClosing=false;
const retryLibrary=document.createElement('button');retryLibrary.id='retry-library-save';retryLibrary.textContent='Retry save';retryLibrary.hidden=true;$('save-status').after(retryLibrary);
function libraryStatus(){
  const busy=Boolean(libraryPending&&libraryPending!==libraryWritten);
  $('save-status').textContent=libraryError?'Could not save notes':busy?'Saving…':'Saved in Rotepad';
  $('save-status').title=libraryError||'Each note saves automatically to a Markdown file on this PC. File → Export Markdown creates an additional copy.';
  retryLibrary.hidden=!libraryError;
}
updateFileStatus=libraryStatus;
function librarySnapshot(){
  libraryStamp=Math.max(Date.now(),libraryStamp+1);
  return JSON.stringify({version:2,activeId,notes,prefs,font:$('font').value,size:$('size').value,mode,desktopSavedAt:libraryStamp});
}
function queueLibrary(){
  libraryPending=librarySnapshot();
  try{localStorage.setItem(libraryKey,libraryPending);}catch{/* Disk library remains available when browser storage is full. */}
  clearTimeout(libraryTimer);libraryTimer=setTimeout(()=>flushLibrary().catch(()=>{}),400);libraryStatus();
}
async function flushLibrary(){
  clearTimeout(libraryTimer);
  if(window.desktopLibraryBootstrapError)throw Error(window.desktopLibraryBootstrapError);
  if(libraryWriting){await libraryWriting;if(libraryPending!==libraryWritten)return flushLibrary();return;}
  libraryWriting=(async()=>{
    try{
      while(libraryPending!==libraryWritten){const text=libraryPending;await window.rotDesktop.librarySave(text);libraryWritten=text;}
      libraryError='';storageOK=true;
    }catch(error){libraryError=error.message;throw error;}
    finally{libraryStatus();}
  })();
  try{await libraryWriting;}finally{libraryWriting=null;}
}
const libraryPersist=persistLibrary;
persistLibrary=function(){normalizeNoteTitles();libraryPersist();queueLibrary();};
retryLibrary.onclick=()=>{persist();void flushLibrary().catch(()=>{});};
save=async()=>{persist();try{await flushLibrary();}catch(error){alert('Could not save notes. '+error.message);}};
$('save').onclick=save;$('save').textContent='Save now';$('save').title='Save notes now (Ctrl+S). Notes also save automatically.';
$('save-as').textContent='Export Markdown…';$('save-as').title='Export a Markdown file (Ctrl+Shift+S)';
const exportMarkdown=saveToFile;
saveToFile=async function(){if(!activeNote()?.closed)await exportMarkdown(true);};
$('open').textContent='Import Markdown…';
const libraryShortcuts=$('shortcuts-dialog').querySelector('.shortcuts');
libraryShortcuts.querySelector('dt').textContent='Save notes now';
libraryShortcuts.insertAdjacentHTML('beforeend','<dt>Export Markdown</dt><dd><kbd>Ctrl + Shift + S</kbd></dd><dt>Close note (keep in Library)</dt><dd><kbd>Ctrl + W</kbd></dd><dt>New note</dt><dd><kbd>Ctrl + N</kbd></dd>');
document.querySelector('#notes-sidebar .side-note').textContent='Notes save automatically as Markdown files on this PC.';
folderRow.querySelector('label').textContent='Default notes folder';
folderRow.querySelector('small').textContent='New notes save here automatically. Existing notes keep their locations. Export dialogs also start here.';

// Open notes are workspace membership, independent of the note library/Trash.
const openNotesButton=document.createElement('button');openNotesButton.id='show-open-notes';openNotesButton.textContent='Open';$('show-notes').before(openNotesButton);$('show-notes').textContent='Library';
if(!['open','library','trash'].includes(prefs.libraryFilter))prefs.libraryFilter='open';
const emptyWorkspace=document.createElement('div');emptyWorkspace.id='empty-workspace';emptyWorkspace.hidden=true;
emptyWorkspace.innerHTML='<p>No note open</p><p>Open a note from the Library, or create a new one.</p><button id="empty-new-note">New note</button>';
emptyWorkspace.style.cssText='padding:40px;text-align:center;color:var(--muted)';column.prepend(emptyWorkspace);
$('empty-new-note').onclick=()=>createNote();
const closeNoteButton=document.createElement('button');closeNoteButton.id='close-note';closeNoteButton.textContent='×';closeNoteButton.title='Close note — keep in Library (Ctrl+W)';closeNoteButton.setAttribute('aria-label','Close note');filename.after(closeNoteButton);
const closeManaged=document.createElement('button');closeManaged.id='note-close';closeManaged.textContent='Close note';$('note-actions-dialog').querySelector('.actions').prepend(closeManaged);
const revealManaged=document.createElement('button');revealManaged.id='note-show-in-folder';revealManaged.textContent='Show in File Explorer';$('note-actions-dialog').querySelector('.actions').append(revealManaged);
revealManaged.onclick=async()=>{
  const note=managedNote();if(!note||revealManaged.disabled)return;
  revealManaged.disabled=true;
  try{
    persist();await flushLibrary();
    const result=await rotDesktop.showInFolder(note.id);
    if(result.error){alert(result.error);return;}
    $('note-actions-dialog').close();
  }catch(error){alert('Could not show the note in File Explorer.\n'+error.message);}
  finally{revealManaged.disabled=false;}
};
const libraryManage=manageNote;manageNote=function(id){libraryManage(id);const note=notes.find(n=>n.id===id);closeManaged.hidden=!note||note.trashed||note.closed;};
function workspaceState(){
  const empty=Boolean(activeNote()?.closed||activeNote()?.trashed);
  emptyWorkspace.hidden=!empty;workspace.style.display=empty?'none':'';document.querySelector('.toolbar').style.display=empty?'none':'';
  filename.disabled=empty;closeNoteButton.disabled=empty;
  if(empty){$('notes-sidebar').hidden=false;$('toggle-notes').setAttribute('aria-expanded','true');}
}
renderNotes=function(){
  trashMode=prefs.libraryFilter==='trash';
  for(const [id,filter] of [['show-open-notes','open'],['show-notes','library'],['show-trash','trash']])$(id).setAttribute('aria-pressed',String(prefs.libraryFilter===filter));
  const list=$('notes-list'),query=$('notes-search').value.toLocaleLowerCase();list.replaceChildren();
  for(const note of [...notes].filter(n=>Boolean(n.trashed)===trashMode&&(prefs.libraryFilter!=='open'||!n.closed)).sort(compareNotes)){
    if(query&&!(note.name+' '+note.text).toLocaleLowerCase().includes(query))continue;
    const row=document.createElement('div');row.className='note-entry';row.dataset.noteId=note.id;
    const button=document.createElement('button');button.className='note-row';button.setAttribute('aria-current',String(note.id===activeId&&!note.closed));
    const title=document.createElement('strong'),snippet=document.createElement('small');title.textContent=(note.pinned?'★ ':'')+(note.name||'Untitled.md');snippet.textContent=note.text.replace(/\s+/g,' ').slice(0,70)||'Empty note';button.append(title,snippet);
    button.onclick=()=>trashMode?manageNote(note.id):note.id===activeId?activateNote(note.id):switchNote(note.id);
    const menu=document.createElement('button');menu.className='note-menu-button';menu.textContent='⋯';menu.setAttribute('aria-label','Options for '+note.name);menu.onclick=()=>manageNote(note.id);row.append(button,menu);list.append(row);
  }
  if(!list.children.length){const message=document.createElement('p');message.className='side-note';message.textContent=trashMode?'Trash is empty.':prefs.libraryFilter==='open'?'No open notes. Find your notes in Library.':'No matching notes.';list.append(message);}
  workspaceState();
};
function libraryFilter(value){prefs.libraryFilter=value;renderNotes();persist();}
setTrash=value=>libraryFilter(value?'trash':'library');
openNotesButton.onclick=()=>libraryFilter('open');$('show-notes').onclick=()=>libraryFilter('library');$('show-trash').onclick=()=>libraryFilter('trash');
const libraryActivate=activateNote;
activateNote=function(id){const note=notes.find(n=>n.id===id);if(!note||note.trashed)return;note.closed=false;libraryActivate(id);workspaceState();};
async function closeLibraryNote(id=activeId){
  if(libraryClosing)return;
  const note=notes.find(n=>n.id===id);if(!note||note.trashed||note.closed)return;
  capturePosition();persist();
  try{await flushLibrary();}catch(error){alert('Could not save this note. It will stay open. '+error.message);return;}
  note.closed=true;
  if(id===activeId){const next=notes.find(n=>!n.closed&&!n.trashed);if(next)activateNote(next.id);}
  persist();renderNotes();
}
closeNoteButton.onclick=()=>closeLibraryNote();closeManaged.onclick=()=>{$('note-actions-dialog').close();void closeLibraryNote(managedNoteId);};
// Existing Trash/history actions retain their semantics; a deleted note is no
// longer open. Do not reopen an unrelated closed note when deleting the last one.
$('note-trash').onclick=()=>{
  const note=managedNote();if(!note)return;capturePosition();checkpoint();persist();note.trashed=true;note.closed=true;note.deletedAt=Date.now();
  if(note.id===activeId){const next=notes.find(n=>!n.trashed&&!n.closed);if(next)activateNote(next.id);}
  finishNoteAction();
};
window.addEventListener('keydown',event=>{
  if(document.querySelector('dialog[open]'))return;
  const modifier=event.ctrlKey||event.metaKey,key=event.key.toLowerCase();
  if(modifier&&key==='w'){event.preventDefault();event.stopImmediatePropagation();void closeLibraryNote();}
  else if(modifier&&key==='n'){event.preventDefault();event.stopImmediatePropagation();createNote();}
  else if((activeNote()?.closed||activeNote()?.trashed)&&(event.key==='F5'||modifier&&['b','i','u','k','z','y','f','h','[',']'].includes(key))){event.preventDefault();event.stopImmediatePropagation();}
},true);
window.rotDesktop.onClose(async()=>{
  if(libraryClosing)return;libraryClosing=true;document.body.inert=true;let approved=false;
  try{
    await desktopFilesReady;await openQueue;
    if(filePickerBusy||fileSaveBusy.size)return;
    capturePosition();persist();await flushLibrary();savedText=editor.value;approved=true;
  }catch(error){alert('Could not save notes. Rotepad will stay open so you can retry or export a backup.\n'+error.message);}
  finally{document.body.inert=false;libraryClosing=false;await window.rotDesktop.closeFinish(approved);}
});
// Core startup already loaded notes. Preserve the saved workspace membership;
// hide closed notes without deleting their text or generating a replacement.
renderNotes();
if(['rich','write','split','preview'].includes(window.desktopInitialSession?.mode))setMode(window.desktopInitialSession.mode);
if(window.desktopInitialSession?.positions)activeNote().positions=window.desktopInitialSession.positions;
restorePosition();persist();
if(window.desktopLibraryBootstrapError){libraryError=window.desktopLibraryBootstrapError;libraryStatus();alert('Could not restore the saved library. Restart Rotepad before editing. '+libraryError);document.body.inert=true;}

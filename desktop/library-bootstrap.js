// Restore the durable library before the editor initializes. A newer local cache
// can recover the final edits after a crash during the short autosave delay.
try{
  const saved=window.rotDesktop.libraryInitial();
  let cached=null;try{cached=JSON.parse(localStorage.getItem('rotepad.library.v2')||'null');}catch{}
  if(saved){
    const disk=JSON.parse(saved);
    if(!cached||!(cached.desktopSavedAt>disk.desktopSavedAt)){localStorage.setItem('rotepad.library.v2',saved);cached=disk;}
    else{
      // A newer session cache must not conceal a changed Markdown file. Keep
      // conflicting unsaved text as a separate recovery note, never discard it.
      for(const change of disk.markdownRefresh||[]){const note=cached.notes?.find(n=>n.id===change.id);if(!note)continue;
        if(note.text!==change.before&&note.text!==change.text)cached.notes.push({...note,id:crypto.randomUUID(),name:note.name+' (recovered draft)',closed:true,trashed:false,created:Date.now(),updated:Date.now()});
        note.text=change.text;
      }
      localStorage.setItem('rotepad.library.v2',JSON.stringify(cached));
    }
  }
  const note=cached?.notes?.find(n=>n.id===cached.activeId);
  if(note)window.desktopInitialSession={mode:cached.mode,positions:note.positions};
}catch(error){window.desktopLibraryBootstrapError=error.message;}

// Each window has its own crash-recovery snapshot; the main process owns the shared library.
try{
 const context=window.rotDesktop.libraryInitial(),key=context.key,baseKey=key+'.base';
 window.desktopLibraryKey=key;window.desktopFreshWindow=context.fresh;
 const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
 const disk=context.library?JSON.parse(context.library):{version:2,notes:[]};
 let cached=context.fresh?null:read(key),baseline=cached?.desktopBase||read(baseKey),initial=disk;
 if(cached){
  if(!context.library)initial=cached;
  else if(baseline)initial=mergeDesktopLibrary(baseline,cached,disk,{keepWorkspace:true,copySuffix:'recovered draft'}).data;
  else if(!context.library||cached.desktopSavedAt>disk.desktopSavedAt){
   initial=cached;
   // Legacy cache migration: keep external-file refreshes and recover conflicting drafts.
   for(const change of disk.markdownRefresh||[]){const note=initial.notes?.find(n=>n.id===change.id);if(!note)continue;
    if(note.text!==change.before&&note.text!==change.text)initial.notes.push({...note,id:crypto.randomUUID(),name:note.name+' (recovered draft)',closed:true,trashed:false,created:Date.now(),updated:Date.now()});
    note.text=change.text;
   }
  }
 }
 const recovered=[];
 if(context.recover){
  for(const other of Object.keys(localStorage).filter(k=>/^rotepad\.library\.v2\.window\.\d+$/.test(k))){
   const snapshot=read(other),base=snapshot?.desktopBase||read(other+'.base');if(!snapshot||!base)continue;
   const workspace={activeId:initial.activeId,mode:initial.mode,prefs:initial.prefs,font:initial.font,size:initial.size};
   initial=mergeDesktopLibrary(base,snapshot,initial,{copySuffix:'recovered draft'}).data;Object.assign(initial,workspace);recovered.push(other);
  }
 }
 window.desktopLibraryBase=JSON.stringify(disk);
 if(initial.notes.length){
  if(context.fresh)initial={...initial,notes:initial.notes.map(n=>({...n,closed:true}))};
  localStorage.setItem(key,JSON.stringify({...initial,desktopBase:disk}));
 }else localStorage.removeItem(key);
 localStorage.removeItem(baseKey);
 for(const other of recovered){localStorage.removeItem(other);localStorage.removeItem(other+'.base');}
 const note=initial.notes?.find(n=>n.id===initial.activeId);
 if(note&&!context.fresh)window.desktopInitialSession={mode:initial.mode,positions:note.positions};
}catch(error){window.desktopLibraryBootstrapError=error.message;}

// Shared three-way merge for the main-process writer and renderer recovery.
// A stale window contributes only its changes, never its entire old library.
(function(root){
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
 const workspaceFields=new Set(['closed','positions']);
 function mergeDesktopLibrary(base,local,remote,options={}){
  base=base||{version:2,notes:[]};remote=remote||{version:2,notes:[]};
  const old=new Map(base.notes.map(n=>[n.id,n])),ours=new Map(local.notes.map(n=>[n.id,n]));
  const result=new Map(remote.notes.map(n=>[n.id,{...clone(n),...(options.keepWorkspace&&!ours.has(n.id)?{closed:true}:{})}])),conflicts=[];
  const makeId=options.makeId||(()=>crypto.randomUUID());
  const changed=(a,b,key)=>!equal(a?.[key],b?.[key]);
  const edited=(a,b)=>['name','text','trashed'].some(key=>changed(a,b,key));
  for(const note of local.notes){
   const before=old.get(note.id),current=result.get(note.id);
   if(!before&&!current){result.set(note.id,clone(note));continue;}
   if(!current){if(edited(before,note))recover(note);continue;}
   const conflict=!before?!equal(note,current):
    ['name','text','trashed'].some(key=>changed(note,before,key)&&changed(current,before,key)&&changed(note,current,key))||
    changed(note,before,'trashed')&&edited(current,before)||changed(current,before,'trashed')&&edited(note,before);
   if(conflict){recover(note);continue;}
   if(!before)continue;
   for(const key of new Set([...Object.keys(before),...Object.keys(note)])){
    if(key==='id'||key==='revisions'||key==='updated')continue;
    if(options.keepWorkspace&&workspaceFields.has(key)||changed(note,before,key)){
     if(note[key]===undefined)delete current[key];else current[key]=clone(note[key]);
    }
   }
   if(changed(note,before,'revisions')){
    if(!changed(current,before,'revisions'))current.revisions=clone(note.revisions||[]);
    else{
     const versions=[...(current.revisions||[]),...(note.revisions||[])].sort((a,b)=>b.at-a.at),kept=[];
     for(const version of versions)if(!kept.length||kept.at(-1).at-version.at>=180000)kept.push(clone(version));
     current.revisions=kept.slice(0,25).reverse();
    }
   }
   current.updated=Math.max(current.updated||0,note.updated||0);
  }
  // Permanent removal cannot discard a note another window changed meanwhile.
  for(const [id,note] of old)if(!ours.has(id)&&result.has(id)&&!edited(result.get(id),note))result.delete(id);
  function recover(note){
   const id=makeId(note),copy={...clone(note),id,name:note.name+' ('+(options.copySuffix||'conflict copy')+')',trashed:false,closed:false,created:Date.now(),updated:Date.now()};
   delete copy.deletedAt;delete copy.diskSignature;delete copy.diskName;
   result.set(id,copy);conflicts.push({originalId:note.id,copyId:id});
  }
  const data={...clone(remote),notes:[...result.values()]};
  for(const key of ['activeId','mode','font','size','prefs']){
   if(options.keepWorkspace||changed(local,base,key))data[key]=clone(local[key]);
  }
  const redirected=conflicts.find(c=>c.originalId===local.activeId);
  if(redirected)data.activeId=redirected.copyId;
  if(!result.has(data.activeId))data.activeId=data.notes[0]?.id;
  return {data,conflicts};
 }
 if(typeof module!=='undefined')module.exports={mergeDesktopLibrary};else root.mergeDesktopLibrary=mergeDesktopLibrary;
})(typeof window==='undefined'?globalThis:window);

// Desktop-only adapter. The original standalone HTML remains unchanged.
const desktopLogo=document.createElement('img');desktopLogo.src='rotepad.png';desktopLogo.alt='';desktopLogo.style.cssText='width:100%;height:100%;object-fit:contain';
const desktopLogoBox=document.querySelector('.logo');desktopLogoBox.replaceChildren(desktopLogo);desktopLogoBox.style.background='transparent';
saveToFile = async function(saveAs=false) {
  const id=activeId,note=activeNote(),text=editor.value,name=filename.value;
  if(fileSaveBusy.has(id)||filePickerBusy)return;
  fileSaveBusy.add(id);filePickerBusy=true;
  try {
    const result=await window.rotDesktop.save({id,text,name:suggestedFilename(name),saveAs});
    if(!result)return;
    noteFiles.set(id,{name:result.name});note.diskSignature=textSignature(text);note.diskName=result.name;
    if(note.name===name){note.name=result.name;if(activeId===id&&filename.value===name)filename.value=result.name;}
    if(activeId===id)savedText=text;
    persist();renderNotes();updateFileStatus();
  } catch(error) { alert('Could not save the file. '+error.message+'\nYour note remains in Rotepad.'); }
  finally {fileSaveBusy.delete(id);filePickerBusy=false;}
};
async function openDesktopNote(file){
  if(!file)return;
  // Reopening an already-open file preserves unsaved work in its existing note.
  const existing=notes.filter(n=>file.existingIds?.includes(n.id)&&!n.trashed).sort((a,b)=>(b.id===activeId)-(a.id===activeId)||(b.updated||0)-(a.updated||0))[0];
  if(existing){activateNote(existing.id);await window.rotDesktop.bind({id:existing.id,token:file.token});return;}
  const oldId=activeId,text=file.text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');createNote(file.name,text);if(oldId!==activeId){await window.rotDesktop.bind({id:activeId,token:file.token});noteFiles.set(activeId,{name:file.name});activeNote().diskSignature=textSignature(text);activeNote().diskName=file.name;savedText=text;persist();updateFileStatus();}
}
$('open').onclick=async()=>{
  if(filePickerBusy)return;filePickerBusy=true;
  try {await openDesktopNote(await window.rotDesktop.open());}
  catch(error){alert('Could not open file: '+error.message);}finally{filePickerBusy=false;}
};
const desktopStatus=updateFileStatus;
updateFileStatus=function(){desktopStatus();$('save-status').textContent=$('save-status').textContent.replace(/in this browser/g,'in this app').replace(/browser draft/g,'app draft');};
const desktopFilesReady=window.rotDesktop.files().then(files=>{for(const file of files)noteFiles.set(file.id,{name:file.name});updateFileStatus();});
const folderRow=document.createElement('div');folderRow.style.cssText='grid-column:1/-1;display:grid;gap:8px';
folderRow.innerHTML='<label>Default save folder</label><output id="default-save-folder" style="overflow-wrap:anywhere"></output><button type="button" id="choose-save-folder">Change folder…</button><small>New notes start here when you save. Existing files keep their own locations.</small>';
$('settings-dialog').querySelector('.settings-grid').append(folderRow);
window.rotDesktop.settings().then(settings=>{$('default-save-folder').textContent=settings.saveFolder;});
$('choose-save-folder').onclick=async()=>{try{const settings=await window.rotDesktop.chooseFolder();if(settings)$('default-save-folder').textContent=settings.saveFolder;}catch(error){alert('Could not change save folder: '+error.message);}};
let openQueue=Promise.resolve();window.rotDesktop.onOpen(file=>{openQueue=openQueue.then(()=>openDesktopNote(file)).catch(error=>alert('Could not open note: '+error.message));});
// Right-click formatting: applied with the toolbar's own commands, and only while the note editor has the selection.
window.rotDesktop.onContextFormat(type=>{const target=document.activeElement;if(target!==editor&&!rich.contains(target))return;if(type==='clear')clearSelectedFormatting();else if(type==='strike'||type==='highlight')extraFormat(type);else format(type);});
void window.rotDesktop.ready();


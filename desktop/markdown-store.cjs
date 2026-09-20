// Only files recorded in this managed-note index are updated or renamed.
// Imported/exported file associations are deliberately separate.
const fs=require('node:fs/promises'),path=require('node:path');
function fileTitle(name){
  let value=(name||'Untitled').replace(/\.(md|markdown|txt)$/i,'').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').trim();
  if(!value)value='Untitled';if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value))value='_'+value;
  return [...value].slice(0,100).join('');
}
class MarkdownStore{
  constructor(indexPath,atomicWrite){this.indexPath=indexPath;this.atomicWrite=atomicWrite;this.records=Object.create(null);}
  async load(){
    try{const data=JSON.parse(await fs.readFile(this.indexPath,'utf8'));for(const [id,record] of Object.entries(data)){
      if(!record||!path.isAbsolute(record.root)||!path.isAbsolute(record.file))throw Error('Invalid managed note index');
      const relative=path.relative(record.root,record.file);if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Managed note is outside its folder');
      this.records[id]=record;
    }}catch(error){if(error.code!=='ENOENT')throw error;}
  }
  async record(id,record){const next={...this.records,[id]:record};await this.atomicWrite(this.indexPath,JSON.stringify(next));this.records=next;}
  async createUnique(folder,title,text){
    await fs.mkdir(folder,{recursive:true});
    for(let i=1;i<100000;i++){
      const file=path.join(folder,title+(i===1?'':' ('+i+')')+'.md');
      try{await fs.writeFile(file,text,{encoding:'utf8',flag:'wx'});return file;}catch(error){if(error.code!=='EEXIST')throw error;}
    }
    throw Error('Could not find an unused note filename');
  }
  async hydrate(data){
    data.markdownRefresh=[];
    for(const note of data.notes){const record=this.records[note.id];if(!record)continue;
      try{const text=(await fs.readFile(record.file,'utf8')).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');if(text!==note.text)data.markdownRefresh.push({id:note.id,before:note.text,text});note.text=text;}
      catch(error){if(error.code!=='ENOENT')throw error;/* Recovery copy recreates a missing managed file on save. */}
    }
    return data;
  }
  async save(data,defaultFolder){
    for(const note of data.notes){
      const previous=this.records[note.id],title=fileTitle(note.name),trashed=Boolean(note.trashed);
      // Don't litter the user's folder with untouched initial empty notes.
      if(!previous&&!note.text&&title==='Untitled')continue;
      const root=previous?.root||defaultFolder,folder=trashed?path.join(root,'.Trash'):root;
      if(!previous||previous.title!==title||previous.trashed!==trashed){
        const file=await this.createUnique(folder,title,note.text);
        try{await this.record(note.id,{root,file,title,trashed});}
        catch(error){await fs.unlink(file).catch(()=>{});throw error;}
        // Commit the new file and index before removing the old managed copy.
        if(previous&&previous.file!==file)await fs.unlink(previous.file).catch(error=>{if(error.code!=='ENOENT')throw error;});
      }else{
        let existing=null;try{existing=await fs.readFile(previous.file,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
        if(existing!==note.text){await fs.mkdir(folder,{recursive:true});await this.atomicWrite(previous.file,note.text);}
      }
    }
  }
}
module.exports={MarkdownStore,fileTitle};

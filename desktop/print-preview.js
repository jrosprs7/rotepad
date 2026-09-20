// Desktop preview uses the actual PDF pagination, not a screen approximation.
const printPreviewStyle=document.createElement('style');
printPreviewStyle.textContent=`
@media screen {
 #print-preview-dialog{width:calc(100vw - 40px);max-width:1200px;height:calc(100vh - 40px);max-height:none;padding:18px;box-sizing:border-box}
 #print-preview-dialog[open]{display:flex;flex-direction:column;gap:12px}
 #print-preview-dialog h2{margin:0;font-size:20px}
 #print-preview-close{position:absolute;right:16px;top:12px;width:36px;height:36px;padding:0}
 #print-preview-dialog .print-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-right:40px}
 #print-preview-dialog label{display:flex;align-items:center;gap:6px;margin:0;font-size:14px}
 #print-preview-dialog select{width:auto;padding:7px}
 #print-preview-dialog iframe{width:100%;flex:1;min-height:100px;border:1px solid var(--line);background:#525659}
 #print-preview-status{margin:0;font-size:14px;color:var(--muted)}
}
@media print{#print-document table{width:100%;border-collapse:collapse}#print-document th,#print-document td{border:1px solid #bbb;padding:6px}#print-document pre{white-space:pre-wrap;overflow-wrap:anywhere}#print-document img{max-width:100%}}
`;
document.head.append(printPreviewStyle);
dialogMarkup('print-preview-dialog',`<button id="print-preview-close" class="dialog-close" aria-label="Close print preview">×</button>
 <h2>Print preview</h2>
 <div class="print-controls">
 <label>Paper <select id="print-paper"><option>A4</option><option>Letter</option><option>Legal</option><option>A5</option></select></label>
 <label>Orientation <select id="print-orientation"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
 <button id="print-preview-print" class="primary">Print…</button><button id="print-preview-save">Save as PDF…</button>
 </div><p id="print-preview-status" role="status">Preparing pages…</p>
 <iframe id="print-preview-frame" title="Print preview pages"></iframe>`);
const printPreviewDialog=$('print-preview-dialog');
// Keep the preview's document fixed even if an external file opens meanwhile.
const prepareLivePrint=preparePrint;
window.removeEventListener('beforeprint',prepareLivePrint);
preparePrint=function(){if(!printPreviewDialog.open)prepareLivePrint();};
window.addEventListener('beforeprint',preparePrint);
let printPreviewURL='',printPreviewToken='',printPreviewWorking=false,printPreviewName='';
function printPreviewLock(value){
 printPreviewWorking=value;
 for(const id of ['print-paper','print-orientation','print-preview-print','print-preview-save','print-preview-close'])$(id).disabled=value;
 if(!value&&!printPreviewToken){$('print-preview-print').disabled=true;$('print-preview-save').disabled=true;}
}
async function refreshPrintPreview(){
 printPreviewLock(true);printPreviewToken='';$('print-preview-status').textContent='Preparing pages…';
 try{
  await document.fonts.ready;
  const result=await rotDesktop.printPreview({pageSize:$('print-paper').value,landscape:$('print-orientation').value==='landscape'});
  if(printPreviewURL)URL.revokeObjectURL(printPreviewURL);
  printPreviewURL=URL.createObjectURL(new Blob([result.pdf],{type:'application/pdf'}));
  $('print-preview-frame').src=printPreviewURL+'#toolbar=0&view=Fit';printPreviewToken=result.token;
  $('print-preview-status').textContent='Scroll to review your pages. Print opens the printer settings.';
 }catch(error){$('print-preview-frame').src='about:blank';$('print-preview-status').textContent='Could not prepare preview. '+error.message;}
 finally{printPreviewLock(false);}
}
async function openPrintPreview(){
 if(printPreviewDialog.open)return;
 const note=activeNote();if(!note||note.closed||note.trashed){alert('Open a note to print.');return;}
 $('settings-dialog').close();
 preparePrint();printPreviewName=noteTitle(filename.value)||'Untitled';
 printPreviewDialog.showModal();await refreshPrintPreview();
}
async function outputPrintPreview(action){
 if(printPreviewWorking||!printPreviewToken)return;
 printPreviewLock(true);
 try{
  const result=await rotDesktop.printOutput({token:printPreviewToken,action,name:printPreviewName});
  $('print-preview-status').textContent=result.canceled?'Canceled. Your preview is still open.':result.saved?'PDF saved.':'Sent to printer.';
 }catch(error){$('print-preview-status').textContent='Could not '+(action==='pdf'?'save PDF':'print')+'. '+error.message;}
 finally{printPreviewLock(false);}
}
$('print-paper').onchange=refreshPrintPreview;$('print-orientation').onchange=refreshPrintPreview;
$('print-preview-print').onclick=()=>outputPrintPreview('print');$('print-preview-save').onclick=()=>outputPrintPreview('pdf');
$('print-preview-close').onclick=()=>printPreviewDialog.close();
printPreviewDialog.addEventListener('cancel',event=>{if(printPreviewWorking)event.preventDefault();});
printPreviewDialog.addEventListener('close',()=>{ $('print-preview-frame').src='about:blank';if(printPreviewURL)URL.revokeObjectURL(printPreviewURL);printPreviewURL='';printPreviewToken='';});
$('print-note').textContent='Print preview / Save as PDF';$('print-note').onclick=openPrintPreview;
window.print=openPrintPreview;
window.addEventListener('keydown',event=>{
 if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='p'){
  event.preventDefault();event.stopImmediatePropagation();
  if(!document.querySelector('dialog[open]')||$('settings-dialog').open)void openPrintPreview();
 }
},true);

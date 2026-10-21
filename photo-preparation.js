/* Photo preparation runs locally; files are not uploaded by this tool. */
(function(){
'use strict';
const root=document.getElementById('freePhotoTools');
if(!root)return;
root.innerHTML='<details class="shop-editor"><summary style="cursor:pointer;font-weight:800;color:var(--green)">Preparar fotos sin usar créditos de Cloudinary</summary><p class="photo-help">1. Elige una foto. Se prepara en este equipo, sin subirla a ningún servicio.</p><input id="localPhotoFile" type="file" accept="image/jpeg,image/png,image/webp"><p id="localPhotoStatus" class="photo-help" role="status" aria-live="polite"></p><img id="localPhotoPreview" class="photo-preview hidden" alt="Vista previa de la foto preparada"><a id="localPhotoDownload" class="btn hidden">Descargar foto preparada</a><p class="photo-help">2. Abre la carpeta de fotos, arrastra el archivo descargado y pulsa Commit changes para publicarlo. Sube únicamente fotos comerciales autorizadas; quedarán públicas.</p><a class="btn ghost" href="https://github.com/jarspp19802008/feria-virtual-navidad-neiva-2026/upload/main/assets/comercios" target="_blank" rel="noopener noreferrer">Abrir carpeta para subir la foto ↗</a><p class="photo-help">3. Después de publicarla (puede tardar unos minutos), copia este enlace en la ficha del comercio y pulsa Guardar fotos.</p><input id="localPhotoUrl" class="photo-input" readonly aria-label="Enlace de la foto para la ficha" placeholder="El enlace aparecerá después de preparar una foto"><p class="photo-help">Conserva la foto original en tu equipo. Si no ves la imagen publicada, comprueba que terminó el despliegue de GitHub Pages antes de guardar el enlace.</p></details>';
let objectUrl=null;
const input=document.getElementById('localPhotoFile'),status=document.getElementById('localPhotoStatus'),preview=document.getElementById('localPhotoPreview'),download=document.getElementById('localPhotoDownload'),urlField=document.getElementById('localPhotoUrl');
input.addEventListener('change',async()=>{
const file=input.files[0];if(!file)return;
download.classList.add('hidden');preview.classList.add('hidden');urlField.value='';
if(!['image/jpeg','image/png','image/webp'].includes(file.type)){status.textContent='Elige una imagen JPG, PNG o WebP.';return;}
if(file.size>30*1024*1024){status.textContent='La foto supera 30 MB. Usa una copia más pequeña.';return;}
status.textContent='Preparando la foto…';
let sourceUrl;
try{
sourceUrl=URL.createObjectURL(file);const img=new Image();img.src=sourceUrl;await img.decode();
const scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));
const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
let blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.86));if(!blob)throw Error('encode');
let finalBlob=blob,extension='jpg';
if(file.size<blob.size){finalBlob=file;extension=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';}
const base=file.name.replace(/\.[^.]+$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'comercio';
const name=base+'-'+Date.now()+'.'+extension;
if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(finalBlob);
preview.src=objectUrl;preview.classList.remove('hidden');download.href=objectUrl;download.download=name;download.classList.remove('hidden');
urlField.value='https://jarspp19802008.github.io/feria-virtual-navidad-neiva-2026/assets/comercios/'+name;
status.textContent='Original: '+(file.size/1024).toFixed(0)+' KB · Preparada: '+(finalBlob.size/1024).toFixed(0)+' KB. Revisa la vista previa antes de publicarla.';
}catch(error){status.textContent='No se pudo preparar la foto. Intenta con otra imagen JPG, PNG o WebP.';}
finally{if(sourceUrl)URL.revokeObjectURL(sourceUrl);}
});
})();

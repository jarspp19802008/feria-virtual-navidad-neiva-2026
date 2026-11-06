/* Photo preparation runs locally; files are not uploaded by this tool. */
(function(){
'use strict';
const root=document.getElementById('freePhotoTools');
if(!root)return;
root.innerHTML='<details class="shop-editor"><summary style="cursor:pointer;font-weight:800;color:var(--green)">Preparar fotos sin usar créditos de Cloudinary</summary><p class="photo-help">1. Elige una foto. Se comprime en este equipo: hasta 960 píxeles, preferiblemente menos de 100 KB y formato WebP. No usa créditos de Cloudinary.</p><input id="localPhotoFile" type="file" accept="image/jpeg,image/png,image/webp"><p id="localPhotoStatus" class="photo-help" role="status" aria-live="polite"></p><img id="localPhotoPreview" class="photo-preview hidden" alt="Vista previa de la foto preparada"><a id="localPhotoDownload" class="btn hidden">Descargar foto preparada</a><p class="photo-help">2. Abre la carpeta de fotos, arrastra el archivo descargado y pulsa Commit changes para publicarlo. Sube únicamente fotos comerciales autorizadas; quedarán públicas.</p><a class="btn ghost" href="https://github.com/jarspp19802008/feria-virtual-navidad-neiva-2026/upload/main/assets/comercios" target="_blank" rel="noopener noreferrer">Abrir carpeta para subir la foto ↗</a><p class="photo-help">3. Después de guardar el archivo en GitHub, copia este enlace directo en la ficha del comercio y pulsa Guardar fotos. No necesitas esperar el despliegue de la feria.</p><input id="localPhotoUrl" class="photo-input" readonly aria-label="Enlace de la foto para la ficha" placeholder="El enlace aparecerá después de preparar una foto"><p class="photo-help">Conserva la foto original en tu equipo. El enlace directo se comprueba al guardar. Si GitHub todavía no devuelve la imagen, espera unos segundos antes de reintentarlo.</p></details>';
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
const scale=Math.min(1,960/Math.max(img.naturalWidth,img.naturalHeight));
const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
let quality=0.72,blob;do{blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(!blob)throw Error('encode');quality-=0.08}while(blob.size>100*1024&&quality>=0.4);
let finalBlob=blob,extension='webp';
if(file.size<blob.size&&Math.max(img.naturalWidth,img.naturalHeight)<=960){finalBlob=file;extension=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';}
const base=file.name.replace(/\.[^.]+$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'comercio';
const name=base+'-'+Date.now()+'.'+extension;
if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(finalBlob);
preview.src=objectUrl;preview.classList.remove('hidden');download.href=objectUrl;download.download=name;download.classList.remove('hidden');
urlField.value='https://raw.githubusercontent.com/jarspp19802008/feria-virtual-navidad-neiva-2026/main/assets/comercios/'+name;
status.textContent='Original: '+(file.size/1024).toFixed(0)+' KB · Preparada: '+(finalBlob.size/1024).toFixed(0)+' KB. Revisa la vista previa antes de publicarla.';
}catch(error){status.textContent='No se pudo preparar la foto. Intenta con otra imagen JPG, PNG o WebP.';}
finally{if(sourceUrl)URL.revokeObjectURL(sourceUrl);}
});
})();

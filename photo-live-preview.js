/* Preview photo links before saving, without changing merchant records. */
(function(){
'use strict';
const root=document.getElementById('approvedShops');if(!root)return;
const timers=new WeakMap();
function preview(input){
const card=input.closest('article');if(!card)return;
const values=Array.from(card.querySelectorAll('[data-photo-input]')).map(el=>el.value.trim());
let box=card.querySelector('[data-live-photo-preview]');
if(!box){box=document.createElement('div');box.dataset.livePhotoPreview='';box.className='photo-gallery-preview';card.querySelector('.photo-row').after(box)}
box.replaceChildren();
values.forEach((value,index)=>{
if(!value)return;
const url=cloudinaryUrl(value),figure=document.createElement('figure'),message=document.createElement('figcaption');
figure.style.margin='10px 0';message.className='photo-help';message.setAttribute('role','status');
if(!url){message.textContent='Foto '+(index+1)+': usa un enlace permitido del sitio o del repositorio.';figure.append(message);box.append(figure);return}
const image=new Image();image.className='photo-preview';image.alt='Vista previa de la foto '+(index+1);image.decoding='async';message.textContent='Cargando vista previa…';
image.onload=()=>{message.textContent='Foto '+(index+1)+' lista para guardar.'};
image.onerror=()=>{image.hidden=true;message.textContent='La foto todavía no está disponible. Comprueba el archivo y el enlace.'};
image.src=window.FeriaPhotos.thumb(url);figure.append(image,message);box.append(figure);
});
}
root.addEventListener('input',event=>{const input=event.target;if(!input.matches('[data-photo-input]'))return;clearTimeout(timers.get(input));timers.set(input,setTimeout(()=>preview(input),350))});
})();
// Retira la ficha pública y revoca su aprobación en una misma escritura.
document.getElementById('approvedShops').addEventListener('click', async event => {
  const button = event.target.closest('[data-shop-delete]');
  if (!button || button.disabled) return;
  const user = auth.currentUser;
  if (!user || user.isAnonymous || user.email !== ADMIN || !user.emailVerified) {
    status.textContent = 'Inicia sesión con la cuenta administradora para eliminar un comercio.';
    return;
  }
  const id = button.dataset.shopDelete;
  const shop = approvedShopCache.find(item => item.id === id);
  if (!shop || id === '_contestEntries') return;
  const syncButton = document.getElementById('syncApproved');
  if (syncButton.disabled) {
    status.textContent = 'Espera a que termine la sincronización antes de eliminar un comercio.';
    return;
  }
  const confirmed = window.confirm(
    `¿Eliminar «${shop.name}» de la feria comercial?\n\n` +
    'Su ficha dejará de aparecer para los visitantes. Su inscripción quedará rechazada para evitar que vuelva a publicarse al sincronizar.\n\n' +
    'Las fotos en Cloudinary y su participación independiente en el concurso se conservan.'
  );
  if (!confirmed) return;
  button.disabled = true;
  syncButton.disabled = true;
  status.textContent = `Eliminando «${shop.name}» de la feria…`;
  try {
    const applicationId = shop.applicationId || id;
    if (/[.#$\[\]/]/.test(applicationId)) throw new Error('Identificador de inscripción inválido.');
    const application = await db.ref('merchantApplications/' + applicationId).once('value');
    const updates = { ['approvedShops/' + id]: null };
    if (application.exists()) {
      updates['merchantApplications/' + applicationId + '/status'] = 'rejected';
    }
    await db.ref().update(updates);
    status.textContent = `«${shop.name}» eliminado de la feria comercial.`;
  } catch (error) {
    status.textContent = 'No se pudo eliminar el comercio. ' + error.message;
  } finally {
    button.disabled = false;
    syncButton.disabled = false;
  }
});

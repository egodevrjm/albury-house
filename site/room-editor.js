(() => {
  const el = id => document.getElementById(id);
  const api = '/api/room-editor';
  const gallery = '/ALBURY_HOUSE_TOUR.html';
  const state = { draft: null, revision: 0, rooms: [], images: [] };
  const photoPath = id => api + '?image=' + encodeURIComponent(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const errorText = error => error.message || 'This action could not be completed.';

  async function call(action, input = {}) {
    const response = await fetch(api, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, input }),
    });
    const value = await response.json();
    if (!response.ok) throw Object.assign(new Error(value.error), { status: response.status });
    return value;
  }

  function notice(text = '', error = false) {
    const box = el('notice');
    box.textContent = text;
    box.classList.toggle('error', error);
    box.hidden = !text;
  }

  function showOwner(signedIn) {
    el('workspace').hidden = !signedIn;
    el('sign-out').hidden = !signedIn;
    el('sign-in-panel').hidden = signedIn;
  }

  function task(button, run) {
    return async event => {
      if (event) event.preventDefault();
      button.disabled = true;
      notice();
      try { await run(event); }
      catch (error) {
        if (error.status === 401) showOwner(false);
        notice(errorText(error), true);
      } finally { button.disabled = false; }
    };
  }

  function setOptions(select, options, blank) {
    const value = select.value;
    select.replaceChildren();
    if (blank) select.add(new Option(blank, ''));
    for (const [id, name] of options) select.add(new Option(name, id));
    if (options.some(option => option[0] === value)) select.value = value;
  }

  function selectedRoom() {
    return state.rooms.find(section => section.id === el('section').value)?.rooms.find(room => room.id === el('room').value);
  }

  function renderRoomOptions() {
    const section = state.rooms.find(item => item.id === el('section').value);
    setOptions(el('room'), (section?.rooms ?? []).map(room => [room.id, room.name]));
    renderViewOptions();
  }

  function renderViewOptions() {
    const room = selectedRoom();
    const pending = state.preview?.find(change => change.sectionId === el('section').value && change.roomId === room?.id);
    const views = pending?.views.map(view => ({
      id: view.viewSlug ?? view.path.split('/').at(-1).replace(/\.[^.]+$/, '') + (view.path.includes('/new-views/') ? '-additional-view' : ''),
      title: view.title, caption: view.description, path: view.path,
    })) ?? room?.views ?? [];
    setOptions(el('existing-view'), views.map(view => [view.id, view.title]));
    const replace = el('change').value === 'replace';
    el('existing-view-label').hidden = !replace;
    el('slug-label').hidden = replace;
    el('slug').required = !replace;
    const view = replace && views.find(item => item.id === el('existing-view').value);
    el('existing-photo').hidden = !view;
    if (view) {
      const managed = view.path.match(/^images\/albury\/managed\/([a-f0-9]{64})\.webp$/);
      el('existing-image').src = managed ? photoPath(managed[1]) : '/' + view.path;
      el('existing-image').alt = view.title;
      el('view-title').value = view.title;
      el('caption').value = view.caption;
    }
  }

  function renderImages(select) {
    setOptions(el('asset'), state.images.map(image => [image.id, image.name + ' · ' + image.width + ' × ' + image.height]), 'Choose an image');
    if (select) el('asset').value = select;
  }

  function linkToDraft(draft, edit) {
    const route = edit ? '#/' + [edit.sectionId, edit.roomId, edit.viewId].map(encodeURIComponent).join('/') : '';
    return gallery + '?draft=' + encodeURIComponent(draft.id) + route;
  }

  function collectionDraftLink(draft, edit) {
    const prefix = '/ALBURY_HOUSE_COLLECTIONS.html?draft=' + encodeURIComponent(draft.id) + '#';
    const item = state.collectionPreview?.find(collection => collection.id === edit.collectionId)?.rooms.find(item => item.id === edit.itemId);
    return prefix + encodeURIComponent(edit.collectionId) + (item?.viewSlug ? '/' + encodeURIComponent(item.viewSlug) : '');
  }

  function renderDraft() {
    const draft = state.draft;
    el('empty-draft').hidden = !!draft;
    el('draft-detail').hidden = !draft;
    if (!draft) return;
    const older = draft.baseRevision !== state.revision;
    el('draft-title').textContent = draft.name;
    const collectionEdits = draft.collectionEdits ?? [];
    const count = draft.edits.length + collectionEdits.length;
    el('draft-state').textContent = count + (count === 1 ? ' change' : ' changes') +
      (older ? ' · Based on an older publication. Create a new draft to publish.' : ' · Saved to draft');
    el('preview-link').hidden = !draft.edits.length;
    el('preview-link').href = linkToDraft(draft, draft.edits[0]);
    el('collection-preview-link').hidden = !collectionEdits.length;
    if (collectionEdits.length) el('collection-preview-link').href = collectionDraftLink(draft, collectionEdits[0]);
    el('publish').disabled = older || !count;
    el('stage-view').querySelector('button').disabled = older;
    el('stage-pantry-photo').querySelector('button').disabled = older;
    const roomMarkup = draft.edits.map((edit, index) => `<article>
      <h3>${escape(edit.title)}</h3><p class="muted">${edit.action === 'replace' ? 'Replace view' : 'Add view'}${edit.position ? ' · Position ' + edit.position : ''}</p>
      <img src="${photoPath(edit.assetId)}" alt="${escape(edit.title)}">
      <a target="_blank" rel="noopener" href="${escape(linkToDraft(draft, edit))}">Preview this view ↗</a><br>
      <button type="button" data-remove="${index}">Remove staged change</button>
    </article>`).join('');
    const collectionMarkup = collectionEdits.map((edit, index) => `<article>
      <h3>${escape(edit.title ?? edit.itemId)}</h3><p class="muted">${edit.action === 'add' ? 'Add collection item' : 'Update collection item'} · ${escape(edit.collectionId)}</p>
      ${edit.description ? '<p>' + escape(edit.description) + '</p>' : ''}
      ${edit.assetId ? '<img src="' + photoPath(edit.assetId) + '" alt="' + escape(edit.title ?? edit.itemId) + '">' : ''}
      <a target="_blank" rel="noopener" href="${escape(collectionDraftLink(draft, edit))}">Preview this item ↗</a><br>
      <button type="button" data-remove-item="${index}">Remove staged change</button>
    </article>`).join('');
    el('edits').innerHTML = roomMarkup + collectionMarkup || '<p class="muted">Your staged changes will appear here.</p>';
    for (const button of el('edits').querySelectorAll('[data-remove-item]')) button.onclick = task(button, async () => {
      const current = state.draft;
      await call('remove_collection_edit', { draftId: current.id, expectedVersion: current.version, index: Number(button.dataset.removeItem) });
      await refresh(current.id);
    });
    for (const button of el('edits').querySelectorAll('[data-remove]')) button.onclick = task(button, async () => {
      const current = state.draft;
      await call('remove_draft_edit', { draftId: current.id, expectedVersion: current.version, index: Number(button.dataset.remove) });
      await refresh(current.id);
    });
    renderViewOptions();
  }

  async function refresh(selectedId = state.draft?.id) {
    const [rooms, open, images, history] = await Promise.all([
      call('list_rooms'), call('list_drafts'), call('list_images'), call('list_revisions'),
    ]);
    state.rooms = rooms.sections;
    state.revision = open.currentRevision;
    state.images = images.images;
    const selected = open.drafts.find(draft => draft.id === selectedId);
    const details = selected ? await call('preview_draft', { draftId: selected.id }) : null;
    state.draft = details?.draft ?? null;
    state.preview = details?.preview ?? [];
    state.collectionPreview = details?.collectionPreview ?? [];
    state.revision = details?.currentRevision ?? state.revision;
    setOptions(el('section'), state.rooms.map(section => [section.id, section.name]));
    renderRoomOptions();
    renderImages();
    el('drafts').innerHTML = open.drafts.map(draft => `<button type="button" data-draft="${draft.id}" aria-current="${draft.id === selectedId}">${escape(draft.name)}<small>${draft.editCount} staged</small></button>`).join('');
    for (const button of el('drafts').querySelectorAll('[data-draft]')) button.onclick = task(button, () => refresh(button.dataset.draft));
    el('history').innerHTML = history.revisions.map(revision => `<p><strong>Revision ${revision.id}</strong> · ${escape(revision.name)}<br>${
      revision.id === history.currentRevision ? '<span class="muted">Current publication</span>' :
        `<button type="button" data-restore="${revision.id}">Restore revision ${revision.id}</button>`
    }</p>`).join('');
    for (const button of el('history').querySelectorAll('[data-restore]')) button.onclick = task(button, async () => {
      const revision = Number(button.dataset.restore);
      if (!await confirmAction('Restore revision ' + revision + '?', 'This makes that revision current in the tour and the MCP. The existing publication stays in the history.', 'Restore revision')) return;
      const result = await call('rollback', { revision, expectedRevision: history.currentRevision });
      await refresh();
      notice('Restored as revision ' + result.revision + '.');
    });
    renderDraft();
  }

  function confirmAction(title, message, label) {
    el('confirm-title').textContent = title;
    el('confirm-note').textContent = message;
    el('confirm-submit').textContent = label;
    const dialog = el('confirm');
    dialog.returnValue = '';
    dialog.showModal();
    return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'approve'), { once: true }));
  }

  el('sign-in').onsubmit = task(el('sign-in').querySelector('button'), async () => {
    await call('sign_in', { key: el('owner-key').value });
    el('owner-key').value = '';
    showOwner(true);
    await refresh();
  });
  el('sign-out').onclick = task(el('sign-out'), async () => {
    await call('sign_out');
    state.draft = null;
    state.preview = [];
    state.collectionPreview = [];
    el('drafts').replaceChildren();
    el('history').replaceChildren();
    el('edits').replaceChildren();
    el('stage-view').reset();
    el('stage-pantry-photo').reset();
    showOwner(false);
    notice('Signed out.');
  });
  el('new-draft').onsubmit = task(el('new-draft').querySelector('button'), async event => {
    const draft = await call('create_draft', { name: el('draft-name').value });
    event.target.reset();
    await refresh(draft.id);
  });
  el('view-title').oninput = () => {
    if (el('change').value !== 'add') return;
    const slug = el('slug');
    if (slug.value && slug.value !== slug.dataset.auto) return;
    slug.value = el('view-title').value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 100).replace(/-$/, '');
    slug.dataset.auto = slug.value;
  };
  el('section').onchange = renderRoomOptions;
  for (const key of ['room', 'change', 'existing-view']) el(key).onchange = renderViewOptions;
  async function uploadImage(file) {
    if (file.size > 3 * 1024 * 1024) throw new Error('Choose an image of up to 3 MiB.');
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return call('upload_image', { name: file.name, base64 });
  }

  el('image-file').onchange = task(el('image-file'), async () => {
    const file = el('image-file').files[0];
    if (!file) return;
    const image = await uploadImage(file);
    el('image-file').value = '';
    state.images = (await call('list_images')).images;
    renderImages(image.id);
    notice('Image uploaded to the private editor.');
  });
  el('stage-pantry-photo').onsubmit = task(el('stage-pantry-photo').querySelector('button'), async event => {
    const file = el('pantry-image-file').files[0];
    if (!file) return;
    const draft = state.draft;
    const image = await uploadImage(file);
    await call('stage_collection_item', {
      draftId: draft.id, expectedVersion: draft.version,
      edit: { action: 'replace', collectionId: 'produce', itemId: 'pantry-p47', assetId: image.id },
    });
    event.target.reset();
    await refresh(draft.id);
    notice('P47 bottle photo saved to draft.');
  });
  el('stage-view').onsubmit = task(el('stage-view').querySelector('button'), async event => {
    const form = new FormData(event.target);
    const draft = state.draft;
    const position = form.get('position');
    const action = form.get('action');
    const edit = {
      action, sectionId: form.get('sectionId'), roomId: form.get('roomId'),
      viewId: form.get(action === 'replace' ? 'existingView' : 'slug'), assetId: form.get('assetId'),
      title: form.get('title'), caption: form.get('caption'), ...(position ? { position: Number(position) } : {}),
    };
    await call('stage_view', { draftId: draft.id, expectedVersion: draft.version, edit });
    if (action === 'add') {
      el('view-title').value = '';
      el('caption').value = '';
      el('slug').value = '';
      delete el('slug').dataset.auto;
    }
    await refresh(draft.id);
    notice('View saved to draft.');
  });
  el('publish').onclick = task(el('publish'), async () => {
    const draft = state.draft;
    const count = draft.edits.length + (draft.collectionEdits?.length ?? 0);
    if (!await confirmAction('Publish ' + draft.name + '?', 'This publishes ' + count + ' staged ' +
      (count === 1 ? 'change' : 'changes') + ' to the website and the MCP.', 'Publish draft')) return;
    const result = await call('publish_draft', { draftId: draft.id, expectedVersion: draft.version });
    await refresh(null);
    notice('Published revision ' + result.revision + ' to the website and the MCP.');
  });
  (async () => {
    try {
      const response = await fetch(api);
      if (response.status === 401) return showOwner(false);
      if (!response.ok) throw new Error('The room editor has not been configured.');
      showOwner(true);
      await refresh();
    } catch (error) { notice(errorText(error), true); }
  })();
})();

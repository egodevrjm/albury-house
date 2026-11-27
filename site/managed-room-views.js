(() => {
  const draftId = new URLSearchParams(location.search).get('draft');
  const signal = AbortSignal.timeout(4500);

  function apply(updates, preview = false) {
    for (const { sectionId, roomId, views } of updates) {
      const section = window.ALBURY_CONTENT.rooms.tour.find(item => item.id === sectionId);
      const first = section?.rooms.findIndex(view => view.roomId === roomId) ?? -1;
      if (first < 0) continue;
      const previewPaths = new Map();
      if (preview) {
        for (const view of views) {
          const match = view.path.match(/^images\/albury\/managed\/([a-f0-9]{64})\.webp$/);
          if (match) previewPaths.set(view.path, '/api/room-editor?image=' + match[1]);
        }
      }
      const nextViews = views.map(view => ({
        ...view,
        path: previewPaths.get(view.path) ?? view.path,
        ...(view.configurations ? {
          configurations: view.configurations.map(config => ({ ...config, path: previewPaths.get(config.path) ?? config.path })),
        } : {}),
      }));
      section.rooms = section.rooms.filter(view => view.roomId !== roomId);
      section.rooms.splice(first, 0, ...nextViews);
    }
  }

  function previewStatus(text) {
    const bar = document.createElement('p');
    bar.className = 'albury-draft-banner';
    bar.setAttribute('role', 'status');
    bar.textContent = text;
    document.body.prepend(bar);
  }

  window.ALBURY_ROOMS_READY = (async () => {
    try {
      const response = await fetch('/api/room-catalogue', { signal });
      if (response.ok) {
        const { updates, collectionUpdates } = await response.json();
        if (!window.ALBURY_MANAGED_CONTENT?.rooms) apply(updates);
        if (!window.ALBURY_MANAGED_CONTENT?.collections && collectionUpdates?.length) {
          const edits = new Map(collectionUpdates.map(collection => [collection.id, collection]));
          const collections = window.ALBURY_CONTENT.collections.collections;
          const published = collections.map(collection => edits.get(collection.id) ?? collection);
          window.ALBURY_CONTENT.collections.collections = published;
          if (window.ALBURY_HOUSE_CATALOGUE) window.ALBURY_HOUSE_CATALOGUE.collections = published;
        }
      }
    } catch {
      // The embedded catalogue remains available during a temporary storage outage.
    }
    if (!draftId) return;
    try {
      const response = await fetch('/api/room-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview_draft', input: { draftId } }),
        signal,
      });
      if (!response.ok) throw new Error('Preview unavailable');
      const { draft, currentRevision, preview } = await response.json();
      apply(preview, true);
      previewStatus('Draft preview · ' + draft.name + (draft.baseRevision !== currentRevision ? ' · Based on an older revision' : ''));
    } catch {
      previewStatus('Draft preview unavailable. Sign in to the room editor and reopen the preview.');
    }
  })();
})();

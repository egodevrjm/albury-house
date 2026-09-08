(() => {
  'use strict';
  const staff = window.ALBURY_CONTENT?.staff;
  if (!staff) throw new Error('Albury staff content is unavailable. Run site/build_content.py.');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
  const legacyIds = {'ottilie-marchant':'staff-ottilie','kit-peverell':'staff-kit'};
  const initials = name => name.replace(/[“”]/g, '').split(/\s+/).map(part => part[0]).slice(0, 2).join('');
  const personCard = person => {
    const portrait = person.image
      ? `<img class="staff-photo" src="${esc(person.image)}" alt="${esc(person.imageAlt || `Portrait of ${person.name}`)}" loading="lazy" decoding="async">`
      : `<div class="staff-initials" aria-label="Portrait not yet available">${esc(initials(person.name))}</div>`;
    const details = [person.ageAtStoryOpen, person.gender, person.pronouns].filter(value => value !== null && value !== '').join(' · ');
    const profile = [person.description, person.career ? `<span class="staff-career">${esc(person.career)}</span>` : ''].join('');
    return `<article class="staff-card" id="${esc(legacyIds[person.id] || `staff-${person.id}`)}" data-staff-id="${esc(person.id)}">${portrait}<div class="staff-card-body"><span class="staff-name">${esc(person.name)}</span><span class="staff-role">${esc(person.role)}</span><span class="staff-remit">${esc(person.remit)}</span><details class="staff-profile"><summary>About</summary><strong>${esc(details)}</strong>${profile}</details></div></article>`;
  };
  const partnerCard = partner => `<div class="staff-partner" data-staff-id="${esc(partner.id)}"><span class="staff-name">${esc(partner.name)}</span><span class="staff-role">${esc(partner.type)}</span><span class="staff-remit">${esc(partner.remit)}</span></div>`;
  const departmentOrder = [...new Set(staff.people.map(person => person.department))];
  const directory = document.querySelector('.staff-directory');
  directory.innerHTML = `<div class="staff-tools"><label>Find a person<input id="staff-search" type="search" placeholder="Name, role or department"></label><label>Department<select id="staff-department"><option value="all">All departments</option>${departmentOrder.map(department => `<option value="${esc(department)}">${esc(department)}</option>`).join('')}<option value="Service partners">Service partners</option></select></label><p id="staff-count" role="status"></p></div><div id="staff-groups">${departmentOrder.map(department => `<section class="staff-group" data-department="${esc(department)}"><h3 class="staff-group-title">${esc(department)}</h3><div class="staff-rows">${staff.people.filter(person => person.department === department).map(personCard).join('')}</div></section>`).join('')}<section class="staff-group" data-department="Service partners"><h3 class="staff-group-title">Service partners</h3><div class="staff-partners">${staff.servicePartners.map(partnerCard).join('')}</div></section></div>`;

  const sections = [...document.querySelectorAll('[data-guide-section]')];
  const groups = [...document.querySelectorAll('.staff-group')];
  const department = document.querySelector('#staff-department');
  const search = document.querySelector('#staff-search');
  function filter() {
    let count = 0;
    const query = search.value.trim().toLocaleLowerCase();
    groups.forEach(group => {
      let matches = 0;
      group.querySelectorAll('.staff-card, .staff-partner').forEach(card => {
        card.hidden = (department.value !== 'all' && department.value !== group.dataset.department) || !(`${card.textContent} ${group.dataset.department}`).toLocaleLowerCase().includes(query);
        if (!card.hidden) { matches += 1; count += 1; }
      });
      group.hidden = matches === 0;
    });
    document.querySelector('#staff-count').textContent = count ? `${count} people and service partners shown` : 'No matching staff. Try another name or department.';
  }
  function render() {
    let id = decodeURIComponent(location.hash.replace(/^#\/?(?:guide\/)?/, '')) || 'overview';
    id = id.replace(/^guide-/, '');
    let person = document.getElementById(id);
    if (!person && id.startsWith('staff-')) person = document.querySelector(`[data-staff-id="${CSS.escape(id.slice(6))}"]`);
    if (person?.closest('#guide-staff')) id = 'staff';
    if (!sections.some(section => section.dataset.guideSection === id)) id = 'overview';
    sections.forEach(section => { section.hidden = section.dataset.guideSection !== id; });
    document.querySelectorAll('.guide-tabs a').forEach(link => link.setAttribute('aria-current', link.hash === `#${id}` ? 'page' : 'false'));
    document.title = `${id === 'overview' ? 'House guide' : document.querySelector(`#guide-${id} h2`).textContent} — Albury`;
    if (person?.classList.contains('staff-card')) person.scrollIntoView();
  }
  search.addEventListener('input', filter);
  department.addEventListener('change', filter);
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  filter();
  render();
})();

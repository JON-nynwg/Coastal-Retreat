const WHATSAPP_NUMBER = '254799640567';

let allListings = [];
let currentFilter = 'all';
let currentGalleryIndex = 0;
let currentListing = null;

const grid = document.getElementById('listing-grid');
const emptyState = document.getElementById('pd-empty');

// ---------- Saved listings (per-browser, localStorage) ----------
function getSaved() {
  try { return JSON.parse(localStorage.getItem('pd_saved') || '[]'); }
  catch (e) { return []; }
}
function toggleSaved(id) {
  let saved = getSaved();
  if (saved.includes(id)) saved = saved.filter(x => x !== id);
  else saved.push(id);
  localStorage.setItem('pd_saved', JSON.stringify(saved));
  renderListings();
}

function formatPrice(l) {
  const amt = Number(l.price || 0).toLocaleString();
  return l.priceType === 'per_night'
    ? `Ksh ${amt} <small>/ night</small>`
    : `Ksh ${amt} <small>total</small>`;
}

// ---------- Card grid ----------
function renderListings() {
  const saved = getSaved();
  let filtered;
  if (currentFilter === 'saved') {
    filtered = allListings.filter(l => saved.includes(l.id));
  } else if (currentFilter === 'all') {
    filtered = allListings;
  } else {
    filtered = allListings.filter(l => l.type === currentFilter);
  }

  grid.innerHTML = '';
  if (filtered.length === 0) { emptyState.style.display = 'block'; return; }
  emptyState.style.display = 'none';

  filtered.forEach(listing => {
    const images = listing.images && listing.images.length ? listing.images : ['./Syaj_files/logo-syaj.png'];
    const isSaved = saved.includes(listing.id);
    const col = document.createElement('div');
    col.className = 'col-lg-3 col-md-6 wow fadeInUp pd-card';
    col.innerHTML = `
      <div class="pd-heart ${isSaved ? 'saved' : ''}" data-id="${listing.id}"><i class="fa-solid fa-heart"></i></div>
      ${listing.type === 'rent' ? `<div class="pd-avail-badge ${listing.availability === 'booked' ? 'booked' : 'available'}">${listing.availability === 'booked' ? 'Booked' : 'Available'}</div>` : ''}
      <div class="team-item" data-id="${listing.id}" style="cursor:pointer;">
        <div class="team-body">
          <img class="img-fluid" src="${images[0]}" alt="${listing.title}" style="aspect-ratio:4/3; object-fit:cover;">
        </div>
        <div style="padding:10px 4px 0;">
          <h5 class="text-uppercase mb-1" style="font-size:15px;">${listing.title}</h5>
          <div class="pd-price-line">${formatPrice(listing)}</div>
          <div style="font-size:12.5px; color:#888;"><i class="fa-solid fa-location-dot"></i> ${listing.location || ''}</div>
        </div>
      </div>
    `;
    col.querySelector('.team-item').addEventListener('click', () => openDetail(listing));
    col.querySelector('.pd-heart').addEventListener('click', (e) => { e.stopPropagation(); toggleSaved(listing.id); });
    grid.appendChild(col);
  });

  if (window.WOW) new WOW().init();
}

document.querySelectorAll('.filter-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderListings();
  });
});

// ---------- Detail modal ----------
function openDetail(listing) {
  currentListing = listing;
  currentGalleryIndex = 0;

  db.collection('listings').doc(listing.id).update({
    viewCount: firebase.firestore.FieldValue.increment(1)
  }).catch(() => {});

  const images = listing.images && listing.images.length ? listing.images : ['./Syaj_files/logo-syaj.png'];
  const modal = document.getElementById('pd-modal');

  const thumbsHtml = images.map((img, i) =>
    `<img src="${img}" class="${i === 0 ? 'active' : ''}" data-i="${i}">`
  ).join('');

  const testimonialsHtml = (listing.testimonials || []).map(t => {
    const parts = t.split(':');
    const name = parts.length > 1 ? parts[0].trim() : 'Guest';
    const text = parts.length > 1 ? parts.slice(1).join(':').trim() : t;
    return `<div class="pd-testimonial"><b>${name}</b>${text}</div>`;
  }).join('');

  const calcHtml = listing.type === 'sale' ? `
    <div class="pd-section-title">Deposit & Mortgage Estimate</div>
    <div class="pd-calc">
      <label>Deposit (%)</label>
      <input type="number" id="calc-deposit" value="${listing.depositPercent || 20}">
      <label>Loan term (years)</label>
      <input type="number" id="calc-years" value="15">
      <label>Interest rate (% per year)</label>
      <input type="number" id="calc-rate" value="13">
      <div class="pd-calc-result" id="calc-result"></div>
    </div>
  ` : '';

  const whatsappMsg = encodeURIComponent(
    listing.type === 'rent'
      ? `Hi, I'd like to book/enquire about "${listing.title}" (${formatPrice(listing).replace(/<[^>]*>/g, '')}).`
      : `Hi, I'm interested in "${listing.title}" (${formatPrice(listing).replace(/<[^>]*>/g, '')}). Can you share more details?`
  );

  modal.innerHTML = `
    <button class="pd-modal-close" id="pd-modal-close">&times;</button>
    <img class="pd-gallery-main" id="pd-gallery-main" src="${images[0]}" alt="${listing.title}">
    <div class="pd-gallery-thumbs">${thumbsHtml}</div>
    <div class="pd-modal-body">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 class="text-uppercase mb-1">${listing.title}</h3>
          <div class="pd-price-line" style="font-size:18px;">${formatPrice(listing)}</div>
        </div>
        ${listing.type === 'rent' ? `<span class="pd-avail-badge ${listing.availability === 'booked' ? 'booked' : 'available'}" style="position:static;">${listing.availability === 'booked' ? 'Booked' : 'Available'}</span>` : ''}
      </div>

      <div class="pd-row">
        ${listing.bedrooms ? `<span><i class="fa-solid fa-bed"></i> ${listing.bedrooms} bed</span>` : ''}
        ${listing.bathrooms ? `<span><i class="fa-solid fa-bath"></i> ${listing.bathrooms} bath</span>` : ''}
        <span><i class="fa-solid fa-location-dot"></i> ${listing.location || ''}</span>
      </div>

      <p>${listing.description || ''}</p>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin:14px 0;">
        <a class="pd-whatsapp-btn" target="_blank" rel="noopener"
           href="https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}" id="pd-whatsapp-link">
          <i class="fab fa-whatsapp"></i> ${listing.type === 'rent' ? 'Book via WhatsApp' : 'Enquire via WhatsApp'}
        </a>
        ${listing.mapLink ? `<a class="pd-map-btn" href="${listing.mapLink}" target="_blank" rel="noopener"><i class="fa-solid fa-map-location-dot"></i> View on Map</a>` : ''}
      </div>

      ${calcHtml}

      ${testimonialsHtml ? `<div class="pd-section-title">What Guests Say</div>${testimonialsHtml}` : ''}

      <div class="pd-section-title">Similar Properties</div>
      <div class="pd-similar-grid" id="pd-similar-grid"></div>

      <div class="pd-section-title">Ask a Question</div>
      <div class="pd-lead-form">
        <input type="text" id="lead-name" placeholder="Your name">
        <input type="text" id="lead-phone" placeholder="Phone number">
        <textarea id="lead-message" rows="3" placeholder="Your message"></textarea>
        <button class="btn btn-primary" id="lead-submit-btn" style="border:none; background:var(--bs-primary); color:#fff; padding:10px 20px; border-radius:6px; font-weight:700; cursor:pointer;">Send</button>
        <p class="pd-lead-success" id="lead-success">Thanks! We'll get back to you shortly.</p>
      </div>
    </div>
  `;

  document.getElementById('pd-modal-close').addEventListener('click', closeDetail);
  document.getElementById('pd-whatsapp-link').addEventListener('click', () => {
    db.collection('listings').doc(listing.id).update({
      enquiryCount: firebase.firestore.FieldValue.increment(1)
    }).catch(() => {});
  });

  modal.querySelectorAll('.pd-gallery-thumbs img').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const i = Number(thumb.dataset.i);
      document.getElementById('pd-gallery-main').src = images[i];
      modal.querySelectorAll('.pd-gallery-thumbs img').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  if (listing.type === 'sale') {
    const recalc = () => {
      const price = Number(listing.price || 0);
      const depositPct = Number(document.getElementById('calc-deposit').value) || 0;
      const years = Number(document.getElementById('calc-years').value) || 1;
      const rate = Number(document.getElementById('calc-rate').value) || 0;

      const deposit = price * (depositPct / 100);
      const principal = price - deposit;
      const monthlyRate = rate / 100 / 12;
      const n = years * 12;
      const monthly = monthlyRate > 0
        ? (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n))
        : principal / n;

      document.getElementById('calc-result').innerHTML =
        `Deposit: Ksh ${Math.round(deposit).toLocaleString()}<br>Est. monthly payment: Ksh ${Math.round(monthly).toLocaleString()}`;
    };
    ['calc-deposit', 'calc-years', 'calc-rate'].forEach(id => {
      document.getElementById(id).addEventListener('input', recalc);
    });
    recalc();
  }

  renderSimilar(listing);

  document.getElementById('lead-submit-btn').addEventListener('click', () => submitLead(listing));

  document.getElementById('pd-modal-overlay').classList.add('open');
}

function closeDetail() {
  document.getElementById('pd-modal-overlay').classList.remove('open');
}
document.getElementById('pd-modal-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'pd-modal-overlay') closeDetail();
});

function renderSimilar(listing) {
  const similar = allListings.filter(l => l.type === listing.type && l.id !== listing.id).slice(0, 3);
  const wrap = document.getElementById('pd-similar-grid');
  if (!wrap) return;
  if (similar.length === 0) { wrap.innerHTML = '<p style="color:#999; font-size:13px;">No other listings yet.</p>'; return; }
  wrap.innerHTML = similar.map(l => {
    const img = (l.images && l.images[0]) || './Syaj_files/logo-syaj.png';
    return `<div class="pd-similar-card" data-id="${l.id}"><img src="${img}"><div class="n">${l.title}</div></div>`;
  }).join('');
  wrap.querySelectorAll('.pd-similar-card').forEach(card => {
    card.addEventListener('click', () => {
      const l = allListings.find(x => x.id === card.dataset.id);
      if (l) openDetail(l);
    });
  });
}

function submitLead(listing) {
  const name = document.getElementById('lead-name').value.trim();
  const phone = document.getElementById('lead-phone').value.trim();
  const message = document.getElementById('lead-message').value.trim();
  if (!name || !phone) { alert('Please enter your name and phone number.'); return; }

  db.collection('leads').add({
    listingTitle: listing.title,
    listingId: listing.id,
    name, phone, message,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    document.getElementById('lead-success').style.display = 'block';
    document.getElementById('lead-name').value = '';
    document.getElementById('lead-phone').value = '';
    document.getElementById('lead-message').value = '';
  }).catch(err => alert('Could not send: ' + err.message));
}

// ---------- Live data ----------
db.collection('listings').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
  allListings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderListings();
}, error => {
  console.error(error);
  grid.innerHTML = '<p style="color:#d64545;">Could not load listings. Check js/firebase-config.js.</p>';
});

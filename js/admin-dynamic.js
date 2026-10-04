const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
let editingId = null;

auth.onAuthStateChanged(user => {
  if (user) {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'block';
    listenToListings();
    listenToLeads();
  } else {
    loginScreen.style.display = 'block';
    dashboard.style.display = 'none';
  }
});

document.getElementById('login-btn').addEventListener('click', () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';
  auth.signInWithEmailAndPassword(email, password)
    .catch(err => { errorEl.textContent = 'Login failed: ' + err.message; });
});
document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());

// ---------- Tabs ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ---------- Type toggles which fields matter ----------
document.getElementById('f-type').addEventListener('change', updateFieldVisibility);
function updateFieldVisibility() {
  const isRent = document.getElementById('f-type').value === 'rent';
  document.getElementById('field-availability').style.display = isRent ? 'block' : 'none';
  document.getElementById('field-testimonials').style.display = isRent ? 'block' : 'none';
  document.getElementById('field-deposit').style.display = isRent ? 'none' : 'block';
  document.getElementById('f-price-type').value = isRent ? 'per_night' : 'total';
}
updateFieldVisibility();

function parseLines(id) {
  return document.getElementById(id).value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

// ---------- Save (create or update) ----------
document.getElementById('save-btn').addEventListener('click', () => {
  const errorEl = document.getElementById('form-error');
  errorEl.textContent = '';

  const type = document.getElementById('f-type').value;
  const listing = {
    type,
    title: document.getElementById('f-title').value.trim(),
    images: parseLines('f-images'),
    price: Number(document.getElementById('f-price').value) || 0,
    priceType: document.getElementById('f-price-type').value,
    bedrooms: Number(document.getElementById('f-bedrooms').value) || null,
    bathrooms: Number(document.getElementById('f-bathrooms').value) || null,
    location: document.getElementById('f-location').value.trim(),
    mapLink: document.getElementById('f-maplink').value.trim(),
    description: document.getElementById('f-description').value.trim(),
  };

  if (type === 'rent') {
    listing.availability = document.getElementById('f-availability').value;
    listing.testimonials = parseLines('f-testimonials');
    listing.depositPercent = null;
  } else {
    listing.depositPercent = Number(document.getElementById('f-deposit').value) || 20;
    listing.availability = null;
    listing.testimonials = [];
  }

  if (!listing.title) { errorEl.textContent = 'Title is required.'; return; }

  if (editingId) {
    db.collection('listings').doc(editingId).update(listing)
      .then(resetForm)
      .catch(err => errorEl.textContent = 'Error saving: ' + err.message);
  } else {
    listing.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    listing.viewCount = 0;
    listing.enquiryCount = 0;
    db.collection('listings').add(listing)
      .then(resetForm)
      .catch(err => errorEl.textContent = 'Error saving: ' + err.message);
  }
});

document.getElementById('cancel-edit-btn').addEventListener('click', resetForm);

function resetForm() {
  editingId = null;
  document.getElementById('form-title').textContent = 'Add new listing';
  document.getElementById('f-type').value = 'rent';
  ['f-title','f-images','f-price','f-bedrooms','f-bathrooms','f-location','f-maplink',
   'f-deposit','f-testimonials','f-description'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('f-availability').value = 'available';
  document.getElementById('form-error').textContent = '';
  document.getElementById('cancel-edit-btn').style.display = 'none';
  updateFieldVisibility();
}

function startEdit(listing) {
  editingId = listing.id;
  document.getElementById('form-title').textContent = 'Edit listing';
  document.getElementById('f-type').value = listing.type || 'rent';
  document.getElementById('f-title').value = listing.title || '';
  document.getElementById('f-images').value = (listing.images || []).join('\n');
  document.getElementById('f-price').value = listing.price || '';
  document.getElementById('f-price-type').value = listing.priceType || (listing.type === 'rent' ? 'per_night' : 'total');
  document.getElementById('f-bedrooms').value = listing.bedrooms || '';
  document.getElementById('f-bathrooms').value = listing.bathrooms || '';
  document.getElementById('f-location').value = listing.location || '';
  document.getElementById('f-maplink').value = listing.mapLink || '';
  document.getElementById('f-availability').value = listing.availability || 'available';
  document.getElementById('f-deposit').value = listing.depositPercent || '';
  document.getElementById('f-testimonials').value = (listing.testimonials || []).join('\n');
  document.getElementById('f-description').value = listing.description || '';
  document.getElementById('cancel-edit-btn').style.display = 'block';
  updateFieldVisibility();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteListing(id, title) {
  if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
  db.collection('listings').doc(id).delete();
}

// ---------- Live admin list ----------
function listenToListings() {
  db.collection('listings').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    const listEl = document.getElementById('admin-list');
    listEl.innerHTML = '';
    if (snapshot.empty) {
      listEl.innerHTML = '<p class="empty-msg">No listings yet. Add one, or click "Load starter listings".</p>';
      return;
    }
    snapshot.docs.forEach(doc => {
      const listing = { id: doc.id, ...doc.data() };
      const img = (listing.images && listing.images[0]) || './Syaj_files/logo-syaj.png';
      const row = document.createElement('div');
      row.className = 'admin-row';
      row.innerHTML = `
        <img src="${img}" alt="">
        <div class="admin-row-info">
          <div class="t">${listing.title}</div>
          <div class="s">${listing.type === 'rent' ? 'Airbnb' : 'For Sale'} · Ksh ${Number(listing.price||0).toLocaleString()} · ${listing.viewCount||0} views · ${listing.enquiryCount||0} enquiries</div>
        </div>
        <div class="admin-row-actions">
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </div>
      `;
      row.querySelector('.edit-btn').addEventListener('click', () => startEdit(listing));
      row.querySelector('.delete-btn').addEventListener('click', () => deleteListing(listing.id, listing.title));
      listEl.appendChild(row);
    });
  });
}

// ---------- Leads ----------
function listenToLeads() {
  db.collection('leads').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    const listEl = document.getElementById('leads-list');
    const badge = document.getElementById('lead-count-badge');
    listEl.innerHTML = '';
    badge.textContent = snapshot.size ? `(${snapshot.size})` : '';

    if (snapshot.empty) {
      listEl.innerHTML = '<p class="empty-msg">No enquiries yet.</p>';
      return;
    }
    snapshot.docs.forEach(doc => {
      const lead = { id: doc.id, ...doc.data() };
      const when = lead.createdAt && lead.createdAt.toDate ? lead.createdAt.toDate().toLocaleString() : '';
      const row = document.createElement('div');
      row.className = 'lead-row';
      row.innerHTML = `
        <div class="t">${lead.name} — ${lead.phone}</div>
        <div class="s">Re: ${lead.listingTitle || 'General enquiry'} · ${when}</div>
        ${lead.message ? `<div class="m">${lead.message}</div>` : ''}
      `;
      listEl.appendChild(row);
    });
  });
}

// ---------- One-click seed of the original 4 listings ----------
document.getElementById('seed-btn').addEventListener('click', () => {
  if (!confirm('This adds the 4 original listings (Watamu, Exotica Nyali, Oceania Luxe, The Opal). Continue?')) return;

  const seed = [
    {
      title: 'Watamu', type: 'rent', images: ['./Syaj_files/watamu.png'],
      price: 62000, priceType: 'per_night', bedrooms: 5, bathrooms: 5,
      location: 'Watamu, near Turtle Bay Beach', availability: 'available', testimonials: [],
      description: 'A 5-bedroom Airbnb villa, all rooms ensuite, and just a short walk from Turtle Bay Beach — ideal for large groups or family getaways.',
      depositPercent: null
    },
    {
      title: 'Exotica Nyali', type: 'sale', images: ['./Syaj_files/exotica.png'],
      price: 7000000, priceType: 'total', bedrooms: 1, bathrooms: 1,
      location: 'Nyali, Mombasa', depositPercent: 20, availability: null, testimonials: [],
      description: '1-bedroom units from Ksh 7M and 2-bedroom units from Ksh 9M, with sea views from the second floor up. Off-plan purchase available with a 20% deposit.'
    },
    {
      title: 'Oceania Luxe', type: 'sale', images: ['./Syaj_files/oceania luxe.png'],
      price: 5000000, priceType: 'total', bedrooms: 2, bathrooms: 2,
      location: 'Mombasa Coast', depositPercent: 30, availability: null, testimonials: [],
      description: '1, 2, 3, and 4-bedroom units from Ksh 5,000,000. Off-plan mortgage financing available with a 30% deposit to secure your unit.'
    },
    {
      title: 'The Opal', type: 'sale', images: ['./Syaj_files/The Opal.png'],
      price: 22000000, priceType: 'total', bedrooms: 3, bathrooms: 3,
      location: 'Mombasa Coast', depositPercent: 30, availability: null, testimonials: [],
      description: '3, 4, and 5-bedroom units plus DSQ, from Ksh 22,000,000. Off-plan mortgage financing available with a 30% deposit.'
    }
  ];

  const batch = db.batch();
  seed.forEach(item => {
    item.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    item.viewCount = 0;
    item.enquiryCount = 0;
    const ref = db.collection('listings').doc();
    batch.set(ref, item);
  });
  batch.commit()
    .then(() => alert('Starter listings added!'))
    .catch(err => alert('Error seeding: ' + err.message));
});

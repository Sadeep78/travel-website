document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const destinationGrid = document.getElementById('destinationGrid');
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const navContent = document.getElementById('navContent');
  const authSection = document.getElementById('authSection');
  const navLinks = document.querySelectorAll('.nav-link');

  // 1. Mobile Menu Toggle
  if (mobileMenuToggle && navContent) {
    mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenuToggle.classList.toggle('active');
      navContent.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (navContent.classList.contains('active') && !navContent.contains(e.target) && e.target !== mobileMenuToggle) {
        mobileMenuToggle.classList.remove('active');
        navContent.classList.remove('active');
      }
    });
  }

  // 2. Smooth Scrolling for Nav Links & Close Mobile Drawer
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        // Offset for sticky navbar (approx. 80px)
        const offset = 80;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = targetElement.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Close mobile drawer if active
        if (mobileMenuToggle && navContent) {
          mobileMenuToggle.classList.remove('active');
          navContent.classList.remove('active');
        }
      }
    });
  });

  // 3. Highlight Navigation Links on Scroll
  const sections = document.querySelectorAll('section[id], main section[id], header[id]');
  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPos = window.scrollY + 120; // threshold offset

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        current = '#' + section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === current) {
        link.classList.add('active');
      }
    });
  });

  // 4. Session Check & Authentication State UI
  async function checkUserSession() {
    if (!authSection) return;
    try {
      const response = await fetch('/api/profile');
      const profile = await response.json();

      if (profile.authenticated) {
        // Render beautiful dynamic user avatar dropdown
        authSection.innerHTML = `
          <div class="user-profile-menu">
            <button class="profile-trigger" id="profileTrigger" aria-label="User account dropdown">
              <span class="avatar">${profile.name.charAt(0).toUpperCase()}</span>
              <span class="user-name">${profile.name}</span>
            </button>
            <div class="profile-dropdown" id="profileDropdown">
              ${profile.role === 'admin' ? '<a href="admin.html" class="dropdown-item">⚙️ Admin Panel</a>' : ''}
              <button id="logoutBtn" class="dropdown-item">🚪 Sign Out</button>
            </div>
          </div>
        `;

        // Wire dropdown events
        const profileTrigger = document.getElementById('profileTrigger');
        const profileDropdown = document.getElementById('profileDropdown');

        if (profileTrigger && profileDropdown) {
          profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('open');
          });

          // Close dropdown on click outside
          document.addEventListener('click', () => {
            profileDropdown.classList.remove('open');
          });
        }

        // Wire logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', async () => {
            try {
              const res = await fetch('/api/logout', { method: 'POST' });
              if (res.ok) {
                window.location.reload();
              }
            } catch (err) {
              console.error('Logout error:', err);
            }
          });
        }
      }
    } catch (err) {
      console.warn('Failed to retrieve user profile:', err);
    }
  }
  checkUserSession();

  const browseGrid = document.getElementById('browseGrid');
  const locationGrid = document.getElementById('locationGrid');
  const heroDestSelect = document.getElementById('heroDestSelect');
  const heroDateInput = document.getElementById('heroDateInput');
  const heroBudgetSelect = document.getElementById('heroBudgetSelect');
  const heroStyleSelect = document.getElementById('heroStyleSelect');
  const searchFilterBanner = document.getElementById('searchFilterBanner');

  function todayIsoDate() {
    const t = new Date();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    return `${t.getFullYear()}-${m}-${d}`;
  }

  function formatDisplayDate(isoDate) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }

  function initHeroDateInput() {
    if (!heroDateInput) return;
    heroDateInput.min = todayIsoDate();
    heroDateInput.value = '';
  }
  initHeroDateInput();

  function triggerScrollReveal(container) {
    if (typeof window.refreshScrollReveals === 'function' && container) {
      window.refreshScrollReveals(container);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function buildFilterParams(extra = {}) {
    const params = new URLSearchParams();
    const q = (extra.q != null ? extra.q : (searchInput ? searchInput.value.trim() : ''));
    if (q) params.set('q', q);
    if (extra.slug) params.set('slug', extra.slug);
    if (extra.featured) params.set('featured', '1');
    if (heroDestSelect && heroDestSelect.value) params.set('slug', heroDestSelect.value);
    if (heroDateInput && heroDateInput.value) params.set('date', heroDateInput.value);
    if (heroBudgetSelect && heroBudgetSelect.value) params.set('maxPrice', heroBudgetSelect.value);
    if (heroStyleSelect && heroStyleSelect.value) params.set('category', heroStyleSelect.value);
    Object.entries(extra).forEach(([key, val]) => {
      if (val != null && val !== '' && !['q', 'slug', 'featured', 'date'].includes(key)) params.set(key, val);
    });
    return params;
  }

  async function fetchDestinations(extra = {}) {
    const params = buildFilterParams(extra);
    const response = await fetch(`/api/destinations?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to load destinations');
    return response.json();
  }

  function bookButtonAttrs(destination, primary = false, extraStyle = '') {
    const cls = primary ? 'btn btn-primary book-tour-btn' : 'btn btn-secondary book-tour-btn';
    const style = extraStyle ? ` style="${extraStyle}"` : '';
    return `<button class="${cls}" type="button"${style}
      data-destination="${escapeHtml(destination.name)}"
      data-price="${escapeHtml(destination.price)}"
      data-image="${escapeHtml(destination.image)}">Book Tour</button>`;
  }

  function renderNoResults(container, message) {
    const hint = message || 'Try a different search or clear your filters.';
    container.innerHTML = `
      <div class="no-results-panel" style="grid-column: 1/-1; text-align: center; padding: 3rem 1.5rem;">
        <span style="font-size: 3rem;">🔍</span>
        <h3>No destinations found</h3>
        <p style="color: var(--subtle); margin-top: 0.5rem;">${escapeHtml(hint)}</p>
      </div>
    `;
  }

  function updateSearchFilterBanner() {
    if (!searchFilterBanner) return;
    const parts = [];
    if (heroDateInput && heroDateInput.value) {
      parts.push(`Travel date: <strong>${escapeHtml(formatDisplayDate(heroDateInput.value))}</strong>`);
    }
    if (heroDestSelect && heroDestSelect.value) {
      const label = heroDestSelect.options[heroDestSelect.selectedIndex]?.text || '';
      if (label) parts.push(`Destination: <strong>${escapeHtml(label)}</strong>`);
    }
    if (heroStyleSelect && heroStyleSelect.value) {
      parts.push(`Style: <strong>${escapeHtml(heroStyleSelect.value)}</strong>`);
    }
    if (heroBudgetSelect && heroBudgetSelect.value) {
      parts.push(`Budget: <strong>under $${escapeHtml(heroBudgetSelect.value)}</strong>`);
    }
    if (!parts.length) {
      searchFilterBanner.hidden = true;
      searchFilterBanner.innerHTML = '';
      return;
    }
    searchFilterBanner.hidden = false;
    searchFilterBanner.className = 'search-filter-banner scroll-reveal scroll-reveal--up';
    searchFilterBanner.innerHTML = `
      <p>Showing tours for ${parts.join(' · ')}</p>
      <button type="button" id="clearSearchFilters" class="btn btn-outline btn-sm">Clear filters</button>
    `;
    triggerScrollReveal(searchFilterBanner);
    const clearBtn = document.getElementById('clearSearchFilters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (heroDateInput) heroDateInput.value = '';
        if (heroDestSelect) heroDestSelect.value = '';
        if (heroBudgetSelect) heroBudgetSelect.value = '';
        if (heroStyleSelect) heroStyleSelect.value = '';
        if (searchInput) searchInput.value = '';
        refreshAllSections();
      });
    }
  }

  function noResultsMessage() {
    if (heroDateInput && heroDateInput.value) {
      return `No tours are available on ${formatDisplayDate(heroDateInput.value)}. Try another date or destination.`;
    }
    return 'Try a different search or clear your filters.';
  }

  function renderBrowseGrid(destinations) {
    if (!browseGrid) return;
    const featured = destinations.filter((d) => d.featured);
    const list = featured.length ? featured : destinations.slice(0, 4);
    if (!list.length) {
      renderNoResults(browseGrid, noResultsMessage());
      return;
    }
    browseGrid.innerHTML = list.map((d, i) => {
      const wide = i === 0 ? ' browse-card--wide' : '';
      const primary = i === 0;
      const body = i === 0
        ? `<div class="browse-card-copy">
            <h3>${escapeHtml(d.name)}</h3>
            <p class="browse-tagline">${escapeHtml(d.region)} · ${escapeHtml(d.category)}</p>
            <p>${escapeHtml(d.description)}</p>
            ${bookButtonAttrs(d, true)}
          </div>`
        : `<div style="display:flex;flex-direction:column;height:100%;justify-content:space-between;">
            <div>
              <h3>${escapeHtml(d.name)}</h3>
              <p>${escapeHtml(d.description)}</p>
            </div>
            ${bookButtonAttrs(d, false, 'margin-top:1rem;width:100%;')}
          </div>`;
      return `<article class="browse-card${wide} scroll-reveal scroll-reveal--up" style="--reveal-delay:${i * 100}ms">
        <img src="${escapeHtml(d.image)}" alt="${escapeHtml(d.name)}" loading="lazy" onerror="this.onerror=null;this.src='images/fallback.svg'" />
        ${body}
      </article>`;
    }).join('');
    triggerScrollReveal(browseGrid);
  }

  function renderLocationGrid(destinations) {
    if (!locationGrid) return;
    if (!destinations.length) {
      renderNoResults(locationGrid, noResultsMessage());
      return;
    }
    locationGrid.innerHTML = destinations.map((d, i) => `
      <article class="location-card scroll-reveal scroll-reveal--up" style="--reveal-delay:${i * 80}ms">
        <img src="${escapeHtml(d.image)}" alt="${escapeHtml(d.name)}" loading="lazy" onerror="this.onerror=null;this.src='images/fallback.svg'" />
        <div class="location-copy">
          <h3>${escapeHtml(d.name)}</h3>
          <p>${escapeHtml(d.description)}</p>
        </div>
        <button type="button" class="location-book-btn"
          data-destination="${escapeHtml(d.name)}"
          data-price="${escapeHtml(d.price)}"
          data-image="${escapeHtml(d.image)}">Book Now →</button>
      </article>
    `).join('');
    triggerScrollReveal(locationGrid);
  }

  function renderDestinationGrid(destinations) {
    if (!destinationGrid) return;
    destinationGrid.innerHTML = '';
    if (!destinations.length) {
      renderNoResults(destinationGrid, noResultsMessage());
      return;
    }
    destinations.forEach((destination, index) => {
      const card = document.createElement('article');
      card.className = 'destination-card scroll-reveal scroll-reveal--up';
      card.style.setProperty('--reveal-delay', `${index * 80}ms`);
      card.innerHTML = `
        <img src="${escapeHtml(destination.image)}" alt="${escapeHtml(destination.name)}" loading="lazy" onerror="this.onerror=null;this.src='images/fallback.svg'" />
        <div class="card-body">
          <span class="destination-meta">${escapeHtml(destination.region)} · ${escapeHtml(destination.category)}</span>
          <h3>${escapeHtml(destination.name)}</h3>
          <p>${escapeHtml(destination.description)}</p>
          <div class="card-footer-row">
            <span class="price">From ${escapeHtml(destination.price)}</span>
            <button type="button" class="btn btn-secondary book-tour-btn"
              data-destination="${escapeHtml(destination.name)}"
              data-price="${escapeHtml(destination.price)}"
              data-image="${escapeHtml(destination.image)}">Book Now</button>
          </div>
        </div>
      `;
      destinationGrid.appendChild(card);
    });
    triggerScrollReveal(destinationGrid);
  }

  async function populateHeroFilters() {
    try {
      const destinations = await fetch('/api/destinations').then((r) => r.json());
      if (heroDestSelect) {
        heroDestSelect.innerHTML = '<option value="">All destinations</option>' +
          destinations.map((d) => `<option value="${escapeHtml(d.slug)}">${escapeHtml(d.name)}</option>`).join('');
      }
    } catch (err) {
      console.warn('Could not load hero filters:', err);
    }
  }

  async function refreshAllSections(extra = {}) {
    try {
      const destinations = await fetchDestinations(extra);
      updateSearchFilterBanner();
      renderBrowseGrid(destinations);
      renderLocationGrid(destinations);
      renderDestinationGrid(destinations);
    } catch (err) {
      console.error('Error loading destinations:', err);
      const msg = '<p class="error-msg" style="grid-column:1/-1;text-align:center;">Failed to load travel options. Please try again later.</p>';
      if (destinationGrid) destinationGrid.innerHTML = msg;
      if (browseGrid) browseGrid.innerHTML = msg;
      if (locationGrid) locationGrid.innerHTML = msg;
    }
  }

  async function loadDestinations(query = '') {
    await refreshAllSections({ q: query });
  }

  // 6. Navigation Search Handler
  function performSearch() {
    const query = searchInput.value.trim();
    loadDestinations(query);

    // Smoothly scroll down to destinations section
    const targetSection = document.getElementById('destinations');
    if (targetSection) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = targetSection.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  if (searchButton && searchInput) {
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });

    // Real-time debounced live search for immersive feeling
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadDestinations(searchInput.value.trim());
      }, 350);
    });
  }

  // Hero Search Banner interactions
  const heroSearchBtn = document.getElementById('heroSearchBtn');
  if (heroSearchBtn) {
    heroSearchBtn.addEventListener('click', () => {
      if (heroDateInput && heroDateInput.value && heroDateInput.value < heroDateInput.min) {
        heroDateInput.value = heroDateInput.min;
      }
      if (searchInput) searchInput.value = '';
      refreshAllSections();
      const targetSection = document.getElementById('destinations');
      if (targetSection) {
        const offset = 80;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = targetSection.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  }

  // 7. Dynamic "Book Now" → redirect to checkout page
  function goToCheckout(destination, price = '', image = '') {
    const params = new URLSearchParams({
      destination,
      price,
      image: encodeURIComponent(image)
    });
    if (heroDateInput && heroDateInput.value) {
      params.set('travelDate', heroDateInput.value);
    }
    window.location.href = `checkout.html?${params.toString()}`;
  }

  // Delegate click listener to make whole travel cards (including image/button) clickable
  document.addEventListener('click', (e) => {
    // 1. Dynamic destination card
    const destCard = e.target.closest('.destination-card');
    if (destCard) {
      const btn = destCard.querySelector('.book-tour-btn');
      if (btn) {
        const dest  = btn.getAttribute('data-destination')  || '';
        const price = btn.getAttribute('data-price')        || '';
        const image = btn.getAttribute('data-image')        || '';
        if (dest) goToCheckout(dest, price, image);
        return;
      }
    }

    // 2. Static location card (Sri Lanka section)
    const locCard = e.target.closest('.location-card');
    if (locCard) {
      const btn = locCard.querySelector('.location-book-btn');
      if (btn) {
        const dest  = btn.getAttribute('data-destination')  || '';
        const price = btn.getAttribute('data-price')        || '';
        const image = locCard.querySelector('.location-book-btn') ? btn.getAttribute('data-image') : '';
        if (dest) goToCheckout(dest, price, image);
        return;
      }
    }
  });

  // 8. Interactive Booking Form Handler with Status Banner Alerts
  if (contactForm && formStatus) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Setup status message styles
      formStatus.className = 'form-status info';
      formStatus.textContent = 'Processing your itinerary request... ⌛';

      const payload = {
        name: document.getElementById('nameInput').value.trim(),
        email: document.getElementById('emailInput').value.trim(),
        message: document.getElementById('messageInput').value.trim()
      };

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (response.ok) {
          formStatus.className = 'form-status success';
          formStatus.textContent = `🎉 Success! ${result.message || 'Thanks! Your request has been received.'}`;
          contactForm.reset();
          
          // Clear status after 8 seconds
          setTimeout(() => {
            formStatus.className = 'form-status';
            formStatus.style.display = 'none';
          }, 8000);
        } else {
          formStatus.className = 'form-status error';
          formStatus.textContent = `⚠️ Oops! ${result.error || 'Unable to submit request. Please verify fields.'}`;
        }
      } catch (err) {
        formStatus.className = 'form-status error';
        formStatus.textContent = '❌ Network connection problem. Please verify connection and try again.';
      }
    });
  }

  populateHeroFilters();
  refreshAllSections();
});

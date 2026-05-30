document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const welcomeText = document.getElementById('welcomeText');
  const logoutButton = document.getElementById('logoutButton');
  
  // Tab elements
  const tabBookings = document.getElementById('tabBookings');
  const tabInquiries = document.getElementById('tabInquiries');
  const bookingsSection = document.getElementById('bookingsSection');
  const inquiriesSection = document.getElementById('inquiriesSection');

  // Stats elements
  const statTotalBookings = document.getElementById('statTotalBookings');
  const statTotalVolume = document.getElementById('statTotalVolume');
  const statTotalInquiries = document.getElementById('statTotalInquiries');

  // Lists elements
  const bookingsList = document.getElementById('bookingsList');
  const requestsList = document.getElementById('requestsList');

  // Data cache
  let bookingsData = [];
  let inquiriesData = [];

  // Tab switching
  tabBookings.addEventListener('click', () => {
    tabBookings.classList.add('active');
    tabInquiries.classList.remove('active');
    bookingsSection.classList.add('active');
    inquiriesSection.classList.remove('active');
  });

  tabInquiries.addEventListener('click', () => {
    tabInquiries.classList.add('active');
    tabBookings.classList.remove('active');
    inquiriesSection.classList.add('active');
    bookingsSection.classList.remove('active');
  });

  // Logout
  logoutButton.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });

  // Main Loader
  async function initAdminPortal() {
    try {
      // 1. Session verification
      const profileRes = await fetch('/api/profile');
      const profile = await profileRes.json();
      if (!profile.authenticated || profile.role !== 'admin') {
        window.location.href = '/login.html';
        return;
      }
      welcomeText.textContent = `Welcome, ${profile.name}`;

      // 2. Fetch Data concurrently
      const [bookingsRes, inquiriesRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/requests')
      ]);

      if (bookingsRes.ok) {
        bookingsData = await bookingsRes.json();
      } else {
        bookingsList.innerHTML = '<p class="empty-state">Unable to load bookings.</p>';
      }

      if (inquiriesRes.ok) {
        inquiriesData = await inquiriesRes.json();
      } else {
        requestsList.innerHTML = '<p class="empty-state">Unable to load inquiries.</p>';
      }

      // 3. Render Dashboard components
      calculateStats();
      renderBookings();
      renderInquiries();

    } catch (err) {
      console.error('Failed to initialize admin dashboard:', err);
    }
  }

  // Calculate stats taking quantity into account
  function calculateStats() {
    // Booking count
    statTotalBookings.textContent = bookingsData.length;
    
    // Inquiries count
    statTotalInquiries.textContent = inquiriesData.length;

    // Volume count (parse currency formatted strings like "$1,350" * quantity)
    let totalVolume = 0;
    bookingsData.forEach(b => {
      const qty = b.quantity ? Number(b.quantity) : 1;
      let unit = b.price_amount != null ? Number(b.price_amount) : NaN;
      if (Number.isNaN(unit) && b.price) {
        unit = parseFloat(String(b.price).replace(/[^\d.]/g, ''));
      }
      if (!Number.isNaN(unit)) {
        totalVolume += unit * qty;
      }
    });
    statTotalVolume.textContent = '$' + totalVolume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // Render bookings
  function renderBookings() {
    if (!bookingsData.length) {
      bookingsList.innerHTML = '<p class="empty-state">No tour bookings received yet.</p>';
      return;
    }

    bookingsList.innerHTML = bookingsData.map(booking => {
      const dateStr = new Date(booking.created_at).toLocaleString();
      const paymentBadgeClass = `badge-${booking.payment_method || 'cod'}`;
      const paymentLabel = booking.payment_method === 'card' ? `Card (ending in ${booking.card_last4 || '****'})` : 'Cash on Delivery';

      // Address string parsing
      let shippingDetailsHTML = '';
      if (booking.shipping_same) {
        shippingDetailsHTML = '<span class="detail-val" style="font-weight: 500; color: var(--admin-text-sub);">Same as billing address</span>';
      } else {
        shippingDetailsHTML = `
          <strong class="detail-val" style="display:block; margin-bottom:0.15rem;">${booking.shipping_name || ''}</strong>
          <p class="detail-val" style="font-weight: normal; margin:0;">${booking.shipping_address || ''}, ${booking.shipping_city || ''}, ${booking.shipping_state || ''} ${booking.shipping_zip || ''}, ${booking.shipping_country || ''}</p>
        `;
      }

      return `
        <article class="admin-item-card" id="bookingCard-${booking.id}">
          <div class="card-header-row">
            <div>
              <h3 class="item-title">${booking.destination}</h3>
              <p class="item-subtitle">Booked on ${dateStr}</p>
            </div>
            <div class="item-badge-group">
              <span class="item-ref">${booking.ref}</span>
              <select class="admin-status-select badge badge-${booking.status || 'pending'}" data-booking-id="${booking.id}">
                <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>pending</option>
                <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>confirmed</option>
                <option value="delivered" ${booking.status === 'delivered' ? 'selected' : ''}>delivered</option>
                <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>cancelled</option>
              </select>
              <span class="badge ${paymentBadgeClass}">${booking.payment_method}</span>
              <button class="btn-delete-booking" data-booking-id="${booking.id}">🗑️ Delete</button>
            </div>
          </div>

          <div class="card-details-grid">
            <div class="detail-block">
              <span class="detail-label">Client Name</span>
              <p class="detail-val">${booking.billing_name}</p>
            </div>
            <div class="detail-block">
              <span class="detail-label">Contact Details</span>
              <p class="detail-val" style="font-weight:700;">${booking.billing_email}</p>
              <p class="detail-val" style="font-size:0.8rem; color:var(--admin-text-sub); margin-top:0.1rem;">${booking.billing_phone || 'No phone'}</p>
            </div>
            <div class="detail-block">
              <span class="detail-label">Booking Price</span>
              <p class="detail-val" style="color:var(--admin-primary); font-weight:800;">${booking.price || 'N/A'}</p>
            </div>
            <div class="detail-block">
              <span class="detail-label">Quantity</span>
              <div class="qty-editor-wrap">
                <input type="number" class="admin-qty-input" id="qtyInput-${booking.id}" value="${booking.quantity || 1}" min="1" />
                <button class="btn btn-outline btn-update-qty btn-sm" data-booking-id="${booking.id}">Update</button>
              </div>
            </div>
            <div class="detail-block" style="grid-column: span 2;">
              <span class="detail-label">Payment Details</span>
              <p class="detail-val">${paymentLabel}</p>
            </div>

            <!-- Addresses -->
            <div class="detail-block address-block">
              <span class="detail-label">Billing Address</span>
              <p class="detail-val" style="font-weight: normal; margin-top:0.25rem;">
                ${booking.billing_address}, ${booking.billing_city}, ${booking.billing_state} ${booking.billing_zip}, ${booking.billing_country}
              </p>
            </div>

            <div class="detail-block" style="grid-column: 1 / -1; margin-top: 0.5rem; border-top: 1px dashed rgba(15,23,42,0.08); padding-top:0.75rem;">
              <span class="detail-label">Shipping Address</span>
              <div style="margin-top:0.25rem;">
                ${shippingDetailsHTML}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // Render inquiries
  function renderInquiries() {
    if (!inquiriesData.length) {
      requestsList.innerHTML = '<p class="empty-state">No client inquiries received yet.</p>';
      return;
    }

    requestsList.innerHTML = inquiriesData.map(inquiry => {
      const dateStr = new Date(inquiry.created_at).toLocaleString();
      const clientLabel = inquiry.user_name ? `${inquiry.user_name} (${inquiry.user_email})` : 'Guest Visitor';

      return `
        <article class="admin-item-card">
          <div class="card-header-row">
            <div>
              <h3 class="item-title">${inquiry.name}</h3>
              <p class="item-subtitle">Submitted on ${dateStr}</p>
            </div>
            <span class="item-ref">MSG-${inquiry.id}</span>
          </div>

          <div class="card-details-grid">
            <div class="detail-block">
              <span class="detail-label">Email Address</span>
              <p class="detail-val" style="font-weight:700;">${inquiry.email}</p>
            </div>
            <div class="detail-block" style="grid-column: span 2;">
              <span class="detail-label">Account Details</span>
              <p class="detail-val">${clientLabel}</p>
            </div>
            <div class="detail-block address-block" style="grid-column: 1 / -1;">
              <span class="detail-label">Message Details</span>
              <p class="detail-message" style="margin-top:0.25rem;">${inquiry.message}</p>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // Handle interaction events (status change, quantity update, deletion) in bookings section
  bookingsList.addEventListener('change', async (e) => {
    if (e.target.classList.contains('admin-status-select')) {
      const select = e.target;
      const bookingId = select.getAttribute('data-booking-id');
      const newStatus = select.value;
      
      try {
        const response = await fetch(`/api/bookings/${bookingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
          // Update status badge styling classes on select element
          select.className = `admin-status-select badge badge-${newStatus}`;
          
          // Update local data cache status
          const idx = bookingsData.findIndex(b => b.id == bookingId);
          if (idx !== -1) {
            bookingsData[idx].status = newStatus;
            calculateStats();
          }
        } else {
          alert('Failed to update booking status.');
        }
      } catch (err) {
        console.error('Error updating status:', err);
        alert('Network error when updating status.');
      }
    }
  });

  bookingsList.addEventListener('click', async (e) => {
    // 1. Delete booking
    if (e.target.closest('.btn-delete-booking')) {
      const btn = e.target.closest('.btn-delete-booking');
      const bookingId = btn.getAttribute('data-booking-id');
      
      if (confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
        try {
          const response = await fetch(`/api/bookings/${bookingId}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            // Remove from local cache and re-render
            bookingsData = bookingsData.filter(b => b.id != bookingId);
            calculateStats();
            renderBookings();
          } else {
            alert('Failed to delete booking.');
          }
        } catch (err) {
          console.error('Error deleting booking:', err);
          alert('Network error when deleting booking.');
        }
      }
    }
    
    // 2. Update quantity
    if (e.target.classList.contains('btn-update-qty')) {
      const btn = e.target;
      const bookingId = btn.getAttribute('data-booking-id');
      const input = document.getElementById(`qtyInput-${bookingId}`);
      if (!input) return;
      
      const newQty = Number(input.value);
      if (newQty < 1 || isNaN(newQty)) {
        alert('Please enter a valid quantity of 1 or more.');
        return;
      }
      
      try {
        const response = await fetch(`/api/bookings/${bookingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: newQty })
        });
        
        if (response.ok) {
          // Update local cache
          const idx = bookingsData.findIndex(b => b.id == bookingId);
          if (idx !== -1) {
            bookingsData[idx].quantity = newQty;
            calculateStats();
            alert('Booking quantity updated.');
          }
        } else {
          alert('Failed to update quantity.');
        }
      } catch (err) {
        console.error('Error updating quantity:', err);
        alert('Network error when updating quantity.');
      }
    }
  });

  // Launch Portal
  initAdminPortal();
});

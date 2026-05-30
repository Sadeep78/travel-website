(() => {
  // ── URL params ──────────────────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const destination = params.get('destination') || 'Your Destination';
  const price       = params.get('price')       || '';
  const image       = params.get('image')       || '';
  const travelDate  = params.get('travelDate')  || '';

  function formatDisplayDate(isoDate) {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  // ── Destination banner ──────────────────────────────────────
  document.getElementById('destName').textContent  = destination;
  document.getElementById('destPrice').textContent = price ? `From ${price} per person` : '';
  const travelDateEl = document.getElementById('destTravelDate');
  if (travelDateEl && travelDate) {
    travelDateEl.hidden = false;
    travelDateEl.textContent = `Travel date: ${formatDisplayDate(travelDate)}`;
  }
  const destImg = document.getElementById('destImg');
  if (image) { destImg.src = decodeURIComponent(image); destImg.alt = destination; }
  else { destImg.style.display = 'none'; }

  // ── Step state ──────────────────────────────────────────────
  let currentStep = 1;
  const steps = [null,
    document.getElementById('step1'),
    document.getElementById('step2'),
    document.getElementById('step3'),
    document.getElementById('stepSuccess')
  ];
  const stepItems = [null,
    document.getElementById('stepItem1'),
    document.getElementById('stepItem2'),
    document.getElementById('stepItem3')
  ];

  function showStep(n) {
    [1,2,3].forEach(i => {
      steps[i].style.display   = (i === n) ? 'block' : 'none';
      if (stepItems[i]) {
        stepItems[i].classList.toggle('active',    i === n);
        stepItems[i].classList.toggle('completed', i < n);
      }
    });
    steps[4].style.display = 'none';
    currentStep = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showSuccess() {
    [1,2,3].forEach(i => { steps[i].style.display = 'none'; });
    steps[4].style.display = 'block';
    [1,2,3].forEach(i => stepItems[i] && stepItems[i].classList.add('completed'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showStep(1);

  // ── Collected data ──────────────────────────────────────────
  let billing  = {};
  let shipping = {};
  let payment  = {};

  // ═══════════════════════════════════════════════════════════
  // STEP 1 – ADDRESS
  // ═══════════════════════════════════════════════════════════
  const sameChk        = document.getElementById('sameAsShipping');
  const shippingSection = document.getElementById('shippingSection');

  sameChk.addEventListener('change', () => {
    shippingSection.style.display = sameChk.checked ? 'none' : 'block';
  });

  document.getElementById('addressForm').addEventListener('submit', e => {
    e.preventDefault();
    const err = document.getElementById('addrError');
    err.textContent = '';

    // Collect billing
    const bName    = v('billName');
    const bEmail   = v('billEmail');
    const bPhone   = v('billPhone');
    const bCountry = v('billCountry');
    const bAddr    = v('billAddr');
    const bCity    = v('billCity');
    const bState   = v('billState');
    const bZip     = v('billZip');

    if (!bName || !bEmail || !bPhone || !bCountry || !bAddr || !bCity || !bState || !bZip) {
      err.textContent = '⚠️ Please fill in all required billing fields.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bEmail)) {
      err.textContent = '⚠️ Please enter a valid email address.';
      return;
    }

    billing = { name: bName, email: bEmail, phone: bPhone, country: bCountry,
                address: bAddr, address2: v('billAddr2'), city: bCity,
                state: bState, zip: bZip };

    if (sameChk.checked) {
      shipping = { ...billing, same: true };
    } else {
      const sName    = v('shipName');
      const sCountry = v('shipCountry');
      const sAddr    = v('shipAddr');
      const sCity    = v('shipCity');
      const sState   = v('shipState');
      const sZip     = v('shipZip');
      if (!sName || !sCountry || !sAddr || !sCity || !sState || !sZip) {
        err.textContent = '⚠️ Please fill in all required shipping fields.';
        return;
      }
      shipping = { name: sName, country: sCountry, address: sAddr,
                   address2: v('shipAddr2'), city: sCity, state: sState,
                   zip: sZip, same: false };
    }

    showStep(2);
  });

  // ═══════════════════════════════════════════════════════════
  // STEP 2 – PAYMENT
  // ═══════════════════════════════════════════════════════════
  const payCardRadio = document.getElementById('payCard');
  const payCodRadio  = document.getElementById('payCod');
  const cardDetails  = document.getElementById('cardDetails');
  const codNotice    = document.getElementById('codNotice');
  const payCardLabel = document.getElementById('payCardLabel');
  const payCodLabel  = document.getElementById('payCodLabel');

  function updatePayUI() {
    const isCard = payCardRadio.checked;
    cardDetails.style.display  = isCard ? 'block' : 'none';
    codNotice.style.display    = isCard ? 'none'  : 'block';
    payCardLabel.classList.toggle('pay-option--active', isCard);
    payCodLabel.classList.toggle('pay-option--active', !isCard);
  }
  payCardRadio.addEventListener('change', updatePayUI);
  payCodRadio.addEventListener('change',  updatePayUI);
  updatePayUI();

  // Card number formatting
  const cardNumberInput = document.getElementById('cardNumber');
  const cardBrand       = document.getElementById('cardBrand');
  cardNumberInput.addEventListener('input', e => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
    e.target.value = val.replace(/(.{4})/g, '$1 ').trim();
    // Brand detection
    if (/^4/.test(val))       cardBrand.textContent = '💳 Visa';
    else if (/^5[1-5]/.test(val)) cardBrand.textContent = '💳 MC';
    else if (/^3[47]/.test(val))  cardBrand.textContent = '💳 Amex';
    else cardBrand.textContent = '💳';
  });

  // Expiry formatting
  const cardExpiryInput = document.getElementById('cardExpiry');
  cardExpiryInput.addEventListener('input', e => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) val = val.slice(0,2) + ' / ' + val.slice(2);
    e.target.value = val;
  });

  document.getElementById('payBackBtn').addEventListener('click', () => showStep(1));

  document.getElementById('payNextBtn').addEventListener('click', () => {
    const err = document.getElementById('payError');
    err.textContent = '';

    if (payCardRadio.checked) {
      const cName   = v('cardName');
      const cNum    = v('cardNumber').replace(/\s/g, '');
      const cExpiry = v('cardExpiry');
      const cCvv    = v('cardCvv');
      if (!cName || !cNum || !cExpiry || !cCvv) {
        err.textContent = '⚠️ Please fill in all card details.'; return;
      }
      if (cNum.length < 15) {
        err.textContent = '⚠️ Please enter a valid card number.'; return;
      }
      payment = { method: 'card', cardName: cName,
                  cardLast4: cNum.slice(-4), expiry: cExpiry };
    } else {
      payment = { method: 'cod' };
    }

    populateSummary();
    showStep(3);
  });

  // ═══════════════════════════════════════════════════════════
  // STEP 3 – CONFIRM
  // ═══════════════════════════════════════════════════════════
  function populateSummary() {
    document.getElementById('sumDest').textContent  = destination;
    document.getElementById('sumPrice').textContent = price ? `From ${price} per person` : '';

    document.getElementById('sumBillingName').textContent = billing.name;
    document.getElementById('sumBillingAddr').textContent =
      `${billing.address}${billing.address2 ? ', ' + billing.address2 : ''}, ${billing.city}, ${billing.state} ${billing.zip}, ${billing.country}`;

    if (shipping.same) {
      document.getElementById('sumShipName').textContent = billing.name;
      document.getElementById('sumShipAddr').textContent = 'Same as billing address';
    } else {
      document.getElementById('sumShipName').textContent = shipping.name;
      document.getElementById('sumShipAddr').textContent =
        `${shipping.address}${shipping.address2 ? ', ' + shipping.address2 : ''}, ${shipping.city}, ${shipping.state} ${shipping.zip}, ${shipping.country}`;
    }

    if (payment.method === 'card') {
      document.getElementById('sumPayment').textContent =
        `Credit / Debit Card ending in ****${payment.cardLast4}`;
    } else {
      document.getElementById('sumPayment').textContent = 'Cash on Delivery';
    }
  }

  document.getElementById('confirmBackBtn').addEventListener('click', () => showStep(2));

  document.getElementById('confirmBtn').addEventListener('click', async () => {
    const err = document.getElementById('confirmError');
    err.textContent = '';
    const agreed = document.getElementById('agreeTerms').checked;
    if (!agreed) { err.textContent = '⚠️ Please agree to the Terms & Conditions.'; return; }

    const btn     = document.getElementById('confirmBtn');
    const btnText = document.getElementById('confirmBtnText');
    btn.disabled  = true;
    btnText.textContent = 'Processing…';

    const qtyEl = document.getElementById('bookingQty');
    const quantity = qtyEl ? Math.max(1, Math.min(20, parseInt(qtyEl.value, 10) || 1)) : 1;

    const payload = {
      destination,
      price,
      quantity,
      billing,
      shipping: shipping.same ? null : shipping,
      shippingSameAsBilling: !!shipping.same,
      paymentMethod: payment.method,
      cardLast4: payment.cardLast4 || null
    };

    try {
      const res  = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed.');

      document.getElementById('successDest').textContent = destination;
      document.getElementById('successRef').textContent  = data.ref || ('TP-' + Date.now());
      showSuccess();
    } catch (err2) {
      document.getElementById('confirmError').textContent = '❌ ' + err2.message;
      btn.disabled = false;
      btnText.textContent = 'Confirm Booking 🎉';
    }
  });

  // ── Helper ──────────────────────────────────────────────────
  function v(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }
})();

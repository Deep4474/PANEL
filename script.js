// --- API CONFIG ---
const API_BASE_URL = 'https://phone-2cv4.onrender.com';
const API_ENDPOINTS = {
  REGISTER: '/api/auth/register',
  LOGIN: '/api/auth/login',
  VERIFY: '/api/auth/verify',
  PRODUCTS: '/api/products',
};

// --- Menu logic ---
const menuToggle = document.getElementById('menu-toggle');
const sideMenu = document.getElementById('side-menu');
const closeMenu = document.getElementById('close-menu');
const notifBtn = document.getElementById('menu-notifications');
const darkModeBtn = document.getElementById('menu-darkmode');
const logoutBtn = document.getElementById('menu-logout');
const notifBadge = document.getElementById('notif-badge');
const notifModal = document.getElementById('notification-modal');
const closeNotif = document.getElementById('close-notif');
const notifList = document.getElementById('notif-list');
const myOrdersBtn = document.getElementById('menu-myorders');
const ordersModal = document.getElementById('orders-modal');
const closeOrdersModal = document.getElementById('close-orders-modal');
const ordersList = document.getElementById('orders-list');
const profileBtn = document.getElementById('menu-profile');
const helpBtn = document.getElementById('menu-help');
const profileModal = document.getElementById('profile-modal');
const helpModal = document.getElementById('help-modal');
const closeProfileModal = document.getElementById('close-profile-modal');
const closeHelpModal = document.getElementById('close-help-modal');

// Hide menu by default
sideMenu.classList.remove('open');
sideMenu.style.display = 'none';

menuToggle.onclick = () => {
  sideMenu.style.display = 'flex';
  setTimeout(() => sideMenu.classList.add('open'), 10);
};
closeMenu.onclick = () => {
  sideMenu.classList.remove('open');
  setTimeout(() => sideMenu.style.display = 'none', 300);
};
sideMenu.onclick = (e) => {
  if (e.target === sideMenu) {
    sideMenu.classList.remove('open');
    setTimeout(() => sideMenu.style.display = 'none', 300);
  }
};
document.addEventListener('keydown', (e) => {
  if (sideMenu.classList.contains('open') && e.key === 'Escape') {
    sideMenu.classList.remove('open');
    setTimeout(() => sideMenu.style.display = 'none', 300);
  }
});

// --- Dark mode logic ---
function setDarkMode(enabled) {
  if (enabled) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('darkMode', '1');
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', '0');
  }
}
darkModeBtn.onclick = () => {
  setDarkMode(!document.body.classList.contains('dark-mode'));
};
if (localStorage.getItem('darkMode') === '1') setDarkMode(true);

// --- Notification logic (demo) ---
const demoNotifs = [

];
function updateNotifBadge() {
  if (demoNotifs.length > 0) {
    notifBadge.textContent = demoNotifs.length;
    notifBadge.classList.remove('hidden');
  } else {
    notifBadge.classList.add('hidden');
  }
}
notifBtn.onclick = async () => {
  notifModal.classList.remove('hidden');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  let notifs = [];
  if (user.email) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications?email=${encodeURIComponent(user.email)}`);
      notifs = await res.json();
    } catch {}
  }
  // Also fetch updates/announcements
  let updates = [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/updates`);
    updates = await res.json();
  } catch {}
  const allNotifs = [
    ...notifs.map(n => ({ text: n.message, time: new Date(n.date).toLocaleString() })),
    ...updates.map(u => ({ text: u.message, time: new Date(u.date).toLocaleString() }))
  ];
  notifList.innerHTML = allNotifs.length
    ? allNotifs.map(n => `<li><b>${n.text}</b><br><span style='font-size:0.9em;color:#888;'>${n.time}</span></li>`).join('')
    : '<li>No notifications</li>';
  sideMenu.classList.remove('open');
  setTimeout(() => sideMenu.style.display = 'none', 300);
};
closeNotif.onclick = () => notifModal.classList.add('hidden');
document.addEventListener('keydown', (e) => {
  if (!notifModal.classList.contains('hidden') && e.key === 'Escape') notifModal.classList.add('hidden');
});
updateNotifBadge();

// --- Logout logic (demo) ---
logoutBtn.onclick = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('pendingVerificationEmail');
  localStorage.removeItem('stage');
  alert('You have been logged out.');
  window.location.reload();
};

// --- Navigation logic (unchanged) ---
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const productsSection = document.getElementById('products-section');
const authSection = document.getElementById('auth-section');

function showLogin() {
  loginView.classList.remove('hidden');
  registerView.classList.add('hidden');
  productsSection.classList.add('hidden');
  authSection.classList.remove('hidden');
  menuToggle.style.display = 'none';
  sideMenu.style.display = 'none';
}
function showRegister() {
  loginView.classList.add('hidden');
  registerView.classList.remove('hidden');
  productsSection.classList.add('hidden');
  authSection.classList.remove('hidden');
  menuToggle.style.display = 'none';
  sideMenu.style.display = 'none';
}
function showProducts() {
  loginView.classList.add('hidden');
  registerView.classList.add('hidden');
  productsSection.classList.remove('hidden');
  authSection.classList.add('hidden');
  menuToggle.style.display = 'inline-block';
  sideMenu.style.display = 'none';
}
document.getElementById('show-register-link').onclick = (e) => { e.preventDefault(); showRegister(); };
document.getElementById('show-login-link').onclick = (e) => { e.preventDefault(); showLogin(); };

// --- API Helpers ---
async function apiPost(endpoint, data) {
  const res = await fetch(API_BASE_URL + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
  return json;
}
async function apiGet(endpoint) {
  const res = await fetch(API_BASE_URL + endpoint);
  if (!res.ok) throw new Error('Failed to fetch');
  return await res.json();
}

// --- Auth logic ---
document.getElementById('login-form').onsubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const loginMsg = document.getElementById('login-message');
  loginMsg.textContent = '';
  try {
    loginMsg.textContent = 'Logging in...';
    const res = await apiPost(API_ENDPOINTS.LOGIN, { email, password });
    loginMsg.textContent = 'Login successful!';
    localStorage.setItem('user', JSON.stringify(res.user));
    localStorage.setItem('token', res.token);
    localStorage.setItem('stage', 'products');
    showProducts();
    loadProducts();
  } catch (err) {
    loginMsg.textContent = err.message;
  }
};
document.getElementById('register-form').onsubmit = async function(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;
  const registerMsg = document.getElementById('register-message');
  registerMsg.textContent = '';
  // Password match check
  if (password !== confirmPassword) {
    registerMsg.textContent = 'Passwords do not match.';
    return;
  }
  // Password strength check
  const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
  if (!strongPassword.test(password)) {
    registerMsg.textContent = 'Password must be at least 8 characters and include a number, an uppercase letter, and a symbol.';
    return;
  }
  try {
    registerMsg.textContent = 'Registering...';
    const res = await apiPost(API_ENDPOINTS.REGISTER, {
      name, email, password, confirmPassword,
      state: document.getElementById('reg-state').value,
      lga: document.getElementById('reg-lga').value,
      address: document.getElementById('reg-address').value
    });
    registerMsg.textContent = 'Registration successful! Check your email for a code.';
    window.pendingVerificationEmail = email;
    localStorage.setItem('pendingVerificationEmail', email);
    localStorage.setItem('stage', 'verify');
    // Show the register view and verification form
    document.getElementById('register-view').classList.remove('hidden');
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('verify-code-section').classList.remove('hidden');
  } catch (err) {
    registerMsg.textContent = err.message;
    // Show the register view and verification form even on error
    document.getElementById('register-view').classList.remove('hidden');
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('verify-code-section').classList.remove('hidden');
  }
};
document.getElementById('verify-btn').onclick = async function() {
  const code = document.getElementById('verification-code').value.trim();
  const email = window.pendingVerificationEmail || localStorage.getItem('pendingVerificationEmail') || document.getElementById('reg-email').value.trim();
  const registerMsg = document.getElementById('register-message');
  if (!code) {
    registerMsg.textContent = 'Please enter the verification code.';
    return;
  }
  try {
    registerMsg.textContent = 'Verifying...';
    const res = await apiPost(API_ENDPOINTS.VERIFY, { email, code });
    registerMsg.textContent = 'Email verified! You can now log in.';
    document.getElementById('verify-code-section').classList.add('hidden');
    localStorage.removeItem('pendingVerificationEmail');
    localStorage.setItem('stage', 'login');
    showLogin();
  } catch (err) {
    registerMsg.textContent = err.message;
  }
};

// --- Products logic ---
async function loadProducts() {
  try {
    const products = await apiGet(API_ENDPOINTS.PRODUCTS);
    renderProducts(products);
  } catch (err) {
    const productList = document.getElementById('product-list');
    if (productList) productList.innerHTML = '<p style="text-align:center;">Failed to load products</p>';
  }
}

function renderProducts(products) {
  const productList = document.getElementById('product-list');
  if (!productList) return;
  if (!products.length) {
    productList.innerHTML = '<p style="text-align:center;">No products available</p>';
    return;
  }
  productList.innerHTML = products.map((product, idx) => `
    <div class="product-card">
      <img src="${product.images[0]}" alt="${product.name}" />
      <h4>${product.name}</h4>
      <p class="description">${product.description}</p>
      <p class="category">${product.category}</p>
      <p class="price">₦${product.price.toLocaleString()}</p>
      <button class="btn-main buy-now-btn" data-idx="${idx}">Buy Now</button>
    </div>
  `).join('');

  // Add event listeners for buy now buttons
  document.querySelectorAll('.buy-now-btn').forEach(btn => {
    btn.onclick = function() {
      const idx = this.getAttribute('data-idx');
      showBuyNowForm(products[idx]);
    };
  });
}

// --- Buy Now Modal Logic ---
function showBuyNowForm(product) {
  let modal = document.getElementById('order-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'order-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal-content">
      <button id="close-order-modal" class="close-modal">&times;</button>
      <h3>Buy Now: ${product.name}</h3>
      <form id="order-form">
        <label>Quantity:<input type="number" id="order-qty" min="1" value="1" required></label><br>
        <label>Delivery Method:<br>
          <input type="radio" name="delivery-method" value="Pick Up" checked> Pick Up
          <input type="radio" name="delivery-method" value="Deliver"> Deliver
        </label><br>
        <div id="address-fields" style="display:none;">
          <label>Address:<input type="text" id="order-address"></label><br>
        </div>
        <label>Phone:<input type="text" id="order-phone" required></label><br>
        <label>Email:<input type="email" id="order-email" required></label><br>
        <label>Payment Method:
          <select id="payment-method" required>
            <option value="Pay on Delivery">Pay on Delivery</option>
            <option value="Card">Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </label><br>
        <div id="map-container" style="margin:10px 0;"></div>
        <button type="submit" class="btn-main" id="order-submit-btn">Send Order</button>
        <div id="order-spinner" style="display:none;text-align:center;margin-top:1em;"><div class="loader"></div> Sending order...</div>
      </form>
      <div id="order-message"></div>
    </div>
  `;
  modal.classList.remove('hidden');
  modal.style.display = 'block';

  // Get registered address from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const registeredAddress = user.address || '';

  // Pre-fill address field if available
  const addressInput = document.getElementById('order-address');
  if (addressInput && registeredAddress) {
    addressInput.value = registeredAddress;
  }

  // Map logic
  const mapContainer = document.getElementById('map-container');
  function showMap(deliveryMethod, address) {
    if (deliveryMethod === 'Deliver') {
      // Use address if available, else fallback to Lagos
      const apiKey = 'YOUR_API_KEY'; // Replace with your real API key
      const mapQuery = encodeURIComponent(address);
      let mapUrl;
      if (apiKey && apiKey !== 'YOUR_API_KEY') {
        mapUrl = `https://www.google.com/maps?q=${address}&output=embed`;
      } else {
        // Fallback to old embed method if API key is not set
        mapUrl = `https://www.google.com/maps?q=${address}&output=embed`;
      }
      mapContainer.innerHTML = `<iframe width="100%" height="200" frameborder="0" style="border:0" src="${mapUrl}" allowfullscreen></iframe>`;
    } else {
      mapContainer.innerHTML = `<iframe width="100%" height="200" frameborder="0" style="border:0" src="https://www.google.com/maps?q=${address}&output=embed" allowfullscreen></iframe>`;
    }
  }
  showMap('Pick Up');

  // Delivery method logic
  const deliveryRadios = modal.querySelectorAll('input[name="delivery-method"]');
  const addressFields = document.getElementById('address-fields');
  deliveryRadios.forEach(radio => {
    radio.onchange = function() {
      if (this.value === 'Deliver') {
        addressFields.style.display = '';
        document.getElementById('order-address').required = true;
        // Pre-fill with registered address if not already filled
        if (addressInput && !addressInput.value && registeredAddress) {
          addressInput.value = registeredAddress;
        }
        showMap('Deliver', addressInput.value || registeredAddress);
      } else {
        addressFields.style.display = 'none';
        document.getElementById('order-address').required = false;
        showMap('Pick Up');
      }
    };
  });

  // Update map live as address changes (when Deliver is selected)
  if (addressInput) {
    addressInput.addEventListener('input', function() {
      const selectedDelivery = modal.querySelector('input[name="delivery-method"]:checked').value;
      if (selectedDelivery === 'Deliver') {
        showMap('Deliver', addressInput.value);
      }
    });
  }

  document.getElementById('close-order-modal').onclick = () => {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  };

  document.getElementById('order-form').onsubmit = async function(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('order-submit-btn');
    const spinner = document.getElementById('order-spinner');
    submitBtn.disabled = true;
    spinner.style.display = 'block';
    const quantity = document.getElementById('order-qty').value;
    const deliveryMethod = modal.querySelector('input[name="delivery-method"]:checked').value;
    const address = document.getElementById('order-address').value;
    const phone = document.getElementById('order-phone').value;
    const email = document.getElementById('order-email').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const orderMsg = document.getElementById('order-message');
    orderMsg.textContent = '';
    try {
      const res = await apiPost('/api/orders', {
        productId: product.id || product._id || product.name,
        quantity,
        address: deliveryMethod === 'Deliver' ? address : '',
        phone,
        email,
        deliveryMethod,
        paymentMethod
      });
      orderMsg.textContent = 'Order sent successfully!';
      orderMsg.style.color = '#00b894';
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        // Automatically open My Orders and refresh the list
        if (typeof myOrdersBtn !== 'undefined' && myOrdersBtn) {
          myOrdersBtn.click();
        }
      }, 1500);
    } catch (err) {
      orderMsg.textContent = err.message || 'Failed to send order.';
      orderMsg.style.color = '#d63031';
    } finally {
      submitBtn.disabled = false;
      spinner.style.display = 'none';
    }
  };
}

if (myOrdersBtn && ordersModal && closeOrdersModal && ordersList) {
  myOrdersBtn.onclick = async () => {
    ordersModal.classList.remove('hidden');
    ordersModal.style.display = 'block';
    ordersList.innerHTML = '<div class="spinner" style="text-align:center;padding:2em;"><div class="loader"></div> Loading orders...</div>';
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.email) {
      try {
        // Fetch orders for this user
        const res = await fetch(`${API_BASE_URL}/api/orders?email=${encodeURIComponent(user.email)}&t=${Date.now()}`); // force fresh fetch
        const orders = await res.json();
        // Fetch products for mapping productId to name (if products exist)
        let products = [];
        try {
          const prodRes = await fetch(`${API_BASE_URL}/api/products`);
          products = await prodRes.json();
        } catch {}
        const getProductName = (id) => {
          const p = products.find(pr => String(pr.id) === String(id));
          return p ? p.name : id;
        };
        if (!orders.length) {
          ordersList.innerHTML = `
            <div style="margin-bottom:1em;font-size:1.05em;color:#444;text-align:center;">
              Here you can view all orders you have sent to admin and see their current status or any actions taken by admin.
            </div>
            <table style="width:100%;font-size:0.98em;"><thead><tr><th>Product</th><th>Qty</th><th>Status</th><th>Date</th><th>Delivery</th><th>Payment</th><th>Address</th></tr></thead><tbody>
            </tbody></table>`;
        } else {
          ordersList.innerHTML = `
            <div style="margin-bottom:1em;font-size:1.05em;color:#444;text-align:center;">
              Here you can view all orders you have sent to admin and see their current status or any actions taken by admin.
            </div>
            <table style="width:100%;font-size:0.98em;"><thead><tr><th>Product</th><th>Qty</th><th>Status</th><th>Date</th><th>Delivery</th><th>Payment</th><th>Address</th></tr></thead><tbody>
              ${orders.map(o => `<tr><td>${getProductName(o.productId)}</td><td>${o.quantity}</td><td>${o.status || 'pending'}</td><td>${o.date ? new Date(o.date).toLocaleString() : ''}</td><td>${o.deliveryMethod || ''}</td><td>${o.paymentMethod || ''}</td><td>${o.address || ''}</td></tr>`).join('')}
            </tbody></table>`;
        }
      } catch {
        ordersList.innerHTML = '<p style="color:#d63031;text-align:center;">Failed to load orders.</p>';
      }
    } else {
      ordersList.innerHTML = '<p style="text-align:center;">You must be logged in to view your orders.</p>';
    }
  };
  closeOrdersModal.onclick = () => {
    ordersModal.classList.add('hidden');
    ordersModal.style.display = 'none';
  };
}

if (profileBtn && profileModal && closeProfileModal) {
  profileBtn.onclick = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const infoDiv = document.getElementById('profile-info');
    if (user && user.email) {
      infoDiv.innerHTML = `<b>Name:</b> ${user.name || ''}<br><b>Email:</b> ${user.email}`;
    } else {
      infoDiv.innerHTML = 'Not logged in.';
    }
    profileModal.classList.remove('hidden');
    profileModal.style.display = 'block';
    sideMenu.classList.remove('open');
    setTimeout(() => sideMenu.style.display = 'none', 300);
  };
  closeProfileModal.onclick = () => {
    profileModal.classList.add('hidden');
    profileModal.style.display = 'none';
  };
}
if (helpBtn && helpModal && closeHelpModal) {
  helpBtn.onclick = () => {
    helpModal.classList.remove('hidden');
    helpModal.style.display = 'block';
    sideMenu.classList.remove('open');
    setTimeout(() => sideMenu.style.display = 'none', 300);
  };
  closeHelpModal.onclick = () => {
    helpModal.classList.add('hidden');
    helpModal.style.display = 'none';
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const stage = localStorage.getItem('stage');
  if (token && stage === 'products') {
    showProducts();
    loadProducts();
  } else if (stage === 'verify') {
    // Show verification form if user was in the middle of verifying
    document.getElementById('register-view').classList.remove('hidden');
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('verify-code-section').classList.remove('hidden');
    window.pendingVerificationEmail = localStorage.getItem('pendingVerificationEmail');
  } else if (stage === 'login') {
    showLogin();
  } else {
    showLogin();
  }
}); 

// Nigerian States and LGAs (full list)
const statesAndLGAs = {
  "Abia": ["Aba North", "Aba South", "Arochukwu", "Bende", "Ikwuano", "Isiala Ngwa North", "Isiala Ngwa South", "Isuikwuato", "Obi Ngwa", "Ohafia", "Osisioma", "Ugwunagbo", "Ukwa East", "Ukwa West", "Umuahia North", "Umuahia South", "Umu Nneochi"],
  "Adamawa": ["Demsa", "Fufore", "Ganye", "Gayuk", "Gombi", "Grie", "Hong", "Jada", "Lamurde", "Madagali", "Maiha", "Mayo Belwa", "Michika", "Mubi North", "Mubi South", "Numan", "Shelleng", "Song", "Toungo", "Yola North", "Yola South"],
  "Akwa Ibom": ["Abak", "Eastern Obolo", "Eket", "Esit Eket", "Essien Udim", "Etim Ekpo", "Etinan", "Ibeno", "Ibesikpo Asutan", "Ibiono Ibom", "Ika", "Ikono", "Ikot Abasi", "Ikot Ekpene", "Ini", "Itu", "Mbo", "Mkpat Enin", "Nsit Atai", "Nsit Ibom", "Nsit Ubium", "Obot Akara", "Okobo", "Onna", "Oron", "Oruk Anam", "Udung Uko", "Ukanafun", "Uruan", "Urue-Offong/Oruko", "Uyo"],
  "Anambra": ["Aguata", "Anambra East", "Anambra West", "Anaocha", "Awka North", "Awka South", "Ayamelum", "Dunukofia", "Ekwusigo", "Idemili North", "Idemili South", "Ihiala", "Njikoka", "Nnewi North", "Nnewi South", "Ogbaru", "Onitsha North", "Onitsha South", "Orumba North", "Orumba South", "Oyi"],
  "Bauchi": ["Alkaleri", "Bauchi", "Bogoro", "Damban", "Darazo", "Dass", "Gamawa", "Ganjuwa", "Giade", "Itas/Gadau", "Jama'are", "Katagum", "Kirfi", "Misau", "Ningi", "Shira", "Tafawa Balewa", "Toro", "Warji", "Zaki"],
  "Bayelsa": ["Brass", "Ekeremor", "Kolokuma/Opokuma", "Nembe", "Ogbia", "Sagbama", "Southern Ijaw", "Yenagoa"],
  "Benue": ["Ado", "Agatu", "Apa", "Buruku", "Gboko", "Guma", "Gwer East", "Gwer West", "Katsina-Ala", "Konshisha", "Kwande", "Logo", "Makurdi", "Obi", "Ogbadibo", "Ohimini", "Oju", "Okpokwu", "Otukpo", "Tarka", "Ukum", "Ushongo", "Vandeikya"],
  "Borno": ["Abadam", "Askira/Uba", "Bama", "Bayo", "Biu", "Chibok", "Damboa", "Dikwa", "Gubio", "Guzamala", "Gwoza", "Hawul", "Jere", "Kaga", "Kala/Balge", "Konduga", "Kukawa", "Kwaya Kusar", "Mafa", "Magumeri", "Maiduguri", "Marte", "Mobbar", "Monguno", "Ngala", "Nganzai", "Shani"],
  "Cross River": ["Abi", "Akamkpa", "Akpabuyo", "Bakassi", "Bekwarra", "Biase", "Boki", "Calabar Municipal", "Calabar South", "Etung", "Ikom", "Obanliku", "Obubra", "Obudu", "Odukpani", "Ogoja", "Yakuur", "Yala"],
  "Delta": ["Aniocha North", "Aniocha South", "Bomadi", "Burutu", "Ethiope East", "Ethiope West", "Ika North East", "Ika South", "Isoko North", "Isoko South", "Ndokwa East", "Ndokwa West", "Okpe", "Oshimili North", "Oshimili South", "Patani", "Sapele", "Udu", "Ughelli North", "Ughelli South", "Ukwuani", "Uvwie", "Warri North", "Warri South", "Warri South West"],
  "Ebonyi": ["Abakaliki", "Afikpo North", "Afikpo South", "Ebonyi", "Ezza North", "Ezza South", "Ikwo", "Ishielu", "Ivo", "Izzi", "Ohaozara", "Ohaukwu", "Onicha"],
  "Edo": ["Akoko-Edo", "Egor", "Esan Central", "Esan North-East", "Esan South-East", "Esan West", "Etsako Central", "Etsako East", "Etsako West", "Igueben", "Ikpoba Okha", "Oredo", "Orhionmwon", "Ovia North-East", "Ovia South-West", "Owan East", "Owan West", "Uhunmwonde"],
  "Ekiti": ["Ado Ekiti", "Efon", "Ekiti East", "Ekiti South-West", "Ekiti West", "Emure", "Gbonyin", "Ido Osi", "Ijero", "Ikere", "Ikole", "Ilejemeje", "Irepodun/Ifelodun", "Ise/Orun", "Moba", "Oye"],
  "Enugu": ["Aninri", "Awgu", "Enugu East", "Enugu North", "Enugu South", "Ezeagu", "Igbo Etiti", "Igbo Eze North", "Igbo Eze South", "Isi Uzo", "Nkanu East", "Nkanu West", "Nsukka", "Oji River", "Udenu", "Udi", "Uzo Uwani"],
  "FCT": ["Abaji", "Bwari", "Gwagwalada", "Kuje", "Kwali", "Municipal Area Council"],
  "Gombe": ["Akko", "Balanga", "Billiri", "Dukku", "Funakaye", "Gombe", "Kaltungo", "Kwami", "Nafada", "Shongom", "Yamaltu/Deba"],
  "Imo": ["Aboh Mbaise", "Ahiazu Mbaise", "Ehime Mbano", "Ezinihitte", "Ideato North", "Ideato South", "Ihitte/Uboma", "Ikeduru", "Isiala Mbano", "Isu", "Mbaitoli", "Ngor Okpala", "Njaba", "Nkwerre", "Nwangele", "Obowo", "Oguta", "Ohaji/Egbema", "Okigwe", "Onuimo", "Orlu", "Orsu", "Oru East", "Oru West", "Owerri Municipal", "Owerri North", "Owerri West"],
  "Jigawa": ["Auyo", "Babura", "Biriniwa", "Birnin Kudu", "Buji", "Dutse", "Gagarawa", "Garki", "Gumel", "Guri", "Gwaram", "Gwiwa", "Hadejia", "Jahun", "Kafin Hausa", "Kaugama", "Kazaure", "Kiri Kasama", "Kiyawa", "Maigatari", "Malam Madori", "Miga", "Ringim", "Roni", "Sule Tankarkar", "Taura", "Yankwashi"],
  "Kaduna": ["Birnin Gwari", "Chikun", "Giwa", "Igabi", "Ikara", "Jaba", "Jema'a", "Kachia", "Kaduna North", "Kaduna South", "Kagarko", "Kajuru", "Kaura", "Kauru", "Kubau", "Kudan", "Lere", "Makarfi", "Sabon Gari", "Sanga", "Soba", "Zangon Kataf", "Zaria"],
  "Kano": ["Ajingi", "Albasu", "Bagwai", "Bebeji", "Bichi", "Bunkure", "Dala", "Dambatta", "Dawakin Kudu", "Dawakin Tofa", "Doguwa", "Fagge", "Gabasawa", "Garko", "Garun Mallam", "Gaya", "Gezawa", "Gwale", "Gwarzo", "Kabo", "Kano Municipal", "Karaye", "Kibiya", "Kiru", "Kumbotso", "Kunchi", "Kura", "Madobi", "Makoda", "Minjibir", "Nasarawa", "Rano", "Rimin Gado", "Rogo", "Shanono", "Sumaila", "Takai", "Tarauni", "Tofa", "Tsanyawa", "Tudun Wada", "Ungogo", "Warawa", "Wudil"],
  "Katsina": ["Bakori", "Batagarawa", "Batsari", "Baure", "Bindawa", "Charanchi", "Dandume", "Danja", "Dan Musa", "Daura", "Dutsi", "Dutsin Ma", "Faskari", "Funtua", "Ingawa", "Jibia", "Kafur", "Kaita", "Kankara", "Kankia", "Katsina", "Kurfi", "Kusada", "Mai'Adua", "Malumfashi", "Mani", "Mashi", "Matazu", "Musawa", "Rimi", "Sabuwa", "Safana", "Sandamu", "Zango"],
  "Kebbi": ["Aleiro", "Arewa Dandi", "Argungu", "Augie", "Bagudo", "Birnin Kebbi", "Bunza", "Dandi", "Fakai", "Gwandu", "Jega", "Kalgo", "Koko/Besse", "Maiyama", "Ngaski", "Sakaba", "Shanga", "Suru", "Wasagu/Danko", "Yauri", "Zuru"],
  "Kogi": ["Adavi", "Ajaokuta", "Ankpa", "Bassa", "Dekina", "Ibaji", "Idah", "Igalamela Odolu", "Ijumu", "Kabba/Bunu", "Kogi", "Lokoja", "Mopa Muro", "Ofu", "Ogori/Magongo", "Okehi", "Okene", "Olamaboro", "Omala", "Yagba East", "Yagba West"],
  "Kwara": ["Asa", "Baruten", "Edu", "Ekiti", "Ifelodun", "Ilorin East", "Ilorin South", "Ilorin West", "Irepodun", "Isin", "Kaiama", "Moro", "Offa", "Oke Ero", "Oyun", "Pategi"],
  "Lagos": ["Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa", "Badagry", "Epe", "Eti-Osa", "Ibeju-Lekki", "Ifako-Ijaiye", "Ikeja", "Ikorodu", "Kosofe", "Lagos Island", "Lagos Mainland", "Mushin", "Ojo", "Oshodi-Isolo", "Shomolu", "Surulere"],
  "Nasarawa": ["Akwanga", "Awe", "Doma", "Karu", "Keana", "Keffi", "Kokona", "Lafia", "Nasarawa", "Nasarawa Egon", "Obi", "Toto", "Wamba"],
  "Niger": ["Agaie", "Agwara", "Bida", "Borgu", "Bosso", "Chanchaga", "Edati", "Gbako", "Gurara", "Katcha", "Kontagora", "Lapai", "Lavun", "Magama", "Mariga", "Mashegu", "Mokwa", "Moya", "Paikoro", "Rafi", "Rijau", "Shiroro", "Suleja", "Tafa", "Wushishi"],
  "Ogun": ["Abeokuta North", "Abeokuta South", "Ado-Odo/Ota", "Egbado North", "Egbado South", "Ewekoro", "Ifo", "Ijebu East", "Ijebu North", "Ijebu North East", "Ijebu Ode", "Ikenne", "Imeko Afon", "Ipokia", "Obafemi Owode", "Odeda", "Odogbolu", "Ogun Waterside", "Remo North", "Shagamu"],
  "Ondo": ["Akoko North-East", "Akoko North-West", "Akoko South-East", "Akoko South-West", "Akure North", "Akure South", "Ese Odo", "Idanre", "Ifedore", "Ilaje", "Ile Oluji/Okeigbo", "Irele", "Odigbo", "Okitipupa", "Ondo East", "Ondo West", "Ose", "Owo"],
  "Osun": ["Aiyedaade", "Aiyedire", "Atakumosa East", "Atakumosa West", "Boluwaduro", "Boripe", "Ede North", "Ede South", "Egbedore", "Ejigbo", "Ife Central", "Ife East", "Ife North", "Ife South", "Ifedayo", "Ifelodun", "Ila", "Ilesa East", "Ilesa West", "Irepodun", "Irewole", "Isokan", "Iwo", "Obokun", "Odo Otin", "Ola Oluwa", "Olorunda", "Oriade", "Orolu", "Osogbo"],
  "Oyo": ["Afijio", "Akinyele", "Atiba", "Atisbo", "Egbeda", "Ibadan North", "Ibadan North-East", "Ibadan North-West", "Ibadan South-East", "Ibadan South-West", "Ibarapa Central", "Ibarapa East", "Ibarapa North", "Ido", "Irepo", "Iseyin", "Itesiwaju", "Iwajowa", "Kajola", "Lagelu", "Ogbomosho North", "Ogbomosho South", "Ogo Oluwa", "Olorunsogo", "Oluyole", "Ona Ara", "Orelope", "Ori Ire", "Oyo East", "Oyo West", "Saki East", "Saki West", "Surulere"],
  "Plateau": ["Barkin Ladi", "Bassa", "Bokkos", "Jos East", "Jos North", "Jos South", "Kanam", "Kanke", "Langtang North", "Langtang South", "Mangu", "Mikang", "Pankshin", "Qua'an Pan", "Riyom", "Shendam", "Wase"],
  "Rivers": ["Abua/Odual", "Ahoada East", "Ahoada West", "Akuku-Toru", "Andoni", "Asari-Toru", "Bonny", "Degema", "Eleme", "Emohua", "Etche", "Gokana", "Ikwerre", "Khana", "Obio/Akpor", "Ogba/Egbema/Ndoni", "Ogu/Bolo", "Okrika", "Omuma", "Opobo/Nkoro", "Oyigbo", "Port Harcourt", "Tai"],
  "Sokoto": ["Binji", "Bodinga", "Dange Shuni", "Gada", "Goronyo", "Gudu", "Gwadabawa", "Illela", "Isa", "Kebbe", "Kware", "Rabah", "Sabon Birni", "Shagari", "Silame", "Sokoto North", "Sokoto South", "Tambuwal", "Tangaza", "Tureta", "Wamako", "Wurno", "Yabo"],
  "Taraba": ["Ardo Kola", "Bali", "Donga", "Gashaka", "Gassol", "Ibi", "Jalingo", "Karim Lamido", "Kumi", "Lau", "Sardauna", "Takum", "Ussa", "Wukari", "Yorro", "Zing"],
  "Yobe": ["Bade", "Bursari", "Damaturu", "Fika", "Fune", "Geidam", "Gujba", "Gulani", "Jakusko", "Karasuwa", "Machina", "Nangere", "Nguru", "Potiskum", "Tarmuwa", "Yunusari", "Yusufari"],
  "Zamfara": ["Anka", "Bakura", "Birnin Magaji/Kiyaw", "Bukkuyum", "Bungudu", "Gummi", "Gusau", "Kaura Namoda", "Maradun", "Maru", "Shinkafi", "Talata Mafara", "Chafe", "Zurmi"]
};

// Populate state and LGA dropdowns
const stateSelect = document.getElementById('reg-state');
const lgaSelect = document.getElementById('reg-lga');
if (stateSelect && lgaSelect) {
  stateSelect.innerHTML = '<option value="">Select State</option>' +
    Object.keys(statesAndLGAs).map(state => `<option value="${state}">${state}</option>`).join('');
  stateSelect.onchange = function() {
    const lgas = statesAndLGAs[this.value] || [];
    lgaSelect.innerHTML = '<option value="">Select LGA</option>' +
      lgas.map(lga => `<option value="${lga}">${lga}</option>`).join('');
  };
} 


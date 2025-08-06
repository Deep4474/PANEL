// --- Supabase Client Setup ---
// Replace with your actual Supabase project URL and anon key
const SUPABASE_URL = 'https://jlwxkykznyjmstpjcgks.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsd3hreWt6bnlqbXN0cGpjZ2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMTAxNDIsImV4cCI6MjA2OTg4NjE0Mn0.C86cvOOT5QI0PSHlPMujivWV8NLWMtgNiX8KrglzhIQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Example: Fetch products directly from Supabase
async function fetchProductsFromSupabase() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: false });
  if (error) {
    console.error('Supabase fetch error:', error);
    return [];
  }
  return data;
}

let products = [];
let orders = [];
let users = [];

function showSection(sectionId, title) {
  document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
  document.getElementById(sectionId).style.display = 'block';
  document.getElementById('main-title').textContent = title;
  document.getElementById('add-product-btn').style.display = (sectionId === 'products-section') ? 'inline-block' : 'none';
  document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
  const navId = 'nav-' + sectionId.replace('-section','');
  const navLink = document.getElementById(navId);
  if (navLink) navLink.classList.add('active');
}

document.addEventListener('DOMContentLoaded', function() {
  // Sidebar navigation
  document.getElementById('nav-dashboard').onclick = e => { e.preventDefault(); showSection('dashboard-section', 'Dashboard'); };
  document.getElementById('nav-products').onclick = e => { e.preventDefault(); showSection('products-section', 'Products'); loadProducts(); };
  document.getElementById('nav-orders').onclick = e => { e.preventDefault(); showSection('orders-section', 'Orders'); loadOrders(); };
  document.getElementById('nav-users').onclick = e => { e.preventDefault(); showSection('users-section', 'Users'); loadUsers(); };
  document.getElementById('nav-sms').onclick = e => { e.preventDefault(); showSection('sms-section', 'SMS'); loadSMSHistory(); };
  document.getElementById('nav-settings').onclick = e => { e.preventDefault(); showSection('settings-section', 'Settings'); loadUpdates(); };
  document.getElementById('nav-logout').onclick = e => { e.preventDefault(); localStorage.clear(); window.location.reload(); };

  showSection('dashboard-section', 'Dashboard');

  // Product Modal logic (new modal)
  const addProductBtn = document.getElementById('add-product-btn');
  const productModal = document.getElementById('product-modal');
  const closeProductModal = document.getElementById('close-product-modal');
  const productForm = document.getElementById('product-form');

  if (addProductBtn && productModal && closeProductModal) {
    addProductBtn.addEventListener('click', function() {
      productModal.style.display = 'flex';
    });
    closeProductModal.addEventListener('click', function() {
      productModal.style.display = 'none';
    });
    productModal.addEventListener('click', function(e) {
      if (e.target === productModal) productModal.style.display = 'none';
    });
  }

  if (productForm) {
    // Image preview logic
    const imageInput = document.getElementById('product-image');
    let previewImg = document.getElementById('product-image-preview');
    if (!previewImg) {
      previewImg = document.createElement('img');
      previewImg.id = 'product-image-preview';
      previewImg.style.maxWidth = '120px';
      previewImg.style.maxHeight = '80px';
      previewImg.style.display = 'block';
      previewImg.style.margin = '0.5em 0';
      imageInput.parentElement.appendChild(previewImg);
    }
    imageInput.onchange = function() {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          previewImg.src = e.target.result;
          previewImg.style.display = 'block';
        };
        reader.readAsDataURL(this.files[0]);
      } else {
        previewImg.style.display = 'none';
      }
    };

    productForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = document.getElementById('product-name').value.trim();
      const price = parseFloat(document.getElementById('product-price').value);
      const category = document.getElementById('product-category').value.trim();
      const description = document.getElementById('product-description').value.trim();
      const stock = parseInt(document.getElementById('product-stock').value, 10);
      const imageInput = document.getElementById('product-image');
      const file = imageInput.files[0];
      if (!name || isNaN(price) || !category || !description || isNaN(stock) || !file) {
        alert('Please fill in all fields correctly and select an image.');
        return;
      }
      // Upload image to an image host (imgbb, cloudinary, etc.) or use a direct URL. For demo, use base64 as fallback.
      const reader = new FileReader();
      reader.onload = async function(event) {
        // In production, upload to a real image host and use the returned URL.
        // For now, store as base64 data URL (not recommended for real apps, but works for demo/testing)
        const imageUrl = event.target.result;
        try {
          const response = await fetch(`${API_BASE_URL}/api/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price, category, description, stock, images: [imageUrl] })
          });
          const data = await response.json();
          if (data.success) {
            alert('Product added successfully!');
            productModal.style.display = 'none';
            productForm.reset();
            previewImg.style.display = 'none';
            loadProducts();
          } else {
            alert(data.message || 'Failed to add product.');
          }
        } catch (err) {
          alert('Error adding product.');
        }
      };
      reader.readAsDataURL(file);
    });
  }
});


// --- Supabase: Load Products ---
async function loadProducts() {
  try {
    products = await fetchProductsFromSupabase();
    displayProducts();
  } catch (error) {
    document.getElementById('products-table-container').innerHTML = '<div class="error">Failed to load products</div>';
  }
}

function displayProducts() {
  const container = document.getElementById('products-table-container');
  if (!container) return;
  if (!products.length) {
    container.innerHTML = '<div class="info">No products found</div>';
    return;
  }
  let html = `<table><thead><tr>
    <th>ID</th><th>Name</th><th>Price</th><th>Category</th><th>Description</th><th>Stock</th><th>Image</th><th>Action</th>
  </tr></thead><tbody>`;
  products.forEach(product => {
    const prodId = product._id || product.id || '';
    html += `<tr>
      <td>${prodId}</td>
      <td>${product.name || ''}</td>
      <td>₦${product.price?.toLocaleString() || ''}</td>
      <td>${product.category || ''}</td>
      <td>${product.description || product.desc || ''}</td>
      <td>${product.stock || ''}</td>
      <td><img src="${product.images && product.images[0] || product.imageUrl || ''}" alt="Product Image" style="max-width:60px;max-height:40px;object-fit:cover;" /></td>
      <td>
        <button class="btn btn-danger btn-delete-product" data-id="${prodId}">Delete</button>
        <button class="btn btn-primary btn-edit-product" data-id="${prodId}">Edit</button>
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
  // Attach event listeners for edit/delete buttons
  container.querySelectorAll('.btn-delete-product').forEach(btn => {
    btn.onclick = async function() {
      const id = this.getAttribute('data-id');
      if (!confirm('Are you sure you want to delete this product?')) return;
      // ...existing code for delete...
    };
  });
  container.querySelectorAll('.btn-edit-product').forEach(btn => {
    btn.onclick = function() {
      const id = this.getAttribute('data-id');
      window.editProduct(id);
    };
  });
}


// --- Ensure admin receives order notifications ---
// This function can be called after a successful order placement (from user site, not admin panel)
// It triggers the backend to send an email to admin (backend must support this endpoint)
async function notifyAdminOfOrder(order) {
  try {
    await fetch(`${API_BASE_URL}/api/notify-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order })
    });
  } catch (e) {
    // Optionally log error
  }
}

window.editProduct = function(id) {
  // Find product by id
  const product = products.find(p => String(p._id || p.id) === String(id));
  if (!product) {
    alert('Product not found.');
    return;
  }
  // Show edit modal
  let modal = document.getElementById('edit-product-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'edit-product-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.4)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
      <form id="edit-product-form" style="background:#fff;padding:2em;border-radius:8px;min-width:320px;max-width:95vw;box-shadow:0 2px 12px #0002;position:relative;">
        <h2>Edit Product</h2>
        <label>Name:<br><input type="text" id="edit-product-name" required></label><br>
        <label>Price:<br><input type="number" id="edit-product-price" required></label><br>
        <label>Category:<br><input type="text" id="edit-product-category" required></label><br>
        <label>Description:<br><textarea id="edit-product-description" required></textarea></label><br>
        <label>Stock:<br><input type="number" id="edit-product-stock" required></label><br>
        <label>Image URL:<br><input type="text" id="edit-product-imageUrl" required></label><br>
        <div style="margin-top:1em;text-align:right;">
          <button type="button" id="close-edit-product-modal" style="margin-right:1em;">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    `;
    document.body.appendChild(modal);
  } else {
    modal.style.display = 'flex';
  }
  // Prefill form, but only if modal and fields exist
  const nameField = document.getElementById('edit-product-name');
  const priceField = document.getElementById('edit-product-price');
  const categoryField = document.getElementById('edit-product-category');
  const descField = document.getElementById('edit-product-description');
  const stockField = document.getElementById('edit-product-stock');
  const imageUrlField = document.getElementById('edit-product-imageUrl');
  if (!nameField || !priceField || !categoryField || !descField || !stockField || !imageUrlField) {
    alert('Edit form fields not found. Please reload the page.');
    return;
  }
  nameField.value = product.name || '';
  priceField.value = product.price || '';
  categoryField.value = product.category || '';
  descField.value = product.description || product.desc || '';
  stockField.value = product.stock || '';
  imageUrlField.value = (product.images && product.images[0]) || product.imageUrl || '';
  // Close modal logic
  document.getElementById('close-edit-product-modal').onclick = function() {
    modal.style.display = 'none';
  };
  modal.onclick = function(e) {
    if (e.target === modal) modal.style.display = 'none';
  };
  // Handle form submit
  document.getElementById('edit-product-form').onsubmit = async function(e) {
    e.preventDefault();
    const name = document.getElementById('edit-product-name').value.trim();
    const price = parseFloat(document.getElementById('edit-product-price').value);
    const category = document.getElementById('edit-product-category').value.trim();
    const description = document.getElementById('edit-product-description').value.trim();
    const stock = parseInt(document.getElementById('edit-product-stock').value, 10);
    const imageUrl = document.getElementById('edit-product-imageUrl').value.trim();
    if (!name || isNaN(price) || !category || !description || isNaN(stock) || !imageUrl) {
      alert('Please fill in all fields correctly.');
      return;
    }
    // PATCH request to backend
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, category, description, stock, images: [imageUrl] })
      });
      const data = await response.json();
      if (data.success) {
        alert('Product updated successfully!');
        modal.style.display = 'none';
        loadProducts();
      } else {
        alert(data.message || 'Failed to update product.');
      }
    } catch (err) {
      alert('Error updating product.');
    }
  };
};


// --- Supabase: Load Orders ---
async function loadOrders() {
  try {
    // Fetch products for mapping productId to name
    const { data: productsList, error: prodErr } = await supabase.from('products').select('*');
    const { data: ordersData, error: ordersErr } = await supabase.from('orders').select('*');
    if (prodErr || ordersErr) throw new Error('Failed to fetch orders or products');
    orders = ordersData;
    displayOrders(productsList);
  } catch (error) {
    document.getElementById('orders-table-container').innerHTML = '<div class="error">Failed to load orders</div>';
  }
}

function displayOrders(productsList = []) {
  const container = document.getElementById('orders-table-container');
  if (!container) return;
  const getProductName = (id) => {
    const p = productsList.find(pr => String(pr.id) === String(id));
    return p ? p.name : id;
  };
  if (!orders.length) {
    container.innerHTML = '<div class="info">No orders found</div>';
    return;
  }
  let html = `<table><thead><tr>
    <th>ID</th><th>Product</th><th>Qty</th><th>Customer</th><th>Phone</th><th>Address</th><th>Delivery</th><th>Payment</th><th>Status</th><th>Date</th><th>Action</th>
  </tr></thead><tbody>`;
  orders.forEach(order => {
    html += `<tr>
      <td>${order.id || ''}</td>
      <td>${getProductName(order.productId) || ''}</td>
      <td>${order.quantity || ''}</td>
      <td>${order.email || ''}</td>
      <td>${order.phone || ''}</td>
      <td>${order.address || ''}</td>
      <td>${order.deliveryMethod || ''}</td>
      <td>${order.paymentMethod || ''}</td>
      <td>${order.status || 'pending'}</td>
      <td>${order.date ? new Date(order.date).toLocaleString() : ''}</td>
      <td>
        <select class="order-status-select">
          <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
          <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
          <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
          <option value="rejected" ${order.status === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select>
        <button class="btn btn-success btn-update-status" data-id="${order.id}">Update</button>
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
  // Add event listeners for update buttons
  container.querySelectorAll('.btn-update-status').forEach(btn => {
    btn.onclick = async function() {
      const id = this.getAttribute('data-id');
      const select = this.parentElement.querySelector('.order-status-select');
      const status = select.value;
      // ...existing code for update status...
    };
  });
}


// --- Supabase: Load Users ---
async function loadUsers() {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    users = data;
    displayUsers();
  } catch (error) {
    document.getElementById('users-table-container').innerHTML = '<div class="error">Failed to load users</div>';
  }
}

function displayUsers() {
  const container = document.getElementById('users-table-container');
  if (!container) return;
  if (!users.length) {
    container.innerHTML = '<div class="info">No users found</div>';
    return;
  }
  let html = `<table><thead><tr>
    <th>Name</th><th>Email</th><th>Verified</th>
  </tr></thead><tbody>`;
  users.forEach(user => {
    html += `<tr>
      <td>${user.name || ''}</td>
      <td>${user.email || ''}</td>
      <td>${user.verified ? 'Yes' : 'No'}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}


// --- Supabase: Load Updates ---
async function loadUpdates() {
  const updatesList = document.getElementById('updates-list');
  updatesList.innerHTML = '<li>Loading...</li>';
  try {
    const { data, error } = await supabase.from('updates').select('*').order('date', { ascending: false });
    if (error || !data || !data.length) {
      updatesList.innerHTML = '<li>No updates yet.</li>';
      return;
    }
    updatesList.innerHTML = data.map(u => `<li><b>${new Date(u.date).toLocaleString()}:</b> ${u.message}</li>`).join('');
  } catch {
    updatesList.innerHTML = '<li>Failed to load updates.</li>';
  }
}

const sendUpdateForm = document.getElementById('send-update-form');
if (sendUpdateForm) {
  sendUpdateForm.onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('update-message').value.trim();
    if (!msg) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('update-message').value = '';
        loadUpdates();
        alert('Update sent!');
      } else {
        alert(data.error || 'Failed to send update.');
      }
    } catch {
      alert('Failed to send update.');
    }
  };
}

// SMS Functionality
document.addEventListener('DOMContentLoaded', function() {
  // SMS form handling
  const smsForm = document.getElementById('send-sms-form');
  const smsRecipients = document.getElementById('sms-recipients');
  const customNumbersGroup = document.getElementById('custom-numbers-group');
  const smsMessage = document.getElementById('sms-message');
  const smsCharCount = document.getElementById('sms-char-count');

  // Show/hide custom numbers input based on selection
  if (smsRecipients) {
    smsRecipients.addEventListener('change', function() {
      if (this.value === 'custom') {
        customNumbersGroup.style.display = 'block';
      } else {
        customNumbersGroup.style.display = 'none';
      }
    });
  }

  // Character count for SMS message
  if (smsMessage && smsCharCount) {
    smsMessage.addEventListener('input', function() {
      const count = this.value.length;
      smsCharCount.textContent = `${count}/160 characters`;
      smsCharCount.className = '';
      
      if (count > 140) {
        smsCharCount.classList.add('warning');
      }
      if (count > 155) {
        smsCharCount.classList.add('danger');
      }
    });
  }

  // SMS form submission
  if (smsForm) {
    smsForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const recipients = smsRecipients.value;
      const customNumbers = document.getElementById('custom-phone-numbers').value;
      const message = smsMessage.value.trim();
      
      if (!recipients || !message) {
        alert('Please select recipients and enter a message.');
        return;
      }
      
      if (recipients === 'custom' && !customNumbers.trim()) {
        alert('Please enter phone numbers for custom recipients.');
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/sms/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipients,
            customNumbers: recipients === 'custom' ? customNumbers : '',
            message
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          alert('SMS sent successfully!');
          smsForm.reset();
          smsCharCount.textContent = '0/160 characters';
          customNumbersGroup.style.display = 'none';
          loadSMSHistory();
        } else {
          alert(data.error || 'Failed to send SMS.');
        }
      } catch (error) {
        alert('Error sending SMS. Please try again.');
      }
    });
  }
});


// --- Supabase: Load SMS History ---
async function loadSMSHistory() {
  try {
    const { data, error } = await supabase.from('sms_history').select('*').order('date', { ascending: false });
    if (error) throw error;
    displaySMSHistory(data || []);
  } catch (error) {
    document.getElementById('sms-history-list').innerHTML = '<p>Failed to load SMS history.</p>';
  }
}

function displaySMSHistory(history) {
  const historyContainer = document.getElementById('sms-history-list');
  if (!historyContainer) return;
  if (!history || !history.length) {
    historyContainer.innerHTML = '<p>No SMS sent yet.</p>';
    return;
  }
  historyContainer.innerHTML = history.map(sms => `
    <div class="sms-history-item">
      <h4>${sms.recipients === 'all' ? 'All Users' : 'Custom Numbers'}</h4>
      <p><strong>Message:</strong> ${sms.message}</p>
      <p><strong>Date:</strong> ${new Date(sms.date).toLocaleString()}</p>
      <p><strong>Status:</strong> <span class="status ${sms.status === 'sent' ? 'success' : 'error'}">${sms.status}</span></p>
      ${sms.error ? `<p><strong>Error:</strong> ${sms.error}</p>` : ''}
    </div>
  `).join('');
}

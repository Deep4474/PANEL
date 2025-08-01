let products = [];
let orders = [];
let users = [];

function showSection(sectionId, title) {
  document.querySelectorAll('.admin-section').forEach(sec => sec.style.display = 'none');
  document.getElementById(sectionId).style.display = 'block';
  document.getElementById('admin-title').textContent = title;
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

  // Add Product Modal logic
  const addProductBtn = document.getElementById('add-product-btn');
  const addProductModal = document.getElementById('add-product-modal');
  const closeAddProductModal = document.getElementById('close-add-product-modal');
  const addProductForm = document.getElementById('add-product-form');

  if (addProductBtn && addProductModal && closeAddProductModal) {
    addProductBtn.addEventListener('click', function() {
      addProductModal.style.display = 'flex';
    });
    closeAddProductModal.addEventListener('click', function() {
      addProductModal.style.display = 'none';
    });
    addProductModal.addEventListener('click', function(e) {
      if (e.target === addProductModal) addProductModal.style.display = 'none';
    });
  }

  if (addProductForm) {
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

    addProductForm.addEventListener('submit', async function(e) {
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
      const reader = new FileReader();
      reader.onload = async function(event) {
        const imageUrl = event.target.result;
        try {
          const response = await fetch(`${API_BASE_URL}/api/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price, category, description, stock, imageUrl })
          });
          const data = await response.json();
          if (data.success) {
            alert('Product added successfully!');
            addProductModal.style.display = 'none';
            addProductForm.reset();
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

async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/products`);
    products = await response.json();
    displayProducts();
  } catch (error) {
    document.getElementById('products-body').innerHTML = '<tr><td colspan="8">Failed to load products</td></tr>';
  }
}

function displayProducts() {
  const tbody = document.getElementById('products-body');
  tbody.innerHTML = '';
  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="8">No products found</td></tr>';
    return;
  }
  products.forEach(product => {
    const prodId = product._id || product.id || '';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${prodId}</td>
      <td>${product.name || ''}</td>
      <td>₦${product.price?.toLocaleString() || ''}</td>
      <td>${product.category || ''}</td>
      <td>${product.description || product.desc || ''}</td>
      <td>${product.stock || ''}</td>
      <td><img src="${product.images && product.images[0] || product.imageUrl || ''}" alt="Product Image" style="max-width:60px;max-height:40px;object-fit:cover;" /></td>
      <td>
        <button class="btn btn-danger" onclick="deleteProduct('${prodId}')">Delete</button>
        <button class="btn btn-primary" onclick="editProduct('${prodId}')">Edit</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

window.deleteProduct = async function(id) {
  if (!id) {
    alert('Invalid product ID.');
    return;
  }
  if (!confirm('Are you sure you want to delete this product?')) return;
  try {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, { method: 'DELETE' });
    const data = await response.json();
    if (data.success) {
      alert('Product deleted successfully!');
      loadProducts();
    } else {
      alert(data.message || 'Failed to delete product.');
    }
  } catch (err) {
    alert('Error deleting product.');
  }
}

window.editProduct = function(id) {
  const product = products.find(p => String(p.id) === String(id) || String(p._id) === String(id));
  if (!product) return alert('Product not found.');
  const modal = document.getElementById('edit-product-modal');
  const form = document.getElementById('edit-product-form');
  const closeBtn = document.getElementById('close-edit-product-modal');
  const nameInput = document.getElementById('edit-product-name');
  const priceInput = document.getElementById('edit-product-price');
  const categoryInput = document.getElementById('edit-product-category');
  const descInput = document.getElementById('edit-product-description');
  const stockInput = document.getElementById('edit-product-stock');
  const imageInput = document.getElementById('edit-product-image');
  const previewImg = document.getElementById('edit-product-image-preview');

  nameInput.value = product.name || '';
  priceInput.value = product.price || '';
  categoryInput.value = product.category || '';
  descInput.value = product.description || product.desc || '';
  stockInput.value = product.stock || '';
  previewImg.src = (product.images && product.images[0]) || product.imageUrl || '';
  previewImg.style.display = previewImg.src ? 'block' : 'none';
  imageInput.value = '';

  modal.classList.remove('hidden');
  modal.style.display = 'block';

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

  closeBtn.onclick = () => {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  };

  form.onsubmit = async function(e) {
    e.preventDefault();
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    const category = categoryInput.value.trim();
    const description = descInput.value.trim();
    const stock = parseInt(stockInput.value, 10);
    let imageUrl = previewImg.src;
    if (imageInput.files[0]) {
      const reader = new FileReader();
      reader.onload = async function(event) {
        imageUrl = event.target.result;
        await saveEdit();
      };
      reader.readAsDataURL(imageInput.files[0]);
      return;
    } else {
      await saveEdit();
    }
    async function saveEdit() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, price, category, description, stock, imageUrl })
        });
        const data = await response.json();
        if (data.success) {
          alert('Product updated successfully!');
          modal.classList.add('hidden');
          modal.style.display = 'none';
          loadProducts();
        } else {
          alert(data.message || 'Failed to update product.');
        }
      } catch (err) {
        alert('Error updating product.');
      }
    }
  };
};

async function loadOrders() {
  try {
    // Fetch products for mapping productId to name
    const prodRes = await fetch(`${API_BASE_URL}/api/products`);
    const productsList = await prodRes.json();
    const response = await fetch(`${API_BASE_URL}/api/orders`);
    orders = await response.json();
    displayOrders(productsList);
  } catch (error) {
    document.getElementById('orders-body').innerHTML = '<tr><td colspan="11">Failed to load orders</td></tr>';
  }
}

function displayOrders(productsList = []) {
  const tbody = document.getElementById('orders-body');
  tbody.innerHTML = '';
  const getProductName = (id) => {
    const p = productsList.find(pr => String(pr.id) === String(id));
    return p ? p.name : id;
  };
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="11">No orders found</td></tr>';
    return;
  }
  // Add a label above the table
  const ordersSection = document.getElementById('orders-section');
  let infoLabel = document.getElementById('admin-orders-info-label');
  if (!infoLabel) {
    infoLabel = document.createElement('div');
    infoLabel.id = 'admin-orders-info-label';
    infoLabel.style.margin = '0 0 1em 0';
    infoLabel.style.fontSize = '1.05em';
    infoLabel.style.color = '#444';
    infoLabel.textContent = 'This section shows all orders sent to admin by users. You can view details and take action (update status) for each order.';
    ordersSection.insertBefore(infoLabel, ordersSection.querySelector('table'));
  }
  orders.forEach(order => {
    const row = document.createElement('tr');
    row.innerHTML = `
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
    `;
    tbody.appendChild(row);
  });
  // Add event listeners for update buttons
  tbody.querySelectorAll('.btn-update-status').forEach(btn => {
    btn.onclick = async function() {
      const id = this.getAttribute('data-id');
      const select = this.parentElement.querySelector('.order-status-select');
      const status = select.value;
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (data.success) {
          alert('Order status updated!');
          loadOrders();
        } else {
          alert(data.error || 'Failed to update order.');
        }
      } catch {
        alert('Failed to update order.');
      }
    };
  });
}

async function loadUsers() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users`);
    users = await response.json();
    displayUsers();
  } catch (error) {
    document.getElementById('users-body').innerHTML = '<tr><td colspan="3">Failed to load users</td></tr>';
  }
}

function displayUsers() {
  const tbody = document.getElementById('users-body');
  tbody.innerHTML = '';
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="3">No users found</td></tr>';
    return;
  }
  users.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.name || ''}</td>
      <td>${user.email || ''}</td>
      <td>${user.verified ? 'Yes' : 'No'}</td>
    `;
    tbody.appendChild(row);
  });
}

function loadUpdates() {
  const updatesList = document.getElementById('updates-list');
  updatesList.innerHTML = '<li>Loading...</li>';
  fetch(`${API_BASE_URL}/api/updates`)
    .then(res => res.json())
    .then(updates => {
      if (!updates.length) {
        updatesList.innerHTML = '<li>No updates yet.</li>';
        return;
      }
      updatesList.innerHTML = updates.map(u => `<li><b>${new Date(u.date).toLocaleString()}:</b> ${u.message}</li>`).join('');
    })
    .catch(() => {
      updatesList.innerHTML = '<li>Failed to load updates.</li>';
    });
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

async function loadSMSHistory() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sms/history`);
    const history = await response.json();
    displaySMSHistory(history);
  } catch (error) {
    document.getElementById('sms-history').innerHTML = '<p>Failed to load SMS history.</p>';
  }
}

function displaySMSHistory(history) {
  const historyContainer = document.getElementById('sms-history');
  
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
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 4003;
const JWT_SECRET = process.env.JWT_SECRET || 'demo_jwt_secret';

// Data file paths
const usersFile = path.join(__dirname, 'users.json');
const productsFile = path.join(__dirname, 'products.json');
const ordersFile = path.join(__dirname, 'orders.json');
const updatesFile = path.join(__dirname, 'updates.json');
const notificationsFile = path.join(__dirname, 'customerMessages.json');
const smsHistoryFile = path.join(__dirname, 'smsHistory.json');

// Middleware
app.use(cors({
  origin: [
    'https://deep4474.github.io',
    'http://localhost:3000',
    'https://glittery-torrone-d1184e.netlify.app',
    'http://godsownpane.netlify.app',
    'https://godsownpane.netlify.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Helper functions
function safeRead(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
}
function safeWrite(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Nodemailer transporter (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // set in Render env vars
    pass: process.env.EMAIL_PASS  // set in Render env vars
  }
});

// Twilio client for SMS
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const twilioClient = require('twilio')(accountSid, authToken);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Define admin phone numbers
const ADMIN_PHONES = ['+12512946765', '+2349138154963'];

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || '';
if (MONGO_URI) {
  mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
    })
    .catch(err => {
    });
}

// Product Schema
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  description: String,
  stock: Number,
  images: [String]
});
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  productId: mongoose.Schema.Types.Mixed,
  quantity: Number,
  address: String,
  phone: String,
  email: String,
  deliveryMethod: String,
  paymentMethod: String,
  status: { type: String, default: 'pending' },
  date: { type: Date, default: Date.now }
});
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// --- Auth Endpoints ---
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, confirmPassword, state, lga, address } = req.body;
  if (!name || !email || !password || !confirmPassword || !state || !lga || !address)
    return res.status(400).json({ error: 'Missing fields' });
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });
  const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
  if (!strongPassword.test(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include a number, an uppercase letter, and a symbol.' });
  }
  let users = safeRead(usersFile);
  if (users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered' });
  const hashed = await bcrypt.hash(password, 10);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const user = { name, email, password: hashed, verified: false, code, state, lga, address };
  users.push(user);
  safeWrite(usersFile, users);
  try {
    await transporter.sendMail({
      from: `GOD'S OWN PHONE GADGET <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Verification Code',
      text: `Your verification code is: ${code}`,
      html: `<p>Your verification code is: <b>${code}</b></p>`
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send verification email.' });
  }
  res.json({ user: { name, email }, message: 'Registered. Check your email for the code.' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  let users = safeRead(usersFile);
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.verified) return res.status(403).json({ error: 'Please verify your email.' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ user: { name: user.name, email: user.email }, token });
});

app.post('/api/auth/verify', (req, res) => {
  const { email, code } = req.body;
  let users = safeRead(usersFile);
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: 'User not found' });
  if (user.verified) return res.json({ success: true, message: 'Already verified' });
  if (user.code !== code) return res.status(400).json({ error: 'Invalid code' });
  user.verified = true;
  user.code = undefined;
  safeWrite(usersFile, users);
  res.json({ success: true, message: 'Email verified' });
});

app.get('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let users = safeRead(usersFile);
    const user = users.find(u => u.email === decoded.email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ name: user.name, email: user.email, verified: user.verified });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

app.delete('/api/auth/user', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  let users = safeRead(usersFile);
  const initialLength = users.length;
  users = users.filter(u => u.email !== email);
  if (users.length === initialLength) {
    return res.status(404).json({ error: 'User not found' });
  }
  safeWrite(usersFile, users);
  res.json({ success: true, message: `User ${email} deleted.` });
});

// --- Products ---
app.get('/api/products', async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    const products = await Product.find();
    return res.json(products);
  }
  res.json(safeRead(productsFile));
});
app.post('/api/products', async (req, res) => {
  const { name, price, category, description, stock, imageUrl } = req.body;
  if (!name || !price || !category || !description || !stock || !imageUrl) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (mongoose.connection.readyState === 1) {
    const newProduct = new Product({
      name, price, category, description, stock, images: [imageUrl]
    });
    await newProduct.save();
    return res.json({ success: true, product: newProduct });
  }
  const products = safeRead(productsFile);
  const newProduct = {
    id: Date.now(),
    name,
    price,
    category,
    description,
    stock,
    images: [imageUrl]
  };
  products.push(newProduct);
  safeWrite(productsFile, products);
  res.json({ success: true, product: newProduct });
});
app.patch('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, category, description, stock, imageUrl } = req.body;
  if (mongoose.connection.readyState === 1) {
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (name) product.name = name;
    if (price) product.price = price;
    if (category) product.category = category;
    if (description) product.description = description;
    if (stock) product.stock = stock;
    if (imageUrl) product.images = [imageUrl];
    await product.save();
    return res.json({ success: true, product });
  }
  let products = safeRead(productsFile);
  const product = products.find(p => String(p.id) === String(id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (name) product.name = name;
  if (price) product.price = price;
  if (category) product.category = category;
  if (description) product.description = description;
  if (stock) product.stock = stock;
  if (imageUrl) product.images = [imageUrl];
  safeWrite(productsFile, products);
  res.json({ success: true, product });
});
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  if (mongoose.connection.readyState === 1) {
    const result = await Product.findByIdAndDelete(id);
    if (!result) return res.status(404).json({ error: 'Product not found' });
    return res.json({ success: true });
  }
  let products = safeRead(productsFile);
  const initialLength = products.length;
  products = products.filter(p => String(p.id) !== String(id));
  if (products.length === initialLength) {
    return res.status(404).json({ error: 'Product not found' });
  }
  safeWrite(productsFile, products);
  res.json({ success: true });
});

// --- Orders ---
app.post('/api/orders', async (req, res) => {
  const { productId, quantity, address, phone, email, deliveryMethod, paymentMethod } = req.body;
  if (!productId || !quantity || !phone || !email || !deliveryMethod || !paymentMethod) {
    return res.status(400).json({ error: 'Missing order details' });
  }
  if (deliveryMethod === 'Deliver' && !address) {
    return res.status(400).json({ error: 'Address required for delivery' });
  }
  if (mongoose.connection.readyState === 1) {
    const newOrder = new Order({
      productId, quantity, address: deliveryMethod === 'Deliver' ? address : '', phone, email, deliveryMethod, paymentMethod
    });
    await newOrder.save();
    // Add notification and send email as before
    const notifs = safeRead(notificationsFile);
    notifs.unshift({ id: Date.now(), email, message: 'Your order has been placed successfully!', date: new Date().toISOString() });
    safeWrite(notificationsFile, notifs);
    try {
      await transporter.sendMail({
        from: `GOD'S OWN PHONE GADGET <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Order Confirmation',
        text: `Thank you for your order!\n\nOrder Details:\nProduct: ${productId}\nQuantity: ${quantity}\nDelivery Method: ${deliveryMethod}\nPayment Method: ${paymentMethod}\nAddress: ${address || 'N/A'}\nPhone: ${phone}\nStatus: pending\nDate: ${new Date().toLocaleString()}\n\nWe will update you as your order is processed.`,
        html: `<h3>Thank you for your order!</h3><p><b>Order Details:</b></p><ul><li><b>Product:</b> ${productId}</li><li><b>Quantity:</b> ${quantity}</li><li><b>Delivery Method:</b> ${deliveryMethod}</li><li><b>Payment Method:</b> ${paymentMethod}</li><li><b>Address:</b> ${address || 'N/A'}</li><li><b>Phone:</b> ${phone}</li><li><b>Status:</b> pending</li><li><b>Date:</b> ${new Date().toLocaleString()}</li></ul><p>We will update you as your order is processed.</p>`
      });
      let smsErrors = [];
      // Send SMS confirmation to user
      if (phone) {
        try {
          await twilioClient.messages.create({
            body: `GOD'S OWN PHONE GADGET: Your order for ${quantity} x ${productId} is received. Status: pending. Thank you!`,
            from: fromNumber,
            to: phone
          });
        } catch (smsErr) {
          smsErrors.push({ to: phone, error: smsErr.message });
        }
      }
      // Send SMS notification to admins
      for (const adminPhone of ADMIN_PHONES) {
        try {
          await twilioClient.messages.create({
            body: `ADMIN ALERT: New order from ${email} (${phone}). Product: ${productId}, Qty: ${quantity}, Delivery: ${deliveryMethod}, Payment: ${paymentMethod}.`,
            from: fromNumber,
            to: adminPhone
          });
        } catch (adminSmsErr) {
          smsErrors.push({ to: adminPhone, error: adminSmsErr.message });
        }
      }
      if (smsErrors.length > 0) {
        return res.json({ success: true, message: 'Order placed, but some SMS failed', order: newOrder, smsErrors });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Order placed, but failed to send email or SMS', details: err.message });
    }
    res.json({ success: true, message: 'Order placed successfully', order: newOrder });
    return;
  }
  const orders = safeRead(ordersFile);
  const newOrder = {
    id: Date.now(),
    productId,
    quantity,
    address: deliveryMethod === 'Deliver' ? address : '',
    phone,
    email,
    deliveryMethod,
    paymentMethod,
    status: 'pending',
    date: new Date().toISOString()
  };
  orders.push(newOrder);
  safeWrite(ordersFile, orders);
  // Add notification
  const notifs = safeRead(notificationsFile);
  notifs.unshift({ id: Date.now(), email, message: 'Your order has been placed successfully!', date: new Date().toISOString() });
  safeWrite(notificationsFile, notifs);
  // Send order confirmation email
  try {
    await transporter.sendMail({
      from: `GOD'S OWN PHONE GADGET <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Order Confirmation',
      text: `Thank you for your order!\n\nOrder Details:\nProduct: ${productId}\nQuantity: ${quantity}\nDelivery Method: ${deliveryMethod}\nPayment Method: ${paymentMethod}\nAddress: ${address || 'N/A'}\nPhone: ${phone}\nStatus: pending\nDate: ${new Date().toLocaleString()}\n\nWe will update you as your order is processed.`,
      html: `<h3>Thank you for your order!</h3><p><b>Order Details:</b></p><ul><li><b>Product:</b> ${productId}</li><li><b>Quantity:</b> ${quantity}</li><li><b>Delivery Method:</b> ${deliveryMethod}</li><li><b>Payment Method:</b> ${paymentMethod}</li><li><b>Address:</b> ${address || 'N/A'}</li><li><b>Phone:</b> ${phone}</li><li><b>Status:</b> pending</li><li><b>Date:</b> ${new Date().toLocaleString()}</li></ul><p>We will update you as your order is processed.</p>`
    });
    let smsErrors = [];
    // Send SMS confirmation to user
    if (phone) {
      try {
        await twilioClient.messages.create({
          body: `GOD'S OWN PHONE GADGET: Your order for ${quantity} x ${productId} is received. Status: pending. Thank you!`,
          from: fromNumber,
          to: phone
        });
      } catch (smsErr) {
        smsErrors.push({ to: phone, error: smsErr.message });
      }
    }
    // Send SMS notification to admins
    for (const adminPhone of ADMIN_PHONES) {
      try {
        await twilioClient.messages.create({
          body: `ADMIN ALERT: New order from ${email} (${phone}). Product: ${productId}, Qty: ${quantity}, Delivery: ${deliveryMethod}, Payment: ${paymentMethod}.`,
          from: fromNumber,
          to: adminPhone
        });
      } catch (adminSmsErr) {
        smsErrors.push({ to: adminPhone, error: adminSmsErr.message });
      }
    }
    if (smsErrors.length > 0) {
      return res.json({ success: true, message: 'Order placed, but some SMS failed', order: newOrder, smsErrors });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Order placed, but failed to send email or SMS', details: err.message });
  }
  res.json({ success: true, message: 'Order placed successfully', order: newOrder });
});
app.patch('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status required' });
  if (mongoose.connection.readyState === 1) {
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = status;
    await order.save();
    // Add notification and send email as before
    const notifs = safeRead(notificationsFile);
    notifs.unshift({ id: Date.now(), email: order.email, message: `Your order status was updated to: ${status}`, date: new Date().toISOString() });
    safeWrite(notificationsFile, notifs);
    try {
      await transporter.sendMail({
        from: `GOD'S OWN PHONE GADGET <${process.env.EMAIL_USER}>`,
        to: order.email,
        subject: 'Order Status Update',
        text: `Your order (ID: ${order.id}) status has been updated to: ${status}.\n\nOrder Details:\nProduct: ${order.productId}\nQuantity: ${order.quantity}\nDelivery Method: ${order.deliveryMethod}\nPayment Method: ${order.paymentMethod}\nAddress: ${order.address || 'N/A'}\nPhone: ${order.phone}\nDate: ${order.date ? new Date(order.date).toLocaleString() : ''}`,
        html: `<h3>Your order (ID: ${order.id}) status has been updated to: <b>${status}</b></h3><p><b>Order Details:</b></p><ul><li><b>Product:</b> ${order.productId}</li><li><b>Quantity:</b> ${order.quantity}</li><li><b>Delivery Method:</b> ${order.deliveryMethod}</li><li><b>Payment Method:</b> ${order.paymentMethod}</li><li><b>Address:</b> ${order.address || 'N/A'}</li><li><b>Phone:</b> ${order.phone}</li><li><b>Date:</b> ${order.date ? new Date(order.date).toLocaleString() : ''}</li></ul>`
      });
      let smsErrors = [];
      // Send SMS to user
      if (order.phone) {
        try {
          await twilioClient.messages.create({
            body: `GOD'S OWN PHONE GADGET: Your order status is now '${status}'.`,
            from: fromNumber,
            to: order.phone
          });
        } catch (smsErr) {
          smsErrors.push({ to: order.phone, error: smsErr.message });
        }
      }
      // Send SMS to admins
      for (const adminPhone of ADMIN_PHONES) {
        try {
          await twilioClient.messages.create({
            body: `ADMIN ALERT: Order for ${order.email} (${order.phone}) updated to '${status}'. Product: ${order.productId}, Qty: ${order.quantity}.`,
            from: fromNumber,
            to: adminPhone
          });
        } catch (adminSmsErr) {
          smsErrors.push({ to: adminPhone, error: adminSmsErr.message });
        }
      }
      if (smsErrors.length > 0) {
        return res.json({ success: true, message: 'Order updated, but some SMS failed', order, smsErrors });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Order updated, but failed to send email or SMS', details: err.message });
    }
    return res.json({ success: true, order });
  }
  const orders = safeRead(ordersFile);
  const order = orders.find(o => String(o.id) === String(id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = status;
  safeWrite(ordersFile, orders);
  // Add notification
  const notifs = safeRead(notificationsFile);
  notifs.unshift({ id: Date.now(), email: order.email, message: `Your order status was updated to: ${status}`, date: new Date().toISOString() });
  safeWrite(notificationsFile, notifs);
  // Send status update email
  try {
    await transporter.sendMail({
      from: `GOD'S OWN PHONE GADGET <${process.env.EMAIL_USER}>`,
      to: order.email,
      subject: 'Order Status Update',
      text: `Your order (ID: ${order.id}) status has been updated to: ${status}.\n\nOrder Details:\nProduct: ${order.productId}\nQuantity: ${order.quantity}\nDelivery Method: ${order.deliveryMethod}\nPayment Method: ${order.paymentMethod}\nAddress: ${order.address || 'N/A'}\nPhone: ${order.phone}\nDate: ${order.date ? new Date(order.date).toLocaleString() : ''}`,
      html: `<h3>Your order (ID: ${order.id}) status has been updated to: <b>${status}</b></h3><p><b>Order Details:</b></p><ul><li><b>Product:</b> ${order.productId}</li><li><b>Quantity:</b> ${order.quantity}</li><li><b>Delivery Method:</b> ${order.deliveryMethod}</li><li><b>Payment Method:</b> ${order.paymentMethod}</li><li><b>Address:</b> ${order.address || 'N/A'}</li><li><b>Phone:</b> ${order.phone}</li><li><b>Date:</b> ${order.date ? new Date(order.date).toLocaleString() : ''}</li></ul>`
    });
    let smsErrors = [];
    // Send SMS to user
    if (order.phone) {
      try {
        await twilioClient.messages.create({
          body: `GOD'S OWN PHONE GADGET: Your order status is now '${status}'.`,
          from: fromNumber,
          to: order.phone
        });
      } catch (smsErr) {
        smsErrors.push({ to: order.phone, error: smsErr.message });
      }
    }
    // Send SMS to admins
    for (const adminPhone of ADMIN_PHONES) {
      try {
        await twilioClient.messages.create({
          body: `ADMIN ALERT: Order for ${order.email} (${order.phone}) updated to '${status}'. Product: ${order.productId}, Qty: ${order.quantity}.`,
          from: fromNumber,
          to: adminPhone
        });
      } catch (adminSmsErr) {
        smsErrors.push({ to: adminPhone, error: adminSmsErr.message });
      }
    }
    if (smsErrors.length > 0) {
      return res.json({ success: true, message: 'Order updated, but some SMS failed', order, smsErrors });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Order updated, but failed to send email or SMS', details: err.message });
  }
  res.json({ success: true, order });
});
app.get('/api/orders', async (req, res) => {
  const { email } = req.query;
  if (mongoose.connection.readyState === 1) {
    let orders = await Order.find(email ? { email } : {});
    return res.json(orders);
  }
  const orders = safeRead(ordersFile);
  if (email) {
    return res.json(orders.filter(o => o.email === email));
  }
  res.json(orders);
});

// --- Users (admin) ---
app.get('/api/users', (req, res) => {
  const users = safeRead(usersFile).map(u => ({ name: u.name, email: u.email, verified: u.verified }));
  res.json(users);
});

// --- Updates ---
app.post('/api/updates', (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  const updates = safeRead(updatesFile);
  const update = { id: Date.now(), message, date: new Date().toISOString() };
  updates.unshift(update);
  safeWrite(updatesFile, updates);
  res.json({ success: true, update });
});
app.get('/api/updates', (req, res) => {
  res.json(safeRead(updatesFile));
});

// --- Notifications ---
app.get('/api/notifications', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const notifs = safeRead(notificationsFile).filter(n => n.email === email);
  res.json(notifs);
});
app.delete('/api/notifications', (req, res) => {
  safeWrite(notificationsFile, []);
  res.json({ success: true, message: 'All notifications deleted.' });
});

// --- SMS Endpoints ---
// --- SMS Sending Endpoint (Twilio) ---
// Example usage (POST JSON to /api/sms/send):
// {
//   "recipients": "all" | "custom" | undefined,
//   "customNumbers": "+2348012345678, +2348765432109",
//   "message": "Hello from GOD'S OWN PHONE GADGET!"
// }
app.post('/api/sms/send', async (req, res) => {
  let { recipients, customNumbers, message, to } = req.body;
  message = message || "Test message from GOD'S OWN PHONE GADGET";
  let numbers = [];

  if (recipients === 'all') {
    // Send to all users (collect all phone numbers from users.json)
    try {
      const users = safeRead(usersFile);
      numbers = users.map(u => u.phone).filter(Boolean);
      if (!numbers.length) return res.status(400).json({ success: false, error: 'No user phone numbers found.' });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to read users.' });
    }
  } else if (recipients === 'custom' && customNumbers) {
    // Send to custom numbers (comma-separated)
    numbers = customNumbers.split(',').map(n => n.trim()).filter(Boolean);
    if (!numbers.length) return res.status(400).json({ success: false, error: 'No valid custom numbers provided.' });
  } else if (to) {
    numbers = [to];
  } else {
    return res.status(400).json({ success: false, error: 'No recipients specified.' });
  }

  try {
    const results = [];
    for (const number of numbers) {
      try {
        const sms = await twilioClient.messages.create({
          body: message,
          from: fromNumber, // Must be a Twilio-verified number
          to: number
        });
        results.push({ to: number, sid: sms.sid, status: 'sent' });
      } catch (error) {
      }
    }
    // Optionally, save to smsHistoryFile here
    res.json({ success: true, results });
  } catch (error) {
  }
  res.status(500).json({ success: false, error: error.message });
});
// --- End SMS Sending Endpoint ---

// --- SMS History Endpoint ---
app.get('/api/sms/history', (req, res) => {
  const history = safeRead(smsHistoryFile);
  res.json(history);
});
// --- End SMS History Endpoint ---

// --- Serve static files from the root directory
app.use(express.static(__dirname));

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Frontend not found. Please add an index.html file to the project root.");
  }
});

// --- Start server ---
app.listen(PORT, () => {
}); 
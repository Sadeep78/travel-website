require('dotenv').config();
const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { DESTINATIONS, parsePriceAmount, toApiRow, filterDestinations, imageUrl, isValidTravelDate } = require('./data/destinations');

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const frontendDir = path.join(__dirname, '../frontend');

if (isProduction && !process.env.SESSION_SECRET) {
  console.warn('Warning: SESSION_SECRET is not set. Set it before deploying to production.');
}

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'travel-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction
  }
}));
app.use(express.static(frontendDir));


const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'travel_site',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let dbPool;
let dbConnected = false;

const fallbackDestinations = DESTINATIONS.map((d) => ({
  id: d.id,
  slug: d.slug,
  name: d.name,
  description: d.description,
  price: d.price,
  priceAmount: d.priceAmount,
  category: d.category,
  region: d.region,
  image: imageUrl(d.image),
  availableFrom: d.availableFrom,
  availableTo: d.availableTo,
  featured: Boolean(d.featured),
  sortOrder: d.sortOrder
}));

async function ensureColumn(table, column, definition) {
  const [rows] = await dbPool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  if (rows.length === 0) {
    await dbPool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  }
}

async function migrateDestinationsTable() {
  await ensureColumn('destinations', 'slug', '`slug` VARCHAR(100) NOT NULL DEFAULT \'\' AFTER `id`');
  await ensureColumn('destinations', 'price_amount', '`price_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER `price`');
  await ensureColumn('destinations', 'category', "`category` ENUM('Cultural','Scenic','Coastal') NOT NULL DEFAULT 'Cultural' AFTER `price_amount`");
  await ensureColumn('destinations', 'region', '`region` VARCHAR(100) NOT NULL DEFAULT \'\' AFTER `category`');
  await ensureColumn('destinations', 'featured', '`featured` TINYINT(1) NOT NULL DEFAULT 0 AFTER `image`');
  await ensureColumn('destinations', 'sort_order', '`sort_order` INT NOT NULL DEFAULT 0 AFTER `featured`');
  await ensureColumn('destinations', 'available_from', '`available_from` DATE NOT NULL DEFAULT \'2025-01-01\' AFTER `sort_order`');
  await ensureColumn('destinations', 'available_to', '`available_to` DATE NOT NULL DEFAULT \'2027-12-31\' AFTER `available_from`');

  const seedRows = DESTINATIONS.map((d) => [
    d.id, d.slug, d.name, d.description, d.price, d.priceAmount,
    d.category, d.region, d.image, d.featured ? 1 : 0, d.sortOrder,
    d.availableFrom, d.availableTo
  ]);
  await dbPool.query(
    `INSERT INTO destinations (id, slug, name, description, price, price_amount, category, region, image, featured, sort_order, available_from, available_to)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       slug = VALUES(slug), name = VALUES(name), description = VALUES(description),
       price = VALUES(price), price_amount = VALUES(price_amount), category = VALUES(category),
       region = VALUES(region), image = VALUES(image), featured = VALUES(featured), sort_order = VALUES(sort_order),
       available_from = VALUES(available_from), available_to = VALUES(available_to)`,
    [seedRows]
  );
}

async function connectDatabase() {
  try {
    const adminPool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      waitForConnections: true,
      connectionLimit: 2
    });

    const connection = await adminPool.getConnection();
    await connection.query('CREATE DATABASE IF NOT EXISTS ??', [dbConfig.database]);
    await connection.release();
    await adminPool.end();

    dbPool = mysql.createPool(dbConfig);
    await dbPool.query(`CREATE TABLE IF NOT EXISTS destinations (
      id INT PRIMARY KEY,
      slug VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      price VARCHAR(50) NOT NULL,
      price_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      category ENUM('Cultural', 'Scenic', 'Coastal') NOT NULL DEFAULT 'Cultural',
      region VARCHAR(100) NOT NULL DEFAULT '',
      image VARCHAR(255) NOT NULL,
      featured TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      available_from DATE NOT NULL DEFAULT '2025-01-01',
      available_to DATE NOT NULL DEFAULT '2027-12-31',
      UNIQUE KEY uk_destinations_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await migrateDestinationsTable();

    await dbPool.query(`CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('user','admin') NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await dbPool.query(`CREATE TABLE IF NOT EXISTS contacts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    const [columnExists] = await dbPool.query("SHOW COLUMNS FROM contacts LIKE 'user_id'");
    if (columnExists.length === 0) {
      await dbPool.query('ALTER TABLE contacts ADD COLUMN user_id INT NULL');
    }

    const [indexExists] = await dbPool.query("SHOW INDEX FROM contacts WHERE Key_name = 'user_id'");
    if (indexExists.length === 0) {
      await dbPool.query('ALTER TABLE contacts ADD INDEX user_id (user_id)');
    }

    await dbPool.query(`CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      ref VARCHAR(20) NOT NULL,
      destination VARCHAR(255) NOT NULL,
      price VARCHAR(50) NOT NULL,
      billing_name VARCHAR(255) NOT NULL,
      billing_email VARCHAR(255) NOT NULL,
      billing_phone VARCHAR(50) NOT NULL,
      billing_address TEXT NOT NULL,
      billing_city VARCHAR(100) NOT NULL,
      billing_state VARCHAR(100) NOT NULL,
      billing_zip VARCHAR(20) NOT NULL,
      billing_country VARCHAR(100) NOT NULL,
      shipping_same TINYINT(1) NOT NULL DEFAULT 1,
      shipping_name VARCHAR(255) NULL,
      shipping_address TEXT NULL,
      shipping_city VARCHAR(100) NULL,
      shipping_state VARCHAR(100) NULL,
      shipping_zip VARCHAR(20) NULL,
      shipping_country VARCHAR(100) NULL,
      payment_method ENUM('card','cod') NOT NULL DEFAULT 'cod',
      card_last4 VARCHAR(4) NULL,
      status ENUM('pending','confirmed','cancelled','delivered') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Ensure status supports 'delivered' if table already existed
    try {
      await dbPool.query(`ALTER TABLE bookings MODIFY COLUMN status ENUM('pending','confirmed','cancelled','delivered') NOT NULL DEFAULT 'pending'`);
    } catch (err) {
      console.warn('Altering bookings status column failed:', err.message);
    }

    // Ensure bookings has the 'quantity' column
    try {
      const [colExists] = await dbPool.query("SHOW COLUMNS FROM bookings LIKE 'quantity'");
      if (colExists.length === 0) {
        await dbPool.query('ALTER TABLE bookings ADD COLUMN quantity INT NOT NULL DEFAULT 1');
      }
    } catch (err) {
      console.warn('Adding quantity column to bookings failed:', err.message);
    }
    
    const [adminRows] = await dbPool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
    if (adminRows[0].count === 0) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@travel.com';
      const adminHash = await bcrypt.hash(adminPassword, 10);
      await dbPool.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
        'Administrator',
        adminEmail,
        adminHash,
        'admin'
      ]);
      console.log(`Seeded admin user: ${adminEmail} / ${adminPassword}`);
    }

    await ensureColumn('bookings', 'price_amount', '`price_amount` DECIMAL(10,2) NULL AFTER `price`');

    dbConnected = true;
    console.log('Connected to MySQL and ensured database schema.');
  } catch (error) {
    console.warn('MySQL initialization failed, using in-memory data fallback.', error.message);
    dbConnected = false;
  }
}

function getDestinationFilters(query) {
  const date = query.date || '';
  return {
    q: query.q || '',
    category: query.category || '',
    maxPrice: query.maxPrice || '',
    region: query.region || '',
    slug: query.slug || '',
    featured: query.featured || '',
    date: isValidTravelDate(date) ? date : ''
  };
}

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required.' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.userRole === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required.' });
}

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  if (!dbConnected) {
    return res.status(500).json({ error: 'Database is not connected.' });
  }

  try {
    const [existing] = await dbPool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ error: 'A user with that email already exists.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await dbPool.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email, passwordHash, 'user']);
    return res.json({ success: true, message: 'Registration successful. Please log in.' });
  } catch (error) {
    console.error('Register error:', error.message);
    return res.status(500).json({ error: 'Unable to register user.' });
  }
});
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  if (!dbConnected) {
    return res.status(500).json({ error: 'Database is not connected.' });
  }

  try {
    const [rows] = await dbPool.query('SELECT id, name, email, password_hash, role FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userName = user.name;
    return res.json({ success: true, role: user.role, name: user.name });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ error: 'Unable to log in.' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Unable to log out.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

app.get('/api/profile', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.json({ authenticated: false });
  }
  return res.json({ authenticated: true, name: req.session.userName, role: req.session.userRole });
});

app.get('/api/requests', requireAdmin, async (req, res) => {
  if (!dbConnected) {
    return res.status(500).json({ error: 'Database is not connected.' });
  }
  try {
    const [rows] = await dbPool.query(`
      SELECT c.id, c.name, c.email, c.message, c.created_at, u.name AS user_name, u.email AS user_email
      FROM contacts c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
    `);
    return res.json(rows);
  } catch (error) {
    console.error('Request fetch error:', error.message);
    return res.status(500).json({ error: 'Unable to load requests.' });
  }
});

app.get('/api/destinations/meta', (req, res) => {
  const categories = [...new Set(DESTINATIONS.map((d) => d.category))].sort();
  const regions = [...new Set(DESTINATIONS.map((d) => d.region))].sort();
  const budgets = [1300, 1500, 1600];
  return res.json({ categories, regions, budgets });
});

app.get('/api/destinations', async (req, res) => {
  const filters = getDestinationFilters(req.query);

  if (!dbConnected) {
    return res.json(filterDestinations(fallbackDestinations, filters));
  }

  try {
    const conditions = [];
    const values = [];

    if (filters.q) {
      conditions.push('(LOWER(name) LIKE ? OR LOWER(description) LIKE ?)');
      const term = `%${filters.q.toLowerCase()}%`;
      values.push(term, term);
    }
    if (filters.slug) {
      conditions.push('slug = ?');
      values.push(filters.slug);
    }
    if (filters.category) {
      conditions.push('category = ?');
      values.push(filters.category);
    }
    if (filters.region) {
      conditions.push('(LOWER(region) LIKE ? OR LOWER(name) LIKE ?)');
      const term = `%${filters.region.toLowerCase()}%`;
      values.push(term, term);
    }
    if (filters.maxPrice) {
      conditions.push('price_amount <= ?');
      values.push(Number(filters.maxPrice));
    }
    if (filters.featured === '1' || filters.featured === 'true') {
      conditions.push('featured = 1');
    }
    if (filters.date) {
      conditions.push('? >= available_from AND ? <= available_to');
      values.push(filters.date, filters.date);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await dbPool.query(
      `SELECT id, slug, name, description, price, price_amount, category, region, image, featured, sort_order, available_from, available_to
       FROM destinations ${where} ORDER BY sort_order ASC, name ASC`,
      values
    );
    return res.json(rows.map(toApiRow));
  } catch (error) {
    console.warn('Failed to query destinations, using fallback.', error.message);
    return res.json(filterDestinations(fallbackDestinations, filters));
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Please provide name, email, and message.' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  let userId = null;
  if (req.session && req.session.userId) {
    userId = req.session.userId;
  }

  if (!dbConnected) {
    return res.status(503).json({ error: 'Inquiry service is temporarily unavailable. Please try again later.' });
  }

  try {
    await dbPool.query('INSERT INTO contacts (name, email, message, user_id) VALUES (?, ?, ?, ?)', [name, email, message, userId]);
    return res.json({ success: true, message: 'Thanks! Your request has been received.' });
  } catch (error) {
    console.warn('Failed to save contact to database:', error.message);
    return res.status(500).json({ error: 'Unable to save your request.' });
  }
});

app.post('/api/booking', async (req, res) => {
  const { destination, price, quantity, billing, shipping, shippingSameAsBilling, paymentMethod, cardLast4 } = req.body;

  if (!destination || !billing || !billing.name || !billing.email || !billing.address || !billing.city) {
    return res.status(400).json({ error: 'Missing required booking fields.' });
  }
  if (!['card', 'cod'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Invalid payment method.' });
  }

  if (!dbConnected) {
    return res.status(503).json({ error: 'Booking service is temporarily unavailable. Please try again later.' });
  }

  const ref = 'TP' + Date.now().toString(36).toUpperCase();
  const userId = (req.session && req.session.userId) ? req.session.userId : null;
  const bookingQty = quantity ? Math.max(1, Number(quantity)) : 1;
  const priceAmount = parsePriceAmount(price || '');

  try {
    const shipSame = shippingSameAsBilling ? 1 : 0;
    const s = shippingSameAsBilling ? {} : (shipping || {});
    await dbPool.query(
      `INSERT INTO bookings
        (user_id, ref, destination, price, price_amount, quantity,
         billing_name, billing_email, billing_phone, billing_address, billing_city, billing_state, billing_zip, billing_country,
         shipping_same, shipping_name, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_country,
         payment_method, card_last4, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending')`,
      [
        userId, ref, destination, price || '', priceAmount || null, bookingQty,
        billing.name, billing.email, billing.phone || '', billing.address, billing.city, billing.state || '', billing.zip || '', billing.country || '',
        shipSame, s.name || null, s.address || null, s.city || null, s.state || null, s.zip || null, s.country || null,
        paymentMethod, cardLast4 || null
      ]
    );
    return res.json({ success: true, ref, message: 'Booking confirmed!' });
  } catch (err) {
    console.error('Booking insert error:', err.message);
    return res.status(500).json({ error: 'Unable to save booking.' });
  }
});

app.get('/api/bookings', requireAdmin, async (req, res) => {
  if (!dbConnected) return res.status(500).json({ error: 'Database not connected.' });
  try {
    const [rows] = await dbPool.query('SELECT * FROM bookings ORDER BY created_at DESC');
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Unable to load bookings.' });
  }
});

app.put('/api/bookings/:id', requireAdmin, async (req, res) => {
  if (!dbConnected) return res.status(500).json({ error: 'Database not connected.' });
  const { id } = req.params;
  const { status, quantity } = req.body;

  try {
    if (status && !['pending', 'confirmed', 'cancelled', 'delivered'].includes(status)) {
      return res.status(400).json({ error: 'Invalid booking status.' });
    }
    if (quantity !== undefined && (isNaN(Number(quantity)) || Number(quantity) < 1)) {
      return res.status(400).json({ error: 'Quantity must be at least 1.' });
    }

    let updateFields = [];
    let values = [];

    if (status) {
      updateFields.push('status = ?');
      values.push(status);
    }
    if (quantity !== undefined) {
      updateFields.push('quantity = ?');
      values.push(Number(quantity));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    values.push(id);
    await dbPool.query(`UPDATE bookings SET ${updateFields.join(', ')} WHERE id = ?`, values);
    return res.json({ success: true, message: 'Booking updated successfully.' });
  } catch (err) {
    console.error('Update booking error:', err.message);
    return res.status(500).json({ error: 'Unable to update booking.' });
  }
});

app.delete('/api/bookings/:id', requireAdmin, async (req, res) => {
  if (!dbConnected) return res.status(500).json({ error: 'Database not connected.' });
  const { id } = req.params;

  try {
    await dbPool.query('DELETE FROM bookings WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Booking deleted successfully.' });
  } catch (err) {
    console.error('Delete booking error:', err.message);
    return res.status(500).json({ error: 'Unable to delete booking.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

connectDatabase().finally(() => {
  app.listen(port, () => {
    console.log(`Travel website running at http://localhost:${port}`);
  });
});

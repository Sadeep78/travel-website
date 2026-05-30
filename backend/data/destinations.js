/** Bump when image files change (cache-bust for browsers). */
const IMAGE_VERSION = '2';

/** Canonical destination catalog — used for seeds, fallbacks, and migrations. */
const DESTINATIONS = [
  {
    id: 1,
    slug: 'sigiriya',
    name: 'Sigiriya',
    description: 'Ancient rock fortress with majestic views over Sri Lanka’s Cultural Triangle.',
    price: '$1,350',
    priceAmount: 1350,
    category: 'Cultural',
    region: 'Cultural Triangle',
    image: 'images/sigiriya.png',
    availableFrom: '2025-01-01',
    availableTo: '2027-12-31',
    featured: 1,
    sortOrder: 1
  },
  {
    id: 2,
    slug: 'galle-fort',
    name: 'Galle Fort',
    description: 'A fortified coastal city lined with colonial architecture and ocean views.',
    price: '$1,450',
    priceAmount: 1450,
    category: 'Cultural',
    region: 'Southern Coast',
    image: 'images/galle-fort.png',
    availableFrom: '2025-01-01',
    availableTo: '2027-12-31',
    featured: 1,
    sortOrder: 2
  },
  {
    id: 3,
    slug: 'ella',
    name: 'Ella',
    description: 'Tea country escapes, waterfall hikes, and scenic mountain trails.',
    price: '$1,550',
    priceAmount: 1550,
    category: 'Scenic',
    region: 'Hill Country',
    image: 'images/ella.png',
    availableFrom: '2025-01-01',
    availableTo: '2027-12-31',
    featured: 0,
    sortOrder: 3
  },
  {
    id: 4,
    slug: 'mirissa',
    name: 'Mirissa',
    description: 'Beachside relaxation, whale watching, and laid-back southern coast charm.',
    price: '$1,250',
    priceAmount: 1250,
    category: 'Coastal',
    region: 'Southern Coast',
    image: 'images/mirissa.png',
    availableFrom: '2025-11-01',
    availableTo: '2027-04-30',
    featured: 1,
    sortOrder: 4
  },
  {
    id: 5,
    slug: 'yala',
    name: 'Yala National Park',
    description: 'Wildlife safaris through one of Sri Lanka’s most famous national parks.',
    price: '$1,600',
    priceAmount: 1600,
    category: 'Coastal',
    region: 'Southeast',
    image: 'images/yala.png',
    availableFrom: '2025-02-01',
    availableTo: '2027-10-31',
    featured: 0,
    sortOrder: 5
  },
  {
    id: 6,
    slug: 'nuwara-eliya',
    name: 'Nuwara Eliya',
    description: 'Cool mountain air, tea plantations, and charming colonial estates.',
    price: '$1,490',
    priceAmount: 1490,
    category: 'Scenic',
    region: 'Hill Country',
    image: 'images/nuwara-eliya.png',
    availableFrom: '2025-01-01',
    availableTo: '2027-12-31',
    featured: 1,
    sortOrder: 6
  },
  {
    id: 7,
    slug: 'kandy',
    name: 'Kandy',
    description: 'Sacred temples, cultural performances, and lakefront city life.',
    price: '$1,520',
    priceAmount: 1520,
    category: 'Cultural',
    region: 'Central Highlands',
    image: 'images/kandy.png',
    availableFrom: '2025-01-01',
    availableTo: '2027-12-31',
    featured: 0,
    sortOrder: 7
  }
];

function isValidTravelDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(`${dateStr}T12:00:00`);
  return !Number.isNaN(d.getTime());
}

function isDateInAvailability(travelDate, from, to) {
  if (!isValidTravelDate(travelDate)) return true;
  const d = new Date(`${travelDate}T12:00:00`);
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return d >= start && d <= end;
}

function parsePriceAmount(priceLabel) {
  if (typeof priceLabel !== 'string') return 0;
  const numeric = parseFloat(priceLabel.replace(/[^\d.]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function imageUrl(path) {
  if (!path) return path;
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}v=${IMAGE_VERSION}`;
}

function findCanonicalDestination(row) {
  return DESTINATIONS.find((d) => d.id === row.id) ||
    DESTINATIONS.find((d) => d.slug === row.slug);
}

function toApiRow(row) {
  const canonical = findCanonicalDestination(row);
  const imagePath = canonical?.image || row.image;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: row.price,
    priceAmount: row.price_amount != null ? Number(row.price_amount) : parsePriceAmount(row.price),
    category: row.category || canonical?.category,
    region: row.region || canonical?.region,
    image: imageUrl(imagePath),
    availableFrom: canonical?.availableFrom || row.available_from || '2025-01-01',
    availableTo: canonical?.availableTo || row.available_to || '2027-12-31',
    featured: Boolean(row.featured),
    sortOrder: row.sort_order != null ? row.sort_order : row.id
  };
}

function filterDestinations(list, filters) {
  const { q = '', category = '', maxPrice = '', region = '', slug = '', featured = '', date = '' } = filters;
  const needle = q.trim().toLowerCase();
  const max = maxPrice ? Number(maxPrice) : null;
  const wantFeatured = featured === '1' || featured === 'true';

  return list
    .filter((d) => {
      if (needle && !d.name.toLowerCase().includes(needle) && !d.description.toLowerCase().includes(needle)) {
        return false;
      }
      if (slug && d.slug !== slug) return false;
      if (category && d.category.toLowerCase() !== category.toLowerCase()) return false;
      if (region && !d.region.toLowerCase().includes(region.toLowerCase()) && !d.name.toLowerCase().includes(region.toLowerCase())) {
        return false;
      }
      if (max != null && !Number.isNaN(max) && d.priceAmount > max) return false;
      if (wantFeatured && !d.featured) return false;
      if (date && !isDateInAvailability(date, d.availableFrom, d.availableTo)) return false;
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

module.exports = {
  DESTINATIONS,
  IMAGE_VERSION,
  imageUrl,
  parsePriceAmount,
  toApiRow,
  filterDestinations,
  isValidTravelDate,
  isDateInAvailability
};

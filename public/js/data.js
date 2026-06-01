/* ============================================================
   data.js
   - تعريف المنتجات بصيغة مصنفة (الفئات)
   - إعدادات النظام
   - واجهة LocalStorage (قابلة للترقية مستقبلاً لـ Firebase / API)
   - دعم الهجرة التلقائية من الصيغة القديمة
   ============================================================ */

/** الفئات الرئيسية للمنتجات */
const INVENTORY_CATEGORIES = [
  {
    id: "smoking",
    name: "الدخان",
    icon: "🚬",
    items: [
      { name: "مالبورو حح", price: 3.75 },
      { name: "بارلمنت حح", price: 4.00 },
      { name: "طويل A+", price: 2.00 },
      { name: "وينستون كومباك", price: 2.50 },
      { name: "MIX", price: 2.50 },
      { name: "هيتس", price: 2.25 },
      { name: "مالبورو", price: 2.85 },
      { name: "كينت", price: 2.60 },
      { name: "ال ام", price: 2.35 },
      { name: "اليجانس", price: 1.85 },
      { name: "جولد كوست", price: 2.40 },
      { name: "وينستون ابيض", price: 2.60 },
      { name: "فرط دخان 0.15", price: 0.15 },
      { name: "فرط W", price: 0.20 },
    ]
  },
  {
    id: "sweets",
    name: "السكاكر",
    icon: "🍬",
    items: [
      { name: "0.15", price: 0.15 },
      { name: "0.25", price: 0.25 },
      { name: "0.35", price: 0.35 },
      { name: "0.50", price: 0.50 },
      { name: "اكسترا", price: 0.50 },
      { name: "هولز 30", price: 0.30 },
      { name: "اندومي", price: 0.50 },
    ]
  },
  {
    id: "refrigerated",
    name: "الثلاجة",
    icon: "❄️",
    items: [
      { name: "ماء صغير", price: 0.25 },
      { name: "زاكي", price: 0.15 },
      { name: "ماء كبير", price: 0.35 },
      { name: "باربيكان", price: 0.75 },
      { name: "بيبسي زجاج", price: 0.30 },
      { name: "مطعمات", price: 0.50 },
      { name: "كناري", price: 0.40 },
      { name: "BM 0.25", price: 0.25 },
      { name: "BM 0.50", price: 0.50 },
      { name: "X", price: 0.40 },
      { name: "كود ريد 1.25", price: 1.25 },
      { name: "ريد بول", price: 1.50 },
      { name: "كود ريد", price: 1.00 },
      { name: "بوم بوم", price: 0.75 },
    ]
  },
  {
    id: "juice",
    name: "العصير",
    icon: "🥤",
    items: [
      { name: "ثلج", price: 0.25 },
      { name: "موهيتو", price: 0.50 },
      { name: "أفوكادو", price: 1.50 },
      { name: "سبيشال", price: 1.50 },
      { name: "أفوكادو دبل", price: 2.00 },
      { name: "قشطة", price: 1.50 },
      { name: "بوظة 1.25", price: 1.25 },
      { name: "صحون وقطع", price: 2.50 },
      { name: "قنينة 1.50", price: 1.50 },
      { name: "قنينة 2.25", price: 2.25 },
      { name: "قنينة 3.00", price: 3.00 },
      { name: "سلاش 0.50", price: 0.50 },
      { name: "سلاش 0.75", price: 0.75 },
      { name: "سلاش 1.00", price: 1.00 },
    ]
  },
  {
    id: "coffee",
    name: "القهوة",
    icon: "☕",
    items: [
      { name: "كاسات زهورات", price: 0.40 },
      { name: "كاسات العميد", price: 0.50 },
      { name: "دبل عميد + نسكافيه", price: 0.75 },
      { name: "كاسات نسكافيه", price: 0.50 },
      { name: "كاسات شاي", price: 0.25 },
    ]
  },
];

/** قائمة المنتجات المسطحة (للتوافقية مع البنية القديمة) */
const DEFAULT_PRODUCTS = INVENTORY_CATEGORIES.flatMap(cat => 
  cat.items.map(item => ({ name: item.name, price: item.price }))
);

/** مفاتيح التخزين */
const STORAGE = {
  PRODUCTS: "ms_products_v2",
  PRODUCTS_CATEGORIZED: "ms_products_categorized_v1",
  INVENTORY_VERSION: "ms_inventory_version",
  ACTIVE_SHIFT: "ms_active_shift",
  ARCHIVE: "ms_archive",
  EXPENSES: "ms_expenses",
  PAYMENTS: "ms_payments",
  WAREHOUSE: "ms_warehouse",
  AUDIT: "ms_audit_log",
  SETTINGS: "ms_settings",
  ROLLOVER: "ms_rollover",
};

/** افتراضيات الإعدادات */
const DEFAULT_SETTINGS = {
  branch: "فرع النزهة",
  managerName: "المدير",
  managerEmail: "",
  emailjs: {
    publicKey: "",
    serviceId: "",
    templateId: "",
  },
  managerPassword: "admin123",
};

/** Storage helpers */
const DB = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  remove(key) { localStorage.removeItem(key); },

  /** يرجع قائمة مسطحة من جميع المنتجات (للتوافقية القديمة) */
  getProducts() {
    const categorized = this.get(STORAGE.PRODUCTS_CATEGORIZED, null);
    if (categorized && Array.isArray(categorized) && categorized.length > 0) {
      return categorized.flatMap(cat => cat.items);
    }
    let p = this.get(STORAGE.PRODUCTS, null);
    if (!p) { 
      this.set(STORAGE.PRODUCTS, DEFAULT_PRODUCTS);
      this.setCategorizedProducts(INVENTORY_CATEGORIES);
      p = DEFAULT_PRODUCTS;
    }
    return p;
  },

  /** يرجع الفئات المصنفة بكاملها */
  getCategorizedProducts() {
    let cats = this.get(STORAGE.PRODUCTS_CATEGORIZED, null);
    if (!cats) {
      cats = JSON.parse(JSON.stringify(INVENTORY_CATEGORIES));
      this.setCategorizedProducts(cats);
    }
    return cats;
  },

  /** يحفظ الفئات المصنفة */
  setCategorizedProducts(categories) {
    this.set(STORAGE.PRODUCTS_CATEGORIZED, categories);
    const flat = categories.flatMap(cat => cat.items);
    this.set(STORAGE.PRODUCTS, flat);
  },

  getSettings() {
    let s = this.get(STORAGE.SETTINGS, null);
    if (!s) { this.set(STORAGE.SETTINGS, DEFAULT_SETTINGS); s = DEFAULT_SETTINGS; }
    return s;
  },
  saveSettings(s) { this.set(STORAGE.SETTINGS, s); },

  getActiveShift() { return this.get(STORAGE.ACTIVE_SHIFT, null); },
  saveActiveShift(s) { this.set(STORAGE.ACTIVE_SHIFT, s); },
  clearActiveShift() { this.remove(STORAGE.ACTIVE_SHIFT); },

  getArchive() { return this.get(STORAGE.ARCHIVE, []); },
  saveArchive(arr) { this.set(STORAGE.ARCHIVE, arr); },

  getExpenses() { return this.get(STORAGE.EXPENSES, []); },
  saveExpenses(arr) { this.set(STORAGE.EXPENSES, arr); },

  getPayments() { return this.get(STORAGE.PAYMENTS, []); },
  savePayments(arr) { this.set(STORAGE.PAYMENTS, arr); },

  getWarehouse() { return this.get(STORAGE.WAREHOUSE, []); },
  saveWarehouse(arr) { this.set(STORAGE.WAREHOUSE, arr); },

  getAudit() { return this.get(STORAGE.AUDIT, []); },
  pushAudit(entry) {
    const arr = this.getAudit();
    arr.unshift({ ...entry, time: new Date().toISOString() });
    this.set(STORAGE.AUDIT, arr);
  },

  getRollover() { return this.get(STORAGE.ROLLOVER, null); },
  saveRollover(r) { this.set(STORAGE.ROLLOVER, r); },
};
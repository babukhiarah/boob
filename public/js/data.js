/* ============================================================
   data.js
   - تعريف المنتجات
   - إعدادات النظام
   - واجهة LocalStorage (قابلة للترقية مستقبلاً لـ Firebase / API)
   ============================================================ */

/** قائمة المنتجات الافتراضية (الاسم - السعر) */
const DEFAULT_PRODUCTS = [
  { name: "بوم بوم",            price: 0.75 },
  { name: "BM 0.50",             price: 0.50 },
  { name: "BM 0.25",             price: 0.25 },
  { name: "كوود ريد",           price: 1.00 },
  { name: "كود ريد 1.25",       price: 1.25 },
  { name: "ريد بول",             price: 1.50 },
  { name: "مطعمات",              price: 0.50 },
  { name: "كناري + X",           price: 0.40 },
  { name: "باربيكان",            price: 0.75 },
  { name: "بيبسي زجاج",          price: 0.30 },
  { name: "زاكي",                 price: 0.15 },
  { name: "ماء كبير",            price: 0.35 },
  { name: "ماء صغير",            price: 0.25 },
  { name: "قداحات",              price: 0.25 },
  { name: "اكسترا",              price: 0.50 },
  { name: "هولز 30",             price: 0.30 },
  { name: "اندومي",              price: 0.50 },
  { name: "فرط W",               price: 0.20 },
  { name: "فرط دخان",            price: 0.15 },
  { name: "بطاقات",              price: 2.00 },
  { name: "ثلج",                  price: 0.25 },
  { name: "موهيتو",              price: 0.50 },
  { name: "أفوكادو",             price: 1.50 },
  { name: "سبيشال",              price: 1.50 },
  { name: "افوكادو دبل",         price: 2.00 },
  { name: "قشطة",                 price: 1.50 },
  { name: "صحون وقطع",           price: 2.50 },
  { name: "قنينة 1.50",          price: 1.50 },
  { name: "قنينة 2.25",          price: 2.25 },
  { name: "قنينة 3.00",          price: 3.00 },
  { name: "سلاش 0.50",           price: 0.50 },
  { name: "سلاش 0.75",           price: 0.75 },
  { name: "سلاش 1.00",           price: 1.00 },
  { name: "كاسات شاي",            price: 0.25 },
  { name: "كاسات زهورات",        price: 0.40 },
  { name: "كاسات نسكافيه",       price: 0.50 },
  { name: "كاسات العميد",        price: 0.50 },
  { name: "دبل عميد + نسكافيه",  price: 0.75 },
  { name: "طويل A",              price: 2.00 },
  { name: "وينستون كومباك + MIX", price: 2.50 },
  { name: "هيتس",                price: 2.25 },
  { name: "مالبورو",             price: 2.85 },
  { name: "كينت",                price: 2.60 },
  { name: "وينستون ابيض",        price: 2.60 },
  { name: "جولد كوست",           price: 2.40 },
  { name: "ال ام",               price: 2.35 },
  { name: "اليجانس",             price: 1.85 },
  { name: "LD",                  price: 2.10 },
  { name: "0.15",                price: 0.15 },
  { name: "0.25",                price: 0.25 },
  { name: "0.35",                price: 0.35 },
  { name: "0.50",                price: 0.50 },
  { name: "مالبورو حح",          price: 3.75 },
  { name: "بارلمنت حح",          price: 4.00 },
];

/** مفاتيح التخزين */
const STORAGE = {
  PRODUCTS: "ms_products_v2",
  ACTIVE_SHIFT: "ms_active_shift",
  ARCHIVE: "ms_archive",
  EXPENSES: "ms_expenses",
  PAYMENTS: "ms_payments",
  WAREHOUSE: "ms_warehouse",
  AUDIT: "ms_audit_log",
  SETTINGS: "ms_settings",
  ROLLOVER: "ms_rollover", // أرصدة تدوير الوردية التالية
};

/** افتراضيات الإعدادات */
const DEFAULT_SETTINGS = {
  branch: "فرع النزهة",
  managerName: "المدير",
  managerEmail: "",
  // EmailJS (مجاني) - يضعها المدير في الإعدادات
  emailjs: {
    publicKey: "",
    serviceId: "",
    templateId: "",
  },
  // كلمة سر المدير المحلية (احترازية للوحة المدير)
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

  // ---- domain helpers ----
  getProducts() {
    let p = this.get(STORAGE.PRODUCTS, null);
    if (!p) { this.set(STORAGE.PRODUCTS, DEFAULT_PRODUCTS); p = DEFAULT_PRODUCTS; }
    return p;
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
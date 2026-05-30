/* ============================================================
   calculations.js
   - حسابات الجرد والكاش المتوقع
   - قيود: لا تسليم > متاح، لا مخزون سالب
   ============================================================ */

const Calc = {
  /** لكل منتج: Available و Sold و Value */
  productLine(p) {
    const received  = Utils.n(p.received);
    const added     = Utils.n(p.added);
    const delivered = p.delivered === "" || p.delivered === null || p.delivered === undefined
      ? null : Utils.n(p.delivered);

    const available = received + added;
    let sold = 0;
    if (delivered !== null) sold = available - delivered;
    const value = sold * Utils.n(p.price);
    return { available, sold, value };
  },

  /** التحقق من قيود الجرد لكامل القائمة */
  validateProducts(products) {
    const errors = [];
    products.forEach((p, i) => {
      const { available, sold } = Calc.productLine(p);
      const delivered = p.delivered === "" || p.delivered === null || p.delivered === undefined
        ? null : Utils.n(p.delivered);
      if (delivered !== null && delivered > available) {
        errors.push(`المنتج "${p.name}": التسليم (${delivered}) أكبر من المتاح (${available}).`);
      }
      if (sold < 0) {
        errors.push(`المنتج "${p.name}": مخزون سالب غير مسموح.`);
      }
    });
    return errors;
  },

  /** إجمالي المبيعات */
  totalSales(products) {
    return products.reduce((sum, p) => sum + Calc.productLine(p).value, 0);
  },

  /** الكاش المتوقع */
  expectedCash(shift) {
    const cashStart = Utils.n(shift.cash.start);
    const sales     = Calc.totalSales(shift.products);
    const visaDiff  = Utils.n(shift.visa.end) - Utils.n(shift.visa.start);
    const clickDiff = Utils.n(shift.click.end) - Utils.n(shift.click.start);
    const incoming  = Utils.n(shift.incoming);
    const debts     = Utils.n(shift.debts);
    const expenses  = (shift.expenses || []).reduce((s, e) => s + Utils.n(e.amount), 0);
    const payments  = (shift.payments || []).reduce((s, e) => s + Utils.n(e.amount), 0);

    return cashStart + sales + visaDiff + clickDiff + incoming - debts - expenses - payments;
  },

  /** الفرق بين المسلّم والمتوقع */
  difference(shift) {
    return Utils.n(shift.cash.delivered) - Calc.expectedCash(shift);
  },

  /** ملخص شامل */
  summary(shift) {
    const sales     = Calc.totalSales(shift.products);
    const visaDiff  = Utils.n(shift.visa.end) - Utils.n(shift.visa.start);
    const clickDiff = Utils.n(shift.click.end) - Utils.n(shift.click.start);
    const expenses  = (shift.expenses || []).reduce((s, e) => s + Utils.n(e.amount), 0);
    const payments  = (shift.payments || []).reduce((s, e) => s + Utils.n(e.amount), 0);
    const expected  = Calc.expectedCash(shift);
    const diff      = Calc.difference(shift);
    return { sales, visaDiff, clickDiff, expenses, payments, expected, diff };
  },
};
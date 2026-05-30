/* ============================================================
   shift.js
   منطق واجهة الموظف:
   - بدء وردية
   - إدخال الأرقام والجرد
   - رفع صورة الجرد
   - إرسال للمدير (Pending Approval)
   ============================================================ */

const Shift = {
  state: null,
  // صورة الجرد تُحفظ في الذاكرة فقط — لا تُكتب أبداً في LocalStorage
  _tempImage: null,

  /** يرجع نسخة من الوردية بدون صورة الجرد (للحفظ في التخزين فقط) */
  _stripImage(sh) {
    if (!sh) return sh;
    const clone = { ...sh };
    delete clone.inventoryImage;
    return clone;
  },

  /** يبني وردية جديدة */
  build(employeeName, shiftKey) {
    const products = DB.getProducts();
    const rollover = DB.getRollover();
    const linkedExpenses = DB.getExpenses().filter(e => !e.shiftId);
    const linkedPayments = DB.getPayments().filter(e => !e.shiftId);

    return {
      id: Utils.uid(),
      branch: DB.getSettings().branch,
      employee: employeeName,
      shiftKey,
      status: "open", // open | pending | approved | rejected
      createdAt: new Date().toISOString(),
      submittedAt: null,
      approvedAt: null,
      approvedBy: null,
      rejectReason: null,

      cash:  { start: rollover?.cashDelivered ?? 0, delivered: "" },
      visa:  { start: rollover?.visaEnd      ?? 0, end: "" },
      click: { start: rollover?.clickEnd     ?? 0, end: "" },

      debts: 0,
      incoming: 0,

      products: products.map((p, idx) => {
        let receivedVal = "";
        if (rollover?.productsDeliveredByName) {
          const byName = rollover.productsDeliveredByName[p.name];
          if (byName !== undefined) receivedVal = byName;
        } else if (rollover?.productsDelivered) {
          const byIdx = rollover.productsDelivered[idx];
          if (byIdx !== undefined && byIdx !== null && byIdx !== "" && byIdx !== 0) receivedVal = byIdx;
        }
        return {
          name: p.name,
          price: p.price,
          received: receivedVal,
          added: "",
          delivered: "",
        };
      }),

      expenses: linkedExpenses,
      payments: linkedPayments,

      inventoryImage: null, // DataURL
    };
  },

  load() {
    this.state = DB.getActiveShift();
    // الصورة موجودة فقط في الذاكرة، نعيد ربطها بحالة الوردية إن وُجدت
    if (this.state && Shift._tempImage) this.state.inventoryImage = Shift._tempImage;
    return this.state;
  },

  save() {
    if (!this.state) return;
    // نحفظ نسخة بدون الصورة لتفادي تجاوز حد التخزين
    DB.saveActiveShift(Shift._stripImage(this.state));
  },

  start(employeeName, shiftKey) {
    if (!employeeName || !shiftKey) { Utils.toast("أدخل الاسم واختر الوردية", "warning"); return false; }
    const existing = DB.getActiveShift();
    if (existing && existing.status !== "approved") {
      Utils.toast("توجد وردية مفتوحة حالياً", "warning");
      return false;
    }
    this.state = this.build(employeeName, shiftKey);
    this.save();
    DB.pushAudit({ action: "بدء وردية", user: employeeName, details: `${Utils.shiftLabel(shiftKey)}` });
    return true;
  },

  submitToManager() {
    if (!this.state) return false;
    const errors = Calc.validateProducts(this.state.products);
    if (errors.length) { Utils.toast(errors[0], "danger"); return false; }
    // نقبل الصورة من state أو من ذاكرة التشغيل (لم تُحفظ في LocalStorage)
    const tempImg = this.state.inventoryImage || Shift._tempImage;
    if (!tempImg) {
      Utils.toast("يجب رفع صورة الجرد قبل تسليم الوردية", "danger");
      return false;
    }
    if (this.state.cash.delivered === "" || this.state.visa.end === "" || this.state.click.end === "") {
      Utils.toast("أكمل أرصدة الكاش/الفيزا/كليك نهاية الوردية", "warning");
      return false;
    }
    // اعتماد تلقائي بدون الرجوع للمدير
    const settings = DB.getSettings();
    const sh = this.state;
    sh.status = "approved";
    sh.submittedAt = new Date().toISOString();
    sh.approvedAt = sh.submittedAt;
    sh.approvedBy = sh.employee + " (اعتماد تلقائي)";

    // نحتفظ بالصورة في الذاكرة فقط لاستخدامها في PDF/واتساب
    Shift._tempImage = tempImg;

    // أرشفة بدون صورة (تفادي مشاكل المساحة)
    const archShift = Shift._stripImage(sh);
    const arch = DB.getArchive();
    arch.unshift(archShift);
    DB.saveArchive(arch);

    // ترحيل للوردية التالية
    DB.saveRollover(Shift.buildRollover(archShift));

    DB.pushAudit({ action: "تسليم واعتماد تلقائي للوردية", user: sh.employee, details: sh.id });

    // نمرر الصورة من الذاكرة إلى مولّد PDF (تظهر داخل التقرير فقط)
    const shWithImg = { ...archShift, inventoryImage: tempImg };
    try { PDFGen.save(shWithImg, sh.approvedBy, sh.approvedAt); } catch (e) { console.error("PDF save failed:", e); }
    try { PDFGen.emailToManager(shWithImg, sh.approvedBy, sh.approvedAt); } catch (e) { console.error("Email failed:", e); }

    DB.clearActiveShift();
    this.state = null;
    return true;
  },

  /** يحسب بيانات الترحيل من وردية معتمدة */
  buildRollover(sh) {
    return {
      cashDelivered: Utils.n(sh.cash.delivered),
      visaEnd: Utils.n(sh.visa.end),
      clickEnd: Utils.n(sh.click.end),
      productsDelivered: sh.products.map(p => p.delivered === "" ? 0 : Utils.n(p.delivered)),
      productsDeliveredByName: sh.products.reduce((acc, p) => {
        if (p.delivered !== "" && p.delivered !== null && p.delivered !== undefined) {
          acc[p.name] = Utils.n(p.delivered);
        }
        return acc;
      }, {}),
    };
  },

  /** هل يمكن تعديل آخر وردية معتمدة؟
   *  مسموح طالما لم تُعتمد وردية أحدث منها (أي ما تزال هي archive[0]
   *  ولم تنتهِ بعد الوردية التي تليها). */
  canEditLastApproved() {
    const arch = DB.getArchive();
    return arch.length > 0; // archive[0] هي آخر معتمدة وقابلة للتعديل
  },

  /** يبدأ وضع تعديل آخر وردية معتمدة */
  startEditLast() {
    const arch = DB.getArchive();
    if (!arch.length) { Utils.toast("لا توجد وردية معتمدة للتعديل", "warning"); return false; }
    this.state = JSON.parse(JSON.stringify(arch[0]));
    this.state._editMode = true;
    return true;
  },

  /** يحفظ تعديلات وردية معتمدة سابقاً */
  saveEdits() {
    if (!this.state || !this.state._editMode) return false;
    const errors = Calc.validateProducts(this.state.products);
    if (errors.length) { Utils.toast(errors[0], "danger"); return false; }
    const arch = DB.getArchive();
    if (!arch.length) return false;
    const edited = Shift._stripImage(this.state);
    delete edited._editMode;
    edited.editedAt = new Date().toISOString();
    arch[0] = edited;
    DB.saveArchive(arch);

    // إعادة حساب الترحيل
    const newRollover = Shift.buildRollover(edited);
    DB.saveRollover(newRollover);

    // إن وُجدت وردية لاحقة نشطة، حدّث أرصدة بدايتها وفق الترحيل الجديد
    const active = DB.getActiveShift();
    if (active) {
      active.cash.start  = newRollover.cashDelivered;
      active.visa.start  = newRollover.visaEnd;
      active.click.start = newRollover.clickEnd;
      active.products.forEach((p) => {
        const v = newRollover.productsDeliveredByName?.[p.name];
        if (v !== undefined) p.received = v;
      });
      DB.saveActiveShift(Shift._stripImage(active));
    }

    DB.pushAudit({ action: "تعديل وردية معتمدة", user: edited.employee, details: edited.id });
    this.state = null;
    return true;
  },
};
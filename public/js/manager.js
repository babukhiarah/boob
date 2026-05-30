/* ============================================================
   manager.js
   لوحة المدير: اعتماد/رفض، إعادة فتح، حذف، مستودع، إعدادات،
   Backup/Restore، Audit log
   ============================================================ */

const MGR = {
  authed: false,

  login() {
    const s = DB.getSettings();
    const pw = prompt("كلمة سر المدير:");
    if (pw === null) return false;
    if (pw !== s.managerPassword) { Utils.toast("كلمة السر غير صحيحة", "danger"); return false; }
    this.authed = true;
    sessionStorage.setItem("ms_mgr_auth", "1");
    return true;
  },

  ensureAuth() {
    if (sessionStorage.getItem("ms_mgr_auth") === "1") { this.authed = true; return true; }
    return this.login();
  },
};

document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("mgrRoot")) return;
  if (!MGR.ensureAuth()) { document.getElementById("mgrRoot").innerHTML = '<div class="alert alert-warning">يلزم تسجيل دخول المدير</div>'; return; }
  renderMgr();
});

function renderMgr() {
  const root = document.getElementById("mgrRoot");
  const active = DB.getActiveShift();
  const settings = DB.getSettings();
  root.innerHTML = `
    <ul class="nav nav-tabs mb-3" id="mgrTabs">
      <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tabShift">الوردية الحالية</button></li>
      <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabWh">المستودع</button></li>
      <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabSettings">الإعدادات</button></li>
      <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabBackup">Backup / Restore</button></li>
      <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabAudit">Audit Log</button></li>
    </ul>
    <div class="tab-content">
      <div class="tab-pane fade show active" id="tabShift">${shiftReviewPane(active)}</div>
      <div class="tab-pane fade" id="tabWh">${warehousePane()}</div>
      <div class="tab-pane fade" id="tabSettings">${settingsPane(settings)}</div>
      <div class="tab-pane fade" id="tabBackup">${backupPane()}</div>
      <div class="tab-pane fade" id="tabAudit">${auditPane()}</div>
    </div>
  `;
  bindMgr();
}

/* ---------- Shift review ---------- */
function shiftReviewPane(sh) {
  if (!sh) return '<div class="alert alert-info">لا توجد وردية نشطة حالياً</div>';
  const sum = Calc.summary(sh);
  return `
    <div class="card card-soft mb-3">
      <div class="card-header card-header-brand d-flex justify-content-between">
        <span>وردية ${Utils.shiftLabel(sh.shiftKey)} — ${sh.employee}</span>
        <span class="badge-status ${sh.status}">${sh.status}</span>
      </div>
      <div class="card-body">
        <div class="row g-3 mb-3">
          ${statTile("المبيعات", Utils.fmt(sum.sales))}
          ${statTile("الكاش المتوقع", Utils.fmt(sum.expected))}
          ${statTile("المسلَّم", Utils.fmt(sh.cash.delivered))}
          ${statTile("الفرق", Utils.fmt(sum.diff), sum.diff < 0 ? "bad" : (sum.diff > 0 ? "warn" : ""))}
          ${statTile("المصاريف", Utils.fmt(sum.expenses))}
          ${statTile("المدفوعات", Utils.fmt(sum.payments))}
        </div>

        <div class="row">
          <div class="col-md-6">
            <h6 class="text-brand">تفاصيل المنتجات</h6>
            <div class="table-responsive" style="max-height:340px;overflow:auto">
              <table class="table table-sm table-soft">
                <thead><tr><th>المنتج</th><th>سعر</th><th>مستلم</th><th>إضافة</th><th>تسليم</th><th>مباع</th><th>قيمة</th></tr></thead>
                <tbody>
                  ${sh.products.map(p=>{const c=Calc.productLine(p);return `<tr><td>${p.name}</td><td>${Utils.fmt(p.price)}</td><td>${p.received}</td><td>${p.added}</td><td>${p.delivered===""?"-":p.delivered}</td><td>${c.sold}</td><td>${Utils.fmt(c.value)}</td></tr>`}).join("")}
                </tbody>
              </table>
            </div>
          </div>
          <div class="col-md-6 text-center">
            <h6 class="text-brand">صورة الجرد</h6>
            ${sh.inventoryImage ? `<img src="${sh.inventoryImage}" class="inventory-img-preview">` : '<div class="text-muted">لا توجد صورة</div>'}
          </div>
        </div>

        <div class="divider-soft"></div>
        <div class="d-flex flex-wrap gap-2">
          ${sh.status === "pending" ? `
            <button id="btnApprove" class="btn btn-brand">اعتماد الوردية</button>
            <button id="btnReject"  class="btn btn-outline-danger">رفض</button>
          ` : ""}
          ${sh.status === "approved" ? `
            <button id="btnReopen" class="btn btn-outline-brand">إعادة فتح</button>
          ` : ""}
          <button id="btnPdf"    class="btn btn-outline-brand">تصدير PDF</button>
          <button id="btnTxt"    class="btn btn-outline-brand">تصدير TXT</button>
          <button id="btnEmail"  class="btn btn-outline-brand">إرسال PDF للإيميل</button>
          <button id="btnDelete" class="btn btn-outline-danger ms-auto">حذف الوردية</button>
        </div>
      </div>
    </div>`;
}
function statTile(label, value, mod="") {
  return `<div class="col-6 col-md-3 col-lg-2"><div class="stat-tile ${mod}"><div class="label">${label}</div><div class="value">${value}</div></div></div>`;
}

/* ---------- Warehouse ---------- */
function warehousePane() {
  const items = DB.getWarehouse();
  return `
    <div class="card card-soft">
      <div class="card-header card-header-brand">المستودع اليدوي</div>
      <div class="card-body">
        <div class="row g-2 mb-3">
          <div class="col-md-4"><input id="whName" class="form-control" placeholder="اسم الصنف"></div>
          <div class="col-md-3"><input id="whQty" type="number" class="form-control" placeholder="الكمية"></div>
          <div class="col-md-3">
            <select id="whUnit" class="form-select">
              <option value="box">صندوق</option>
              <option value="unit">حبة</option>
            </select>
          </div>
          <div class="col-md-2"><button id="btnWhAdd" class="btn btn-brand w-100">إضافة</button></div>
        </div>
        <table class="table table-soft">
          <thead><tr><th>الصنف</th><th>الكمية</th><th>الوحدة</th><th></th></tr></thead>
          <tbody>
            ${items.length ? items.map((it,i)=>`<tr><td>${it.name}</td><td>${it.qty}</td><td>${it.unit==="box"?"صندوق":"حبة"}</td><td><button class="btn btn-sm btn-outline-danger" data-wh-del="${i}">حذف</button></td></tr>`).join("") : '<tr><td colspan="4" class="text-muted text-center">لا أصناف</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

/* ---------- Settings ---------- */
function settingsPane(s) {
  return `
    <div class="card card-soft"><div class="card-header card-header-brand">إعدادات النظام</div><div class="card-body">
      <div class="row g-3">
        <div class="col-md-6"><label class="form-label">اسم الفرع</label><input id="setBranch" class="form-control" value="${s.branch}"></div>
        <div class="col-md-6"><label class="form-label">اسم المدير</label><input id="setMgrName" class="form-control" value="${s.managerName}"></div>
        <div class="col-md-6"><label class="form-label">إيميل المدير</label><input id="setMgrEmail" type="email" class="form-control" value="${s.managerEmail||""}"></div>
        <div class="col-md-6"><label class="form-label">كلمة سر المدير</label><input id="setMgrPw" class="form-control" value="${s.managerPassword}"></div>
        <div class="col-12"><hr><h6 class="text-brand">إعدادات EmailJS (مجاناً) لإرسال PDF</h6></div>
        <div class="col-md-4"><label class="form-label">Public Key</label><input id="setEjsPk" class="form-control" value="${s.emailjs?.publicKey||""}"></div>
        <div class="col-md-4"><label class="form-label">Service ID</label><input id="setEjsSv" class="form-control" value="${s.emailjs?.serviceId||""}"></div>
        <div class="col-md-4"><label class="form-label">Template ID</label><input id="setEjsTm" class="form-control" value="${s.emailjs?.templateId||""}"></div>
        <div class="col-12"><button id="btnSaveSettings" class="btn btn-brand">حفظ الإعدادات</button></div>
      </div>
    </div></div>`;
}

/* ---------- Backup ---------- */
function backupPane() {
  return `
    <div class="card card-soft"><div class="card-header card-header-brand">Backup / Restore</div><div class="card-body">
      <button id="btnBackup" class="btn btn-brand me-2">تنزيل backup.json</button>
      <label class="btn btn-outline-brand mb-0">استعادة backup.json<input id="restoreFile" type="file" accept="application/json" hidden></label>
    </div></div>`;
}

/* ---------- Audit ---------- */
function auditPane() {
  const logs = DB.getAudit();
  return `
    <div class="card card-soft"><div class="card-header card-header-brand">سجل العمليات</div><div class="card-body">
      <table class="table table-soft"><thead><tr><th>الوقت</th><th>المستخدم</th><th>الحركة</th><th>تفاصيل</th></tr></thead><tbody>
        ${logs.length ? logs.map(l=>`<tr><td>${new Date(l.time).toLocaleString("ar-EG",{hour12:false})}</td><td>${l.user||"-"}</td><td>${l.action}</td><td>${l.details||""}</td></tr>`).join("") : '<tr><td colspan="4" class="text-muted text-center">لا سجلات</td></tr>'}
      </tbody></table>
    </div></div>`;
}

/* ---------- Bindings ---------- */
function bindMgr() {
  const sh = DB.getActiveShift();
  const settings = DB.getSettings();

  // Shift actions
  on("btnApprove", "click", () => {
    if (!sh) return;
    sh.status = "approved";
    sh.approvedAt = new Date().toISOString();
    sh.approvedBy = settings.managerName;
    // نحتفظ بالصورة في الذاكرة فقط (لتمريرها لـ PDF)، ولا نكتبها في LocalStorage
    const tempImg = sh.inventoryImage || null;
    const shStripped = { ...sh }; delete shStripped.inventoryImage;
    DB.saveActiveShift(shStripped);

    // archive بدون صورة
    const arch = DB.getArchive(); arch.unshift(shStripped); DB.saveArchive(arch);

    // rollover
    const rolloverData = {
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
    DB.saveRollover(rolloverData);

    DB.pushAudit({ action: "اعتماد وردية", user: settings.managerName, details: sh.id });
    // auto-generate PDF and try to email (don't break approval if these fail)
    const shForPdf = { ...shStripped, inventoryImage: tempImg };
    try { PDFGen.save(shForPdf, settings.managerName, sh.approvedAt); } catch (e) { console.error("PDF save failed:", e); }
    try { PDFGen.emailToManager(shForPdf, settings.managerName, sh.approvedAt); } catch (e) { console.error("Email failed:", e); }

    DB.clearActiveShift();
    Utils.toast("تم اعتماد الوردية");
    renderMgr();
  });
  on("btnReject", "click", () => {
    if (!sh) return;
    const reason = prompt("سبب الرفض:") || "";
    sh.status = "rejected"; sh.rejectReason = reason;
    DB.saveActiveShift(sh);
    DB.pushAudit({ action: "رفض وردية", user: settings.managerName, details: `${sh.id} - ${reason}` });
    Utils.toast("تم رفض الوردية", "warning");
    renderMgr();
  });
  on("btnReopen", "click", () => {
    if (!sh) return;
    sh.status = "open"; DB.saveActiveShift(sh);
    DB.pushAudit({ action: "إعادة فتح وردية", user: settings.managerName, details: sh.id });
    renderMgr();
  });
  on("btnPdf", "click", () => sh && PDFGen.save(sh, settings.managerName, sh.approvedAt));
  on("btnTxt", "click", () => sh && exportTxt(sh));
  on("btnEmail","click", () => sh && PDFGen.emailToManager(sh, settings.managerName, sh.approvedAt));
  on("btnDelete","click", () => {
    if (!sh || !confirm("حذف الوردية الحالية؟")) return;
    DB.pushAudit({ action: "حذف وردية", user: settings.managerName, details: sh.id });
    DB.clearActiveShift(); renderMgr();
  });

  // Warehouse
  on("btnWhAdd","click", () => {
    const name = val("whName"); const qty = Utils.n(val("whQty")); const unit = val("whUnit");
    if (!name || qty <= 0) { Utils.toast("أدخل اسم وكمية صحيحة","warning"); return; }
    const list = DB.getWarehouse(); list.push({ name, qty, unit }); DB.saveWarehouse(list);
    renderMgr();
  });
  document.querySelectorAll("[data-wh-del]").forEach(b => b.onclick = () => {
    const list = DB.getWarehouse(); list.splice(+b.dataset.whDel, 1); DB.saveWarehouse(list); renderMgr();
  });

  // Settings
  on("btnSaveSettings","click", () => {
    const ns = {
      branch: val("setBranch"),
      managerName: val("setMgrName"),
      managerEmail: val("setMgrEmail"),
      managerPassword: val("setMgrPw"),
      emailjs: { publicKey: val("setEjsPk"), serviceId: val("setEjsSv"), templateId: val("setEjsTm") },
    };
    DB.saveSettings(ns); Utils.toast("تم حفظ الإعدادات");
  });

  // Backup / Restore
  on("btnBackup","click", () => {
    const data = {};
    Object.values(STORAGE).forEach(k => { data[k] = DB.get(k, null); });
    Utils.download("backup.json", JSON.stringify(data, null, 2));
    DB.pushAudit({ action: "Backup", user: settings.managerName });
  });
  const rf = document.getElementById("restoreFile");
  if (rf) rf.onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        Object.entries(data).forEach(([k,v]) => v !== null && localStorage.setItem(k, JSON.stringify(v)));
        DB.pushAudit({ action: "Restore", user: settings.managerName });
        Utils.toast("تمت الاستعادة"); renderMgr();
      } catch (err) { Utils.toast("ملف غير صالح","danger"); }
    };
    reader.readAsText(file);
  };
}

function on(id, ev, fn) { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); }
function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ""; }

function exportTxt(sh) {
  const sum = Calc.summary(sh);
  const lines = [
    `الفرع: ${sh.branch}`,
    `الموظف: ${sh.employee}`,
    `الوردية: ${Utils.shiftLabel(sh.shiftKey)}`,
    `التاريخ: ${Utils.dateOnly(sh.createdAt)}`,
    `الكاش بداية: ${Utils.fmt(sh.cash.start)}`,
    `الكاش تسليم: ${Utils.fmt(sh.cash.delivered)}`,
    `المبيعات: ${Utils.fmt(sum.sales)}`,
    `فرق الفيزا: ${Utils.fmt(sum.visaDiff)}`,
    `فرق كليك: ${Utils.fmt(sum.clickDiff)}`,
    `الديون: ${Utils.fmt(sh.debts)}`,
    `الواصل: ${Utils.fmt(sh.incoming)}`,
    `المصاريف: ${Utils.fmt(sum.expenses)}`,
    `المدفوعات: ${Utils.fmt(sum.payments)}`,
    `الكاش المتوقع: ${Utils.fmt(sum.expected)}`,
    `الفرق: ${Utils.fmt(sum.diff)}`,
    ``,
    `--- المنتجات ---`,
    ...sh.products.map(p => { const c = Calc.productLine(p); return `${p.name} | سعر ${Utils.fmt(p.price)} | مستلم ${p.received} | إضافة ${p.added} | تسليم ${p.delivered} | مباع ${c.sold} | قيمة ${Utils.fmt(c.value)}`; }),
  ];
  Utils.download(`shift_${sh.id}.txt`, lines.join("\n"), "text/plain;charset=utf-8");
  DB.pushAudit({ action: "تصدير TXT", user: DB.getSettings().managerName, details: sh.id });
}
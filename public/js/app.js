/* ============================================================
   app.js
   منطق واجهة الموظف (index.html)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // initialize defaults
  DB.getProducts(); DB.getSettings();

  Shift.load();
  renderRoot();
});

// آخر وردية مُسلَّمة في هذه الجلسة لعرض شاشة التقرير بعد التسليم
let lastReportShift = null;

function renderRoot() {
  const root = document.getElementById("appRoot");
  if (!root) return;

  // إذا طلبنا عرض شاشة التقرير بعد التسليم
  if (lastReportShift) {
    root.innerHTML = reportScreen(lastReportShift);
    bindReportScreen();
    return;
  }

  // لا تعِد التحميل إذا كنا في وضع التعديل
  if (!Shift.state || !Shift.state._editMode) Shift.load();
  if (!Shift.state || Shift.state.status === "approved") {
    DB.clearActiveShift();
    Shift.state = null;
    root.innerHTML = startScreen();
    document.getElementById("btnStartShift").onclick = onStartShift;
    const btnEdit = document.getElementById("btnEditLast");
    if (btnEdit) btnEdit.onclick = onEditLast;
    return;
  }
  root.innerHTML = shiftScreen();
  bindShiftScreen();
}

/* ---------- Start screen ---------- */
function startScreen() {
  const s = DB.getSettings();
  const canEdit = Shift.canEditLastApproved();
  const last = canEdit ? DB.getArchive()[0] : null;
  return `
    <div class="row justify-content-center fade-in">
      <div class="col-lg-7">
        <div class="start-hero text-center mb-4">
          <span class="branch-pill">${s.branch}</span>
          <h1>نظام إدارة الورديات</h1>
          <p class="mb-0 opacity-75">ابدأ ورديتك وأدخل البيانات بسهولة واحترافية</p>
        </div>
        <div class="card card-soft">
          <div class="card-header card-header-brand">بدء وردية جديدة</div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label">اسم الموظف</label>
              <input id="empName" class="form-control" placeholder="مثال: أحمد">
            </div>
            <div class="mb-3">
              <label class="form-label">اختر الوردية</label>
              <select id="shiftKey" class="form-select">
                <option value="">-- اختر --</option>
                <option value="morning">صباحية</option>
                <option value="evening">مسائية</option>
                <option value="night">ليلية</option>
              </select>
            </div>
            <button id="btnStartShift" class="btn btn-brand w-100 py-2">بدء الوردية</button>
          </div>
        </div>
        ${last ? `
        <div class="card card-soft mt-3">
          <div class="card-body d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <div><strong>آخر وردية معتمدة:</strong> ${Utils.shiftLabel(last.shiftKey)} — ${last.employee}</div>
              <small class="text-muted">يمكن تعديلها قبل اعتماد الوردية التالية</small>
            </div>
            <button id="btnEditLast" class="btn btn-outline-brand">تعديل آخر وردية</button>
          </div>
        </div>` : ""}
      </div>
    </div>
  `;
}
function onStartShift() {
  const name = document.getElementById("empName").value.trim();
  const key  = document.getElementById("shiftKey").value;
  if (Shift.start(name, key)) renderRoot();
}
function onEditLast() {
  if (Shift.startEditLast()) renderRoot();
}

/* ---------- Shift screen ---------- */
function shiftScreen() {
  const sh = Shift.state;
  const sum = Calc.summary(sh);
  const editing = !!sh._editMode;
  const statusBadge = ({
    open: '<span class="badge-status open">مفتوحة</span>',
    pending: '<span class="badge-status pending">بانتظار اعتماد المدير</span>',
    rejected: '<span class="badge-status rejected">مرفوضة</span>',
    approved: '<span class="badge-status approved">معتمدة — وضع تعديل</span>',
  })[sh.status] || "";

  const readOnly = (sh.status !== "open" && !editing) ? "disabled" : "";

  return `
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 fade-in">
      <div>
        <h3 class="mb-1 text-brand">وردية ${Utils.shiftLabel(sh.shiftKey)} — ${sh.employee}</h3>
        <small class="text-muted">${sh.branch} • بدأت: ${Utils.dateOnly(sh.createdAt)} ${Utils.timeOnly(sh.createdAt)}</small>
      </div>
      <div>${statusBadge}</div>
    </div>

    ${sh.status === "rejected" ? `
      <div class="alert alert-danger">
        <strong>تم رفض الوردية:</strong> ${sh.rejectReason || "أعد المراجعة وأرسلها مجدداً"}
      </div>` : ""}

    <div class="row g-3 mb-3">
      ${statTile("المبيعات", Utils.fmt(sum.sales))}
      ${statTile("الكاش المتوقع", Utils.fmt(sum.expected))}
      ${statTile("الفرق", Utils.fmt(sum.diff), sum.diff < 0 ? "bad" : (sum.diff > 0 ? "warn" : ""))}
      ${statTile("فرق الفيزا", Utils.fmt(sum.visaDiff))}
      ${statTile("فرق كليك", Utils.fmt(sum.clickDiff))}
    </div>

    <ul class="nav nav-tabs mb-3" id="shiftTabs">
      <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tabInfo">معلومات الوردية</button></li>
      <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabInv">الجرد</button></li>
    </ul>

    <div class="tab-content">
      <div class="tab-pane fade show active" id="tabInfo">
        ${infoTab(sh, readOnly)}
      </div>
      <div class="tab-pane fade" id="tabInv">
        ${inventoryTab(sh, readOnly)}
      </div>
    </div>

    <div class="d-flex flex-wrap gap-2 mt-4">
      ${editing ? `
        <button id="btnSaveEdits" class="btn btn-brand">حفظ التعديلات</button>
        <button id="btnCancelEdit" class="btn btn-outline-secondary">إلغاء</button>
      ` : sh.status === "open" ? `
        <button id="btnSave" class="btn btn-outline-brand">حفظ مؤقت</button>
        <button id="btnSubmit" class="btn btn-brand">تسليم واعتماد الوردية</button>
      ` : `
        <a href="manager.html" class="btn btn-outline-brand">فتح لوحة المدير</a>
      `}
    </div>
  `;
}

function statTile(label, value, mod = "") {
  return `<div class="col-6 col-md-3 col-lg-2-4"><div class="stat-tile ${mod}"><div class="label">${label}</div><div class="value">${value}</div></div></div>`;
}

function infoTab(sh, ro) {
  return `
    <div class="row g-3">
      <div class="col-md-6">
        <div class="card card-soft">
          <div class="card-header card-header-brand">الكاش</div>
          <div class="card-body">
            <label class="form-label">استلام بداية الوردية</label>
            <input ${ro} type="number" step="0.01" class="form-control mb-2" data-bind="cash.start" value="${sh.cash.start}">
            <label class="form-label">تسليم نهاية الوردية</label>
            <input ${ro} type="number" step="0.01" class="form-control" data-bind="cash.delivered" value="${sh.cash.delivered}">
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card card-soft">
          <div class="card-header card-header-brand">الفيزا</div>
          <div class="card-body">
            <label class="form-label">رصيد بداية</label>
            <input ${ro} type="number" step="0.01" class="form-control mb-2" data-bind="visa.start" value="${sh.visa.start}">
            <label class="form-label">رصيد نهاية</label>
            <input ${ro} type="number" step="0.01" class="form-control" data-bind="visa.end" value="${sh.visa.end}">
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card card-soft">
          <div class="card-header card-header-brand">كليك</div>
          <div class="card-body">
            <label class="form-label">رصيد بداية</label>
            <input ${ro} type="number" step="0.01" class="form-control mb-2" data-bind="click.start" value="${sh.click.start}">
            <label class="form-label">رصيد نهاية</label>
            <input ${ro} type="number" step="0.01" class="form-control" data-bind="click.end" value="${sh.click.end}">
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card card-soft">
          <div class="card-header card-header-brand">الديون والواصل</div>
          <div class="card-body">
            <label class="form-label">الديون (تنقص من الكاش المتوقع)</label>
            <input ${ro} type="number" step="0.01" class="form-control mb-2" data-bind="debts" value="${sh.debts}">
            <label class="form-label">الواصل (يضاف للكاش المتوقع)</label>
            <input ${ro} type="number" step="0.01" class="form-control" data-bind="incoming" value="${sh.incoming}">
          </div>
        </div>
      </div>
      <div class="col-12">
        <div class="card card-soft">
          <div class="card-header card-header-brand d-flex justify-content-between align-items-center">
            <span>المصاريف والمدفوعات</span>
            <a href="expenses.html" class="btn btn-sm btn-outline-brand">إدارة المصاريف ←</a>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <h6 class="text-brand">المصاريف</h6>
                ${(sh.expenses||[]).length ? sh.expenses.map(e=>`<div class="d-flex justify-content-between border-bottom py-1"><span>${e.note||"-"}</span><strong>${Utils.fmt(e.amount)}</strong></div>`).join("") : '<div class="text-muted small">لا مصاريف</div>'}
              </div>
              <div class="col-md-6">
                <h6 class="text-brand">المدفوعات</h6>
                ${(sh.payments||[]).length ? sh.payments.map(e=>`<div class="d-flex justify-content-between border-bottom py-1"><span>${e.note||"-"} <small class="text-muted">(${e.type||""})</small></span><strong>${Utils.fmt(e.amount)}</strong></div>`).join("") : '<div class="text-muted small">لا مدفوعات</div>'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="card card-soft">
          <div class="card-header card-header-brand">صورة الجرد (إجبارية)</div>
          <div class="card-body text-center">
            ${sh.inventoryImage
              ? `<img src="${sh.inventoryImage}" class="inventory-img-preview mb-2"><br>`
              : '<div class="text-muted mb-2">لم يتم رفع صورة بعد</div>'}
            <div class="d-flex flex-wrap gap-2 justify-content-center">
              <label class="btn btn-brand mb-0">
                <i class="bi bi-camera"></i> التقاط بالكاميرا
                <input ${ro} id="invImgCam" type="file" accept="image/*" capture="environment" hidden>
              </label>
              <label class="btn btn-outline-brand mb-0">
                <i class="bi bi-image"></i> اختيار من الجهاز
                <input ${ro} id="invImg" type="file" accept="image/png,image/jpeg,image/jpg" hidden>
              </label>
            </div>
            <small class="text-muted d-block mt-2">PNG / JPG / JPEG فقط</small>
          </div>
        </div>
      </div>
    </div>
  `;
}

function inventoryTab(sh, ro) {
  return `
    <div class="row g-3">
      ${sh.products.map((p, i) => {
        const { available, sold, value } = Calc.productLine(p);
        return `
        <div class="col-12 col-sm-6 col-lg-4">
          <div class="product-card">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6>${p.name}</h6>
              <span class="price-chip">${Utils.fmt(p.price)}</span>
            </div>
            <div class="row g-2">
              <div class="col-6">
                <label class="form-label small">المستلم</label>
                <input ${ro} type="number" step="1" class="form-control form-control-sm" data-prod="${i}" data-field="received" value="${p.received}">
              </div>
              <div class="col-6">
                <label class="form-label small">الإضافة</label>
                <input ${ro} type="number" step="1" class="form-control form-control-sm" data-prod="${i}" data-field="added" value="${p.added}">
              </div>
              <div class="col-12">
                <label class="form-label small">التسليم نهاية الوردية</label>
                <input ${ro} type="number" step="1" class="form-control form-control-sm" data-prod="${i}" data-field="delivered" value="${p.delivered}">
              </div>
            </div>
            <div class="sold-line d-flex justify-content-between">
              <span>المتاح: <strong>${available}</strong> • المباع: <strong>${sold}</strong></span>
              <span>القيمة: <strong>${Utils.fmt(value)}</strong></span>
            </div>
          </div>
        </div>`;
      }).join("")}
    </div>
  `;
}

function bindShiftScreen() {
  const editing = !!(Shift.state && Shift.state._editMode);
  // bind primitive fields
  document.querySelectorAll("[data-bind]").forEach(inp => {
    inp.addEventListener("input", () => {
      const path = inp.getAttribute("data-bind").split(".");
      let obj = Shift.state;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      const val = inp.type === "number" ? (inp.value === "" ? "" : Utils.n(inp.value)) : inp.value;
      obj[path[path.length-1]] = val;
      if (!editing) Shift.save();
      updateStats();
    });
  });

  // bind product inputs
  document.querySelectorAll("[data-prod]").forEach(inp => {
    inp.addEventListener("input", () => {
      const idx = +inp.getAttribute("data-prod");
      const field = inp.getAttribute("data-field");
      const val = inp.value === "" ? "" : Utils.n(inp.value);
      Shift.state.products[idx][field] = val;
      if (!editing) Shift.save();
      updateStats();
    });
  });

  // image upload (file + camera)
  ["invImg", "invImgCam"].forEach((id) => {
    const inp = document.getElementById(id);
    if (!inp) return;
    inp.addEventListener("change", async (e) => {
      try {
        const data = await Utils.readImageAsDataURL(e.target.files[0]);
        // الصورة تُحفظ في الذاكرة فقط — ليست في LocalStorage
        Shift._tempImage = data;
        Shift.state.inventoryImage = data;
        if (!editing) Shift.save(); // save() يستثني الصورة تلقائياً
        DB.pushAudit({ action: "رفع صورة جرد", user: Shift.state.employee, details: Shift.state.id });
        renderRoot();
      } catch (err) { Utils.toast(err.message, "danger"); }
    });
  });

  // save / submit
  const btnSave = document.getElementById("btnSave");
  if (btnSave) btnSave.onclick = () => { Shift.save(); Utils.toast("تم الحفظ"); };
  const btnSubmit = document.getElementById("btnSubmit");
  if (btnSubmit) btnSubmit.onclick = () => {
    // نلتقط مرجعًا للوردية قبل أن يمسحها submit
    const before = Shift.state;
    const tempImg = Shift._tempImage;
    if (Shift.submitToManager()) {
      Utils.toast("تم تسليم واعتماد الوردية");
      // عرض شاشة التقرير العربي + أزرار واتساب/PDF
      // نُرفق الصورة من الذاكرة فقط (لن تُحفظ في التخزين)
      const base = (DB.getArchive()[0]) || before;
      lastReportShift = { ...base, inventoryImage: tempImg };
      renderRoot();
    }
  };
  const btnSaveEdits = document.getElementById("btnSaveEdits");
  if (btnSaveEdits) btnSaveEdits.onclick = () => {
    if (Shift.saveEdits()) {
      Utils.toast("تم حفظ التعديلات");
      renderRoot();
    }
  };
  const btnCancelEdit = document.getElementById("btnCancelEdit");
  if (btnCancelEdit) btnCancelEdit.onclick = () => {
    Shift.state = null;
    renderRoot();
  };
}

function updateStats() {
  const sum = Calc.summary(Shift.state);
  const tiles = document.querySelectorAll(".stat-tile .value");
  if (tiles.length >= 5) {
    tiles[0].textContent = Utils.fmt(sum.sales);
    tiles[1].textContent = Utils.fmt(sum.expected);
    tiles[2].textContent = Utils.fmt(sum.diff);
    tiles[3].textContent = Utils.fmt(sum.visaDiff);
    tiles[4].textContent = Utils.fmt(sum.clickDiff);
  }
  // refresh inventory sold/value lines
  document.querySelectorAll(".product-card").forEach((card, i) => {
    const { available, sold, value } = Calc.productLine(Shift.state.products[i]);
    const line = card.querySelector(".sold-line");
    if (line) line.innerHTML = `<span>المتاح: <strong>${available}</strong> • المباع: <strong>${sold}</strong></span><span>القيمة: <strong>${Utils.fmt(value)}</strong></span>`;
  });
}

/* ---------- Report screen (بعد تسليم الوردية) ---------- */
function reportScreen(sh) {
  // نص التقرير العربي الذي سيُرسَل لواتساب ويُعرَض على الشاشة
  const text = Report.buildText(sh);
  return `
    <div class="row justify-content-center fade-in">
      <div class="col-lg-8">
        <div class="card card-soft">
          <div class="card-header card-header-brand d-flex justify-content-between align-items-center">
            <span>تقرير الوردية</span>
            <span class="badge bg-success">تم الاعتماد</span>
          </div>
          <div class="card-body">
            <pre id="reportText" style="
              direction: rtl;
              text-align: right;
              font-family: 'Tajawal', sans-serif;
              font-size: 15px;
              line-height: 1.9;
              white-space: pre-wrap;
              background: #f8faf7;
              border: 1px solid #e3e8e0;
              border-radius: 10px;
              padding: 16px;
              margin: 0;
            ">${text.replace(/</g, "&lt;")}</pre>

            <div class="d-flex flex-wrap gap-2 mt-3">
              <button id="btnWhatsApp" class="btn btn-success">
                📱 إرسال واتساب
              </button>
              <button id="btnReportPdf" class="btn btn-brand">
                📄 تحميل PDF
              </button>
              <button id="btnReportClose" class="btn btn-outline-secondary ms-auto">
                إغلاق والعودة
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bindReportScreen() {
  const sh = lastReportShift;
  if (!sh) return;
  const btnWa = document.getElementById("btnWhatsApp");
  if (btnWa) btnWa.onclick = () => Report.sendWhatsApp(sh);
  const btnPdf = document.getElementById("btnReportPdf");
  if (btnPdf) btnPdf.onclick = () => Report.downloadPDF(sh);
  const btnClose = document.getElementById("btnReportClose");
  if (btnClose) btnClose.onclick = () => {
    // حذف الصورة من الذاكرة بعد انتهاء التقرير
    Shift._tempImage = null;
    if (lastReportShift) delete lastReportShift.inventoryImage;
    lastReportShift = null;
    renderRoot();
  };
}
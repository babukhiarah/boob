/* ============================================================
   archive.js
   صفحة الأرشيف - للمدير فقط
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("archRoot")) return;
  if (!MGR.ensureAuth()) {
    document.getElementById("archRoot").innerHTML = '<div class="alert alert-warning">يلزم تسجيل دخول المدير</div>'; return;
  }
  renderArchive();
});

function renderArchive() {
  const all = DB.getArchive();
  const q = (document.getElementById("qSearch")?.value || "").toLowerCase();
  const qDate = document.getElementById("qDate")?.value || "";
  const qShift = document.getElementById("qShift")?.value || "";

  const filtered = all.filter(sh => {
    if (q && !sh.employee.toLowerCase().includes(q)) return false;
    if (qShift && sh.shiftKey !== qShift) return false;
    if (qDate && !sh.createdAt.startsWith(qDate)) return false;
    return true;
  });

  document.getElementById("archRoot").innerHTML = `
    <div class="card card-soft mb-3"><div class="card-body">
      <div class="row g-2">
        <div class="col-md-4"><input id="qSearch" class="form-control" placeholder="بحث باسم الموظف" value="${q}"></div>
        <div class="col-md-3"><input id="qDate" type="date" class="form-control" value="${qDate}"></div>
        <div class="col-md-3">
          <select id="qShift" class="form-select">
            <option value="">كل الورديات</option>
            <option value="morning" ${qShift==="morning"?"selected":""}>صباحية</option>
            <option value="evening" ${qShift==="evening"?"selected":""}>مسائية</option>
            <option value="night" ${qShift==="night"?"selected":""}>ليلية</option>
          </select>
        </div>
        <div class="col-md-2"><button id="btnFilter" class="btn btn-brand w-100">فلترة</button></div>
      </div>
      <hr>
      <div class="d-flex flex-wrap gap-2">
        <button id="btnExportJson" class="btn btn-brand">📤 تصدير JSON</button>
        <label class="btn btn-outline-brand mb-0">📥 استيراد JSON<input id="importJsonFile" type="file" accept="application/json" hidden></label>
        <small class="text-muted ms-auto align-self-center">نسخة احتياطية كاملة لكل البيانات</small>
      </div>
    </div></div>

    ${filtered.length ? `
    <div class="table-responsive"><table class="table table-soft">
      <thead><tr><th>التاريخ</th><th>الوقت</th><th>الموظف</th><th>الوردية</th><th>المبيعات</th><th>الفرق</th><th>الحالة</th><th></th></tr></thead>
      <tbody>
        ${filtered.map(sh => {
          const s = Calc.summary(sh);
          return `<tr>
            <td>${Utils.dateOnly(sh.createdAt)}</td>
            <td>${Utils.timeOnly(sh.createdAt)}</td>
            <td>${sh.employee}</td>
            <td>${Utils.shiftLabel(sh.shiftKey)}</td>
            <td>${Utils.fmt(s.sales)}</td>
            <td>${Utils.fmt(s.diff)}</td>
            <td><span class="badge-status ${sh.status}">${sh.status}</span></td>
            <td>
              <button class="btn btn-sm btn-outline-brand" data-view="${sh.id}">عرض</button>
              <button class="btn btn-sm btn-outline-brand" data-pdf="${sh.id}">PDF</button>
              <button class="btn btn-sm btn-outline-danger" data-del="${sh.id}">حذف</button>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table></div>` : '<div class="alert alert-info">لا توجد ورديات مؤرشفة</div>'}

    <div class="modal fade" id="viewModal" tabindex="-1"><div class="modal-dialog modal-xl modal-dialog-scrollable"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">تفاصيل الوردية</h5><button class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body" id="viewBody"></div></div></div></div>
  `;

  document.getElementById("btnFilter").onclick = renderArchive;

  // Export / Import JSON
  const btnExp = document.getElementById("btnExportJson");
  if (btnExp) btnExp.onclick = () => {
    const data = {};
    Object.values(STORAGE).forEach(k => { data[k] = DB.get(k, null); });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    Utils.download(`backup_${stamp}.json`, JSON.stringify(data, null, 2));
    DB.pushAudit({ action: "تصدير JSON", user: DB.getSettings().managerName });
    Utils.toast("تم تصدير النسخة الاحتياطية");
  };
  const impFile = document.getElementById("importJsonFile");
  if (impFile) impFile.onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!confirm("سيتم استبدال جميع البيانات الحالية. متابعة؟")) { e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        Object.entries(data).forEach(([k, v]) => v !== null && localStorage.setItem(k, JSON.stringify(v)));
        DB.pushAudit({ action: "استيراد JSON", user: DB.getSettings().managerName });
        Utils.toast("تمت الاستعادة بنجاح");
        renderArchive();
      } catch (err) { Utils.toast("ملف JSON غير صالح", "danger"); }
    };
    reader.readAsText(file);
  };

  ["qSearch","qDate","qShift"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", renderArchive);
  });

  document.querySelectorAll("[data-view]").forEach(b => b.onclick = () => showShift(b.dataset.view));
  document.querySelectorAll("[data-pdf]").forEach(b => b.onclick = () => {
    const sh = DB.getArchive().find(s => s.id === b.dataset.pdf);
    if (sh) PDFGen.save(sh, sh.approvedBy, sh.approvedAt);
  });
  document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    if (!confirm("حذف الوردية من الأرشيف؟")) return;
    const arr = DB.getArchive().filter(s => s.id !== b.dataset.del);
    DB.saveArchive(arr);
    DB.pushAudit({ action: "حذف من الأرشيف", user: DB.getSettings().managerName, details: b.dataset.del });
    renderArchive();
  });
}

function showShift(id) {
  const sh = DB.getArchive().find(s => s.id === id);
  if (!sh) return;
  const s = Calc.summary(sh);
  document.getElementById("viewBody").innerHTML = `
    <div class="row g-3 mb-3">
      <div class="col-md-8">
        <h6 class="text-brand">${sh.branch} — ${sh.employee} — ${Utils.shiftLabel(sh.shiftKey)}</h6>
        <small class="text-muted">${Utils.dateOnly(sh.createdAt)} ${Utils.timeOnly(sh.createdAt)}</small>
        <div class="row g-2 mt-2">
          <div class="col-6 col-md-4"><div class="stat-tile"><div class="label">المبيعات</div><div class="value">${Utils.fmt(s.sales)}</div></div></div>
          <div class="col-6 col-md-4"><div class="stat-tile"><div class="label">الكاش المتوقع</div><div class="value">${Utils.fmt(s.expected)}</div></div></div>
          <div class="col-6 col-md-4"><div class="stat-tile ${s.diff<0?"bad":(s.diff>0?"warn":"")}"><div class="label">الفرق</div><div class="value">${Utils.fmt(s.diff)}</div></div></div>
        </div>
      </div>
      <div class="col-md-4 text-center">
        ${sh.inventoryImage ? `<img src="${sh.inventoryImage}" class="inventory-img-preview">` : '<div class="text-muted">لا صورة</div>'}
      </div>
    </div>
    <table class="table table-sm table-soft"><thead><tr><th>المنتج</th><th>سعر</th><th>مستلم</th><th>إضافة</th><th>تسليم</th><th>مباع</th><th>قيمة</th></tr></thead><tbody>
      ${sh.products.map(p=>{const c=Calc.productLine(p);return `<tr><td>${p.name}</td><td>${Utils.fmt(p.price)}</td><td>${p.received}</td><td>${p.added}</td><td>${p.delivered===""?"-":p.delivered}</td><td>${c.sold}</td><td>${Utils.fmt(c.value)}</td></tr>`}).join("")}
    </tbody></table>
  `;
  new bootstrap.Modal(document.getElementById("viewModal")).show();
}
/* ============================================================
   expenses.js
   صفحة المصاريف والمدفوعات
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("expRoot")) return;
  render();
});

function render() {
  const exp = DB.getExpenses();
  const pay = DB.getPayments();
  document.getElementById("expRoot").innerHTML = `
    <div class="row g-3">
      <div class="col-lg-6">
        <div class="card card-soft">
          <div class="card-header card-header-brand">المصاريف</div>
          <div class="card-body">
            <div class="row g-2 mb-3">
              <div class="col-7"><input id="eNote" class="form-control" placeholder="البيان"></div>
              <div class="col-3"><input id="eAmt" type="number" step="0.01" class="form-control" placeholder="المبلغ"></div>
              <div class="col-2"><button id="btnAddExp" class="btn btn-brand w-100">+</button></div>
            </div>
            ${listRows(exp, "exp")}
          </div>
        </div>
      </div>
      <div class="col-lg-6">
        <div class="card card-soft">
          <div class="card-header card-header-brand">المدفوعات</div>
          <div class="card-body">
            <div class="row g-2 mb-3">
              <div class="col-5"><input id="pNote" class="form-control" placeholder="البيان"></div>
              <div class="col-3">
                <select id="pType" class="form-select">
                  <option value="موزعين">موزعين</option>
                  <option value="مشتريات">مشتريات</option>
                  <option value="التزامات">التزامات</option>
                </select>
              </div>
              <div class="col-2"><input id="pAmt" type="number" step="0.01" class="form-control" placeholder="مبلغ"></div>
              <div class="col-2"><button id="btnAddPay" class="btn btn-brand w-100">+</button></div>
            </div>
            ${listRows(pay, "pay")}
          </div>
        </div>
      </div>
    </div>

    <div class="alert alert-info mt-4 small">
      المصاريف والمدفوعات المضافة هنا قبل بدء الوردية ستُرتبط تلقائياً بالوردية الجديدة.
    </div>
  `;

  document.getElementById("btnAddExp").onclick = () => {
    const note = val("eNote"); const amt = Utils.n(val("eAmt"));
    if (!note || amt <= 0) return Utils.toast("أدخل بيان ومبلغ","warning");
    const arr = DB.getExpenses(); arr.push({ id: Utils.uid(), note, amount: amt, time: new Date().toISOString() });
    DB.saveExpenses(arr); syncIntoShift(); render();
  };
  document.getElementById("btnAddPay").onclick = () => {
    const note = val("pNote"); const type = val("pType"); const amt = Utils.n(val("pAmt"));
    if (!note || amt <= 0) return Utils.toast("أدخل بيان ومبلغ","warning");
    const arr = DB.getPayments(); arr.push({ id: Utils.uid(), note, type, amount: amt, time: new Date().toISOString() });
    DB.savePayments(arr); syncIntoShift(); render();
  };
  document.querySelectorAll("[data-del-exp]").forEach(b => b.onclick = () => {
    const arr = DB.getExpenses(); arr.splice(+b.dataset.delExp,1); DB.saveExpenses(arr); syncIntoShift(); render();
  });
  document.querySelectorAll("[data-del-pay]").forEach(b => b.onclick = () => {
    const arr = DB.getPayments(); arr.splice(+b.dataset.delPay,1); DB.savePayments(arr); syncIntoShift(); render();
  });
}

function listRows(arr, kind) {
  if (!arr.length) return '<div class="text-muted small">لا عناصر</div>';
  return `<table class="table table-sm table-soft"><thead><tr><th>البيان</th>${kind==="pay"?"<th>النوع</th>":""}<th>المبلغ</th><th></th></tr></thead><tbody>
    ${arr.map((e,i)=>`<tr><td>${e.note}</td>${kind==="pay"?`<td>${e.type||"-"}</td>`:""}<td>${Utils.fmt(e.amount)}</td><td><button class="btn btn-sm btn-outline-danger" data-del-${kind}="${i}">×</button></td></tr>`).join("")}
  </tbody></table>`;
}

function val(id){ const el=document.getElementById(id); return el?el.value.trim():""; }

function syncIntoShift() {
  const sh = DB.getActiveShift();
  if (!sh || sh.status !== "open") return;
  sh.expenses = DB.getExpenses();
  sh.payments = DB.getPayments();
  DB.saveActiveShift(sh);
}
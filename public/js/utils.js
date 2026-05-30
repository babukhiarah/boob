/* ============================================================
   utils.js
   أدوات مساعدة عامة
   ============================================================ */

const Utils = {
  /** تنسيق رقم بمنزلتين عشريتين */
  n(v) {
    const x = parseFloat(v);
    return isNaN(x) ? 0 : x;
  },
  fmt(v) { return Utils.n(v).toFixed(2); },

  /** تاريخ ووقت مقروء */
  nowStr() {
    const d = new Date();
    return d.toLocaleString("ar-EG", { hour12: false });
  },
  dateOnly(iso) {
    try { return new Date(iso).toLocaleDateString("ar-EG"); }
    catch (e) { return iso; }
  },
  timeOnly(iso) {
    try { return new Date(iso).toLocaleTimeString("ar-EG", { hour12: false }); }
    catch (e) { return iso; }
  },

  /** UID بسيط */
  uid() {
    return "id_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  /** Toast بسيط عبر Bootstrap */
  toast(msg, type = "success") {
    const id = "toast_" + Date.now();
    const bg = { success: "bg-success", danger: "bg-danger", warning: "bg-warning text-dark", info: "bg-info text-dark" }[type] || "bg-success";
    const wrap = document.getElementById("toastWrap") || (() => {
      const w = document.createElement("div");
      w.id = "toastWrap";
      w.className = "toast-container position-fixed top-0 start-50 translate-middle-x p-3";
      w.style.zIndex = 1080;
      document.body.appendChild(w);
      return w;
    })();
    const html = `
      <div id="${id}" class="toast align-items-center text-white ${bg} border-0" role="alert">
        <div class="d-flex">
          <div class="toast-body">${msg}</div>
          <button type="button" class="btn-close btn-close-white ms-2 me-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>`;
    wrap.insertAdjacentHTML("beforeend", html);
    const el = document.getElementById(id);
    const t = new bootstrap.Toast(el, { delay: 3000 });
    t.show();
    el.addEventListener("hidden.bs.toast", () => el.remove());
  },

  /** قراءة ملف صورة كـ DataURL مع التحقق من النوع */
  readImageAsDataURL(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error("لا يوجد ملف"));
      const okTypes = ["image/png", "image/jpeg", "image/jpg"];
      if (!okTypes.includes(file.type)) {
        return reject(new Error("الصيغة غير مدعومة. PNG / JPG / JPEG فقط"));
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  },

  /** تحميل ملف */
  download(filename, content, mime = "application/json") {
    const blob = (content instanceof Blob) ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  },

  /** تأكيد حركي */
  confirm(msg) { return window.confirm(msg); },

  /** اسم الوردية بالعربي */
  shiftLabel(key) {
    return ({ morning: "صباحية", evening: "مسائية", night: "ليلية" })[key] || key;
  },
};
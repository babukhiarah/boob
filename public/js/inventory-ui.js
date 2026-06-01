/* ============================================================
   inventory-ui.js
   - UI للعرض المصنف للمنتجات بأكورديون/فئات قابلة للتوسع
   - دعم كامل للـ RTL والجوال
   - تكامل سلس مع نظام الجرد القائم
   ============================================================ */

const InventoryUI = {
  /** ينشئ HTML للفئة الواحدة (اكورديون) */
  renderCategory(category, shiftProducts, readOnly = "") {
    const categoryId = `cat-${category.id}`;
    const categoryProducts = shiftProducts.filter(p => 
      category.items.some(item => item.name === p.name)
    );

    return `
      <div class="inventory-category mb-3">
        <div class="category-header" data-toggle="collapse" data-target="#${categoryId}" aria-expanded="true">
          <span class="category-icon">${category.icon}</span>
          <span class="category-title">${category.name}</span>
          <span class="category-count badge bg-brand">${categoryProducts.length}</span>
          <span class="collapse-icon">▼</span>
        </div>
        <div id="${categoryId}" class="collapse show">
          <div class="category-items">
            ${categoryProducts.map((p, i) => {
              const globalIdx = shiftProducts.findIndex(prod => prod.name === p.name);
              const { available, sold, value } = Calc.productLine(p);
              return `
              <div class="product-card">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <h6>${p.name}</h6>
                  <span class="price-chip">${Utils.fmt(p.price)}</span>
                </div>
                <div class="row g-2">
                  <div class="col-6">
                    <label class="form-label small">المستلم</label>
                    <input ${readOnly} type="number" step="1" class="form-control form-control-sm" data-prod="${globalIdx}" data-field="received" value="${p.received}">
                  </div>
                  <div class="col-6">
                    <label class="form-label small">الإضافة</label>
                    <input ${readOnly} type="number" step="1" class="form-control form-control-sm" data-prod="${globalIdx}" data-field="added" value="${p.added}">
                  </div>
                  <div class="col-12">
                    <label class="form-label small">التسليم نهاية الوردية</label>
                    <input ${readOnly} type="number" step="1" class="form-control form-control-sm" data-prod="${globalIdx}" data-field="delivered" value="${p.delivered}">
                  </div>
                </div>
                <div class="sold-line d-flex justify-content-between">
                  <span>المتاح: <strong>${available}</strong> • المباع: <strong>${sold}</strong></span>
                  <span>القيمة: <strong>${Utils.fmt(value)}</strong></span>
                </div>
              </div>`;
            }).join("")}
          </div>
        </div>
      </div>
    `;
  },

  /** ينشئ عرض اكورديون كامل للفئات */
  renderCategorizedInventory(shiftProducts, readOnly = "") {
    const categories = DB.getCategorizedProducts();
    return `
      <div class="inventory-accordion">
        ${categories.map(cat => this.renderCategory(cat, shiftProducts, readOnly)).join("")}
      </div>
    `;
  },

  /** يهيئ أحداث الاكورديون والانهيار */
  initAccordions() {
    document.querySelectorAll(".category-header").forEach(header => {
      header.addEventListener("click", (e) => {
        const target = header.getAttribute("data-target");
        const panel = document.querySelector(target);
        if (!panel) return;
        
        panel.classList.toggle("show");
        const isOpen = panel.classList.contains("show");
        header.setAttribute("aria-expanded", isOpen ? "true" : "false");
        
        const icon = header.querySelector(".collapse-icon");
        if (icon) icon.textContent = isOpen ? "▼" : "▶";
      });
    });
  },
};
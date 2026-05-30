/* ============================================================
   report.js
   - بناء تقرير عربي مختصر عن الوردية
   - زر إرسال واتساب (wa.me + encodeURIComponent)
   - زر تحميل PDF بالعربية (jsPDF + autoTable + خط Tajawal)
   ============================================================ */

const Report = {
  // عنوان مفتاح كاش الخط داخل LocalStorage حتى لا يُحمَّل في كل مرة
  FONT_KEY: "ms_font_tajawal_b64",
  // رابط خط Tajawal العربي بصيغة TTF من مستودع جوجل فونتس
  FONT_URL: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tajawal/Tajawal-Regular.ttf",
  FONT_BOLD_URL: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tajawal/Tajawal-Bold.ttf",
  FONT_BOLD_KEY: "ms_font_tajawal_b64_bold",

  /** يبني كائن ملخص للوردية يُستخدم في التقرير النصي والـ PDF */
  summarize(sh) {
    const sum = Calc.summary(sh);
    const cashDelivered = Utils.n(sh.cash.delivered);
    // الصافي النهائي = الكاش المسلَّم + فرق الفيزا + فرق كليك (إيراد الوردية الفعلي)
    const netFinal = cashDelivered + sum.visaDiff + sum.clickDiff;
    return {
      branch: sh.branch,
      date: Utils.dateOnly(sh.createdAt),
      shiftLabel: Utils.shiftLabel(sh.shiftKey),
      employee: sh.employee,
      cashDelivered,
      visaDiff: sum.visaDiff,
      clickDiff: sum.clickDiff,
      sales: sum.sales,
      expenses: sum.expenses,
      payments: sum.payments,
      diff: sum.diff,
      netFinal,
      notes: sh.notes || "-",
    };
  },

  /** نص التقرير العربي (يُستخدم لرسالة واتساب وللعرض في الشاشة) */
  buildText(sh) {
    const r = this.summarize(sh);
    // تنسيق عربي بسيط وواضح بدون JSON
    return (
`تقرير وردية - فرع ${r.branch}

التاريخ: ${r.date}
الوردية: ${r.shiftLabel}
الموظف: ${r.employee}

المبيعات:
- نقدي: ${Utils.fmt(r.cashDelivered)}
- فيزا: ${Utils.fmt(r.visaDiff)}
- كليك: ${Utils.fmt(r.clickDiff)}
- إجمالي المبيعات: ${Utils.fmt(r.sales)}

المصروفات: ${Utils.fmt(r.expenses)}
المدفوعات: ${Utils.fmt(r.payments)}

الفروقات: ${Utils.fmt(r.diff)}

الصافي النهائي: ${Utils.fmt(r.netFinal)}

الملاحظات:
${r.notes}`
    );
  },

  /** يفتح واتساب برسالة جاهزة */
  sendWhatsApp(sh) {
    const text = this.buildText(sh);
    const settings = DB.getSettings();
    // إذا تم ضبط رقم المدير في الإعدادات نستخدمه، وإلا نفتح اختيار جهة الاتصال
    const phone = (settings.managerPhone || "").replace(/[^\d]/g, "");
    const base = phone ? `https://wa.me/${phone}` : `https://wa.me/`;
    const url = `${base}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  },

  /** يحمّل خط Tajawal كـ Base64 ويُخزنه في LocalStorage */
  async _loadFontBase64(url, cacheKey) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
    const res = await fetch(url);
    if (!res.ok) throw new Error("تعذّر تحميل خط Tajawal");
    const buf = await res.arrayBuffer();
    // تحويل ArrayBuffer إلى Base64
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    const b64 = btoa(binary);
    try { localStorage.setItem(cacheKey, b64); } catch (e) { /* تجاهل إذا الكاش ممتلئ */ }
    return b64;
  },

  /** ينشئ PDF احترافي يدعم العربية بالكامل */
  async downloadPDF(sh) {
    if (!window.jspdf) { Utils.toast("مكتبة jsPDF غير محمّلة", "danger"); return; }
    Utils.toast("جاري تجهيز PDF عربي…", "info");
    try {
      const [regularB64, boldB64] = await Promise.all([
        this._loadFontBase64(this.FONT_URL, this.FONT_KEY),
        this._loadFontBase64(this.FONT_BOLD_URL, this.FONT_BOLD_KEY),
      ]);

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      // تسجيل خط Tajawal (Regular + Bold) لدعم العربية بدون تقطيع
      doc.addFileToVFS("Tajawal-Regular.ttf", regularB64);
      doc.addFont("Tajawal-Regular.ttf", "Tajawal", "normal");
      doc.addFileToVFS("Tajawal-Bold.ttf", boldB64);
      doc.addFont("Tajawal-Bold.ttf", "Tajawal", "bold");
      doc.setFont("Tajawal", "normal");
      // تفعيل اتجاه RTL على مستوى الصفحة
      if (typeof doc.setR2L === "function") doc.setR2L(true);

      const r = this.summarize(sh);
      const W = doc.internal.pageSize.getWidth();

      // رأس الصفحة الأخضر
      doc.setFillColor(31, 122, 58);
      doc.rect(0, 0, W, 70, "F");
      doc.setTextColor(255);
      doc.setFont("Tajawal", "bold");
      doc.setFontSize(20);
      doc.text(`تقرير وردية - ${r.branch}`, W / 2, 42, { align: "center" });
      doc.setFontSize(12);
      doc.text(`${r.shiftLabel}  •  ${r.date}`, W / 2, 60, { align: "center" });
      doc.setTextColor(0);

      // معلومات أساسية
      let y = 100;
      doc.setFont("Tajawal", "normal");
      doc.setFontSize(13);
      doc.text(`الموظف: ${r.employee}`, W - 40, y, { align: "right" }); y += 22;

      // جدول المبيعات / الفروقات / الصافي (autoTable يدعم تعيين الخط)
      if (doc.autoTable) {
        doc.autoTable({
          startY: y,
          theme: "grid",
          styles: { font: "Tajawal", fontStyle: "normal", halign: "right", fontSize: 12, cellPadding: 6 },
          headStyles: { font: "Tajawal", fontStyle: "bold", fillColor: [31, 122, 58], textColor: 255, halign: "right" },
          head: [["البند", "القيمة"]],
          body: [
            ["المبيعات النقدية", Utils.fmt(r.cashDelivered)],
            ["فرق الفيزا", Utils.fmt(r.visaDiff)],
            ["فرق كليك", Utils.fmt(r.clickDiff)],
            ["إجمالي المبيعات", Utils.fmt(r.sales)],
            ["المصروفات", Utils.fmt(r.expenses)],
            ["المدفوعات", Utils.fmt(r.payments)],
            ["الفروقات", Utils.fmt(r.diff)],
            ["الصافي النهائي", Utils.fmt(r.netFinal)],
          ],
          // عمود البند على اليمين والقيمة على اليسار يلائم اتجاه RTL
          columnStyles: { 0: { halign: "right" }, 1: { halign: "left" } },
        });
        y = doc.lastAutoTable.finalY + 20;
      }

      // الملاحظات
      doc.setFont("Tajawal", "bold");
      doc.setFontSize(13);
      doc.text("الملاحظات:", W - 40, y, { align: "right" }); y += 18;
      doc.setFont("Tajawal", "normal");
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(String(r.notes || "-"), W - 80);
      doc.text(lines, W - 40, y, { align: "right" });
      y += lines.length * 16 + 14;

      // صورة الجرد (من الذاكرة فقط — قد لا تكون موجودة، وهذا مقبول)
      const img = sh.inventoryImage;
      if (img) {
        try {
          const props = doc.getImageProperties(img);
          const maxW = W - 80;
          const ratio = props.height / props.width;
          let h = maxW * ratio;
          if (h > 380) h = 380;
          // إن لم تكفِ المساحة في الصفحة الحالية ننتقل لصفحة جديدة
          if (y + h + 30 > 800) { doc.addPage(); y = 60; }
          doc.setFont("Tajawal", "bold");
          doc.setFontSize(13);
          doc.text("صورة الجرد:", W - 40, y, { align: "right" });
          y += 14;
          const type = img.startsWith("data:image/png") ? "PNG" : "JPEG";
          doc.addImage(img, type, 40, y, maxW, h, undefined, "FAST");
        } catch (e) {
          console.error("inventory image embed failed:", e);
        }
      }

      // تذييل
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text("صنع بواسطة المهندس بهاء الدين عامر", W / 2, 820, { align: "center" });

      const fname = `تقرير_${r.shiftLabel}_${r.employee}_${r.date}.pdf`.replace(/\s+/g, "_");
      doc.save(fname);
      DB.pushAudit({ action: "تحميل تقرير PDF عربي", user: r.employee, details: sh.id });
    } catch (e) {
      console.error(e);
      Utils.toast("فشل إنشاء PDF: " + (e.message || ""), "danger");
    }
  },
};
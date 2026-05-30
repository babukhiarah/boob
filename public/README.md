# نظام إدارة الورديات — فرع النزهة

نظام ويب احترافي لإدارة ورديات وجرد ومحاسبة محل، مبني بـ:
- HTML5 + CSS3 + JavaScript Vanilla
- Bootstrap 5 (RTL)
- jsPDF لتوليد PDF
- EmailJS (مجاناً) لإرسال PDF بالبريد
- LocalStorage للتخزين (قابل للترقية مستقبلاً لـ Firebase / Backend API)

## الصفحات
- `index.html` — واجهة الموظف (بدء وردية، إدخال الكاش/الفيزا/كليك/الديون/الجرد، رفع صورة الجرد، إرسال للمدير)
- `expenses.html` — المصاريف والمدفوعات
- `manager.html` — لوحة المدير (اعتماد/رفض، تصدير PDF/TXT، المستودع، الإعدادات، Backup/Restore، Audit Log)
- `archive.html` — أرشيف الورديات

## النشر على GitHub Pages
1. ارفع محتويات مجلد `public/` إلى مستودع GitHub.
2. Settings → Pages → Source = `main` / root.
3. ستحصل على رابط مثل `https://username.github.io/repo/`.

## كلمة سر المدير الافتراضية
`admin123` — غيّرها من **لوحة المدير → الإعدادات**.

## إعداد إرسال PDF للإيميل (مجاناً)
1. سجّل في [EmailJS](https://www.emailjs.com/) (الباقة المجانية).
2. أنشئ Service و Template يحتويان المتغيرات:
   `to_email, branch, employee, shift, date, difference, pdf_base64`.
3. في **لوحة المدير → الإعدادات** أدخل: Public Key، Service ID، Template ID، إيميل المدير.

## الترقية المستقبلية
طبقة `DB` في `js/data.js` معزولة — استبدل تنفيذها بـ Firebase أو REST API دون تغيير بقية الكود.
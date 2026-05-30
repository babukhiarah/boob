import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "نظام إدارة الورديات - فرع النزهة" },
      { name: "description", content: "نظام إدارة ورديات وجرد ومحاسبة - فرع النزهة" },
    ],
  }),
});

function Index() {
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#f6faf7", fontFamily: "Tajawal, Cairo, Segoe UI, sans-serif" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ background: "linear-gradient(135deg,#1f7a3a,#145c2a)", color: "#fff", borderRadius: 18, padding: 32, boxShadow: "0 8px 24px rgba(20,92,42,0.18)" }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", padding: "4px 14px", borderRadius: 999, marginBottom: 8 }}>فرع النزهة</div>
          <h1 style={{ fontWeight: 800, marginBottom: 0 }}>🌿 نظام إدارة الورديات</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, marginTop: 24 }}>
          {[
            { href: "/index.html",    title: "واجهة الموظف",    desc: "بدء الوردية وإدخال الكاش والجرد" },
            { href: "/expenses.html", title: "المصاريف والمدفوعات", desc: "إدارة المصاريف والمدفوعات" },
            { href: "/manager.html",  title: "لوحة المدير",     desc: "اعتماد، رفض، PDF، إعدادات" },
            { href: "/archive.html",  title: "الأرشيف",         desc: "كل الورديات المؤرشفة" },
          ].map((c) => (
            <a key={c.href} href={c.href} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 4px 14px rgba(20,92,42,0.08)", border: "1px solid #e5efe7", transition: "transform .2s" }}>
                <h3 style={{ color: "#145c2a", marginTop: 0 }}>{c.title}</h3>
                <p style={{ color: "#4a6b54", margin: 0 }}>{c.desc}</p>
              </div>
            </a>
          ))}
        </div>

        <footer style={{ color: "#4a6b54", marginTop: 32, textAlign: "center", fontSize: 14, opacity: 0.85 }}>
          صنع بواسطة المهندس بهاء الدين عامر
        </footer>
      </div>
    </div>
  );
}

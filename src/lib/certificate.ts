export type CertificateRecord = {
  certificate_number: string;
  student_name: string;
  course: string;
  type: string;
  issued_date: string;
  issued_by?: string | null;
  description?: string | null;
  enrollment_id?: string | null;
};

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );

/** Printable, self-contained certificate document. */
export function certificateHtml(cert: CertificateRecord): string {
  const issued = new Date(cert.issued_date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${esc(cert.type)} — ${esc(cert.student_name)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#070b14;color:#e8eefc;font-family:Georgia,'Times New Roman',serif;
       display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
  .sheet{width:1000px;max-width:100%;aspect-ratio:1.414/1;background:linear-gradient(145deg,#0b1222,#101b31);
         border:2px solid #22d3ee;border-radius:18px;padding:56px;text-align:center;
         display:flex;flex-direction:column;justify-content:center;gap:14px;
         box-shadow:0 0 60px rgba(34,211,238,.18)}
  .brand{font-family:Arial,Helvetica,sans-serif;letter-spacing:.35em;font-size:12px;color:#22d3ee;text-transform:uppercase}
  .type{font-size:38px;margin:6px 0 0}
  .lead{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#9fb3cf}
  .name{font-size:46px;color:#fff;margin:4px 0;border-bottom:1px solid rgba(34,211,238,.4);display:inline-block;padding-bottom:8px}
  .course{font-size:20px;color:#c9d9f2}
  .note{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#9fb3cf;max-width:70ch;margin:0 auto}
  .foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:28px;
        font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9fb3cf}
  .num{font-family:ui-monospace,Menlo,monospace;color:#22d3ee}
  @media print{body{background:#fff}.sheet{box-shadow:none}}
</style></head>
<body>
  <div class="sheet">
    <div class="brand">Daryl Tech &amp; Educational Network</div>
    <h1 class="type">${esc(cert.type)}</h1>
    <p class="lead">This is proudly presented to</p>
    <div><span class="name">${esc(cert.student_name)}</span></div>
    <p class="lead">for the successful completion of</p>
    <p class="course">${esc(cert.course)}</p>
    ${cert.description ? `<p class="note">${esc(cert.description)}</p>` : ""}
    <div class="foot">
      <div>Issued ${esc(issued)}<br/>By ${esc(cert.issued_by || "Daryl Tech Educational Network")}</div>
      <div style="text-align:right">Verification number<br/><span class="num">${esc(cert.certificate_number)}</span></div>
    </div>
  </div>
</body></html>`;
}

/** Download the certificate as a standalone file the student can open or print. */
export function downloadCertificate(cert: CertificateRecord) {
  const blob = new Blob([certificateHtml(cert)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${cert.certificate_number}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Open a print-ready view in a new tab. */
export function printCertificate(cert: CertificateRecord) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(certificateHtml(cert));
  w.document.close();
}

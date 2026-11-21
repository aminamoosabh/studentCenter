function showMsg(text, type) {
  const el = document.getElementById("msg");
  el.textContent = text;
  el.className = "msg " + type;
}

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const r = params.get("redirect");
  if (r === "admin") return "../admin/index.html";
  if (r === "gpa") return "../gpa/index.html";
  return "../index.html";
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const sb = getSupabaseClient();
  if (!sb) {
    showMsg("لم يتم ربط قاعدة البيانات بعد بهذا الموقع.", "error");
    return;
  }
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    showMsg("البريد أو كلمة المرور غير صحيحة.", "error");
    return;
  }
  window.location.href = getRedirectTarget();
});

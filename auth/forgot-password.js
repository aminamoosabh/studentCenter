function showMsg(text, type) {
  const el = document.getElementById("msg");
  el.textContent = text;
  el.className = "msg " + type;
}

document.getElementById("forgot-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const sb = getSupabaseClient();
  if (!sb) {
    showMsg("لم يتم ربط قاعدة البيانات بعد بهذا الموقع.", "error");
    return;
  }
  const email = document.getElementById("email").value.trim();
  const redirectTo = window.location.origin + window.location.pathname.replace("forgot-password.html", "reset-password.html");

  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    showMsg("تعذّر إرسال الرابط، تأكدي من البريد وحاولي مرة أخرى.", "error");
    return;
  }
  showMsg("تم إرسال رابط إعادة التعيين إلى بريدك إن كان مسجّلاً لدينا.", "success");
});

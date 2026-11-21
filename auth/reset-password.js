function showMsg(text, type) {
  const el = document.getElementById("msg");
  el.textContent = text;
  el.className = "msg " + type;
}

document.getElementById("reset-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const sb = getSupabaseClient();
  if (!sb) {
    showMsg("لم يتم ربط قاعدة البيانات بعد بهذا الموقع.", "error");
    return;
  }
  const password = document.getElementById("password").value;
  const password2 = document.getElementById("password2").value;

  if (password !== password2) {
    showMsg("كلمتا المرور غير متطابقتين.", "error");
    return;
  }

  const { error } = await sb.auth.updateUser({ password });
  if (error) {
    showMsg("انتهت صلاحية الرابط أو حدث خطأ. اطلبي رابطًا جديدًا من صفحة نسيت كلمة المرور.", "error");
    return;
  }
  showMsg("تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.", "success");
  setTimeout(() => { window.location.href = "login.html"; }, 1800);
});

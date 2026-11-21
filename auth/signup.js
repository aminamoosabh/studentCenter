function showMsg(text, type) {
  const el = document.getElementById("msg");
  el.textContent = text;
  el.className = "msg " + type;
}

document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const sb = getSupabaseClient();
  if (!sb) {
    showMsg("لم يتم ربط قاعدة البيانات بعد بهذا الموقع.", "error");
    return;
  }
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const password2 = document.getElementById("password2").value;

  if (password !== password2) {
    showMsg("كلمتا المرور غير متطابقتين.", "error");
    return;
  }

  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) {
    showMsg(error.message.includes("already") ? "هذا البريد مسجّل مسبقًا." : "تعذّر إنشاء الحساب، حاولي مرة أخرى.", "error");
    return;
  }

  if (data.session) {
    window.location.href = "../index.html";
  } else {
    showMsg("تم إنشاء الحساب! تحققي من بريدك الإلكتروني لتفعيله ثم سجّلي الدخول.", "success");
  }
});

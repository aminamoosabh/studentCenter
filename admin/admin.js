const GROUP_OPTIONS = [
  { value: "year1_plan:A", label: "السنة الأولى - البديل (أ)", group_type: "year1_plan", group_key: "A", semesters: [1, 2] },
  { value: "year1_plan:B", label: "السنة الأولى - البديل (ب)", group_type: "year1_plan", group_key: "B", semesters: [1, 2] },
  { value: "track:chemistry", label: "تخصص كيمياء", group_type: "track", group_key: "chemistry", semesters: [3, 4, 5, 6] },
  { value: "track:physics", label: "تخصص فيزياء", group_type: "track", group_key: "physics", semesters: [3, 4, 5, 6] },
  { value: "track:commercial", label: "تخصص تجاري", group_type: "track", group_key: "commercial", semesters: [3, 4, 5, 6] },
  { value: "track:literary", label: "تخصص أدبي", group_type: "track", group_key: "literary", semesters: [3, 4, 5, 6] },
];

const SEMESTER_NAMES = {
  1: "الأول", 2: "الثاني", 3: "الثالث", 4: "الرابع", 5: "الخامس", 6: "السادس",
};

let sb = null;
let currentCourses = [];

function showMsg(text, type) {
  const el = document.getElementById("msg");
  el.textContent = text;
  el.className = "msg " + type;
}

function currentGroup() {
  const value = document.getElementById("group-select").value;
  return GROUP_OPTIONS.find((g) => g.value === value);
}

function populateGroupSelect() {
  const select = document.getElementById("group-select");
  select.innerHTML = "";
  GROUP_OPTIONS.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g.value;
    opt.textContent = g.label;
    select.appendChild(opt);
  });
}

function populateSemesterSelect() {
  const group = currentGroup();
  const select = document.getElementById("semester-select");
  select.innerHTML = "";
  group.semesters.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = "الفصل " + SEMESTER_NAMES[s];
    select.appendChild(opt);
  });
}

async function loadCourses() {
  const group = currentGroup();
  const semester = parseInt(document.getElementById("semester-select").value, 10);
  document.getElementById("courses-title").textContent =
    "مقررات: " + group.label + " - الفصل " + SEMESTER_NAMES[semester];

  const { data, error } = await sb
    .from("courses")
    .select("*")
    .eq("group_type", group.group_type)
    .eq("group_key", group.group_key)
    .eq("semester", semester)
    .order("sort_order");

  if (error) {
    showMsg("تعذّر تحميل المقررات.", "error");
    return;
  }
  currentCourses = data || [];
  renderCoursesTable();
}

function renderCoursesTable() {
  const tbody = document.getElementById("courses-body");
  tbody.innerHTML = "";
  let totalHours = 0;

  currentCourses.forEach((course) => {
    totalHours += course.hours;
    const tr = document.createElement("tr");

    const tdOrder = document.createElement("td");
    const orderInput = document.createElement("input");
    orderInput.type = "number";
    orderInput.value = course.sort_order;
    orderInput.dataset.field = "sort_order";
    tdOrder.appendChild(orderInput);

    const tdCode = document.createElement("td");
    const codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.value = course.code;
    codeInput.dataset.field = "code";
    tdCode.appendChild(codeInput);

    const tdHours = document.createElement("td");
    const hoursInput = document.createElement("input");
    hoursInput.type = "number";
    hoursInput.value = course.hours;
    hoursInput.dataset.field = "hours";
    tdHours.appendChild(hoursInput);

    const tdActions = document.createElement("td");
    const saveBtn = document.createElement("button");
    saveBtn.className = "row-btn save";
    saveBtn.textContent = "حفظ";
    saveBtn.addEventListener("click", () =>
      saveCourse(course.id, orderInput.value, codeInput.value, hoursInput.value)
    );
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "row-btn delete";
    deleteBtn.textContent = "حذف";
    deleteBtn.addEventListener("click", () => deleteCourse(course.id));
    tdActions.appendChild(saveBtn);
    tdActions.appendChild(deleteBtn);

    tr.appendChild(tdOrder);
    tr.appendChild(tdCode);
    tr.appendChild(tdHours);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });

  document.getElementById("hours-sum").textContent =
    "إجمالي الساعات الحالي لهذا الفصل: " + totalHours;
}

async function saveCourse(id, sortOrder, code, hours) {
  const h = parseInt(hours, 10);
  const o = parseInt(sortOrder, 10);
  if (!code.trim() || isNaN(h) || h <= 0 || isNaN(o)) {
    showMsg("تأكدي من تعبئة رمز المقرر والساعات والترتيب بشكل صحيح.", "error");
    return;
  }
  const { error } = await sb
    .from("courses")
    .update({ code: code.trim(), hours: h, sort_order: o })
    .eq("id", id);

  if (error) {
    showMsg("تعذّر حفظ التعديل.", "error");
    return;
  }
  showMsg("تم الحفظ.", "success");
  await loadCourses();
}

async function deleteCourse(id) {
  const ok = confirm("هل أنتِ متأكدة من حذف هذا المقرر؟");
  if (!ok) return;
  const { error } = await sb.from("courses").delete().eq("id", id);
  if (error) {
    showMsg("تعذّر حذف المقرر.", "error");
    return;
  }
  showMsg("تم الحذف.", "success");
  await loadCourses();
}

async function addCourse() {
  const group = currentGroup();
  const semester = parseInt(document.getElementById("semester-select").value, 10);
  const order = parseInt(document.getElementById("new-order").value, 10);
  const code = document.getElementById("new-code").value.trim();
  const hours = parseInt(document.getElementById("new-hours").value, 10);

  if (!code || isNaN(hours) || hours <= 0 || isNaN(order)) {
    showMsg("تأكدي من تعبئة رمز المقرر والساعات والترتيب بشكل صحيح.", "error");
    return;
  }

  const { error } = await sb.from("courses").insert({
    group_type: group.group_type,
    group_key: group.group_key,
    semester,
    code,
    hours,
    sort_order: order,
  });

  if (error) {
    showMsg(
      error.code === "23505" ? "هذا الرمز مستخدم مسبقًا في نفس الفصل والمجموعة." : "تعذّرت إضافة المقرر.",
      "error"
    );
    return;
  }

  document.getElementById("new-code").value = "";
  document.getElementById("new-hours").value = "";
  document.getElementById("new-order").value = "";
  showMsg("تمت الإضافة.", "success");
  await loadCourses();
}

async function init() {
  const statusCard = document.getElementById("status-card");
  sb = getSupabaseClient();

  if (!sb) {
    statusCard.innerHTML = "<p>لم يتم ربط قاعدة البيانات بعد بهذا الموقع. لا يمكن استخدام صفحة الإدارة حاليًا.</p>";
    return;
  }

  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) {
    window.location.href = "../auth/login.html?redirect=admin";
    return;
  }

  const user = sessionData.session.user;
  const { data: profile, error: profileError } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    statusCard.innerHTML = "<p>ما عندك صلاحية الوصول لصفحة الإدارة.</p>";
    return;
  }

  statusCard.classList.add("hidden");
  document.getElementById("manager").classList.remove("hidden");
  document.getElementById("courses-card").classList.remove("hidden");

  populateGroupSelect();
  populateSemesterSelect();
  await loadCourses();

  document.getElementById("group-select").addEventListener("change", async () => {
    populateSemesterSelect();
    await loadCourses();
  });
  document.getElementById("semester-select").addEventListener("change", loadCourses);
  document.getElementById("add-btn").addEventListener("click", addCourse);
}

document.getElementById("logout-btn").addEventListener("click", () => {
  signOutAndRedirect("../index.html");
});

init();

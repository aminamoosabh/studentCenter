const STORAGE_KEY = "studentCenter_gpa_state_v1";

function defaultState() {
  return { plan: null, track: null, grades: {} };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed, grades: parsed.grades || {} };
  } catch (e) {
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // localStorage غير متاح (مثلاً وضع التصفح الخاص) - نتجاهل بصمت
  }
}

// إذا كان الموقع مربوطًا بقاعدة بيانات Supabase، نحمّل المقررات من هناك
// (عشان تعديلات الأدمن تنعكس على الحاسبة)، وإلا نبقى على البيانات المحلية في data.js
async function loadCoursesFromSupabase() {
  if (typeof getSupabaseClient !== "function") return false;
  const sb = getSupabaseClient();
  if (!sb) return false;

  const { data, error } = await sb.from("courses").select("*").order("sort_order");
  if (error || !data || data.length === 0) return false;

  const plans = {
    A: { label: YEAR1_PLANS.A.label, sem1: [], sem2: [] },
    B: { label: YEAR1_PLANS.B.label, sem1: [], sem2: [] },
  };
  const tracks = {};
  Object.keys(TRACKS).forEach((key) => {
    tracks[key] = { label: TRACKS[key].label, sem3: [], sem4: [], sem5: [], sem6: [] };
  });

  data.forEach((row) => {
    const entry = { code: row.code, hours: row.hours };
    if (row.group_type === "year1_plan" && plans[row.group_key]) {
      plans[row.group_key]["sem" + row.semester].push(entry);
    } else if (row.group_type === "track" && tracks[row.group_key]) {
      tracks[row.group_key]["sem" + row.semester].push(entry);
    }
  });

  YEAR1_PLANS = plans;
  TRACKS = tracks;
  return true;
}

let state = loadState();

function getCoursesForSemester(semIndex) {
  if (semIndex === 1) return state.plan ? YEAR1_PLANS[state.plan].sem1 : null;
  if (semIndex === 2) return state.plan ? YEAR1_PLANS[state.plan].sem2 : null;
  if (!state.track) return null;
  const key = "sem" + semIndex;
  return TRACKS[state.track][key] || null;
}

function isSemesterUnlocked(semIndex) {
  if (semIndex === 1) return !!state.plan;
  if (semIndex === 2) return !!state.plan && isSemesterCompleted(1);
  if (semIndex === 3) return !!state.track && isSemesterCompleted(2);
  return !!state.track && isSemesterCompleted(semIndex - 1);
}

function isSemesterCompleted(semIndex) {
  const courses = getCoursesForSemester(semIndex);
  const g = state.grades[semIndex];
  if (!courses || !g) return false;
  return courses.every((c) => typeof g[c.code] === "number" && !isNaN(g[c.code]));
}

function computeSemesterGPA(semIndex) {
  const courses = getCoursesForSemester(semIndex);
  const g = state.grades[semIndex];
  if (!courses || !g) return null;
  let totalPoints = 0;
  let totalHours = 0;
  for (const c of courses) {
    const grade = g[c.code];
    if (typeof grade !== "number" || isNaN(grade)) return null;
    totalPoints += c.hours * grade;
    totalHours += c.hours;
  }
  return totalHours === 0 ? null : totalPoints / totalHours;
}

function computeCumulativeGPA(uptoSem) {
  let totalPoints = 0;
  let totalHours = 0;
  for (let s = 1; s <= uptoSem; s++) {
    const courses = getCoursesForSemester(s);
    const g = state.grades[s];
    if (!courses || !g) return null;
    for (const c of courses) {
      const grade = g[c.code];
      if (typeof grade !== "number" || isNaN(grade)) return null;
      totalPoints += c.hours * grade;
      totalHours += c.hours;
    }
  }
  return totalHours === 0 ? null : totalPoints / totalHours;
}

function fmt(n) {
  return n === null || n === undefined ? "—" : n.toFixed(2);
}

// ---------- Rendering ----------

function renderPlanChoices() {
  const container = document.getElementById("plan-choices");
  container.innerHTML = "";
  Object.entries(YEAR1_PLANS).forEach(([key, plan]) => {
    const div = document.createElement("div");
    div.className = "choice-card" + (state.plan === key ? " selected" : "");
    div.textContent = plan.label;
    div.addEventListener("click", () => selectPlan(key));
    container.appendChild(div);
  });
}

function buildTrackChoiceSection() {
  const section = document.createElement("section");
  section.id = "setup-track";
  section.className = "card setup-section";

  const h2 = document.createElement("h2");
  h2.textContent = "اختاري التخصص (من الفصل الثالث إلى السادس)";
  section.appendChild(h2);

  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = "يحدد هذا الاختيار مقررات الفصول من الثالث حتى السادس.";
  section.appendChild(hint);

  const grid = document.createElement("div");
  grid.className = "choice-grid";
  Object.entries(TRACKS).forEach(([key, track]) => {
    const div = document.createElement("div");
    div.className = "choice-card" + (state.track === key ? " selected" : "");
    div.textContent = track.label;
    div.addEventListener("click", () => selectTrack(key));
    grid.appendChild(div);
  });
  section.appendChild(grid);

  return section;
}

function selectPlan(key) {
  if (state.plan === key) return;
  if (state.plan && (state.grades[1] || state.grades[2])) {
    const ok = confirm(
      "تغيير البديل سيمسح درجات الفصل الأول والثاني المدخلة حاليًا. هل تريدين المتابعة؟"
    );
    if (!ok) return;
  }
  state.plan = key;
  delete state.grades[1];
  delete state.grades[2];
  // تغيير خطة السنة الأولى لا يُبطل التخصص، لكنه يُبطل كل شيء بعده لأن الفصل 3 يعتمد على اكتمال الفصل 2
  for (let s = 3; s <= 6; s++) delete state.grades[s];
  saveState();
  renderAll();
}

function selectTrack(key) {
  if (state.track === key) return;
  const hasLaterGrades = [3, 4, 5, 6].some((s) => state.grades[s]);
  if (state.track && hasLaterGrades) {
    const ok = confirm(
      "تغيير التخصص سيمسح درجات الفصول من الثالث إلى السادس المدخلة حاليًا. هل تريدين المتابعة؟"
    );
    if (!ok) return;
  }
  state.track = key;
  for (let s = 3; s <= 6; s++) delete state.grades[s];
  saveState();
  renderAll();
}

function buildSemesterSection(semIndex) {
  const section = document.createElement("section");
  section.className = "card semester-section";
  section.id = "semester-" + semIndex;

  const courses = getCoursesForSemester(semIndex);
  const unlocked = isSemesterUnlocked(semIndex);

  const h2 = document.createElement("h2");
  const titleSpan = document.createElement("span");
  titleSpan.textContent = SEMESTER_LABELS[semIndex - 1];
  h2.appendChild(titleSpan);

  const badges = document.createElement("div");
  badges.className = "badges";
  const semBadge = document.createElement("span");
  semBadge.className = "badge empty";
  semBadge.id = "badge-sem-" + semIndex;
  semBadge.textContent = "المعدل الفصلي: —";
  const cumBadge = document.createElement("span");
  cumBadge.className = "badge empty";
  cumBadge.id = "badge-cum-" + semIndex;
  cumBadge.textContent = "المعدل التراكمي: —";
  badges.appendChild(semBadge);
  badges.appendChild(cumBadge);
  h2.appendChild(badges);
  section.appendChild(h2);

  if (!unlocked) {
    section.classList.add("locked");
    const msg = document.createElement("p");
    msg.className = "hint";
    if (semIndex <= 2) {
      msg.textContent = "اختاري البديل الدراسي أولاً، وأكملي الفصل السابق.";
    } else if (!state.track) {
      msg.textContent = "اختاري التخصص أعلاه للوصول لهذا الفصل.";
    } else {
      msg.textContent = "أكملي حساب الفصل السابق للوصول لهذا الفصل.";
    }
    section.appendChild(msg);
    return section;
  }

  if (!courses) return section;

  const table = document.createElement("table");
  table.className = "grades-table";
  table.innerHTML =
    "<thead><tr><th>المقرر</th><th>عدد الساعات</th><th>الدرجة</th></tr></thead>";
  const tbody = document.createElement("tbody");
  const savedGrades = state.grades[semIndex] || {};

  courses.forEach((c) => {
    const tr = document.createElement("tr");
    const tdCode = document.createElement("td");
    tdCode.textContent = c.code;
    const tdHours = document.createElement("td");
    tdHours.textContent = c.hours;
    const tdGrade = document.createElement("td");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "100";
    input.step = "0.01";
    input.dataset.code = c.code;
    if (typeof savedGrades[c.code] === "number") input.value = savedGrades[c.code];
    tdGrade.appendChild(input);
    tr.appendChild(tdCode);
    tr.appendChild(tdHours);
    tr.appendChild(tdGrade);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  section.appendChild(table);

  const calcRow = document.createElement("div");
  calcRow.className = "calc-row";
  const btn = document.createElement("button");
  btn.className = "primary-btn";
  btn.textContent = "احسب";
  btn.addEventListener("click", () => calculateSemester(semIndex));
  calcRow.appendChild(btn);

  const errorMsg = document.createElement("span");
  errorMsg.className = "error-msg hidden";
  errorMsg.id = "error-" + semIndex;
  calcRow.appendChild(errorMsg);

  section.appendChild(calcRow);

  return section;
}

function calculateSemester(semIndex) {
  const section = document.getElementById("semester-" + semIndex);
  const inputs = section.querySelectorAll("input[data-code]");
  const errorEl = document.getElementById("error-" + semIndex);
  const newGrades = {};
  let hasError = false;

  inputs.forEach((input) => {
    const val = parseFloat(input.value);
    if (input.value.trim() === "" || isNaN(val) || val < 0 || val > 100) {
      hasError = true;
    } else {
      newGrades[input.dataset.code] = val;
    }
  });

  if (hasError) {
    errorEl.textContent = "فضلاً أدخلي درجة صحيحة (من 0 إلى 100) لكل المقررات.";
    errorEl.classList.remove("hidden");
    return;
  }

  errorEl.classList.add("hidden");
  state.grades[semIndex] = newGrades;
  saveState();
  renderAll();
}

function renderSemesters() {
  const container = document.getElementById("semesters-container");
  container.innerHTML = "";
  for (let s = 1; s <= 6; s++) {
    container.appendChild(buildSemesterSection(s));
    if (s === 2 && isSemesterCompleted(2)) {
      container.appendChild(buildTrackChoiceSection());
    }
  }
}

function updateBadgesAndSummary() {
  const summarySection = document.getElementById("summary");
  const summaryBody = document.getElementById("summary-body");
  summaryBody.innerHTML = "";
  let anyCompleted = false;

  for (let s = 1; s <= 6; s++) {
    const semBadge = document.getElementById("badge-sem-" + s);
    const cumBadge = document.getElementById("badge-cum-" + s);
    if (!semBadge || !cumBadge) continue;

    if (isSemesterCompleted(s)) {
      const semGPA = computeSemesterGPA(s);
      const cumGPA = computeCumulativeGPA(s);
      semBadge.textContent = "المعدل الفصلي: " + fmt(semGPA);
      cumBadge.textContent = "المعدل التراكمي: " + fmt(cumGPA);
      semBadge.classList.remove("empty");
      cumBadge.classList.remove("empty");

      anyCompleted = true;
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        SEMESTER_LABELS[s - 1] +
        "</td><td>" +
        fmt(semGPA) +
        "</td><td>" +
        fmt(cumGPA) +
        "</td>";
      summaryBody.appendChild(tr);
    } else {
      semBadge.textContent = "المعدل الفصلي: —";
      cumBadge.textContent = "المعدل التراكمي: —";
      semBadge.classList.add("empty");
      cumBadge.classList.add("empty");
    }
  }

  summarySection.classList.toggle("hidden", !anyCompleted);
}

function renderAll() {
  renderPlanChoices();
  renderSemesters();
  updateBadgesAndSummary();
}

document.getElementById("reset-btn").addEventListener("click", () => {
  const ok = confirm("سيتم مسح كل البيانات المحفوظة على هذا الجهاز. هل أنتِ متأكدة؟");
  if (!ok) return;
  state = defaultState();
  saveState();
  renderAll();
});

(async () => {
  try {
    await loadCoursesFromSupabase();
  } catch (e) {
    // تجاهلي الخطأ واستمري بالبيانات المحلية من data.js
  }
  renderAll();
})();

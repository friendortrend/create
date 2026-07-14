// Website A - create.friendortrend.dedyn.io
// Sign gate -> pick quiz type -> pick count -> build questions -> save to Firestore -> share link.

const db = firebase.firestore();

const views = {
  sign: document.getElementById("signView"),
  home: document.getElementById("homeView"),
  count: document.getElementById("countView"),
  builder: document.getElementById("builderView"),
  share: document.getElementById("shareView"),
};

function show(name) {
  Object.values(views).forEach((v) => v.classList.add("hidden"));
  views[name].classList.remove("hidden");
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------------- AUTH / SESSION ---------------- */
const USER_KEY = "fot_user";

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

function captureUserFromUrl() {
  const p = new URLSearchParams(location.search);
  if (p.get("uid")) {
    const user = {
      uid: p.get("uid"),
      name: p.get("name") || "Friend",
      email: p.get("email") || "",
      photo: p.get("photo") || "",
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    // Clean the URL so tokens don't linger in the address bar.
    window.history.replaceState({}, "", location.pathname);
    return user;
  }
  return null;
}

function initAuth() {
  const user = captureUserFromUrl() || getUser();
  if (user) {
    document.body.classList.add("logged-in");
    document.getElementById("userName").textContent = user.name.split(" ")[0];
    const chip = document.getElementById("userChip");
    chip.innerHTML =
      (user.photo ? `<img src="${user.photo}" alt="" />` : "") +
      `<span>${user.email || user.name}</span>`;
    show("home");
  } else {
    show("sign");
  }
}

document.getElementById("signBtn").addEventListener("click", () => {
  const url = new URL(FOT.SIGN_URL);
  url.searchParams.set("return", FOT.CREATE_URL);
  window.location.href = url.toString();
});

document.getElementById("signOutBtn").addEventListener("click", () => {
  localStorage.removeItem(USER_KEY);
  document.body.classList.remove("logged-in");
  show("sign");
});

/* ---------------- QUIZ STATE ---------------- */
let quiz = { type: "general", count: 10, questions: [], index: 0 };

document.querySelectorAll(".option").forEach((opt) => {
  opt.addEventListener("click", () => {
    quiz.type = opt.dataset.type;
    document.getElementById("countTitle").textContent =
      quiz.type === "general" ? "General Quiz" : "Custom Quiz";
    show("count");
  });
});

/* Count selection */
let selectedCount = 10;
document.querySelectorAll(".count-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    if (pill.dataset.count === "more") {
      toast("Redirecting to FINB premium...");
      setTimeout(() => (window.location.href = FOT.FINB_URL), 900);
      return;
    }
    document.querySelectorAll(".count-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    selectedCount = parseInt(pill.dataset.count, 10);
  });
});

document.getElementById("countBack").addEventListener("click", () => show("home"));

document.getElementById("countStart").addEventListener("click", () => {
  quiz.count = selectedCount;
  quiz.index = 0;
  quiz.questions = [];
  if (quiz.type === "general") {
    // Pick a random subset from the bank.
    const shuffled = [...GENERAL_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, quiz.count);
    quiz.questions = shuffled.map((item) => ({
      question: item.q,
      options: [...item.options],
      answer: null,
    }));
  } else {
    for (let i = 0; i < quiz.count; i++) {
      quiz.questions.push({ question: "", options: ["", "", "", ""], answer: null });
    }
  }
  show("builder");
  renderBuilder();
});

/* ---------------- BUILDER ---------------- */
const builderBody = document.getElementById("builderBody");
const progressBar = document.getElementById("progressBar");
const qCount = document.getElementById("qCount");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

function renderBuilder() {
  const cur = quiz.questions[quiz.index];
  qCount.textContent = `Question ${quiz.index + 1} of ${quiz.count}`;
  progressBar.style.width = `${((quiz.index + 1) / quiz.count) * 100}%`;
  prevBtn.disabled = quiz.index === 0;
  nextBtn.textContent = quiz.index === quiz.count - 1 ? "Finish & Share" : "Next";

  if (quiz.type === "general") {
    builderBody.innerHTML =
      `<div class="q-text slide">${cur.question}</div><div class="answers slide" id="answers"></div>`;
    const answersEl = document.getElementById("answers");
    cur.options.forEach((opt, i) => {
      const el = document.createElement("button");
      el.className = "answer" + (cur.answer === i ? " selected" : "");
      el.textContent = opt;
      el.addEventListener("click", () => {
        cur.answer = i;
        renderBuilder();
      });
      answersEl.appendChild(el);
    });
  } else {
    builderBody.innerHTML = `
      <input class="field slide" id="qField" placeholder="Type your question..." value="${escapeAttr(cur.question)}" />
      <div id="optRows" class="slide"></div>`;
    document.getElementById("qField").addEventListener("input", (e) => (cur.question = e.target.value));
    const rows = document.getElementById("optRows");
    cur.options.forEach((opt, i) => {
      const row = document.createElement("div");
      row.className = "opt-row";
      row.innerHTML = `
        <div class="opt-radio ${cur.answer === i ? "on" : ""}" data-i="${i}" title="Mark correct"></div>
        <input class="field" placeholder="Option ${i + 1}" value="${escapeAttr(opt)}" />`;
      row.querySelector(".opt-radio").addEventListener("click", () => {
        cur.answer = i;
        renderBuilder();
      });
      row.querySelector("input").addEventListener("input", (e) => (cur.options[i] = e.target.value));
      rows.appendChild(row);
    });
  }
}

function escapeAttr(s) {
  return (s || "").replace(/"/g, "&quot;");
}

function validateCurrent() {
  const cur = quiz.questions[quiz.index];
  if (quiz.type === "custom") {
    if (!cur.question.trim()) return "Please type the question.";
    if (cur.options.some((o) => !o.trim())) return "Please fill all four options.";
  }
  if (cur.answer === null || cur.answer === undefined) return "Please select the correct answer.";
  return null;
}

prevBtn.addEventListener("click", () => {
  if (quiz.index > 0) {
    quiz.index--;
    renderBuilder();
  }
});

nextBtn.addEventListener("click", async () => {
  const err = validateCurrent();
  if (err) return toast(err);
  if (quiz.index < quiz.count - 1) {
    quiz.index++;
    renderBuilder();
  } else {
    await saveQuiz();
  }
});

/* ---------------- SAVE ---------------- */
function makeCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function saveQuiz() {
  const user = getUser();
  nextBtn.disabled = true;
  nextBtn.textContent = "Saving...";
  const code = makeCode();
  try {
    await db
      .collection("quizzes")
      .doc(code)
      .set({
        code,
        type: quiz.type,
        count: quiz.count,
        questions: quiz.questions.map((q) => ({
          question: q.question,
          options: q.options,
          answer: q.answer,
        })),
        creatorUid: user ? user.uid : null,
        creatorName: user ? user.name : "Anonymous",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    showShare(code);
  } catch (e) {
    console.log("[v0] Save error:", e.message);
    toast("Could not save quiz. Check your connection.");
    nextBtn.disabled = false;
    nextBtn.textContent = "Finish & Share";
  }
}

function showShare(code) {
  const link = `${FOT.FUNTEST_URL}/share.html?quizcode=${code}`;
  document.getElementById("shareLink").value = link;
  document.getElementById("quizCodeText").textContent = code;
  show("share");
}

document.getElementById("copyBtn").addEventListener("click", () => {
  const input = document.getElementById("shareLink");
  input.select();
  navigator.clipboard.writeText(input.value).then(() => toast("Link copied!"));
});

document.getElementById("newQuizBtn").addEventListener("click", () => {
  nextBtn.disabled = false;
  show("home");
});

/* ---------------- INIT ---------------- */
initAuth();

// Website A - create.friendortrend.dedyn.io
// Sign gate -> pick General (instant, auto-advancing) or Custom (build your own) -> save -> share.

const db = firebase.firestore();

const views = {
  sign: document.getElementById("signView"),
  home: document.getElementById("homeView"),
  count: document.getElementById("countView"),
  general: document.getElementById("generalView"),
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

/* ---------------- HOME: PICK A MODE ---------------- */
document.querySelectorAll(".option").forEach((opt) => {
  opt.addEventListener("click", () => {
    if (opt.dataset.type === "general") {
      startGeneral();
    } else {
      document.getElementById("countTitle").textContent = "Custom Quiz";
      show("count");
    }
  });
});

/* =====================================================================
   GENERAL QUIZ - instant, auto-advancing, skippable, with milestones
   ===================================================================== */
const FREE_LIMIT = 20; // free plan max
const MILESTONE = 10; // pause every 10 answered

let gq = { pool: [], items: [], index: 0, locked: false };

const gqText = document.getElementById("gqText");
const gAnswers = document.getElementById("gAnswers");
const gCount = document.getElementById("gCount");
const gProgress = document.getElementById("gProgress");
const gSkip = document.getElementById("gSkip");

function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function startGeneral() {
  gq.pool = shuffled(GENERAL_QUESTIONS);
  gq.items = [];
  gq.index = 0;
  gq.locked = false;
  serveOne();
  show("general");
  renderGeneral();
}

// Pull the next unused question from the pool into the active list.
function serveOne() {
  const next = gq.pool.pop();
  if (!next) return false;
  gq.items.push({ question: next.q, options: [...next.options], answer: null });
  return true;
}

function renderGeneral() {
  const cur = gq.items[gq.index];
  gq.locked = false;
  const answered = gq.index; // questions fully answered so far
  gCount.textContent = `Question ${gq.index + 1}`;
  gProgress.style.width = `${Math.min((answered / FREE_LIMIT) * 100, 100)}%`;

  gqText.textContent = cur.question;
  gqText.classList.remove("slide");
  void gqText.offsetWidth;
  gqText.classList.add("slide");

  gAnswers.className = "answers slide";
  gAnswers.innerHTML = "";
  cur.options.forEach((opt, i) => {
    const el = document.createElement("button");
    el.className = "answer";
    el.textContent = opt;
    el.addEventListener("click", () => chooseGeneral(i, el));
    gAnswers.appendChild(el);
  });
  gSkip.disabled = false;
}

function chooseGeneral(i, el) {
  if (gq.locked) return;
  gq.locked = true;
  gq.items[gq.index].answer = i;
  gAnswers.classList.add("locked");
  el.classList.add("chosen");
  gSkip.disabled = true;

  // Let the green confirmation play, then advance.
  setTimeout(advanceGeneral, 620);
}

function advanceGeneral() {
  const answered = gq.index + 1;
  if (answered >= FREE_LIMIT) {
    return openMilestone(FREE_LIMIT);
  }
  if (answered % MILESTONE === 0) {
    return openMilestone(answered);
  }
  goToNextGeneral();
}

function goToNextGeneral() {
  gq.index++;
  if (gq.index >= gq.items.length) {
    if (!serveOne()) return finishGeneral(); // pool exhausted
  }
  renderGeneral();
}

// Skip: swap the current (unanswered) question for a fresh one from the pool.
gSkip.addEventListener("click", () => {
  if (gq.locked) return;
  const replacement = gq.pool.pop();
  if (!replacement) return toast("No more questions to swap in.");
  gq.items[gq.index] = { question: replacement.q, options: [...replacement.options], answer: null };
  renderGeneral();
  toast("Swapped in a fresh question");
});

function finishGeneral() {
  quizType = "general";
  const answeredItems = gq.items.filter((q) => q.answer !== null && q.answer !== undefined);
  saveQuiz(answeredItems);
}

/* ---------------- MILESTONE MODAL ---------------- */
const milestoneEl = document.getElementById("milestone");
const msTitle = document.getElementById("msTitle");
const msText = document.getElementById("msText");
const msEmoji = document.getElementById("msEmoji");
const msActions = document.getElementById("msActions");

function openMilestone(count) {
  msActions.innerHTML = "";

  if (count >= FREE_LIMIT) {
    // Reached the free plan limit -> promote FINB for more.
    msEmoji.innerHTML = "&#128081;"; // crown
    msTitle.textContent = "More questions?";
    msText.innerHTML =
      "You've answered <b>20 questions</b> - that's the free plan limit. Unlock hundreds more premium questions with <b>Fake International Bank</b>.";

    const finb = document.createElement("a");
    finb.href = FOT.FINB_URL;
    finb.className = "btn btn-finb";
    finb.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 7v2h18V7l-9-5z"/><path d="M5 11v6M10 11v6M14 11v6M19 11v6M3 21h18"/></svg>' +
      "<span>More questions on FINB</span>";
    msActions.appendChild(finb);

    const done = document.createElement("button");
    done.className = "btn btn-primary";
    done.textContent = "Finish & share my quiz";
    done.addEventListener("click", () => {
      closeMilestone();
      finishGeneral();
    });
    msActions.appendChild(done);
  } else {
    // 10-question checkpoint.
    msEmoji.innerHTML = "&#10024;"; // sparkles
    msTitle.textContent = "More questions?";
    msText.innerHTML = `Lovely - you've answered <b>${count} questions</b>. Keep the momentum going, or share your quiz now.`;

    const cont = document.createElement("button");
    cont.className = "btn btn-primary";
    cont.textContent = "Yes, add 10 more";
    cont.addEventListener("click", () => {
      closeMilestone();
      goToNextGeneral();
    });
    msActions.appendChild(cont);

    const done = document.createElement("button");
    done.className = "btn btn-ghost";
    done.textContent = "Finish & share now";
    done.addEventListener("click", () => {
      closeMilestone();
      finishGeneral();
    });
    msActions.appendChild(done);
  }

  milestoneEl.classList.remove("hidden");
}

function closeMilestone() {
  milestoneEl.classList.add("hidden");
}

/* =====================================================================
   CUSTOM QUIZ - build your own with count selection
   ===================================================================== */
let quizType = "custom";
let quiz = { count: 10, questions: [], index: 0 };

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
  quizType = "custom";
  quiz.count = selectedCount;
  quiz.index = 0;
  quiz.questions = [];
  for (let i = 0; i < quiz.count; i++) {
    quiz.questions.push({ question: "", options: ["", "", "", ""], answer: null });
  }
  show("builder");
  renderBuilder();
});

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

function escapeAttr(s) {
  return (s || "").replace(/"/g, "&quot;");
}

function validateCurrent() {
  const cur = quiz.questions[quiz.index];
  if (!cur.question.trim()) return "Please type the question.";
  if (cur.options.some((o) => !o.trim())) return "Please fill all four options.";
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
    await saveQuiz(quiz.questions);
  }
});

/* ---------------- SAVE ---------------- */
function makeCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function saveQuiz(questions) {
  const user = getUser();
  const code = makeCode();
  toast("Saving your quiz...");
  try {
    await db
      .collection("quizzes")
      .doc(code)
      .set({
        code,
        type: quizType,
        count: questions.length,
        questions: questions.map((q) => ({
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
  show("home");
});

/* ---------------- INIT ---------------- */
initAuth();

const STORAGE_KEY = "pinyin-reflex-engine-v1";

const levels = {
  0: {
    title: "LEVEL 0：感知层",
    desc: "看到字母后，在 0.5 秒内完成识别。",
    target: 500,
    label: "Flash 识别",
    hint: "不拼读，只做视觉到声音的快速映射。",
    items: [
      ...["b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s", "y", "w"].map((x) => item(x, x, "声母")),
      ...["a", "o", "e", "i", "u", "ü"].map((x) => item(x, x, "单韵母")),
    ],
  },
  1: {
    title: "LEVEL 1：音节构建层",
    desc: "声母 + 单韵母，必须整体输出，不做 b-a-ba 拆读。",
    target: 1200,
    label: "整体拼读",
    hint: "看到 ba 就直接读 ba，禁止先拆再合。",
    items: [
      ["ba", "b + a"], ["bo", "b + o"], ["bi", "b + i"], ["bu", "b + u"],
      ["pa", "p + a"], ["po", "p + o"], ["pi", "p + i"], ["pu", "p + u"],
      ["ma", "m + a"], ["mo", "m + o"], ["me", "m + e"], ["mi", "m + i"],
      ["da", "d + a"], ["de", "d + e"], ["di", "d + i"], ["du", "d + u"],
    ].map(([prompt, structure]) => item(prompt, prompt, structure)),
  },
  2: {
    title: "LEVEL 2：扩展韵母层",
    desc: "复韵母和鼻韵母自动合成，压缩拆解习惯。",
    target: 1500,
    label: "复杂韵母合成",
    hint: "把复杂韵母作为整体处理，直接读完整音节。",
    items: [
      "bai", "bei", "bao", "pao", "mei", "mou", "fei", "fou", "dai", "dei",
      "dui", "tou", "nie", "lie", "xue", "yue", "ban", "ben", "min", "lun",
      "yun", "fang", "feng", "ming", "hong",
    ].map((x) => item(x, x, complexityTag(x))),
  },
  3: {
    title: "LEVEL 3：完整音节系统",
    desc: "普通音节、三拼音、整体认读混合训练。",
    target: 1500,
    label: "完整音节识别",
    hint: "三拼和整体认读都要当成一个单位处理。",
    items: [
      ["bang", "普通音节"], ["tang", "普通音节"], ["peng", "普通音节"], ["qing", "普通音节"],
      ["xiao", "三拼音 x+i+ao"], ["qiao", "三拼音 q+i+ao"], ["jiao", "三拼音 j+i+ao"], ["huan", "三拼音 h+u+an"],
      ["guang", "三拼音 g+u+ang"], ["kuai", "三拼音 k+u+ai"], ["shuang", "三拼音 sh+u+ang"],
      ["zhi", "整体认读"], ["chi", "整体认读"], ["shi", "整体认读"], ["ri", "整体认读"],
      ["zi", "整体认读"], ["ci", "整体认读"], ["si", "整体认读"], ["yi", "整体认读"], ["wu", "整体认读"], ["yu", "整体认读"],
    ].map(([prompt, structure]) => item(prompt, prompt, structure)),
  },
  4: {
    title: "LEVEL 4：阅读反射层",
    desc: "拼音词块到语义单位，训练分块读取。",
    target: 2500,
    label: "词块阅读",
    hint: "先看词块，再进入句子语义，不逐字母拖读。",
    items: [
      ["mā ma", "妈妈", "词块"], ["bà ba", "爸爸", "词块"], ["qù xué xiào", "去学校", "短语"],
      ["mǎi cài", "买菜", "词块"], ["xiǎo niǎo", "小鸟", "词块"], ["bái yún", "白云", "词块"],
      ["mā ma qù mǎi cài", "妈妈去买菜", "句子"], ["wǒ ài xué pīn yīn", "我爱学拼音", "句子"],
      ["xiǎo māo zài hē shuǐ", "小猫在喝水", "句子"],
    ].map(([prompt, answer, structure]) => item(prompt, answer, structure)),
  },
};

const state = {
  level: 0,
  mode: "flash",
  current: null,
  startedAt: 0,
  timerId: null,
  answered: false,
  session: {
    total: 0,
    correct: 0,
    streak: 0,
    slow: 0,
    rtSum: 0,
    rtCount: 0,
  },
  engine: loadEngine(),
};

const els = {
  levelTabs: document.querySelectorAll(".level-tab"),
  modeChips: document.querySelectorAll(".mode-chip"),
  abilityScore: document.querySelector("#abilityScore"),
  avgRt: document.querySelector("#avgRt"),
  targetWindow: document.querySelector("#targetWindow"),
  rankText: document.querySelector("#rankText"),
  stageTitle: document.querySelector("#stageTitle"),
  stageDesc: document.querySelector("#stageDesc"),
  roundText: document.querySelector("#roundText"),
  promptCard: document.querySelector("#promptCard"),
  promptLabel: document.querySelector("#promptLabel"),
  speak: document.querySelector("#speakButton"),
  questionText: document.querySelector("#questionText"),
  timerFill: document.querySelector("#timerFill"),
  hintText: document.querySelector("#hintText"),
  answerGrid: document.querySelector("#answerGrid"),
  feedback: document.querySelector("#feedback"),
  next: document.querySelector("#nextButton"),
  progressFill: document.querySelector("#progressFill"),
  progressText: document.querySelector("#progressText"),
  accuracyText: document.querySelector("#accuracyText"),
  streakCount: document.querySelector("#streakCount"),
  slowCount: document.querySelector("#slowCount"),
  matrixList: document.querySelector("#matrixList"),
  mistakeList: document.querySelector("#mistakeList"),
  reset: document.querySelector("#resetButton"),
  wechatTip: document.querySelector("#wechatTip"),
};

function item(prompt, answer, structure) {
  return { id: `${prompt}->${answer}`, prompt, answer, structure };
}

function complexityTag(value) {
  if (/(ang|eng|ing|ong)$/.test(value)) return "后鼻韵母";
  if (/(an|en|in|un|ün)$/.test(value)) return "前鼻韵母";
  return "复韵母";
}

function loadEngine() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && typeof stored === "object") return stored;
  } catch {
    // Ignore broken localStorage data and start fresh.
  }
  return { mastery: {}, errors: [] };
}

function saveEngine() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.engine));
}

function metricFor(id) {
  if (!state.engine.mastery[id]) {
    state.engine.mastery[id] = {
      exposure: 0,
      correct: 0,
      slow: 0,
      errors: 0,
      avgRt: 0,
      mastery: 0,
    };
  }
  return state.engine.mastery[id];
}

function shuffle(values) {
  return [...values].sort(() => Math.random() - 0.5);
}

function currentLevel() {
  return levels[state.level];
}

function itemPool() {
  const pool = currentLevel().items;
  if (state.mode === "flash" && state.level > 1) return levels[0].items;
  if (state.mode === "fusion" && state.level === 0) return levels[1].items;
  return pool;
}

function weightedPick(pool) {
  const weighted = pool.flatMap((candidate) => {
    const metric = metricFor(candidate.id);
    const slowBoost = metric.slow * 2;
    const errorBoost = metric.errors * 3;
    const masteryGap = Math.ceil((1 - metric.mastery) * 5);
    const weight = Math.max(1, masteryGap + slowBoost + errorBoost);
    return Array.from({ length: Math.min(weight, 12) }, () => candidate);
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
}

function choicesFor(question, pool) {
  const source = shuffle(pool.map((candidate) => candidate.answer).filter((answer) => answer !== question.answer));
  return shuffle([question.answer, ...source.slice(0, 3)]);
}

function startTimer(target) {
  window.clearTimeout(state.timerId);
  els.timerFill.style.transition = "none";
  els.timerFill.style.width = "100%";
  requestAnimationFrame(() => {
    els.timerFill.style.transition = `width ${target}ms linear`;
    els.timerFill.style.width = "0%";
  });
  state.timerId = window.setTimeout(() => {
    if (!state.answered) els.promptCard.classList.add("time-warning");
  }, target);
}

function nextQuestion() {
  const pool = itemPool();
  const question = weightedPick(pool);
  state.current = { ...question, choices: choicesFor(question, pool) };
  state.answered = false;
  state.startedAt = performance.now();
  renderQuestion();
  startTimer(currentTarget());
}

function currentTarget() {
  if (state.mode === "flash") return 500;
  if (state.mode === "fusion") return Math.min(currentLevel().target, 1200);
  return currentLevel().target;
}

function renderQuestion() {
  const level = currentLevel();
  els.stageTitle.textContent = level.title;
  els.stageDesc.textContent = level.desc;
  els.promptLabel.textContent = level.label;
  els.hintText.textContent = `${level.hint} 结构：${state.current.structure}`;
  els.questionText.textContent = state.current.prompt;
  els.questionText.classList.toggle("reading-question", state.level === 4);
  els.promptCard.classList.remove("time-warning");
  els.targetWindow.textContent = `${(currentTarget() / 1000).toFixed(1)}s`;
  els.answerGrid.innerHTML = "";
  els.feedback.className = "feedback";
  els.feedback.textContent = "看到后立即作答，慢反应会进入复习队列。";
  els.next.textContent = "跳过";

  state.current.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "answer-button";
    button.type = "button";
    button.textContent = choice;
    button.addEventListener("click", () => checkAnswer(button, choice));
    els.answerGrid.append(button);
  });

  updateDashboard();
}

function checkAnswer(button, choice) {
  if (state.answered) return;
  state.answered = true;
  window.clearTimeout(state.timerId);

  const rt = Math.max(1, Math.round(performance.now() - state.startedAt));
  const target = currentTarget();
  const isAnswerCorrect = choice === state.current.answer;
  const isFast = rt <= target;
  const isReflex = isAnswerCorrect && isFast;

  const buttons = els.answerGrid.querySelectorAll("button");
  buttons.forEach((item) => {
    item.disabled = true;
    if (item.textContent === state.current.answer) item.classList.add("correct");
  });
  if (!isAnswerCorrect) button.classList.add("wrong");

  updateMastery(state.current, { isAnswerCorrect, isFast, rt });
  state.session.total += 1;
  state.session.rtSum += rt;
  state.session.rtCount += 1;

  if (isReflex) {
    state.session.correct += 1;
    state.session.streak += 1;
    els.feedback.className = "feedback good";
    els.feedback.textContent = `反射成功：${rt}ms`;
    speak();
  } else {
    state.session.streak = 0;
    if (!isFast) state.session.slow += 1;
    const reason = isAnswerCorrect ? `正确但慢：${rt}ms` : `错误：${choice || "未选"}`;
    pushError(state.current, reason);
    els.feedback.className = "feedback bad";
    els.feedback.textContent = `${reason}，目标 ${target}ms，答案 ${state.current.answer}`;
  }

  els.next.textContent = "下一题";
  saveEngine();
  updateDashboard();
}

function updateMastery(question, result) {
  const metric = metricFor(question.id);
  metric.exposure += 1;
  metric.correct += result.isAnswerCorrect ? 1 : 0;
  metric.slow += result.isFast ? 0 : 1;
  metric.errors += result.isAnswerCorrect ? 0 : 1;
  metric.avgRt = metric.avgRt ? Math.round(metric.avgRt * 0.72 + result.rt * 0.28) : result.rt;

  const accuracy = metric.correct / metric.exposure;
  const speedScore = Math.max(0, 1 - Math.max(0, metric.avgRt - currentTarget()) / currentTarget());
  const exposureScore = Math.min(metric.exposure / 20, 1);
  metric.mastery = clamp(accuracy * 0.5 + speedScore * 0.3 + exposureScore * 0.2, 0, 1);
}

function pushError(question, reason) {
  state.engine.errors.unshift({
    id: question.id,
    prompt: question.prompt,
    answer: question.answer,
    reason,
    at: Date.now(),
  });
  state.engine.errors = state.engine.errors.slice(0, 12);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function abilityScore() {
  const metrics = Object.values(state.engine.mastery);
  if (!metrics.length) return 0;
  const avg = metrics.reduce((sum, metric) => sum + metric.mastery, 0) / metrics.length;
  return clamp(avg * 10, 0, 10);
}

function rankFor(score) {
  if (score >= 9) return "王者";
  if (score >= 7.5) return "钻石";
  if (score >= 6) return "黄金";
  if (score >= 3) return "白银";
  return "青铜";
}

function updateDashboard() {
  const roundSize = 20;
  const done = state.session.total % roundSize;
  const accuracy = state.session.total ? Math.round((state.session.correct / state.session.total) * 100) : 0;
  const avg = state.session.rtCount ? Math.round(state.session.rtSum / state.session.rtCount) : 0;
  const score = abilityScore();

  els.abilityScore.textContent = score.toFixed(1);
  els.rankText.textContent = rankFor(score);
  els.avgRt.textContent = avg ? `${avg}ms` : "--";
  els.progressFill.style.width = `${(done / roundSize) * 100}%`;
  els.progressText.textContent = `${done} / ${roundSize}`;
  els.roundText.textContent = `第 ${done + 1} 题`;
  els.accuracyText.textContent = `${accuracy}%`;
  els.streakCount.textContent = state.session.streak;
  els.slowCount.textContent = state.session.slow;

  renderMatrix();
  renderErrors();
}

function renderMatrix() {
  const currentIds = itemPool().map((candidate) => candidate.id);
  const rows = currentIds
    .map((id) => ({ id, ...metricFor(id) }))
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 8);

  els.matrixList.innerHTML = "";
  rows.forEach((row) => {
    const [prompt, answer] = row.id.split("->");
    const itemEl = document.createElement("div");
    itemEl.className = "matrix-item";
    itemEl.innerHTML = `
      <span>${prompt} → ${answer}</span>
      <strong>${Math.round(row.mastery * 100)}%</strong>
      <div><i style="width:${Math.round(row.mastery * 100)}%"></i></div>
    `;
    els.matrixList.append(itemEl);
  });
}

function renderErrors() {
  if (!state.engine.errors.length) {
    els.mistakeList.innerHTML = "<li>还没有错题</li>";
    return;
  }
  els.mistakeList.innerHTML = "";
  state.engine.errors.slice(0, 6).forEach((entry) => {
    const itemEl = document.createElement("li");
    itemEl.textContent = `${entry.prompt} → ${entry.answer}（${entry.reason}）`;
    els.mistakeList.append(itemEl);
  });
}

function speak(text = state.current?.answer || state.current?.prompt) {
  if (!text || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replaceAll("ü", "yu"));
  utterance.lang = "zh-CN";
  utterance.rate = state.level >= 4 ? 0.86 : 0.72;
  utterance.pitch = 1.08;
  speechSynthesis.speak(utterance);
}

function setLevel(level) {
  state.level = Number(level);
  els.levelTabs.forEach((tab) => tab.classList.toggle("active", Number(tab.dataset.level) === state.level));
  state.mode = defaultModeForLevel(state.level);
  els.modeChips.forEach((chip) => chip.classList.toggle("active", chip.dataset.mode === state.mode));
  resetRound();
}

function setMode(mode) {
  state.mode = mode;
  els.modeChips.forEach((chip) => chip.classList.toggle("active", chip.dataset.mode === mode));
  resetRound();
}

function defaultModeForLevel(level) {
  if (level === 0) return "flash";
  if (level === 1) return "fusion";
  return "mixed";
}

function resetRound() {
  state.session = { total: 0, correct: 0, streak: 0, slow: 0, rtSum: 0, rtCount: 0 };
  nextQuestion();
}

els.levelTabs.forEach((tab) => tab.addEventListener("click", () => setLevel(tab.dataset.level)));
els.modeChips.forEach((chip) => chip.addEventListener("click", () => setMode(chip.dataset.mode)));
els.next.addEventListener("click", nextQuestion);
els.speak.addEventListener("click", () => speak(state.current?.prompt));
els.reset.addEventListener("click", resetRound);

if (/MicroMessenger/i.test(navigator.userAgent)) {
  els.wechatTip.hidden = false;
  window.setTimeout(() => {
    els.wechatTip.hidden = true;
  }, 3600);
}

nextQuestion();
const toneNames = {
  1: "一声",
  2: "二声",
  3: "三声",
  4: "四声",
};

const banks = {
  initials: {
    label: "找出声母",
    hint: "看音节，选开头的声母",
    choices: ["b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s", "y", "w"],
    items: [
      ["bā", "b", "八"], ["pá", "p", "爬"], ["mǎ", "m", "马"], ["fēi", "f", "飞"],
      ["dà", "d", "大"], ["tǔ", "t", "土"], ["nǚ", "n", "女"], ["lù", "l", "路"],
      ["gē", "g", "歌"], ["kǒu", "k", "口"], ["hǎo", "h", "好"], ["jī", "j", "鸡"],
      ["qí", "q", "旗"], ["xué", "x", "学"], ["zhōng", "zh", "中"], ["chē", "ch", "车"],
      ["shū", "sh", "书"], ["rì", "r", "日"], ["zǒu", "z", "走"], ["cǎo", "c", "草"], ["sān", "s", "三"],
    ],
  },
  finals: {
    label: "找出韵母",
    hint: "看音节，选后面的韵母",
    choices: ["a", "o", "e", "i", "u", "ü", "ai", "ei", "ui", "ao", "ou", "iu", "ie", "üe", "er", "an", "en", "in", "un", "ün", "ang", "eng", "ing", "ong"],
    items: [
      ["bā", "a", "八"], ["bō", "o", "波"], ["hé", "e", "河"], ["mǐ", "i", "米"],
      ["tǔ", "u", "土"], ["nǚ", "ü", "女"], ["bái", "ai", "白"], ["fēi", "ei", "飞"],
      ["shuǐ", "ui", "水"], ["māo", "ao", "猫"], ["kǒu", "ou", "口"], ["niú", "iu", "牛"],
      ["xiě", "ie", "写"], ["yuè", "üe", "月"], ["ér", "er", "儿"], ["shān", "an", "山"],
      ["mén", "en", "门"], ["lín", "in", "林"], ["yún", "ün", "云"], ["fēng", "eng", "风"],
      ["xīng", "ing", "星"], ["hóng", "ong", "红"],
    ],
  },
  tones: {
    label: "判断声调",
    hint: "看声调小帽子，选第几声",
    choices: Object.values(toneNames),
    items: [
      ["mā", "一声", "妈"], ["má", "二声", "麻"], ["mǎ", "三声", "马"], ["mà", "四声", "骂"],
      ["bā", "一声", "八"], ["bá", "二声", "拔"], ["bǎ", "三声", "把"], ["bà", "四声", "爸"],
      ["pō", "一声", "坡"], ["pó", "二声", "婆"], ["pǒ", "三声", "叵"], ["pò", "四声", "破"],
      ["lī", "一声", "哩"], ["lí", "二声", "梨"], ["lǐ", "三声", "里"], ["lì", "四声", "立"],
    ],
  },
  words: {
    label: "选择拼音",
    hint: "看汉字，选正确的拼读",
    choices: [],
    items: [
      ["妈妈", "mā ma", "妈妈"], ["爸爸", "bà ba", "爸爸"], ["小马", "xiǎo mǎ", "小马"], ["白云", "bái yún", "白云"],
      ["花朵", "huā duǒ", "花朵"], ["小鸟", "xiǎo niǎo", "小鸟"], ["月亮", "yuè liang", "月亮"], ["学校", "xué xiào", "学校"],
      ["老师", "lǎo shī", "老师"], ["同学", "tóng xué", "同学"], ["中国", "zhōng guó", "中国"], ["红旗", "hóng qí", "红旗"],
      ["汽车", "qì chē", "汽车"], ["书包", "shū bāo", "书包"], ["太阳", "tài yáng", "太阳"], ["森林", "sēn lín", "森林"],
    ],
  },
};

const levelRatio = {
  easy: 0.45,
  normal: 0.7,
  challenge: 1,
};

const state = {
  mode: "initials",
  level: "normal",
  current: null,
  total: 0,
  correct: 0,
  streak: 0,
  stars: Number(localStorage.getItem("pinyinStars") || 0),
  answered: false,
  mistakes: [],
};

const els = {
  tabs: document.querySelectorAll(".mode-tab"),
  level: document.querySelector("#levelSelect"),
  promptLabel: document.querySelector("#promptLabel"),
  questionText: document.querySelector("#questionText"),
  hintText: document.querySelector("#hintText"),
  answerGrid: document.querySelector("#answerGrid"),
  feedback: document.querySelector("#feedback"),
  next: document.querySelector("#nextButton"),
  speak: document.querySelector("#speakButton"),
  reset: document.querySelector("#resetButton"),
  starCount: document.querySelector("#starCount"),
  progressFill: document.querySelector("#progressFill"),
  progressText: document.querySelector("#progressText"),
  roundText: document.querySelector("#roundText"),
  correctCount: document.querySelector("#correctCount"),
  streakCount: document.querySelector("#streakCount"),
  accuracyText: document.querySelector("#accuracyText"),
  mobileCorrectCount: document.querySelector("#mobileCorrectCount"),
  mobileStreakCount: document.querySelector("#mobileStreakCount"),
  mobileAccuracyText: document.querySelector("#mobileAccuracyText"),
  mistakeList: document.querySelector("#mistakeList"),
  wechatTip: document.querySelector("#wechatTip"),
};

function shuffle(values) {
  return [...values].sort(() => Math.random() - 0.5);
}

function modeItems() {
  const items = banks[state.mode].items;
  const count = Math.max(4, Math.ceil(items.length * levelRatio[state.level]));
  return items.slice(0, count).map(([prompt, answer, speakText]) => ({ prompt, answer, speakText }));
}

function choicesFor(answer, pool) {
  const source = state.mode === "words"
    ? pool.map((item) => item.answer)
    : banks[state.mode].choices;
  const wrong = shuffle(source.filter((choice) => choice !== answer)).slice(0, 3);
  return shuffle([answer, ...wrong]);
}

function pickQuestion() {
  const pool = modeItems();
  const item = pool[Math.floor(Math.random() * pool.length)];
  state.current = {
    ...item,
    choices: choicesFor(item.answer, pool),
  };
  state.answered = false;
}

function renderQuestion() {
  const bank = banks[state.mode];
  els.promptLabel.textContent = bank.label;
  els.hintText.textContent = bank.hint;
  els.questionText.textContent = state.current.prompt;
  els.questionText.classList.toggle("word-question", state.mode === "words");
  els.answerGrid.innerHTML = "";
  els.feedback.className = "feedback";
  els.feedback.textContent = "选出正确答案。";
  els.next.textContent = "跳过";

  state.current.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "answer-button";
    button.type = "button";
    button.textContent = choice;
    button.addEventListener("click", () => checkAnswer(button, choice));
    els.answerGrid.append(button);
  });
}

function speak(text = state.current?.speakText || state.current?.prompt) {
  if (!text || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replaceAll("ü", "yu"));
  utterance.lang = "zh-CN";
  utterance.rate = state.mode === "words" ? 0.85 : 0.72;
  utterance.pitch = 1.08;
  speechSynthesis.speak(utterance);
}

function checkAnswer(button, choice) {
  if (state.answered) return;
  state.answered = true;
  state.total += 1;

  const isCorrect = choice === state.current.answer;
  const buttons = els.answerGrid.querySelectorAll("button");
  buttons.forEach((item) => {
    item.disabled = true;
    if (item.textContent === state.current.answer) item.classList.add("correct");
  });

  if (isCorrect) {
    state.correct += 1;
    state.streak += 1;
    state.stars += 1;
    localStorage.setItem("pinyinStars", String(state.stars));
    els.feedback.className = "feedback good";
    els.feedback.textContent = state.streak >= 3 ? "连续答对三题！" : "答对了！";
    speak();
  } else {
    state.streak = 0;
    button.classList.add("wrong");
    state.mistakes.unshift(`${state.current.prompt} → ${state.current.answer}`);
    state.mistakes = state.mistakes.slice(0, 6);
    els.feedback.className = "feedback bad";
    els.feedback.textContent = `正确答案：${state.current.answer}`;
  }

  els.next.textContent = "下一题";
  updateStats();
}

function updateStats() {
  const roundSize = 10;
  const answeredInRound = state.total % roundSize;
  const progress = Math.min(answeredInRound / roundSize, 1) * 100;
  const accuracy = state.total ? Math.round((state.correct / state.total) * 100) : 0;

  els.starCount.textContent = state.stars;
  els.progressFill.style.width = `${progress}%`;
  els.progressText.textContent = `${answeredInRound} / ${roundSize}`;
  els.roundText.textContent = `第 ${answeredInRound + 1} 题`;
  els.correctCount.textContent = state.correct;
  els.streakCount.textContent = state.streak;
  els.accuracyText.textContent = `${accuracy}%`;
  els.mobileCorrectCount.textContent = state.correct;
  els.mobileStreakCount.textContent = state.streak;
  els.mobileAccuracyText.textContent = `${accuracy}%`;

  if (state.mistakes.length === 0) {
    els.mistakeList.innerHTML = "<li>还没有错题</li>";
    return;
  }

  els.mistakeList.innerHTML = "";
  state.mistakes.forEach((mistake) => {
    const item = document.createElement("li");
    item.textContent = mistake;
    els.mistakeList.append(item);
  });
}

function nextQuestion() {
  pickQuestion();
  renderQuestion();
  updateStats();
}

function resetSession() {
  state.total = 0;
  state.correct = 0;
  state.streak = 0;
  state.mistakes = [];
  nextQuestion();
}

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    els.tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    state.mode = tab.dataset.mode;
    resetSession();
  });
});

els.level.addEventListener("change", () => {
  state.level = els.level.value;
  resetSession();
});

els.next.addEventListener("click", nextQuestion);
els.speak.addEventListener("click", () => speak());
els.reset.addEventListener("click", resetSession);

if (/MicroMessenger/i.test(navigator.userAgent)) {
  els.wechatTip.hidden = false;
  window.setTimeout(() => {
    els.wechatTip.hidden = true;
  }, 3600);
}

nextQuestion();

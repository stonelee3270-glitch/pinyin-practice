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

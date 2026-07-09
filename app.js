"use strict";

const DATA_FILE = "4-journey-to-the-west-quiz.md";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const state = {
  sections: [],
  selectedIndex: 0,
  copyMode: "student",
  optionMode: "random",
  showDate: true,
  randomOrders: new Map(),
  printSelection: new Set(),
  searchTerm: "",
};

const elements = {
  chapterCount: document.querySelector("#chapter-count"),
  chapterList: document.querySelector("#chapter-list"),
  chapterSearch: document.querySelector("#chapter-search"),
  toolbarTitle: document.querySelector("#toolbar-chapter-title"),
  worksheet: document.querySelector("#worksheet"),
  previousChapter: document.querySelector("#previous-chapter"),
  nextChapter: document.querySelector("#next-chapter"),
  reshuffle: document.querySelector("#reshuffle"),
  printButton: document.querySelector("#print-button"),
  batchPrintButton: document.querySelector("#batch-print-button"),
  showDate: document.querySelector("#show-date"),
  selectedCount: document.querySelector("#selected-count"),
  selectVisible: document.querySelector("#select-visible"),
  clearSelected: document.querySelector("#clear-selected"),
  sidebar: document.querySelector(".sidebar"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
  mobileBackdrop: document.querySelector("#mobile-backdrop"),
  toast: document.querySelector("#toast"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripQuestionNumber(question) {
  return question.replace(/^\s*\d+\s*[.)]\s*/, "").trim();
}

function stripOptionLabel(option) {
  return option.replace(/^\s*[A-Z]\s*[.)]\s*/, "").trim();
}

function hasShortOptions(question) {
  return question.options.length === 3 && question.options.every((option) => {
    const text = stripOptionLabel(option);
    return text.length > 0 && text.split(/\s+/).length <= 5;
  });
}

function getLocalDateLabel(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseChapter(section, index) {
  const match = section.title.match(/^Journey to the West\s+(\d+)\s*:\s*(.+)$/i);
  return {
    number: match ? Number(match[1]) : index + 1,
    name: match ? match[2].trim() : section.title,
  };
}

function shuffledIndexes(length) {
  const values = Array.from({ length }, (_, index) => index);
  for (let index = values.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[randomIndex]] = [values[randomIndex], values[index]];
  }
  return values;
}

function createRandomOrders(sectionIndex) {
  const section = state.sections[sectionIndex];
  const orders = section.questions.map((question) => shuffledIndexes(question.options.length));
  state.randomOrders.set(sectionIndex, orders);
  return orders;
}

function getOptionOrder(sectionIndex, questionIndex, optionCount) {
  if (state.optionMode === "original") {
    return Array.from({ length: optionCount }, (_, index) => index);
  }

  const sectionOrders = state.randomOrders.get(sectionIndex) ?? createRandomOrders(sectionIndex);
  return sectionOrders[questionIndex];
}

function getAnswerOriginalIndex(question) {
  const answer = String(question.answer ?? "").trim().toUpperCase();
  const letterIndex = LETTERS.indexOf(answer);

  if (letterIndex >= 0 && letterIndex < question.options.length) {
    return letterIndex;
  }

  const numberIndex = Number(answer) - 1;
  if (Number.isInteger(numberIndex) && numberIndex >= 0 && numberIndex < question.options.length) {
    return numberIndex;
  }

  return -1;
}

function getDisplayedAnswer(question, order) {
  const originalIndex = getAnswerOriginalIndex(question);
  const displayedIndex = order.indexOf(originalIndex);

  return {
    letter: displayedIndex >= 0 ? LETTERS[displayedIndex] : "?",
    text: originalIndex >= 0 ? stripOptionLabel(question.options[originalIndex]) : "答案缺失",
  };
}

function getFilteredSections() {
  const query = state.searchTerm.trim().toLowerCase();

  return state.sections
    .map((section, index) => ({ section, index, chapter: parseChapter(section, index) }))
    .filter(({ section, chapter }) => {
      if (!query) return true;
      return section.title.toLowerCase().includes(query) || String(chapter.number).includes(query);
    });
}

function updateBatchControls() {
  const selectedCount = state.printSelection.size;
  elements.selectedCount.textContent = `已选 ${selectedCount}`;
  elements.batchPrintButton.disabled = selectedCount === 0;
  elements.clearSelected.disabled = selectedCount === 0;
  elements.selectVisible.disabled = getFilteredSections().length === 0;
}

function getSortedPrintIndexes() {
  return [...state.printSelection].sort((left, right) => left - right);
}

function renderChapterList() {
  const query = state.searchTerm.trim().toLowerCase();
  const filteredSections = getFilteredSections();

  elements.chapterCount.textContent = query
    ? `${filteredSections.length} / ${state.sections.length}`
    : String(state.sections.length);

  if (filteredSections.length === 0) {
    elements.chapterList.innerHTML = '<div class="empty-list">没有找到匹配的章节</div>';
    updateBatchControls();
    return;
  }

  elements.chapterList.innerHTML = filteredSections
    .map(({ index, chapter }) => `
      <div class="chapter-row">
        <button
          class="chapter-button"
          type="button"
          data-chapter-index="${index}"
          aria-current="${index === state.selectedIndex}"
          title="Chapter ${chapter.number}: ${escapeHtml(chapter.name)}"
        >
          <span class="chapter-number">${chapter.number}</span>
          <span class="chapter-name">${escapeHtml(chapter.name)}</span>
        </button>
        <label class="chapter-checkbox" title="加入批量打印">
          <input
            type="checkbox"
            data-print-index="${index}"
            aria-label="选择 Chapter ${chapter.number} 批量打印"
            ${state.printSelection.has(index) ? "checked" : ""}
          />
          <span aria-hidden="true"></span>
        </label>
      </div>
    `)
    .join("");
  updateBatchControls();
}

function renderWorksheetPage(sectionIndex) {
  const section = state.sections[sectionIndex];
  if (!section) return;

  const chapter = parseChapter(section, sectionIndex);
  const todayLabel = getLocalDateLabel();

  const questions = section.questions
    .map((question, questionIndex) => {
      const order = getOptionOrder(sectionIndex, questionIndex, question.options.length);
      const optionLayoutClass = hasShortOptions(question) ? " options-inline" : "";
      const options = order
        .map((originalIndex, displayedIndex) => `
          <li class="option-item">
            <span class="option-letter">${LETTERS[displayedIndex]}</span>
            <span>${escapeHtml(stripOptionLabel(question.options[originalIndex]))}</span>
          </li>
        `)
        .join("");

      return `
        <li class="question-item">
          <p class="question-text">${escapeHtml(stripQuestionNumber(question.question))}</p>
          <ol class="option-list${optionLayoutClass}">${options}</ol>
        </li>
      `;
    })
    .join("");

  const answerKey = state.copyMode === "teacher"
    ? renderAnswerKey(section, sectionIndex, chapter)
    : "";
  const dateLabel = state.showDate ? todayLabel : "";

  return `
    <header class="worksheet-header">
      <div class="worksheet-kicker">
        <span>JOURNEY TO THE WEST</span>
        <span>Reading | Listening</span>
      </div>
      <h3>Chapter ${chapter.number}: ${escapeHtml(chapter.name)}</h3>
      <div class="student-fields">
        <span class="student-field">Name <span class="field-line"></span></span>
        <span class="student-field date-field">Date <span class="date-value">${dateLabel}</span></span>
      </div>
    </header>
    <ol class="question-list">${questions}</ol>
    ${answerKey}
  `;
}

function renderWorksheet() {
  const section = state.sections[state.selectedIndex];
  if (!section) return;

  const chapter = parseChapter(section, state.selectedIndex);
  elements.worksheet.classList.remove("batch-preview");
  elements.worksheet.innerHTML = renderWorksheetPage(state.selectedIndex);
  elements.toolbarTitle.textContent = `Chapter ${chapter.number}: ${chapter.name}`;
  document.title = `Chapter ${chapter.number} - ${chapter.name}`;
  elements.previousChapter.disabled = state.selectedIndex === 0;
  elements.nextChapter.disabled = state.selectedIndex === state.sections.length - 1;
  elements.printButton.disabled = false;
}

function renderBatchPrint() {
  const indexes = getSortedPrintIndexes();
  if (indexes.length === 0) {
    showToast("请先选择要批量打印的章节");
    return false;
  }

  elements.worksheet.classList.add("batch-preview");
  elements.worksheet.innerHTML = indexes
    .map((sectionIndex) => `<section class="worksheet-page">${renderWorksheetPage(sectionIndex)}</section>`)
    .join("");
  elements.toolbarTitle.textContent = `批量打印 ${indexes.length} 章`;
  document.title = `Journey to the West - 批量打印 ${indexes.length} 章`;
  elements.previousChapter.disabled = true;
  elements.nextChapter.disabled = true;
  elements.printButton.disabled = true;
  closeSidebar();
  return true;
}

function renderAnswerKey(section, sectionIndex, chapter) {
  const answers = section.questions
    .map((question, questionIndex) => {
      const order = getOptionOrder(sectionIndex, questionIndex, question.options.length);
      const answer = getDisplayedAnswer(question, order);

      return `
        <li class="answer-item">
          <span class="answer-number">${questionIndex + 1}</span>
          <span class="answer-letter">${escapeHtml(answer.letter)}</span>
          <span class="answer-text">${escapeHtml(answer.text)}</span>
        </li>
      `;
    })
    .join("");

  return `
    <section class="answer-key" aria-label="教师答案页">
      <div class="answer-key-header">
        <p class="eyebrow">TEACHER ANSWER KEY</p>
        <h4>Chapter ${chapter.number}: ${escapeHtml(chapter.name)}</h4>
      </div>
      <ol class="answer-list">${answers}</ol>
    </section>
  `;
}

function selectChapter(index) {
  if (index < 0 || index >= state.sections.length) return;
  state.selectedIndex = index;
  renderChapterList();
  renderWorksheet();
  closeSidebar();

  requestAnimationFrame(() => {
    const current = elements.chapterList.querySelector('[aria-current="true"]');
    current?.scrollIntoView({ block: "nearest" });
  });
}

function closeSidebar() {
  elements.sidebar.classList.remove("open");
  elements.mobileBackdrop.hidden = true;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => elements.toast.classList.remove("visible"), 1800);
}

function bindEvents() {
  elements.chapterList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-chapter-index]");
    if (!button) return;
    selectChapter(Number(button.dataset.chapterIndex));
  });

  elements.chapterList.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-print-index]");
    if (!checkbox) return;

    const index = Number(checkbox.dataset.printIndex);
    if (checkbox.checked) {
      state.printSelection.add(index);
    } else {
      state.printSelection.delete(index);
    }
    renderChapterList();
  });

  elements.chapterSearch.addEventListener("input", (event) => {
    state.searchTerm = event.target.value;
    renderChapterList();
  });

  document.querySelectorAll('input[name="worksheet-copy"]').forEach((input) => {
    input.addEventListener("change", (event) => {
      state.copyMode = event.target.value;
      renderWorksheet();
      showToast(state.copyMode === "teacher" ? "已切换到教师版" : "已切换到学生版");
    });
  });

  elements.showDate.addEventListener("change", (event) => {
    state.showDate = event.target.checked;
    renderWorksheet();
    showToast(state.showDate ? "已显示日期" : "已隐藏日期");
  });

  document.querySelectorAll('input[name="option-order"]').forEach((input) => {
    input.addEventListener("change", (event) => {
      state.optionMode = event.target.value;
      elements.reshuffle.disabled = state.optionMode !== "random";
      state.randomOrders.clear();
      renderWorksheet();
      showToast(state.optionMode === "random" ? "选项已随机排列" : "已恢复原始顺序");
    });
  });

  elements.reshuffle.addEventListener("click", () => {
    createRandomOrders(state.selectedIndex);
    renderWorksheet();
    showToast("已生成新的随机顺序");
  });

  elements.previousChapter.addEventListener("click", () => selectChapter(state.selectedIndex - 1));
  elements.nextChapter.addEventListener("click", () => selectChapter(state.selectedIndex + 1));
  elements.printButton.addEventListener("click", () => window.print());
  elements.batchPrintButton.addEventListener("click", () => {
    if (!renderBatchPrint()) return;
    requestAnimationFrame(() => window.print());
  });
  elements.selectVisible.addEventListener("click", () => {
    getFilteredSections().forEach(({ index }) => state.printSelection.add(index));
    renderChapterList();
    showToast("已选择当前列表中的章节");
  });
  elements.clearSelected.addEventListener("click", () => {
    state.printSelection.clear();
    renderChapterList();
    showToast("已清空批量打印选择");
  });

  elements.sidebarToggle.addEventListener("click", () => {
    elements.sidebar.classList.add("open");
    elements.mobileBackdrop.hidden = false;
  });
  elements.mobileBackdrop.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (event) => {
    const targetIsInput = event.target instanceof HTMLInputElement;
    if (event.key === "/" && !targetIsInput) {
      event.preventDefault();
      elements.chapterSearch.focus();
    }
    if (event.key === "Escape") {
      closeSidebar();
      elements.chapterSearch.blur();
    }
    if (!targetIsInput && event.key === "ArrowLeft") selectChapter(state.selectedIndex - 1);
    if (!targetIsInput && event.key === "ArrowRight") selectChapter(state.selectedIndex + 1);
  });
}

function validateData(data) {
  if (!data || !Array.isArray(data.sections) || data.sections.length === 0) {
    throw new Error("题库中没有可用的 sections 数据。");
  }
  data.sections.forEach((section, sectionIndex) => {
    if (typeof section.title !== "string" || !Array.isArray(section.questions)) {
      throw new Error(`第 ${sectionIndex + 1} 章的数据格式不正确。`);
    }
    section.questions.forEach((question, questionIndex) => {
      if (
        typeof question.question !== "string"
        || !Array.isArray(question.options)
        || typeof question.answer !== "string"
      ) {
        throw new Error(`第 ${sectionIndex + 1} 章第 ${questionIndex + 1} 题的数据格式不正确。`);
      }
    });
  });
  return data.sections;
}

async function initialize() {
  bindEvents();
  try {
    const response = await fetch(DATA_FILE, { cache: "no-store" });
    if (!response.ok) throw new Error(`无法读取题库文件，HTTP ${response.status}。`);
    const data = JSON.parse(await response.text());
    state.sections = validateData(data);
    state.printSelection.add(state.selectedIndex);
    renderChapterList();
    renderWorksheet();
  } catch (error) {
    console.error(error);
    elements.toolbarTitle.textContent = "题库载入失败";
    elements.worksheet.innerHTML = `
      <div class="error-state">
        <div>
          <h3>无法载入题库</h3>
          <p>${escapeHtml(error.message)}</p>
          <p>请通过 start.command 或 python3 server.py 启动，不要直接双击 index.html。</p>
        </div>
      </div>
    `;
  }
}

initialize();

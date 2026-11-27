"use strict";

(() => {
  const STORAGE_KEY = "casinoCalcState";
  const MAX_INTEGER_DIGITS = 8;
  const MAX_RESULT = 99_999_999;
  const MAX_HISTORY = 10;
  const DEFAULT_TITLE = "Casino Session Notes";

  const display = document.querySelector("#display");
  const expressionDisplay = document.querySelector("#expression");
  const keypad = document.querySelector(".keypad");
  const historyList = document.querySelector("#history-list");
  const entryCount = document.querySelector("#entry-count");
  const sessionTitleInput = document.querySelector("#session-title");
  const clearLogButton = document.querySelector("#clear-log");
  const savePdfButton = document.querySelector("#save-pdf");
  const printSessionTitle = document.querySelector("#print-session-title");
  const printDate = document.querySelector("#print-date");
  const toast = document.querySelector("#toast");

  let state = loadState();
  let currentInput = "0";
  let storedValue = null;
  let pendingOperator = null;
  let waitingForOperand = false;
  let errorState = false;
  let evaluated = false;
  let toastTimer = 0;
  let storageWarningShown = false;

  function isValidEntry(entry) {
    return entry
      && typeof entry.id === "string"
      && typeof entry.expression === "string"
      && typeof entry.result === "string"
      && typeof entry.note === "string"
      && typeof entry.timestamp === "string";
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { sessionTitle: DEFAULT_TITLE, history: [] };
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.history)) {
        throw new Error("Saved ledger data has an invalid format.");
      }

      return {
        sessionTitle: typeof parsed.sessionTitle === "string" ? parsed.sessionTitle : DEFAULT_TITLE,
        history: parsed.history.filter(isValidEntry).slice(0, MAX_HISTORY),
      };
    } catch (error) {
      showToast("Saved ledger data could not be loaded. A new session is ready.", true);
      console.error("Could not load the saved calculator ledger.", error);
      return { sessionTitle: DEFAULT_TITLE, history: [] };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageWarningShown = false;
    } catch (error) {
      if (!storageWarningShown) {
        showToast("Changes are available for this visit but could not be saved on this device.", true);
        storageWarningShown = true;
      }
      console.error("Could not save the calculator ledger.", error);
    }
  }

  function showToast(message, isError = false) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle("is-error", isError);
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 3600);
  }

  function formatNumber(value) {
    const rounded = Number(value.toFixed(4));
    return Object.is(rounded, -0) ? "0" : String(rounded);
  }

  function operatorSymbol(operator) {
    return operator === "*" ? "×" : operator === "/" ? "÷" : operator;
  }

  function renderDisplay() {
    display.textContent = errorState || currentInput === "-" ? currentInput : formatInput(currentInput);
    display.classList.toggle("is-error", errorState);
    expressionDisplay.textContent = pendingOperator !== null && storedValue !== null
      ? `${formatNumber(storedValue)} ${operatorSymbol(pendingOperator)}`
      : "";
  }

  function formatInput(value) {
    if (value === "-" || value.endsWith(".")) {
      return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? formatNumber(parsed) : value;
  }

  function resetCalculator() {
    currentInput = "0";
    storedValue = null;
    pendingOperator = null;
    waitingForOperand = false;
    errorState = false;
    evaluated = false;
    renderDisplay();
  }

  function showError(message) {
    currentInput = message;
    storedValue = null;
    pendingOperator = null;
    waitingForOperand = false;
    errorState = true;
    evaluated = false;
    renderDisplay();
  }

  function appendDigit(digit) {
    if (errorState) {
      resetCalculator();
    }

    if (waitingForOperand || evaluated) {
      currentInput = digit === "." ? "0." : digit;
      waitingForOperand = false;
      evaluated = false;
      if (pendingOperator === null) {
        storedValue = null;
      }
      renderDisplay();
      return;
    }

    if (digit === ".") {
      if (!currentInput.includes(".")) {
        currentInput = currentInput === "-" ? "-0." : `${currentInput}.`;
      }
      renderDisplay();
      return;
    }

    const integerPart = currentInput.replace(/^-/, "").split(".")[0];
    if (integerPart.length >= MAX_INTEGER_DIGITS) {
      return;
    }

    currentInput = currentInput === "0" ? digit : currentInput === "-0" ? `-${digit}` : `${currentInput}${digit}`;
    renderDisplay();
  }

  function currentValue() {
    if (currentInput === "-" || currentInput === "") {
      return NaN;
    }
    return Number(currentInput);
  }

  function calculate(left, operator, right) {
    if ((operator === "/" || operator === "%") && right === 0) {
      return { error: "INVALID BET" };
    }

    let result;
    switch (operator) {
      case "+":
        result = left + right;
        break;
      case "-":
        result = left - right;
        break;
      case "*":
        result = left * right;
        break;
      case "/":
        result = left / right;
        break;
      case "%":
        result = left % right;
        break;
      default:
        return { error: "INVALID BET" };
    }

    if (!Number.isFinite(result)) {
      return { error: "INVALID BET" };
    }
    if (result > MAX_RESULT || result < -MAX_RESULT) {
      return { error: "HOUSE LIMIT" };
    }

    return { value: Number(result.toFixed(4)) };
  }

  function setOperator(operator) {
    if (errorState) {
      return;
    }

    if (waitingForOperand && pendingOperator !== null) {
      if (operator === "-" && !currentInput.startsWith("-")) {
        currentInput = "-0";
        waitingForOperand = false;
      } else {
        pendingOperator = operator;
      }
      renderDisplay();
      return;
    }

    const value = currentValue();
    if (!Number.isFinite(value)) {
      return;
    }

    if (pendingOperator !== null && storedValue !== null) {
      const outcome = calculate(storedValue, pendingOperator, value);
      if (outcome.error) {
        showError(outcome.error);
        return;
      }
      storedValue = outcome.value;
      currentInput = String(outcome.value);
    } else {
      storedValue = value;
    }

    pendingOperator = operator;
    waitingForOperand = true;
    evaluated = false;
    renderDisplay();
  }

  function makeHistoryEntry(expression, result) {
    const now = new Date();
    return {
      id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      expression,
      result: formatNumber(result),
      note: "",
      timestamp: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };
  }

  function addHistoryEntry(entry) {
    state.history = [entry, ...state.history].slice(0, MAX_HISTORY);
    saveState();
    renderHistory();
  }

  function evaluate() {
    if (errorState || pendingOperator === null || storedValue === null) {
      return;
    }

    const rightValue = currentValue();
    if (!Number.isFinite(rightValue)) {
      return;
    }

    const leftValue = storedValue;
    const operator = pendingOperator;
    const outcome = calculate(leftValue, operator, rightValue);
    if (outcome.error) {
      showError(outcome.error);
      return;
    }

    const result = outcome.value;
    addHistoryEntry(makeHistoryEntry(
      `${formatNumber(leftValue)} ${operatorSymbol(operator)} ${formatNumber(rightValue)}`,
      result,
    ));
    currentInput = String(result);
    storedValue = null;
    pendingOperator = null;
    waitingForOperand = true;
    evaluated = true;
    renderDisplay();
  }

  function deleteLastDigit() {
    if (errorState) {
      return;
    }

    if (waitingForOperand) {
      currentInput = "0";
      waitingForOperand = false;
      evaluated = false;
    } else if (currentInput.length <= 1 || (currentInput.length === 2 && currentInput.startsWith("-"))) {
      currentInput = "0";
    } else {
      currentInput = currentInput.slice(0, -1);
    }
    renderDisplay();
  }

  function doubleCurrentValue() {
    if (errorState) {
      return;
    }

    const previousValue = currentValue();
    if (!Number.isFinite(previousValue)) {
      return;
    }

    const outcome = calculate(previousValue, "*", 2);
    if (outcome.error) {
      showError(outcome.error);
      return;
    }

    addHistoryEntry(makeHistoryEntry(
      `${formatNumber(previousValue)} × 2`,
      outcome.value,
    ));
    currentInput = String(outcome.value);
    storedValue = null;
    pendingOperator = null;
    waitingForOperand = true;
    evaluated = true;
    renderDisplay();
  }

  function renderHistory() {
    historyList.replaceChildren();
    entryCount.textContent = `${state.history.length} of ${MAX_HISTORY} entries`;
    sessionTitleInput.value = state.sessionTitle;

    if (state.history.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = '<span class="empty-icon" aria-hidden="true">♧</span><strong>Your ledger is ready</strong><p>Calculations you complete will appear here. Add a note to remember what each one was for.</p>';
      historyList.append(empty);
      return;
    }

    state.history.forEach((entry) => {
      historyList.append(createHistoryCard(entry));
    });
  }

  function createHistoryCard(entry) {
    const item = document.createElement("article");
    item.className = "history-item";
    item.dataset.id = entry.id;

    const reveal = document.createElement("div");
    reveal.className = "delete-reveal";
    reveal.textContent = "DELETE";

    const card = document.createElement("div");
    card.className = "history-card";

    const topline = document.createElement("div");
    topline.className = "history-topline";

    const reuseButton = document.createElement("button");
    reuseButton.className = "reuse-button";
    reuseButton.type = "button";
    reuseButton.setAttribute("aria-label", `Reuse result ${entry.result}`);

    const calculation = document.createElement("span");
    calculation.className = "calculation-expression";
    calculation.textContent = entry.expression;

    const result = document.createElement("span");
    result.className = "calculation-result";
    result.textContent = `= ${entry.result}`;

    reuseButton.append(calculation, result);
    reuseButton.addEventListener("click", () => {
      currentInput = entry.result;
      storedValue = null;
      pendingOperator = null;
      waitingForOperand = true;
      errorState = false;
      evaluated = true;
      renderDisplay();
      showToast(`Loaded ${entry.result} into the calculator.`);
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", `Delete calculation ${entry.expression}`);
    deleteButton.addEventListener("click", () => removeHistoryEntry(entry.id));

    topline.append(reuseButton, deleteButton);

    const noteInput = document.createElement("input");
    noteInput.className = "note-input";
    noteInput.type = "text";
    noteInput.maxLength = 200;
    noteInput.placeholder = "Add a note...";
    noteInput.value = entry.note;
    noteInput.setAttribute("aria-label", `Note for ${entry.expression}`);
    noteInput.autocomplete = "off";
    noteInput.addEventListener("input", () => {
      const savedEntry = state.history.find((itemEntry) => itemEntry.id === entry.id);
      if (savedEntry) {
        savedEntry.note = noteInput.value;
        printableNote.textContent = noteInput.value.trim() ? `Note: ${noteInput.value.trim()}` : "";
        printableNote.classList.toggle("has-note", Boolean(noteInput.value.trim()));
        saveState();
      }
    });

    const printableNote = document.createElement("span");
    printableNote.className = "print-note";
    printableNote.textContent = entry.note.trim() ? `Note: ${entry.note.trim()}` : "";
    printableNote.classList.toggle("has-note", Boolean(entry.note.trim()));

    const timestamp = document.createElement("time");
    timestamp.className = "history-time";
    timestamp.textContent = entry.timestamp;

    card.append(topline, noteInput, printableNote, timestamp);
    item.append(reveal, card);
    enableSwipeToDelete(item, card, entry.id);
    return item;
  }

  function enableSwipeToDelete(item, card, id) {
    let startX = 0;
    let currentX = 0;
    let dragging = false;
    let moved = false;

    card.addEventListener("pointerdown", (event) => {
      if (event.target.closest("input, button")) {
        return;
      }
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      startX = event.clientX;
      currentX = 0;
      dragging = true;
      moved = false;
      card.classList.add("is-dragging");
      card.setPointerCapture(event.pointerId);
    });

    card.addEventListener("pointermove", (event) => {
      if (!dragging) {
        return;
      }

      currentX = Math.max(0, event.clientX - startX);
      moved ||= currentX > 5;
      card.style.transform = `translateX(${currentX}px)`;
    });

    const finishDrag = () => {
      if (!dragging) {
        return;
      }
      dragging = false;
      card.classList.remove("is-dragging");
      const threshold = Math.min(80, item.clientWidth * 0.35);

      if (currentX >= threshold) {
        card.classList.add("is-removing");
        card.style.transform = "";
        window.setTimeout(() => removeHistoryEntry(id), 240);
      } else {
        card.style.transform = "";
      }
    };

    card.addEventListener("pointerup", finishDrag);
    card.addEventListener("pointercancel", finishDrag);
    card.addEventListener("click", (event) => {
      if (moved) {
        event.preventDefault();
        event.stopPropagation();
        moved = false;
      }
    }, true);
  }

  function removeHistoryEntry(id) {
    const nextHistory = state.history.filter((entry) => entry.id !== id);
    if (nextHistory.length === state.history.length) {
      return;
    }
    state.history = nextHistory;
    saveState();
    renderHistory();
  }

  function clearHistory() {
    if (state.history.length === 0) {
      showToast("Your ledger is already clear.");
      return;
    }
    state.history = [];
    saveState();
    renderHistory();
    showToast("Ledger cleared. Your session title was kept.");
  }

  function saveAsPdf() {
    printSessionTitle.textContent = state.sessionTitle.trim() || DEFAULT_TITLE;
    printDate.textContent = new Date().toLocaleDateString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    window.print();
  }

  keypad.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) {
      return;
    }

    if (button.dataset.digit !== undefined) {
      appendDigit(button.dataset.digit);
      return;
    }
    if (button.dataset.operator !== undefined) {
      setOperator(button.dataset.operator);
      return;
    }

    switch (button.dataset.action) {
      case "clear":
        resetCalculator();
        break;
      case "delete":
        deleteLastDigit();
        break;
      case "double":
        doubleCurrentValue();
        break;
      case "equals":
        evaluate();
        break;
      default:
        break;
    }
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement
      && (target.matches("input, textarea, select") || target.isContentEditable)) {
      return;
    }

    if (/^[0-9.]$/.test(event.key)) {
      event.preventDefault();
      appendDigit(event.key);
    } else if (["+", "-", "*", "/", "%"].includes(event.key)) {
      event.preventDefault();
      setOperator(event.key);
    } else if (event.key === "Enter" || event.key === "=") {
      event.preventDefault();
      evaluate();
    } else if (event.key === "Backspace") {
      event.preventDefault();
      deleteLastDigit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      resetCalculator();
    }
  });

  sessionTitleInput.addEventListener("input", () => {
    state.sessionTitle = sessionTitleInput.value;
    saveState();
  });
  clearLogButton.addEventListener("click", clearHistory);
  savePdfButton.addEventListener("click", saveAsPdf);

  sessionTitleInput.value = state.sessionTitle;
  renderDisplay();
  renderHistory();
})();

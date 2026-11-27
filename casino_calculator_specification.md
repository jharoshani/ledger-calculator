# Project Specification: Casino Calculator & Session Notes Web App

## 1. Project Overview
A lightweight, responsive, browser-based **Casino-Themed Calculator** paired with a **Google Notes–style Calculation Ledger**. The application runs completely client-side with zero external frameworks, libraries, or backend dependencies.

### Target File Structure
Create and maintain strictly three files inside the project folder (`roshani/calculator/`):
- `index.html` — Semantic HTML5 structure for the calculator keypad, display screen, and Google Notes–style history ledger.
- `style.css` — Custom CSS3 styling featuring an emerald-felt casino aesthetic, metallic gold trim, LED readout styling, responsive layout, and smooth swipe animations.
- `script.js` — Vanilla ES6+ JavaScript handling arithmetic logic, the 8-digit cap, `localStorage` state persistence, swipe-to-delete gestures, and print-to-PDF ledger export.

---

## 2. Visual Design & Layout Architecture

### Aesthetic & Color Palette
- **Table Felt Background:** Deep Casino Emerald (`#0b3d2e` to `#06241b` radial gradient) with subtle felt texture feel.
- **Calculator Chassis:** Matte Charcoal / Obsidian (`#16191d`) framed with a Metallic Gold border (`#d4af37`) and soft ambient drop shadow.
- **Digital Display Screen:** Dark Recessed LED Screen (`#0a0f0d`) with crisp gold/amber glowing digits (`#ffd166`) and a secondary top line showing the active expression.
- **Button Styling (Tactile Poker-Chip Inspired):**
  - **Number Keys (`0–9`, `.`):** Ivory / Off-White (`#f4f1ea`) with dark text (`#16191d`).
  - **Standard Operators (`+`, `-`, `×`, `÷`, `%`):** Crimson / Casino Red (`#b8292f`) with white text.
  - **Casino Quick-Bet Key (`2x` Double Down):** Royal Gold (`#d4af37`) with bold dark text (`#16191d`) and subtle shimmer border.
  - **Utility Keys (`AC`, `DEL`):** Slate Gray (`#3a404a`) with white text.
  - **Equals Key (`=`):** Emerald Green (`#1b7a56`) with gold border.
- **Google Notes–Style Ledger Panel:** Clean Warm Card (`#fffdf7` or dark-mode warm slate `#1f242b` with gold accents—ensure high readability) styled like a Google Keep card with subtle borders, clean sans-serif typography, and soft hover elevation.

### Responsive Layout
- **Desktop (`>= 768px`):** Two-column CSS Grid/Flexbox layout side-by-side:
  - **Left Column:** Casino Calculator unit (`max-width: 380px`).
  - **Right Column:** Google Notes–Style History Ledger (`flex: 1`, `max-width: 460px`).
- **Mobile (`< 768px`):** Single-column stacked layout with the Calculator on top and the History Ledger directly below.

---

## 3. Functional Specifications: Calculator Engine

### Keypad Layout
Include the following buttons:
- **Row 1 (Special & Clear):** `AC` (All Clear), `DEL` (Backspace), `2x` (Double Down), `÷`
- **Row 2:** `7`, `8`, `9`, `×`
- **Row 3:** `4`, `5`, `6`, `-`
- **Row 4:** `1`, `2`, `3`, `+`
- **Row 5:** `%`, `0`, `.`, `=`

### Core Math & Input Rules
1. **8-Digit Answer & Input Cap (`-99,999,999` to `99,999,999`):**
   - Users cannot type more than 8 digits before the decimal point in a single operand (ignoring the minus sign `-`). Digits after the decimal point do not count toward this input cap.
   - Any calculated result strictly greater than `99999999` or less than `-99999999` must trigger the overflow state.
2. **Overflow State (`"HOUSE LIMIT"`):**
   - When a result exceeds the 8-digit cap, display `"HOUSE LIMIT"` on the main readout.
   - Do **not** save `"HOUSE LIMIT"` errors to the history log.
   - Pressing any number or `AC` resets the screen cleanly to normal operation.
3. **Divide-by-Zero Guard (`"INVALID BET"`):**
   - Dividing by `0` displays `"INVALID BET"` instead of `Infinity` or `NaN`, and does not save to history.
4. **Decimal Precision:**
   - Prevent JavaScript floating-point artifacts (e.g., `0.1 + 0.2 = 0.30000000000000004`) by rounding results cleanly (e.g., `Number(result.toFixed(4))`). Display up to 8 digits before the decimal point and up to 4 decimal places, removing unnecessary trailing zeros.
5. **Percent Key (`%`):**
   - `%` performs the modulo (remainder) operation; for example, `10 % 3` evaluates to `1`.
   - Taking the remainder by `0` displays `"INVALID BET"` and does not save to history.
6. **`2x` (Double Down) Behavior:**
   - Clicking `2x` immediately multiplies the currently displayed number (or active result) by `2`.
   - Validates against the 8-digit cap (`99,999,999`); if valid, updates the display and logs `<prevValue> × 2 = <newValue>` to the history log.
7. **Physical Keyboard Support:**
   - Map `0–9`, `.`, `+`, `-`, `*`, `/`, `%` to their respective calculator actions.
   - Map `Enter` or `=` to Evaluate (`=`).
   - Map `Backspace` to `DEL`.
   - Map `Escape` to `AC`.
   - *Important:* Disable calculator keyboard shortcuts while the user is actively typing inside the Session Title or any inline History Note `<input>` field.

---

## 4. Functional Specifications: 10-Item History Log

### Capacity & Queue Behavior
- **Maximum Capacity:** Stores up to **10** calculation entries.
- **FIFO Auto-Eviction (11th Calculation Rule):** When 10 calculations are already stored and an 11th valid calculation is completed, automatically remove the **oldest** calculation (bottom of the list) and prepend the newest calculation at the top.

### Persistence (`localStorage`)
Store state under a single JSON key (e.g., `casinoCalcState`) in `localStorage`:
```json
{
  "sessionTitle": "Casino Session Notes",
  "history": [
    {
      "id": "1732712000000",
      "expression": "250 × 2",
      "result": "500",
      "note": "Table 3 double down",
      "timestamp": "6:30 PM"
    }
  ]
}
```

### Interactive History Features
1. **Click-to-Reuse:** Clicking the calculation expression/result area of any history card loads that `result` directly into the calculator's current input so the user can continue calculating from it.
2. **Swipe-Right to Delete (Individual Item):**
   - Implement smooth horizontal pointer/touch dragging (`pointerdown`, `pointermove`, `pointerup`) on each history card.
   - Reveal a red `"DELETE"` background layer underneath as the card slides right.
   - If dragged right beyond `80px` (or ~35% of card width), animate the card sliding completely off-screen to the right and remove that specific item from `history` and `localStorage`. If released early, snap the card smoothly back to `0px`.
   - **Desktop Mouse Accessibility Fallback:** Also display a subtle `×` delete button on the top-right corner of each card on hover so desktop mouse users can delete single rows with one click.
3. **Clear Log Button:**
   - Placed in the Ledger header toolbar. Clears all items in the `history` array (while keeping or resetting the session title cleanly) and updates `localStorage`.

---

## 5. Functional Specifications: Session Ledger & PDF Export

### Inline Note Editing (Google Keep Style)
- **Editable Session Title:** At the top of the ledger panel, provide a borderless, auto-saving text input (`placeholder="Session Title..."`, default `"Casino Session Notes"`).
- **Per-Calculation Inline Note:** Below each saved calculation (`expression = result`), render a clean, lightweight text input (`placeholder="Add a note..."`) styled like a Google Keep line item. Typing updates that item's `note` field in `localStorage` on `input`/`change`.

### "Save as PDF" Button
- Placed next to the **Clear Log** button in the ledger header.
- Clicking it opens the browser's print dialog (`window.print()`); the user can choose **Save as PDF** as the destination.
- The print layout includes the session title, current date, calculations, timestamps, and any saved notes. It hides the calculator, interactive controls, and screen-only decorations.

---

## 6. Acceptance Criteria Checklist
- [ ] Only three files exist: `index.html`, `style.css`, and `script.js`.
- [ ] Results exceeding `99,999,999` or below `-99,999,999` display `"HOUSE LIMIT"` and do not log to history.
- [ ] `2x` button doubles the active value and respects the 8-digit cap.
- [ ] History holds a maximum of 10 items and automatically drops the oldest item on the 11th calculation.
- [ ] Swiping right on any history card (or clicking its hover `×` icon) deletes only that card.
- [ ] Typing into the Session Title or any calculation's inline note saves automatically in `localStorage` and does not trigger calculator keyboard shortcuts.
- [ ] Clicking **Save as PDF** opens the browser print dialog with a clean ledger-only layout that includes saved notes.

---

## 7. Quick Prompts to Run in VS Code Copilot Chat
Once you attach `#file:CASINO_CALCULATOR_SPEC.md` in VS Code Copilot Chat, run these three prompts in order:
1. *"Using `#file:CASINO_CALCULATOR_SPEC.md`, generate the complete semantic HTML for `index.html`."*
2. *"Using `#file:CASINO_CALCULATOR_SPEC.md` and `index.html`, generate the complete casino-themed and Google Notes–styled CSS for `style.css`."*
3. *"Using `#file:CASINO_CALCULATOR_SPEC.md` and `index.html`, generate the complete JavaScript logic in `script.js` including the 8-digit cap, 2x button, FIFO 10-item history, swipe-right deletion, and print-to-PDF ledger export."*
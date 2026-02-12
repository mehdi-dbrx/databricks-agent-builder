# Dropdown list component — design spec

This document describes the **filterable dropdown list** used in the app (e.g. Unity Catalog and schema selectors). Any agent or developer should be able to recreate the same component elsewhere by following this spec: structure, behaviour, and styles.

---

## 1. Purpose

A single-select dropdown that:

- Shows a **trigger** with the current value or a placeholder.
- Opens a **popover** below the trigger containing:
  - A **filter input** (optional but recommended for long lists).
  - A **scrollable list** of options; clicking an option selects it and closes the popover.
- Closes on **outside click** or on **selection**.
- Supports **filtering** by typing (client-side, case-insensitive substring match).

No “clear selection” or “Select X” entry in the list; the trigger alone shows placeholder when empty.

---

## 2. Structure (DOM / JSX)

Use a **single wrapper** that contains both trigger and popover, so “outside” is easy to detect. Suggested structure:

```
<div ref={wrapperRef} className="relative">
  <!-- TRIGGER -->
  <button type="button" ...>
    <span>{selectedValue || placeholder}</span>
    <ChevronDownIcon />
  </button>

  {isOpen && (
    <div className="absolute left-0 right-0 top-full mt-1 ...">
      <!-- FILTER INPUT -->
      <input type="text" value={filter} onChange={...} onMouseDown={e => e.stopPropagation()} placeholder="Type to filter..." />

      <!-- LIST CONTAINER (scrollable) -->
      <div className="overflow-auto ...">
        {filteredOptions.map(option => (
          <button type="button" key={option.id} onClick={() => select(option)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )}
</div>
```

- **Wrapper:** `position: relative`; attach a ref for outside-click detection.
- **Trigger:** full-width button, flex, space between label and chevron.
- **Popover:** `position: absolute`, `left-0 right-0 top-full`, `margin-top: 4px`; high enough z-index so it overlays surrounding content (e.g. `z-10`).
- **Filter input:** must call `onMouseDown={(e) => e.stopPropagation()}` so clicking it doesn’t close the popover (no focus steal).
- **List:** scrollable area with a max height so long lists don’t overflow the viewport.

---

## 3. Behaviour

### 3.1 Open / close

- **Open:** click on trigger toggles the popover (or only opens; either is fine).
- **Close:**
  - When user clicks an option → set value, close popover.
  - When user clicks outside the wrapper → close popover (no selection change).
- **Outside click:** on open, add a `mousedown` listener on `document`. If the event target is not inside `wrapperRef.current`, set open to false. Remove the listener on close / unmount.

### 3.2 Filter

- **State:** one string state for the filter input value.
- **Reset:** when opening the popover, clear the filter (e.g. set to `''`) and focus the filter input (after a tick if needed).
- **Filtering:** derive `filteredOptions` from the full list: if filter is trimmed non-empty, keep options whose `label` (or comparable string) contains the filter substring, case-insensitive; otherwise show all options.
- **Display:** render only `filteredOptions` in the list; no “no results” row required unless you want it.

### 3.3 Selection

- Each list item is a `<button type="button">`. On click: set the selected value (or object), close the popover, optionally clear the filter for next open.
- **Trigger display:** if there is a selected value, show its label; otherwise show the placeholder in a muted style.

### 3.4 Accessibility

- Trigger and list items are focusable. Focus management (e.g. move focus into popover when open, return to trigger on close) can be added later; minimum is keyboard-focusable buttons and correct labelling (e.g. `aria-label` on trigger, `aria-expanded` if you add it).

---

## 4. Styles (Tailwind)

Use these so all dropdowns in the app look the same. Project uses **zinc** for neutrals and **brick** for accent (see `tailwind.config.js` for brick palette).

### 4.1 Trigger button

- **Layout:** `w-full flex items-center justify-between gap-2 px-3 py-2 text-left`.
- **Shape:** `rounded-md`.
- **Colors:** `bg-white text-zinc-900`, placeholder (when no value): `text-zinc-500` on the label span.
- **Border:** `border border-zinc-200`, `hover:border-zinc-300`.
- **Focus:** `focus:outline-none focus:ring-2 focus:ring-brick-400 focus:border-transparent`.
- **Icon:** chevron down, `h-4 w-4 shrink-0 text-zinc-500`.

Example trigger class string:

```
w-full flex items-center justify-between gap-2 px-3 py-2 border border-zinc-200 rounded-md text-sm text-zinc-900 bg-white hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-brick-400 focus:border-transparent text-left
```

(Use a `span` for the label and conditionally add `text-zinc-500` when value is empty.)

### 4.2 Popover container

- **Position/size:** `absolute left-0 right-0 top-full mt-1 max-h-56 overflow-hidden rounded-md`.
- **Surface:** `border border-zinc-200 bg-white shadow-lg z-10 flex flex-col`.

### 4.3 Filter input

- **Spacing:** `m-2` (margin on all sides inside popover).
- **Layout:** `px-3 py-2`, `text-sm`.
- **Colors:** `border border-zinc-200`, `text-zinc-900`, `placeholder:text-zinc-400`.
- **Shape:** `rounded-md`.
- **Focus:** `focus:outline-none focus:ring-2 focus:ring-brick-400 focus:border-transparent`.

Example:

```
m-2 px-3 py-2 border border-zinc-200 rounded-md text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brick-400 focus:border-transparent
```

### 4.4 List container

- **Scroll:** `overflow-auto py-1 max-h-44` (so popover total height stays bounded; `max-h-56` on container, filter + list share space).

### 4.5 List item buttons

- **Layout:** `w-full px-3 py-2 text-left text-sm`.
- **Colors:** `text-zinc-800`, `hover:bg-brick-50 hover:text-zinc-900`.

Example:

```
w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-brick-50 hover:text-zinc-900
```

---

## 5. Label above the dropdown

When the dropdown is used in a form/settings layout:

- **Label:** `block text-sm font-medium text-zinc-700 mb-2` (margin below label).
- **Wrapper:** one block-level wrapper (e.g. `<div>`) with the label and the dropdown wrapper inside.

---

## 6. State and refs (React)

- `value` — selected value (string or id); empty string or null when none.
- `isOpen` — boolean for popover visibility.
- `filter` — string for the filter input.
- `wrapperRef` — ref on the root `relative` div for outside-click checks.
- `filterInputRef` — optional ref on the filter input to call `.focus()` when opening.

**Effects:**

1. When `isOpen` becomes true: clear `filter`, focus filter input (e.g. in a useEffect or after state update), and add document `mousedown` listener that closes popover if click is outside `wrapperRef.current`. Cleanup: remove listener and optionally blur.
2. When `isOpen` becomes false: no special cleanup besides removing the listener.

**Filtering:** compute `filteredOptions` from `options` and `filter` (trim, toLowerCase, includes).

---

## 7. Optional: disabled / error states

- **Disabled:** if the dropdown can be disabled, disable the trigger button and do not open on click; optionally add `opacity-50` or `bg-zinc-50` for the trigger.
- **Error:** if the field can show an error (e.g. API error), show a message below the dropdown: `text-sm text-red-600`. Do not change the trigger/list styles for error; keep the same dropdown look.

---

## 8. Summary checklist for implementation

- [ ] Wrapper: `relative`, ref for outside click.
- [ ] Trigger: full-width button, value or placeholder, chevron; styles as in §4.1.
- [ ] Popover: absolute, below trigger, max height, border/shadow/z-index as in §4.2.
- [ ] Filter input: inside popover, `onMouseDown` stopPropagation; styles as in §4.3.
- [ ] List: scrollable, max height; item buttons as in §4.5.
- [ ] Close on outside mousedown; close on option select; clear filter on open; focus filter on open.
- [ ] Filter logic: trim, case-insensitive substring on option label.
- [ ] No “Select X” or “Clear” entry in the list; placeholder only on trigger.

Using this spec, you can add new dropdowns (e.g. for another catalog, workspace, or any list) that look and behave like the existing Unity Catalog and schema dropdowns.

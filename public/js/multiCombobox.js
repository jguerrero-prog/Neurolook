// @ts-check
import { createElement } from './dom.js';

const OPEN_CLASS = 'tm-combobox--open';
const SELECTED_CLASS = 'tm-combobox--selected';
const ACTIVE_OPTION_CLASS = 'tm-combobox__option--active';
const SELECTED_OPTION_CLASS = 'tm-combobox__option--selected';

/**
 * @typedef {Object} FacetOption
 * @property {string} value
 * @property {number} count
 */

// A facet's option list can run into the dozens, so it's collapsed behind a
// dropdown (like Combobox in combobox.js) instead of an always-open,
// scrolling checkbox list — that made it too easy to check something and
// have it scroll out of view with no other indication it was selected.
// Unlike Combobox this allows several values at once: picking an option
// toggles it and leaves the panel open, and every checked value also
// renders as a removable pill below the trigger. The real state lives in
// plain (hidden) checkboxes, so the existing query-building code in
// browse.js — which reads `input[name][checked]` — needs no changes.
class MultiCombobox {
  /** @param {HTMLElement} root */
  constructor(root) {
    this.root = root;
    this.field = root.dataset.multiselect;
    this.trigger = /** @type {HTMLElement} */ (root.querySelector('.tm-combobox__trigger'));
    this.valueLabel = /** @type {HTMLElement} */ (root.querySelector('.tm-combobox__value'));
    this.placeholder = this.valueLabel.textContent;
    this.panel = /** @type {HTMLElement} */ (root.querySelector('.tm-combobox__panel'));
    this.searchInput = /** @type {HTMLInputElement} */ (root.querySelector('.tm-combobox__search'));
    this.list = /** @type {HTMLElement} */ (root.querySelector('.tm-combobox__list'));
    this.nativeContainer = /** @type {HTMLElement} */ (root.querySelector('.tm-multiselect__native'));
    this.pillsContainer = /** @type {HTMLElement} */ (root.querySelector('.tm-multiselect__pills'));
    /** @type {HTMLElement|null} */
    this.emptyItem = null;
    this.activeIndex = -1;

    this.trigger.addEventListener('click', () => this.toggleOpen());
    this.trigger.addEventListener('keydown', (event) => this.handleTriggerKeydown(event));
    this.searchInput.addEventListener('input', () => this.filterOptions());
    this.searchInput.addEventListener('keydown', (event) => this.handleSearchKeydown(event));
    document.addEventListener('click', (event) => {
      if (!root.contains(/** @type {Node} */ (event.target))) this.close();
    });
  }

  /**
   * @param {FacetOption[]} items
   * @param {Set<string>} selectedValues
   * @returns {void}
   */
  setOptions(items, selectedValues) {
    this.nativeContainer.replaceChildren(
      ...items.map(({ value }) => {
        const checkbox = /** @type {HTMLInputElement} */ (
          createElement('input', { attrs: { type: 'checkbox', name: this.field, value } })
        );
        checkbox.checked = selectedValues.has(value);
        return checkbox;
      }),
    );

    this.list.replaceChildren(
      ...items.map(({ value, count }, index) => {
        const option = createElement('li', {
          className: 'tm-combobox__option',
          attrs: {
            role: 'option',
            id: `${this.field}-option-${index}`,
            'data-index': index,
            'data-value': value,
            'data-text': value.toLowerCase(),
          },
          children: [
            createElement('img', {
              className: 'tm-multiselect__checkbox',
              attrs: { src: '/assets/icons/checkbox-unchecked.svg', alt: '', width: 14, height: 14 },
            }),
            createElement('span', { className: 'tm-combobox__option-label', text: value }),
            createElement('span', { className: 'tm-multiselect__option-count', text: count.toLocaleString() }),
          ],
        });
        option.addEventListener('click', () => this.toggleValue(value));
        option.addEventListener('mouseenter', () => this.setActive(index));
        return option;
      }),
    );

    const emptyItem = createElement('li', { className: 'tm-combobox__empty', text: 'No matches' });
    emptyItem.hidden = true;
    this.list.appendChild(emptyItem);
    this.emptyItem = emptyItem;

    this.syncSelectedDisplay();
  }

  /** @param {string} value @returns {HTMLInputElement|null} */
  getCheckbox(value) {
    return this.nativeContainer.querySelector(`input[value="${CSS.escape(value)}"]`);
  }

  /** @returns {string[]} */
  getSelectedValues() {
    return [...this.nativeContainer.querySelectorAll('input:checked')].map(
      (checkbox) => /** @type {HTMLInputElement} */ (checkbox).value,
    );
  }

  // For "Clear all" — resets this field's checkboxes/pills without
  // navigating; the caller (browse.js) triggers one navigation afterward
  // for all fields at once, rather than one per field.
  /** @returns {void} */
  clearSelection() {
    this.nativeContainer.querySelectorAll('input:checked').forEach((checkbox) => {
      /** @type {HTMLInputElement} */ (checkbox).checked = false;
    });
    this.syncSelectedDisplay();
  }

  // Checks exactly one value (unchecking anything else) — for setting a
  // programmatic default, as opposed to toggleValue's user-driven add/remove.
  /** @param {string} value @returns {void} */
  selectOnly(value) {
    this.nativeContainer.querySelectorAll('input').forEach((checkbox) => {
      /** @type {HTMLInputElement} */ (checkbox).checked = checkbox.value === value;
    });
    this.syncSelectedDisplay();
  }

  /** @param {string} value @returns {void} */
  toggleValue(value) {
    const checkbox = this.getCheckbox(value);
    if (!checkbox) return;
    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    this.syncSelectedDisplay();
  }

  /** @returns {void} */
  syncSelectedDisplay() {
    const selectedValues = new Set(this.getSelectedValues());

    this.list.querySelectorAll('.tm-combobox__option').forEach((item) => {
      const element = /** @type {HTMLElement} */ (item);
      const isSelected = selectedValues.has(element.dataset.value ?? '');
      element.classList.toggle(SELECTED_OPTION_CLASS, isSelected);
      element.setAttribute('aria-selected', String(isSelected));
      const checkboxImage = /** @type {HTMLImageElement} */ (element.querySelector('.tm-multiselect__checkbox'));
      checkboxImage.src = `/assets/icons/checkbox-${isSelected ? 'checked' : 'unchecked'}.svg`;
    });

    this.root.classList.toggle(SELECTED_CLASS, selectedValues.size > 0);
    this.valueLabel.textContent = selectedValues.size > 0 ? [...selectedValues].join(', ') : this.placeholder;

    this.pillsContainer.replaceChildren(
      ...[...selectedValues].map((value) => {
        const pill = createElement('button', {
          className: 'tm-multiselect__pill',
          attrs: { type: 'button', 'data-value': value, 'aria-label': `Remove ${value}` },
          children: [
            createElement('span', { className: 'tm-multiselect__pill-label', text: value }),
            createElement('img', { attrs: { src: '/assets/icons/pill-remove.svg', alt: '', width: 12, height: 12 } }),
          ],
        });
        pill.addEventListener('click', () => this.toggleValue(value));
        return pill;
      }),
    );
  }

  /** @returns {HTMLElement[]} */
  getOptionItems() {
    return /** @type {HTMLElement[]} */ ([...this.list.querySelectorAll('.tm-combobox__option')]);
  }

  /** @returns {HTMLElement[]} */
  getVisibleOptionItems() {
    return this.getOptionItems().filter((item) => !item.hidden);
  }

  /** @returns {void} */
  filterOptions() {
    const query = this.searchInput.value.trim().toLowerCase();
    const items = this.getOptionItems();
    items.forEach((item) => {
      item.hidden = query !== '' && !item.dataset.text?.includes(query);
    });
    if (this.emptyItem) this.emptyItem.hidden = this.getVisibleOptionItems().length > 0;
    this.setActive(this.getVisibleOptionItems().length > 0 ? 0 : -1);
  }

  /** @returns {void} */
  open() {
    if (this.root.classList.contains(OPEN_CLASS)) return;
    this.root.classList.add(OPEN_CLASS);
    this.panel.hidden = false;
    this.trigger.setAttribute('aria-expanded', 'true');
    this.searchInput.value = '';
    this.filterOptions();
    this.searchInput.focus();
  }

  /** @returns {void} */
  close() {
    if (!this.root.classList.contains(OPEN_CLASS)) return;
    this.root.classList.remove(OPEN_CLASS);
    this.panel.hidden = true;
    this.trigger.setAttribute('aria-expanded', 'false');
    this.setActive(-1);
  }

  /** @returns {void} */
  toggleOpen() {
    if (this.root.classList.contains(OPEN_CLASS)) this.close();
    else this.open();
  }

  // `index` is relative to the currently visible (filtered) items, since
  // that's the list a keyboard or mouse user is actually navigating.
  /** @param {number} index @returns {void} */
  setActive(index) {
    const visibleItems = this.getVisibleOptionItems();
    this.getOptionItems().forEach((item) => item.classList.remove(ACTIVE_OPTION_CLASS));

    const activeItem = visibleItems[index];
    this.activeIndex = activeItem ? Number(activeItem.dataset.index) : -1;
    this.searchInput.removeAttribute('aria-activedescendant');

    if (activeItem) {
      activeItem.classList.add(ACTIVE_OPTION_CLASS);
      activeItem.scrollIntoView({ block: 'nearest' });
      this.searchInput.setAttribute('aria-activedescendant', activeItem.id);
    }
  }

  /** @param {number} delta @returns {void} */
  moveActive(delta) {
    const visibleItems = this.getVisibleOptionItems();
    if (visibleItems.length === 0) return;
    const currentVisibleIndex = visibleItems.findIndex((item) => Number(item.dataset.index) === this.activeIndex);
    let next = currentVisibleIndex + delta;
    if (next < 0) next = visibleItems.length - 1;
    if (next >= visibleItems.length) next = 0;
    this.setActive(next);
  }

  /** @returns {void} */
  toggleActive() {
    const activeItem = this.getOptionItems().find((item) => Number(item.dataset.index) === this.activeIndex);
    if (activeItem) this.toggleValue(activeItem.dataset.value ?? '');
  }

  /** @param {KeyboardEvent} event @returns {void} */
  handleTriggerKeydown(event) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      this.open();
    }
  }

  /** @param {KeyboardEvent} event @returns {void} */
  handleSearchKeydown(event) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        break;
      case 'Enter':
        event.preventDefault();
        this.toggleActive();
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        this.trigger.focus();
        break;
      case 'Tab':
        this.close();
        break;
      default:
        break;
    }
  }
}

/**
 * @param {HTMLElement} root
 * @returns {MultiCombobox}
 */
export function initMultiCombobox(root) {
  return new MultiCombobox(root);
}

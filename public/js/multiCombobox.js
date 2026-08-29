import { createElement } from './dom.js';

const OPEN_CLASS = 'tm-combobox--open';
const SELECTED_CLASS = 'tm-combobox--selected';
const ACTIVE_OPTION_CLASS = 'tm-combobox__option--active';
const SELECTED_OPTION_CLASS = 'tm-combobox__option--selected';

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
  constructor(root) {
    this.root = root;
    this.field = root.dataset.multiselect;
    this.trigger = root.querySelector('.tm-combobox__trigger');
    this.valueLabel = root.querySelector('.tm-combobox__value');
    this.placeholder = this.valueLabel.textContent;
    this.panel = root.querySelector('.tm-combobox__panel');
    this.searchInput = root.querySelector('.tm-combobox__search');
    this.list = root.querySelector('.tm-combobox__list');
    this.nativeContainer = root.querySelector('.tm-multiselect__native');
    this.pillsContainer = root.querySelector('.tm-multiselect__pills');
    this.emptyItem = null;
    this.activeIndex = -1;

    this.trigger.addEventListener('click', () => this.toggleOpen());
    this.trigger.addEventListener('keydown', (event) => this.handleTriggerKeydown(event));
    this.searchInput.addEventListener('input', () => this.filterOptions());
    this.searchInput.addEventListener('keydown', (event) => this.handleSearchKeydown(event));
    document.addEventListener('click', (event) => {
      if (!root.contains(event.target)) this.close();
    });
  }

  setOptions(items, selectedValues) {
    this.nativeContainer.replaceChildren(...items.map(({ value }) => {
      const checkbox = createElement('input', { attrs: { type: 'checkbox', name: this.field, value } });
      checkbox.checked = selectedValues.has(value);
      return checkbox;
    }));

    this.list.replaceChildren(...items.map(({ value, count }, index) => {
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
    }));

    const emptyItem = createElement('li', { className: 'tm-combobox__empty', text: 'No matches' });
    emptyItem.hidden = true;
    this.list.appendChild(emptyItem);
    this.emptyItem = emptyItem;

    this.syncSelectedDisplay();
  }

  getCheckbox(value) {
    return this.nativeContainer.querySelector(`input[value="${CSS.escape(value)}"]`);
  }

  getSelectedValues() {
    return [...this.nativeContainer.querySelectorAll('input:checked')].map((checkbox) => checkbox.value);
  }

  // For "Clear all" — resets this field's checkboxes/pills without
  // navigating; the caller (browse.js) triggers one navigation afterward
  // for all fields at once, rather than one per field.
  clearSelection() {
    this.nativeContainer.querySelectorAll('input:checked').forEach((checkbox) => { checkbox.checked = false; });
    this.syncSelectedDisplay();
  }

  // Checks exactly one value (unchecking anything else) — for setting a
  // programmatic default, as opposed to toggleValue's user-driven add/remove.
  selectOnly(value) {
    this.nativeContainer.querySelectorAll('input').forEach((checkbox) => {
      checkbox.checked = checkbox.value === value;
    });
    this.syncSelectedDisplay();
  }

  toggleValue(value) {
    const checkbox = this.getCheckbox(value);
    if (!checkbox) return;
    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    this.syncSelectedDisplay();
  }

  syncSelectedDisplay() {
    const selectedValues = new Set(this.getSelectedValues());

    this.list.querySelectorAll('.tm-combobox__option').forEach((item) => {
      const isSelected = selectedValues.has(item.dataset.value);
      item.classList.toggle(SELECTED_OPTION_CLASS, isSelected);
      item.setAttribute('aria-selected', String(isSelected));
      item.querySelector('.tm-multiselect__checkbox').src =
        `/assets/icons/checkbox-${isSelected ? 'checked' : 'unchecked'}.svg`;
    });

    this.root.classList.toggle(SELECTED_CLASS, selectedValues.size > 0);
    this.valueLabel.textContent = selectedValues.size > 0
      ? [...selectedValues].join(', ')
      : this.placeholder;

    this.pillsContainer.replaceChildren(...[...selectedValues].map((value) => {
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
    }));
  }

  getOptionItems() {
    return [...this.list.querySelectorAll('.tm-combobox__option')];
  }

  getVisibleOptionItems() {
    return this.getOptionItems().filter((item) => !item.hidden);
  }

  filterOptions() {
    const query = this.searchInput.value.trim().toLowerCase();
    const items = this.getOptionItems();
    items.forEach((item) => {
      item.hidden = query !== '' && !item.dataset.text.includes(query);
    });
    this.emptyItem.hidden = this.getVisibleOptionItems().length > 0;
    this.setActive(this.getVisibleOptionItems().length > 0 ? 0 : -1);
  }

  open() {
    if (this.root.classList.contains(OPEN_CLASS)) return;
    this.root.classList.add(OPEN_CLASS);
    this.panel.hidden = false;
    this.trigger.setAttribute('aria-expanded', 'true');
    this.searchInput.value = '';
    this.filterOptions();
    this.searchInput.focus();
  }

  close() {
    if (!this.root.classList.contains(OPEN_CLASS)) return;
    this.root.classList.remove(OPEN_CLASS);
    this.panel.hidden = true;
    this.trigger.setAttribute('aria-expanded', 'false');
    this.setActive(-1);
  }

  toggleOpen() {
    if (this.root.classList.contains(OPEN_CLASS)) this.close();
    else this.open();
  }

  // `index` is relative to the currently visible (filtered) items, since
  // that's the list a keyboard or mouse user is actually navigating.
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

  moveActive(delta) {
    const visibleItems = this.getVisibleOptionItems();
    if (visibleItems.length === 0) return;
    const currentVisibleIndex = visibleItems.findIndex((item) => Number(item.dataset.index) === this.activeIndex);
    let next = currentVisibleIndex + delta;
    if (next < 0) next = visibleItems.length - 1;
    if (next >= visibleItems.length) next = 0;
    this.setActive(next);
  }

  toggleActive() {
    const activeItem = this.getOptionItems().find((item) => Number(item.dataset.index) === this.activeIndex);
    if (activeItem) this.toggleValue(activeItem.dataset.value);
  }

  handleTriggerKeydown(event) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      this.open();
    }
  }

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

export function initMultiCombobox(root) {
  return new MultiCombobox(root);
}

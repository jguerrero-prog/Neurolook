// @ts-check
import { createElement } from './dom.js';

const OPEN_CLASS = 'tm-combobox--open';
const SELECTED_CLASS = 'tm-combobox--selected';
const ACTIVE_OPTION_CLASS = 'tm-combobox__option--active';
const SELECTED_OPTION_CLASS = 'tm-combobox__option--selected';

// Native <select> popups render outside the DOM/CSS and cannot be styled.
// This mirrors a <select>'s options into a styleable button + panel, while
// keeping the original <select> (hidden) as the field the form actually
// submits, so existing form-submission and value-reading code is untouched.
class Combobox {
  /** @param {HTMLElement} root */
  constructor(root) {
    this.root = root;
    this.trigger = /** @type {HTMLElement} */ (root.querySelector('.tm-combobox__trigger'));
    this.valueLabel = /** @type {HTMLElement} */ (root.querySelector('.tm-combobox__value'));
    this.panel = /** @type {HTMLElement} */ (root.querySelector('.tm-combobox__panel'));
    this.searchInput = /** @type {HTMLInputElement} */ (root.querySelector('.tm-combobox__search'));
    this.list = /** @type {HTMLElement} */ (root.querySelector('.tm-combobox__list'));
    /** @type {HTMLElement|null} */
    this.emptyItem = null;
    this.nativeSelect = /** @type {HTMLSelectElement} */ (root.querySelector('.tm-combobox__native'));
    this.placeholder = this.valueLabel.textContent;
    this.activeIndex = -1;

    this.trigger.addEventListener('click', () => this.toggle());
    this.trigger.addEventListener('keydown', (event) => this.handleTriggerKeydown(event));
    this.searchInput.addEventListener('input', () => this.filterOptions());
    this.searchInput.addEventListener('keydown', (event) => this.handleSearchKeydown(event));
    document.addEventListener('click', (event) => {
      if (!root.contains(/** @type {Node} */ (event.target))) this.close();
    });

    this.rebuildOptions();
  }

  /** @returns {void} */
  rebuildOptions() {
    const options = [...this.nativeSelect.options];
    const comboboxId = this.root.dataset.combobox;

    this.list.replaceChildren(
      ...options.map((option, index) => {
        const item = createElement('li', {
          className: 'tm-combobox__option',
          attrs: {
            role: 'option',
            id: `${comboboxId}-option-${index}`,
            'data-index': index,
            'data-value': option.value,
            'data-text': option.textContent?.toLowerCase(),
          },
          children: [
            createElement('span', { className: 'tm-combobox__option-label', text: option.textContent ?? '' }),
            createElement('img', {
              className: 'tm-combobox__check',
              attrs: { src: '/assets/icons/check.svg', alt: '' },
            }),
          ],
        });
        item.addEventListener('click', () => this.selectByIndex(index));
        item.addEventListener('mouseenter', () => this.setActive(index));
        return item;
      }),
    );

    const emptyItem = createElement('li', { className: 'tm-combobox__empty', text: 'No matches' });
    emptyItem.hidden = true;
    this.list.appendChild(emptyItem);
    this.emptyItem = emptyItem;

    this.syncSelectedDisplay();
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
  syncSelectedDisplay() {
    const selectedOption = this.nativeSelect.selectedOptions[0];
    const hasValue = Boolean(selectedOption && selectedOption.value !== '');
    this.valueLabel.textContent = selectedOption ? selectedOption.textContent : this.placeholder;
    this.root.classList.toggle(SELECTED_CLASS, hasValue);

    this.list.querySelectorAll('.tm-combobox__option').forEach((item) => {
      const isSelected = /** @type {HTMLElement} */ (item).dataset.value === this.nativeSelect.value;
      item.classList.toggle(SELECTED_OPTION_CLASS, isSelected);
      item.setAttribute('aria-selected', String(isSelected));
    });
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

    const selectedItem = this.list.querySelector(`.${SELECTED_OPTION_CLASS}`);
    const visibleItems = this.getVisibleOptionItems();
    const selectedVisibleIndex = selectedItem ? visibleItems.indexOf(/** @type {HTMLElement} */ (selectedItem)) : -1;
    this.setActive(selectedVisibleIndex >= 0 ? selectedVisibleIndex : 0);
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
  toggle() {
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

  /** @param {number} index @returns {void} */
  selectByIndex(index) {
    const option = this.nativeSelect.options[index];
    if (!option) return;
    this.nativeSelect.value = option.value;
    this.nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    this.syncSelectedDisplay();
    this.close();
    this.trigger.focus();
  }

  /** @returns {void} */
  selectActive() {
    if (this.activeIndex === -1) return;
    this.selectByIndex(this.activeIndex);
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
        this.selectActive();
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
 * @returns {Combobox}
 */
export function initCombobox(root) {
  return new Combobox(root);
}

import { createButton } from '../util.js';

export class WizardLayout {
  inputFields = 'input,textarea,select';

  constructor(includePrevBtn = true, includeNextBtn = true) {
    this.includePrevBtn = includePrevBtn;
    this.includeNextBtn = includeNextBtn;
  }

  // eslint-disable-next-line class-methods-use-this
  getSteps(form) {
    return [...form.children].filter((step) => step.tagName.toLowerCase() === 'fieldset');
  }

  assignIndexToSteps(form) {
    const steps = this.getSteps(form);
    steps.forEach((step, index) => {
      step.dataset.index = index;
      step.style.setProperty('--wizard-step-index', index);
    });
  }

  // eslint-disable-next-line class-methods-use-this
  getEligibleSibling(current, forward = true) {
    const direction = forward ? 'nextElementSibling' : 'previousElementSibling';

    for (let sibling = current[direction]; sibling; sibling = sibling[direction]) {
      if (sibling.dataset.hidden !== 'true') {
        return sibling;
      }
    }
    return null;
  }

  /**
 * @param {FormElement | Fieldset} container
 * @returns return false, if there are invalid fields
 */
  validateContainer(container) {
    const fieldElements = [...container.querySelectorAll(this.inputFields)];
    const isValid = fieldElements.reduce((valid, fieldElement) => {
      const isFieldValid = fieldElement.offsetParent !== null ? fieldElement.checkValidity() : true;
      return valid && isFieldValid;
    }, true);

    if (!isValid) {
      container.querySelector(':invalid')?.focus();
    }
    return isValid;
  }

  navigate(form, forward = true) {
    const current = form.querySelector('.current-wizard-step');

    let valid = true;
    if (forward) {
      valid = this.validateContainer(current);
    }
    const navigateTo = valid ? this.getEligibleSibling(current, forward) : current;

    if (navigateTo && current !== navigateTo) {
      current.classList.remove('current-wizard-step');
      navigateTo.classList.add('current-wizard-step');
      const event = new CustomEvent('wizard:navigate', {
        detail: {
          prevStep: { id: current.id, index: +current.dataset.index },
          currStep: { id: navigateTo.id, index: +navigateTo.dataset.index },
        },
        bubbles: false,
      });
      form.dispatchEvent(event);
    }
  }

  addButton(wrapper, form, buttonDef, forward = true) {
    const button = createButton(buttonDef);
    button.classList.add(buttonDef.Id);
    button.addEventListener('click', () => this.navigate(form, forward));
    wrapper.append(button);
  }

  applyLayout(formDef, form) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-wizard-button-wrapper';
    if (this.includePrevBtn) {
      this.addButton(wrapper, form, {
        Label: 'BACK', Type: 'button', Name: 'back', Id: 'form-wizard-button-prev',
      }, false);
    }

    if (this.includeNextBtn) {
      this.addButton(wrapper, form, {
        Label: 'NEXT', Type: 'button', Name: 'next', Id: 'form-wizard-button-next',
      });
    }

    const submitBtn = form.querySelector('.form-submit-wrapper');
    if (submitBtn) {
      wrapper.append(submitBtn);
    }
    this.assignIndexToSteps(form);
    form.append(wrapper);
    form.children[0]?.classList.add('current-wizard-step');
  }
}

const layout = new WizardLayout();

export default function wizardLayout(formDef, form, block) {
  if (block.matches('.wizard')) {
    layout.applyLayout(formDef, form);
  }
}

export const navigate = layout.navigate.bind(layout);
export const validateContainer = layout.validateContainer.bind(layout);

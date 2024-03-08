import { readBlockConfig } from '../../scripts/lib-franklin.js';
import { createButton, createFieldWrapper, createLabel } from './util.js';

function generateUnique() {
  return new Date().valueOf() + Math.random();
}

const formatFns = await (async function imports() {
  try {
    const formatters = await import('./formatting.js');
    return formatters.default;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('Formatting library not found. Formatting will not be supported');
  }
  return {};
}());

export function constructPayload(form) {
  const payload = { __id__: generateUnique() };
  [...form.elements].forEach((fe) => {
    if (fe.name) {
      if (fe.type === 'radio') {
        if (fe.checked) payload[fe.name] = fe.value;
      } else if (fe.type === 'checkbox') {
        if (fe.checked) payload[fe.name] = payload[fe.name] ? `${payload[fe.name]},${fe.value}` : fe.value;
      } else if (fe.type !== 'file') {
        payload[fe.name] = fe.value;
      }
    }
  });
  return { payload };
}

async function submissionFailure(error, form) {
  alert("We can't process your submission right now because the form isn't set up to receive data. Please check out our 'Getting Started with EDS Forms' documentation to learn how to set up the sheet. Thanks!"); // TODO define error mechansim
  form.setAttribute('data-submitting', 'false');
  form.querySelector('button[type="submit"]').disabled = false;
}

async function prepareRequest(form, transformer) {
  const { payload } = constructPayload(form);
  const headers = {
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({ data: payload });
  const url = form.dataset.submit;
  if (typeof transformer === 'function') {
    return transformer({ headers, body, url }, form);
  }
  return { headers, body, url };
}

async function submitForm(form, transformer) {
  try {
    const { headers, body, url } = await prepareRequest(form, transformer);
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });
    if (response.ok) {
      window.location.href = form.dataset?.redirect || 'thankyou';
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  } catch (error) {
    submissionFailure(error, form);
  }
}

async function handleSubmit(form, transformer) {
  if (form.getAttribute('data-submitting') !== 'true') {
    form.setAttribute('data-submitting', 'true');
    if (form.dataset?.action) {
      form.action = form.dataset.action;
      form.target = form.dataset.target || '_self';
      form.submit();
    } else {
      await submitForm(form, transformer);
    }
  }
}

function setPlaceholder(element, fd) {
  if (fd.Placeholder) {
    element.setAttribute('placeholder', fd.Placeholder);
  }
}

const constraintsDef = Object.entries({
  'password|tel|email|text': [['Max', 'maxlength'], ['Min', 'minlength']],
  'number|range|date': ['Max', 'Min', 'Step'],
  file: ['Accept', 'Multiple'],
  fieldset: [['Max', 'data-max'], ['Min', 'data-min']],
}).flatMap(([types, constraintDef]) => types.split('|')
  .map((type) => [type, constraintDef.map((cd) => (Array.isArray(cd) ? cd : [cd, cd]))]));

const constraintsObject = Object.fromEntries(constraintsDef);

function setConstraints(element, fd) {
  const constraints = constraintsObject[fd.Type];
  if (constraints) {
    constraints
      .filter(([nm]) => fd[nm])
      .forEach(([nm, htmlNm]) => {
        element.setAttribute(htmlNm, fd[nm]);
      });
  }
}

function createHelpText(fd) {
  const div = document.createElement('div');
  div.className = 'field-description';
  div.setAttribute('aria-live', 'polite');
  div.innerText = fd.Description;
  div.id = `${fd.Id}-description`;
  return div;
}

function createSubmit(fd) {
  const wrapper = createButton(fd);
  const button = wrapper.querySelector('button');
  button.id = '';
  button.name = ''; // removing id and name from button otherwise form.submit() will not work
  return wrapper;
}

function createInput(fd) {
  const input = document.createElement('input');
  input.type = fd.Type;
  setPlaceholder(input, fd);
  setConstraints(input, fd);
  return input;
}

const withFieldWrapper = (element) => (fd) => {
  const wrapper = createFieldWrapper(fd);
  wrapper.append(element(fd));
  return wrapper;
};

const createTextArea = withFieldWrapper((fd) => {
  const input = document.createElement('textarea');
  setPlaceholder(input, fd);
  return input;
});

const createSelect = withFieldWrapper((fd) => {
  const select = document.createElement('select');
  if (fd.Placeholder) {
    const ph = document.createElement('option');
    ph.textContent = fd.Placeholder;
    ph.setAttribute('selected', '');
    ph.setAttribute('disabled', '');
    select.append(ph);
  }

  const addOption = (label, value) => {
    const option = document.createElement('option');
    option.textContent = label?.trim();
    option.value = value?.trim() || label?.trim();
    if (fd.Value === option.value) {
      option.setAttribute('selected', '');
    }
    select.append(option);
    return option;
  };
  const options = fd?.Options?.split(',') || [];
  const optionsName = fd?.['Options Name'] ? fd?.['Options Name']?.split(',') : options;
  options.forEach((value, index) => addOption(optionsName?.[index], value));
  return select;
});

function createRadio(fd) {
  const wrapper = createFieldWrapper(fd);
  wrapper.insertAdjacentElement('afterbegin', createInput(fd));
  return wrapper;
}

const createOutput = withFieldWrapper((fd) => {
  const output = document.createElement('output');
  output.name = fd.Name;
  output.id = fd.Id;
  const displayFormat = fd['Display Format'];
  if (displayFormat) {
    output.dataset.displayFormat = displayFormat;
  }
  const formatFn = formatFns[displayFormat] || ((x) => x);
  output.dataset.value = fd.Value;
  output.innerText = formatFn(fd.Value);
  return output;
});

const currencySymbol = '$';
function createCurrency(fd) {
  const wrapper = createFieldWrapper(fd);
  const widgetWrapper = document.createElement('div');
  widgetWrapper.className = 'currency-input-wrapper';
  const currencyEl = document.createElement('div');
  currencyEl.className = 'currency-symbol';
  currencyEl.innerText = currencySymbol; // todo :read from css
  widgetWrapper.append(currencyEl);
  const input = createInput({
    ...fd,
    Type: 'number',
  });
  input.dataset.displayFormat = 'currency';
  input.dataset.type = 'currency';
  widgetWrapper.append(input);
  wrapper.append(widgetWrapper);
  return wrapper;
}

function createHidden(fd) {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.id = fd.Id;
  input.name = fd.Name;
  input.value = fd.Value;
  return input;
}

function createLegend(fd) {
  return createLabel(fd, 'legend');
}

function createFragment(fd) {
  const wrapper = createFieldWrapper(fd);
  if (fd.Value?.startsWith('/') && fd.Value.includes('.html')) {
    const url = fd.Value.replace('.html', '.plain.html');
    fetch(url).then(async (resp) => {
      if (resp.ok) {
        wrapper.innerHTML = await resp.text();
      }
    });
  }
  return wrapper;
}

function createFieldSet(fd) {
  const wrapper = createFieldWrapper(fd, 'fieldset');
  wrapper.id = fd.Id;
  wrapper.name = fd.Name;
  wrapper.replaceChildren(createLegend(fd));
  if (fd.Repeatable && fd.Repeatable.toLowerCase() === 'true') {
    setConstraints(wrapper, fd);
    wrapper.dataset.repeatable = 'true';
  }
  return wrapper;
}

function groupFieldsByFieldSet(form) {
  const fieldsets = form.querySelectorAll('fieldset');
  fieldsets?.forEach((fieldset) => {
    const fields = form.querySelectorAll(`[data-fieldset="${fieldset.name}"`);
    fields?.forEach((field) => {
      fieldset.append(field);
    });
  });
}

function createPlainText(fd) {
  const paragraph = document.createElement('p');
  paragraph.textContent = fd.Label;
  const wrapper = createFieldWrapper(fd);
  wrapper.id = fd.Id;
  wrapper.replaceChildren(paragraph);
  return wrapper;
}

export const getId = (function getId() {
  const ids = {};
  return (name) => {
    ids[name] = ids[name] || 0;
    const idSuffix = ids[name] ? `-${ids[name]}` : '';
    ids[name] += 1;
    return `${name}${idSuffix}`;
  };
}());

const fieldRenderers = {
  radio: createRadio,
  checkbox: createRadio,
  textarea: createTextArea,
  select: createSelect,
  button: createButton,
  submit: createSubmit,
  output: createOutput,
  currency: createCurrency,
  hidden: createHidden,
  fieldset: createFieldSet,
  plaintext: createPlainText,
  fragment: createFragment,
};

function renderField(fd) {
  const renderer = fieldRenderers[fd.Type];
  let field;
  if (typeof renderer === 'function') {
    field = renderer(fd);
  } else {
    field = createFieldWrapper(fd);
    field.append(createInput(fd));
  }
  if (fd.Description) {
    field.append(createHelpText(fd));
  }
  return field;
}

async function applyTransformation(formDef, form, block) {
  try {
    // eslint-disable-next-line import/no-cycle
    const { requestTransformers, transformers } = await import('./decorators/index.js');
    if (transformers) {
      transformers.forEach(
        (fn) => fn.call(this, formDef, form, block),
      );
    }

    const transformRequest = async (request, fd) => requestTransformers?.reduce(
      (promise, transformer) => promise.then((modifiedRequest) => transformer(modifiedRequest, fd)),
      Promise.resolve(request),
    );
    return transformRequest;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('no custom decorators found.');
  }
  return (req) => req;
}

async function fetchData(url) {
  const resp = await fetch(url);
  const json = await resp.json();
  return json.data.map((fd) => ({
    ...fd,
    Id: fd.Id || getId(fd.Name),
    Value: fd.Value || '',
  }));
}

async function fetchForm(pathname) {
  // get the main form
  const jsonData = await fetchData(pathname);
  return jsonData;
}

export async function generateFormRendition(field, container) {
  field.forEach((fd) => {
    const el = renderField(fd);
    const input = el.querySelector('input,textarea,select');
    if (fd.Mandatory === true || fd.Mandatory?.toLowerCase() === 'true') {
      input.setAttribute('required', 'required');
    }
    if (input) {
      input.id = fd.Id;
      input.name = fd.Name;
      if (input.type !== 'file') {
        input.value = fd.Value;
        if (input.type === 'radio' || input.type === 'checkbox') {
          input.checked = fd.Checked === 'true';
        }
      }
      if (fd.Description) {
        input.setAttribute('aria-describedby', `${fd.Id}-description`);
      }
    }
    container.append(el);
  });
  groupFieldsByFieldSet(container);
}

function getFieldContainer(fieldElement) {
  const wrapper = fieldElement?.closest('.field-wrapper');
  let container = wrapper;
  if ((fieldElement.type === 'radio' || fieldElement.type === 'checkbox') && wrapper.dataset.fieldset) {
    container = fieldElement?.closest(`fieldset[name=${wrapper.dataset.fieldset}]`);
  }
  return container;
}

function updateorCreateInvalidMsg(fieldElement) {
  const container = getFieldContainer(fieldElement);
  let element = container.querySelector(':scope > .field-description');
  if (!element) {
    element = createHelpText({ Id: fieldElement.id });
    element.classList.add('field-invalid');
    container.append(element);
  }
  element.textContent = fieldElement.validationMessage;
  return element;
}

async function createForm(formURL, block) {
  const { pathname } = new URL(formURL);
  const fields = await fetchForm(pathname);
  const form = document.createElement('form');
  form.noValidate = true;
  await generateFormRendition(fields, form);
  const transformRequest = await applyTransformation(fields, form, block);
  // eslint-disable-next-line prefer-destructuring
  form.dataset.submit = pathname?.split('.json')[0];
  form.querySelectorAll('input,textarea,select').forEach((el) => {
    el.addEventListener('invalid', () => updateorCreateInvalidMsg(el));
    el.addEventListener('change', () => updateorCreateInvalidMsg(el));
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const valid = form.checkValidity();
    if (valid) {
      e.submitter.setAttribute('disabled', '');
      handleSubmit(form, transformRequest);
    } else {
      form.querySelector(':invalid')?.focus();
    }
  });
  return form;
}

export default async function decorate(block) {
  const formLink = block.querySelector('a[href$=".json"]');
  if (formLink) {
    const form = await createForm(formLink.href, block);
    formLink.replaceWith(form);

    const config = readBlockConfig(block);
    Object.entries(config).forEach(([key, value]) => { if (value) form.dataset[key] = value; });
  }
}

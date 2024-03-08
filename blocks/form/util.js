export function createLabel(fd, tagName = 'label') {
  const label = document.createElement(tagName);
  label.setAttribute('for', fd.Id);
  label.className = 'field-label';
  label.textContent = fd.Label || '';
  if (fd.Tooltip) {
    label.title = fd.Tooltip;
  }
  return label;
}

export function createFieldWrapper(fd, tagName = 'div') {
  const fieldWrapper = document.createElement(tagName);
  const nameStyle = fd.Name ? ` form-${fd.Name}` : '';
  const fieldId = `form-${fd.Type}-wrapper${nameStyle}`;
  fieldWrapper.className = fieldId;
  if (fd.Fieldset) {
    fieldWrapper.dataset.fieldset = fd.Fieldset;
  }
  if (fd.Mandatory === true || fd.Mandatory?.toLowerCase() === 'true') {
    fieldWrapper.dataset.required = '';
  }
  if (fd.Hidden?.toLowerCase() === 'true') {
    fieldWrapper.dataset.visible = 'true';
  }
  fieldWrapper.classList.add('field-wrapper');
  fieldWrapper.append(createLabel(fd));
  return fieldWrapper;
}

export function createButton(fd) {
  const wrapper = createFieldWrapper(fd);
  const button = document.createElement('button');
  button.textContent = fd.Label;
  button.type = fd.Type;
  button.classList.add('button');
  button.dataset.redirect = fd.Extra || '';
  button.id = fd.Id;
  button.name = fd.Name;
  wrapper.replaceChildren(button);
  return wrapper;
}

/**
 * Small DOM construction helpers shared by the table/row renderers.
 */

/**
 * Creates an element and applies the handful of properties/attributes the
 * renderers use, so call sites stay declarative.
 */
export function createElement(doc, tagName, { className, text, title, testId, attributes } = {}) {
  const element = doc.createElement(tagName);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  if (title !== undefined) element.title = title;
  if (testId !== undefined) element.setAttribute('data-testid', testId);

  Object.entries(attributes || {}).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });

  return element;
}

/**
 * Creates a button wired for the table's event delegation (`data-action` plus
 * `data-player-id`).
 */
export function createActionButton(doc, { className, action, playerId, text, testId, title, disabled }) {
  const button = createElement(doc, 'button', {
    className,
    text,
    title,
    testId,
    attributes: { 'data-action': action, 'data-player-id': playerId }
  });
  button.disabled = Boolean(disabled);
  return button;
}

/**
 * Replaces a cell's content with a single child node.
 */
export function replaceCellContent(cell, child) {
  cell.innerHTML = '';
  if (child) cell.appendChild(child);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports.createElement = createElement;
  module.exports.createActionButton = createActionButton;
  module.exports.replaceCellContent = replaceCellContent;
}

/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('index.html modal template structure', () => {
  test('defines a <template id="player-modal-template">', () => {
    const htmlPath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).toMatch(/<template[^>]*id=["']player-modal-template["'][^>]*>/);
    expect(html).toMatch(/<\/template>/);
  });
});

/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('HTML template structure', () => {
  test('index.html should define a <template id="player-row-template"> for player rows', () => {
    const htmlPath = path.resolve(__dirname, '../index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    expect(html).toMatch(/<template[^>]*id=["']player-row-template["'][^>]*>/);
    expect(html).toMatch(/<\/template>/);
  });
});

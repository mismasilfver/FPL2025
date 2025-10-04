/**
 * Import/Export utility functions for FPL data
 */

/**
 * Export FPL data to a JSON file for download
 * @param {Object} data The data to export
 * @param {number} currentWeek The current week number
 */
export function exportToJSON(data, currentWeek) {
  const jsonData = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fpl-data-week-${currentWeek}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import FPL data from a JSON file
 * @param {File} file The JSON file to import
 * @returns {Promise<Object>} The parsed JSON data
 */
export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Fuerza a Puppeteer a descargar y buscar Chrome en la carpeta del proyecto
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};

const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Servicio de Scraping SEACE activo y listo.');
});

// ESTE ES EL ENDPOINT QUE LLAMARÁ N8N
app.get('/scrape-seace', async (req, res) => {
  console.log("📥 Petición recibida desde n8n. Iniciando scraping de SEACE...");
  let browser;

  try {
    // Configuración para que Puppeteer funcione de forma segura en los servidores de Render
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });

    const page = await browser.newPage();
    
    // Cambiar el User-Agent para que SEACE no detecte que es un robot básico
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1. Ir a la página de búsqueda del SEACE (Ajusta la URL exacta si usas la del buscador avanzado)
    const urlSeace = 'https://prod2.seace.gob.pe/seacebus-uiwd-pub/busqueda/buscador复合.xhtml'; // <-- Asegúrate de usar la URL pública del buscador que necesitas
    await page.goto(urlSeace, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log("🔗 Página de SEACE cargada. Esperando selectores...");

    // 2. [Opcional] Si necesitas hacer clics en botones de "Buscar" o llenar formularios, se hace aquí:
    // await page.click('#id_del_boton_buscar');
    // await page.waitForTimeout(3000); // Esperar que refresque la tabla

    // 3. Extraer el contenido de la tabla de convocatorias del día
    // Evaluamos el contenido dentro del navegador
    const datosProyectos = await page.evaluate(() => {
      // Reemplaza '.clase-tabla-seace' por el selector real de la tabla de resultados de SEACE
      const filas = document.querySelectorAll('table.ui-datatable-data tr'); 
      let resultados = [];

      filas.forEach(fila => {
        const columnas = fila.querySelectorAll('td');
        if (columnas.length > 0) {
          resultados.push({
            entidad: columnas[0]?.innerText?.trim() || '',
            objeto: columnas[1]?.innerText?.trim() || '',
            monto: columnas[2]?.innerText?.trim() || '',
            fecha: columnas[3]?.innerText?.trim() || ''
          });
        }
      });
      return resultados;
    });

    console.log(`✅ Scraping completado con éxito. Se encontraron ${datosProyectos.length} registros.`);
    
    // 4. Devolver los datos limpios en formato JSON directamente a tu n8n
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: datosProyectos
    });

  } catch (error) {
    console.error("❌ Error durante el scraping:", error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (browser) {
      await browser.close();
      console.log("🚪 Navegador cerrado.");
    }
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

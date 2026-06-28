const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Servicio de Scraping SEACE Activo.');
});

app.get('/scrape-seace', async (req, res) => {
  console.log("📥 Petición recibida. Iniciando scraping en el Buscador Público SEACE...");
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const page = await browser.newPage();
    
    // Simular un navegador real para evitar bloqueos del firewall de OSCE
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    // URL del Buscador Público proveída por el usuario
    const urlSeace = 'https://prod2.seace.gob.pe/seacebus-uiwd-pub/buscadorPublico/buscadorPublico.xhtml';
    
    console.log("🔗 Navegando a SEACE...");
    await page.goto(urlSeace, { waitUntil: 'networkidle2', timeout: 60000 });

    // Esperamos a que el formulario base de PrimeFaces esté visible
    await page.waitForSelector('form', { timeout: 20000 });
    console.log("📝 Formulario cargado. Intentando lanzar búsqueda estándar...");

    // NOTA: El SEACE suele requerir el llenado de un año o captcha si la búsqueda es muy masiva. 
    // Como prueba inicial para n8n, buscaremos el botón de búsqueda por su texto o clase PrimeFaces y le daremos clic.
    // Usualmente el botón principal de búsqueda contiene la clase '.ui-button' o un ID específico de tipo 'btnBuscar'
    
    const botonBuscarSelector = 'button[id*="btnBuscar"], .ui-button'; 
    if (await page.$(botonBuscarSelector) !== null) {
        await page.click(botonBuscarSelector);
        console.log("🖱️ Clic ejecutado en el botón Buscar. Esperando actualización de datos...");
        
        // Esperamos unos segundos a que la petición AJAX de PrimeFaces termine y cargue los resultados
        await page.waitForTimeout(5000); 
    } else {
        console.log("⚠️ No se encontró un botón de búsqueda estandarizado, mapeando el HTML actual...");
    }

    // Extraer las filas de la tabla estructurada de resultados (Patrón común de tablas PrimeFaces en SEACE)
    const datosProyectos = await page.evaluate(() => {
      // Las tablas dinámicas de PrimeFaces usan la clase '.ui-datatable-data tr'
      const filas = document.querySelectorAll('.ui-datatable-data tr, table tbody tr'); 
      let resultados = [];

      filas.forEach(fila => {
        const columnas = fila.querySelectorAll('td');
        // Filtramos filas vacías o mensajes de "No se encontraron registros"
        if (columnas.length > 2 && !fila.innerText.includes("No se encontraron")) {
          resultados.push({
            idConvocatoria: columnas[0]?.innerText?.trim() || '',
            entidad: columnas[1]?.innerText?.trim() || '',
            objetoContratacion: columnas[2]?.innerText?.trim() || '',
            descripcion: columnas[3]?.innerText?.trim() || '',
            montoEstimado: columnas[4]?.innerText?.trim() || '',
            fechaPublicacion: columnas[5]?.innerText?.trim() || '',
            estado: columnas[6]?.innerText?.trim() || ''
          });
        }
      });
      return resultados;
    });

    console.log(`✅ Scraping finalizado. Registros capturados: ${datosProyectos.length}`);
    
    // Enviamos la respuesta limpia a n8n
    res.json({
      success: true,
      urlProcesada: urlSeace,
      timestamp: new Date().toISOString(),
      total: datosProyectos.length,
      data: datosProyectos
    });

  } catch (error) {
    console.error("❌ Error en el proceso de scraping:", error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (browser) {
      await browser.close();
      console.log("🚪 Navegador Puppeteer cerrado.");
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor escuchando correctamente en el puerto ${PORT}`);
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

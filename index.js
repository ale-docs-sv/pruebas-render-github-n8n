const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Esto mantiene a Render feliz respondiendo "Ok" cuando revise el puerto
app.get('/', (req, res) => {
  res.send('Worker gratuito simulado corriendo con éxito.');
});

app.listen(PORT, () => {
  console.log(`Servidor HTTP escuchando en el puerto ${PORT}`);

  // Aquí inicia tu worker automático
  iniciarWorker();
});

function iniciarWorker() {
  console.log("🚀 El Worker ha comenzado a trabajar en segundo plano...");

  setInterval(() => {
    console.log("Ejecutando tarea repetitiva en segundo plano...");
    // AQUÍ irá tu lógica más adelante (hacer peticiones, revisar datos, etc.)
  }, 60000); // Se ejecuta automáticamente cada 60 segundos
}

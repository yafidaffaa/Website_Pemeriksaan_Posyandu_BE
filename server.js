// server.js
const app = require('./src/app');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST;

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
});

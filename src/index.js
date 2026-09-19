require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Train Travel API mock server running on port ${PORT}`);
  console.log(`Docs:   http://localhost:${PORT}/api-docs`);
  console.log(`Health: http://localhost:${PORT}/health`);
});

const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('👋 Hello from Render!'));

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve landing page at the root URL
app.use(express.static(path.join(__dirname, 'landing')));

// Serve the platform at /platform
app.use('/platform', express.static(path.join(__dirname, 'platform')));



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

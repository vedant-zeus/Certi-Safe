const express = require('express');
const cors = require('cors');
const kycRoutes = require('./routes/kycRoutes');

const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/v1/kyc', kycRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`KYC API running on port ${PORT}`);
});

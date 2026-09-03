import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateSchemeEligibility, calculateAmortization } from './finance.js';

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BusinessBuddy backend is running' });
});

app.post('/api/scheme/calculate', (req, res) => {
  try {
    const { marginCapital } = req.body;
    const result = calculateSchemeEligibility(Number(marginCapital) || 0);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/emi/calculate', (req, res) => {
  try {
    const { amount, rate, tenure, moratorium, frequency } = req.body;
    const result = calculateAmortization({
      principal: Number(amount) || 0,
      annualRatePct: Number(rate) || 8,
      tenureYears: Number(tenure) || 7,
      moratoriumMonths: Number(moratorium) || 0,
      frequency: frequency || 'monthly'
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 BusinessBuddy backend running on http://localhost:${PORT}`);
});

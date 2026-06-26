const express = require('express');
const router = express.Router();
const { translateText } = require('../services/deeplService');

router.post('/', async (req, res, next) => {
  const { text, targetLang, sourceLang } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required for translation.' });
  }

  try {
    const translation = await translateText(text, targetLang || 'RU', sourceLang);
    res.json({ translation });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

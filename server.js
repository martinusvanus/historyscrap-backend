const express = require('express');
const puppeteer = require('puppeteer');
const { createObjectCsvStringifier } = require('csv-writer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { urls, ids } = req.body;
  const results = [];

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  for (const url of urls) {
    const data = { url };
    try {
      await page.goto(url, { waitUntil: 'networkidle0' });

      for (const id of ids) {
        try {
          await page.waitForSelector(`#${id}`, { timeout: 500 });
          const value = await page.$eval(`#${id}`, el => el.textContent || el.value);
          data[id] = value;
        } catch {
          data[id] = null;
        }
      }

      results.push(data);
    } catch (err) {
      data.error = err.message;
      results.push(data);
    }
  }

  await browser.close();

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'url', title: 'URL' },
      ...ids.map(id => ({ id, title: id })),
      { id: 'error', title: 'Error' }
    ]
  });

  const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(results);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=vysledky.csv');
  res.send(csv);
});

app.get('/', (req, res) => {
  res.send('Scraper backend is running.');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

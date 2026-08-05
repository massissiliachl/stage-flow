const fs = require('fs');
const path = require('path');
const png = path.join(__dirname, '..', 'assets', 'stageflow-site-qr.png');
const out = path.join(__dirname, '..', 'js', 'stageflow-qr-embedded.js');
const b = fs.readFileSync(png).toString('base64');
fs.writeFileSync(out, 'const STAGEFLOW_QR_DATA_URL = "data:image/png;base64,' + b + '";\n');

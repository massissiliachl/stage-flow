const { execSync } = require('child_process');

const port = process.env.PORT || 3000;

try {
  if (process.platform === 'win32') {
    const out = execSync(
      `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique"`,
      { encoding: 'utf8' }
    ).trim();

    const pids = out.split(/\s+/).filter(Boolean).filter((id) => id !== '0');
    if (pids.length === 0) {
      return;
    }

    for (const pid of pids) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      console.log(`Processus ${pid} arrêté (port ${port}).`);
    }
  } else {
    execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
    console.log(`Port ${port} libéré.`);
  }
} catch {
  // port déjà libre
}

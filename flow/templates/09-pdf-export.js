// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GÃ‰NÃ‰RATION PDF â€” helper partagÃ©
// Styles identiques Ã  l'aperÃ§u convention (html2pdf ne rÃ©sout pas les var CSS)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function conventionPdfStyles() {
  return `
.pdf-preview{background:#fff;padding:32px 40px;font-family:Georgia,serif;line-height:1.8;font-size:13px;color:#0B1E3D;box-sizing:border-box}
.pdf-header{text-align:center;margin-bottom:28px;border-bottom:2px double #000;padding-bottom:16px}
.pdf-header .uni-name{font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px}
.pdf-header .doc-title{font-size:17px;font-weight:bold;margin:12px 0 4px}
.pdf-header .doc-ref{font-size:11px;color:#666;margin-top:6px}
.pdf-section{margin-bottom:18px}
.pdf-section h4{font-size:12px;font-weight:bold;text-transform:uppercase;margin-bottom:8px;background:#EBF0F8;padding:4px 8px;border-left:3px solid #0B1E3D}
.pdf-field{display:flex;gap:8px;margin-bottom:5px}
.pdf-field label{width:190px;flex-shrink:0;color:#555;font-size:12px}
.pdf-field .val{border-bottom:1px solid #999;flex:1;min-height:18px;color:#0B1E3D;font-weight:500;font-size:12px}
.pdf-sign-row{display:flex;justify-content:space-between;gap:40px;margin-top:28px}
.pdf-sign-row .sign-box-pdf{flex:0 0 42%}
.sign-box-pdf{border:1px solid #ccc;border-radius:6px;padding:12px;text-align:center}
.sign-box-pdf .role-lbl{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#666;margin-bottom:6px}
.sign-box-pdf .sign-name{font-size:11px;color:#333;margin-bottom:8px}
.sign-box-pdf .sign-result{min-height:56px;border:1px dashed #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#aaa;background:#fafafa;padding:4px;flex-direction:column;gap:4px}
.sign-box-pdf .sign-result.done{background:#f0fff8;border-color:#00C48C;color:#00C48C}
.sign-box-pdf .sign-date{font-size:10px;color:#888;margin-top:4px}
.cert-badge{display:inline-flex;align-items:center;gap:6px;background:#D1FAE5;border-radius:20px;padding:4px 12px;font-size:11px;color:#065F46;font-weight:500;margin-top:8px}`;
}

function isCanvasMostlyBlank(canvas) {
  try {
    const ctx = canvas.getContext('2d');
    const w = Math.min(100, canvas.width);
    const h = Math.min(100, canvas.height);
    if (w < 1 || h < 1) return true;
    const data = ctx.getImageData(0, 0, w, h).data;
    let white = 0;
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 248 && data[i + 1] > 248 && data[i + 2] > 248) white++;
    }
    return white / pixels > 0.97;
  } catch (e) {
    return false;
  }
}

function exportConventionPdfViaIframe(innerHtml, filename, title) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;left:0;top:0;width:794px;border:0;margin:0;padding:0;z-index:2147483647;background:#fff;';
  document.body.appendChild(iframe);

  const iwin = iframe.contentWindow;
  const idoc = iwin.document;
  idoc.open();
  idoc.write('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>' + (title || 'Convention') + '</title><style>' + conventionPdfStyles() + '</style></head><body style="margin:0;padding:0;background:#fff;"><div class="pdf-preview">' + innerHtml + '</div></body></html>');
  idoc.close();

  let done = false;
  const cleanup = function() {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };
  const fallback = function() {
    if (done) return;
    done = true;
    cleanup();
    printFallback(innerHtml, title, true);
  };

  const attempt = function() {
    if (done) return;
    const target = idoc.querySelector('.pdf-preview');
    if (!target || target.scrollHeight < 20) {
      fallback();
      return;
    }
    if (typeof html2pdf === 'undefined') {
      fallback();
      return;
    }
    const canvasOpts = {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: target.scrollWidth || 794,
      height: target.scrollHeight,
      windowWidth: target.scrollWidth || 794,
      windowHeight: target.scrollHeight
    };
    const pdfOpts = {
      margin: [8, 8, 8, 8],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: canvasOpts,
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    const savePdf = function() {
      html2pdf().set(pdfOpts).from(target).save().then(function() {
        if (done) return;
        done = true;
        showToast('âœ… ' + filename + ' tÃ©lÃ©chargÃ©');
        cleanup();
      }).catch(function(err) {
        console.error('html2pdf error:', err);
        fallback();
      });
    };

    const h2c = (typeof html2canvas !== 'undefined') ? html2canvas : (iwin && iwin.html2canvas);
    if (h2c) {
      h2c(target, canvasOpts).then(function(canvas) {
        if (isCanvasMostlyBlank(canvas)) {
          console.warn('PDF canvas blank â€” fallback impression');
          fallback();
          return;
        }
        savePdf();
      }).catch(function() { savePdf(); });
    } else {
      savePdf();
    }
  };

  iframe.onload = function() { setTimeout(attempt, 200); };
  setTimeout(attempt, 500);
}

function generatePdfFromElement(innerHtml, filename, title, options){
  options = options || {};
  const isConvention = options.conventionPdf || (innerHtml && innerHtml.includes('pdf-header'));
  const runPrintFallback = function() { printFallback(innerHtml, title, isConvention); };

  if (!innerHtml || !String(innerHtml).trim()) {
    showToast('âš ï¸ Contenu PDF vide â€” ouvrez l\'aperÃ§u de la convention');
    return;
  }

  if (isConvention) {
    exportConventionPdfViaIframe(innerHtml, filename, title);
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.id = 'sfPdfExportRoot';
  wrapper.className = 'pdf-preview';
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.style.cssText = 'position:fixed;left:0;top:0;width:794px;max-width:794px;background:#fff;z-index:2147483646;padding:0;margin:0;overflow:visible;';
  wrapper.innerHTML = innerHtml;
  document.body.appendChild(wrapper);

  const cleanup = function() {
    if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
  };

  const exportPdf = function() {
    if (wrapper.offsetHeight < 20) {
      cleanup();
      runPrintFallback();
      return;
    }
    if (typeof html2pdf === 'undefined') {
      cleanup();
      runPrintFallback();
      return;
    }
    const opts = {
      margin: [8, 8, 8, 8],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        width: 794,
        windowWidth: 794
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };
    html2pdf().set(opts).from(wrapper).save().then(function() {
      showToast('âœ… ' + filename + ' tÃ©lÃ©chargÃ©');
      cleanup();
    }).catch(function(err) {
      console.error('html2pdf error:', err);
      cleanup();
      runPrintFallback();
    });
  };

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      setTimeout(exportPdf, 120);
    });
  });
}

function printFallback(innerHtml, title, isConvention){
  const styles = isConvention ? conventionPdfStyles() : `
      body{font-family:Georgia,serif;line-height:1.8;font-size:13px;color:#1b2a48;padding:32px 40px;margin:0}
      .pdf-header{text-align:center;margin-bottom:28px;border-bottom:2px double #000;padding-bottom:16px}
      .pdf-header .uni-name{font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px}
      .pdf-header .doc-title{font-size:17px;font-weight:bold;margin:12px 0 4px}
      .pdf-header .doc-ref{font-size:11px;color:#666;margin-top:6px}
      .pdf-section{margin-bottom:18px}
      .pdf-section h4{font-size:12px;font-weight:bold;text-transform:uppercase;margin-bottom:8px;background:#EBF0F8;padding:4px 8px;border-left:3px solid #0B1E3D}
      .pdf-field{display:flex;gap:8px;margin-bottom:5px}
      .pdf-field label{width:190px;flex-shrink:0;color:#555;font-size:12px}
      .pdf-field .val{border-bottom:1px solid #999;flex:1;min-height:18px;color:#0B1E3D;font-weight:500;font-size:12px}
      .pdf-sign-row{display:flex;justify-content:space-between;gap:40px;margin-top:28px}.pdf-sign-row .sign-box-pdf{flex:0 0 42%}
      .sign-box-pdf{border:1px solid #ccc;border-radius:6px;padding:12px;text-align:center}
      .sign-box-pdf .role-lbl{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#666;margin-bottom:6px}
      .sign-box-pdf .sign-name{font-size:11px;color:#333;margin-bottom:8px}
      .sign-box-pdf .sign-result{min-height:56px;border:1px dashed #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#aaa;background:#fafafa;padding:4px}
      .sign-box-pdf .sign-result.done{background:#f0fff8;border-color:#00C48C;color:#00C48C}
      .sign-box-pdf .sign-date{font-size:10px;color:#888;margin-top:4px}
      .cert-badge{display:inline-flex;align-items:center;gap:6px;background:#D1FAE5;border-radius:20px;padding:4px 12px;font-size:11px;color:#065F46;font-weight:500;margin-top:8px}
      @media print{ body{padding:16px 24px} }`;
  const bodyHtml = isConvention
    ? '<div class="pdf-preview">' + innerHtml + '</div>'
    : innerHtml;
  const win = window.open('', '_blank');
  if(!win){
    showToast('âš ï¸ Veuillez autoriser les fenÃªtres pop-up pour gÃ©nÃ©rer le PDF');
    return;
  }
  win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>${title||'StageFlow'}</title>
    <style>${styles}</style></head><body>${bodyHtml}
    <scr` + `ipt>window.onload=function(){ setTimeout(function(){ window.print(); }, 300); };</scr` + `ipt>
    </body></html>`);
  win.document.close();
  showToast("ðŸ–¨ï¸ Choisissez \"Enregistrer en PDF\" dans la fenÃªtre d'impression");
}

async function downloadConvention(convId){
  convId = convId || state.openConventionId;
  if (!convId && state.role === 'etudiant' && typeof getStudentConvention === 'function' && state.user) {
    const sc = getStudentConvention(state.user);
    if (sc) convId = sc.id;
  }
  if (!convId) {
    showToast('âš ï¸ Aucune convention Ã  tÃ©lÃ©charger');
    return;
  }
  if (typeof loadConventionFromDb === 'function') {
    await loadConventionFromDb(convId);
  }
  const conv = conventions.find(c => c.id === convId);
  if (!conv) {
    showToast('âš ï¸ Convention introuvable');
    return;
  }
  const ref = conv.reference || ('SF-2026-0' + (conv.id + 46));
  const filename = `Convention-${ref}.pdf`;
  showToast('â³ GÃ©nÃ©ration du PDF en cours...');

  let innerHtml;
  if (typeof buildConventionPdfHtml === 'function') {
    const tmp = document.createElement('div');
    tmp.innerHTML = buildConventionPdfHtml(convId, true);
    innerHtml = tmp.querySelector('.pdf-preview') ? tmp.querySelector('.pdf-preview').innerHTML : tmp.innerHTML;
  } else {
    const preview = document.getElementById('conventionContent')?.querySelector('.pdf-preview');
    if (!preview) {
      showToast('âš ï¸ Ouvrez d\'abord l\'aperÃ§u de la convention');
      return;
    }
    innerHtml = preview.innerHTML;
  }
  if (!innerHtml || innerHtml.trim().length < 50) {
    showToast('âš ï¸ Impossible de gÃ©nÃ©rer la convention â€” rÃ©essayez aprÃ¨s l\'aperÃ§u');
    return;
  }
  generatePdfFromElement(innerHtml, filename, filename, { conventionPdf: true });
}

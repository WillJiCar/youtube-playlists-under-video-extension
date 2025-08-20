async function extractWithInlineStyles(finder) {
    const el = document.querySelector(`${finder}`);
    if (!el) {
        console.error("Element not found");
        return;
    }

    // Get all style sheets
    const styleSheets = document.styleSheets;
    let allCSSContent = '';
    
    // Process each style sheet
    for (let i = 0; i < styleSheets.length; i++) {
        const sheet = styleSheets[i];
        
        try {
            let cssText = "";
            if(sheet.href){
                const res = await fetch(sheet.href);
                cssText = await res.text();
            }
            
            if (cssText.length == 0 && sheet.cssRules) {                
                for (let j = 0; j < sheet.cssRules.length; j++) {
                    cssText += sheet.cssRules[j].cssText + '\n';
                }               
            }
            allCSSContent += `/* Stylesheet ${i + 1} */\n${cssText}\n\n`;
        } catch (e) {
            console.warn(`Cannot access stylesheet ${i}:`, e.message);
            allCSSContent += `/* Stylesheet ${i + 1}: Cross-origin or inaccessible */\n\n`;
        }
    }

  const html = `<!DOCTYPE html>
<html class="${document.querySelector("html").className}">
<head>
<meta charset="utf-8">
<title>Extracted</title>
</head>
<style>${allCSSContent}</style>
<body>
${el.outerHTML}
${el.nextElementSibling ? el.nextElementSibling.outerHTML : ""}
</body>
</html>`;

    //console.log(html);
    // Open in new tab
    const newTab = window.open();
    newTab.document.write(html);
    newTab.document.close();

    const blob = new Blob([html], { type: "text/html" });

    console.log('Styles extracted and opened in new tab successfully!', blob.size, "bytes");
}

// Example usage:
extractWithInlineStyles("[data-turn-id]");


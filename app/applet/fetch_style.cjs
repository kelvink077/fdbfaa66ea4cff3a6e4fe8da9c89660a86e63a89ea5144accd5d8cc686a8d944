const https = require("https");
const fs = require("fs");

https.get("https://styles.refero.design/style/e5f5f8cf-e68d-4ed1-bbf5-6b67569af648", (res) => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    const match = data.match(/<code class="text-foreground whitespace-pre-wrap break-words">([\s\S]*?)<\/code>/);
    if (match) {
      const decoded = match[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'");
      fs.writeFileSync("./refero_dala_style.md", decoded);
      console.log("Saved refero_dala_style.md, length:", decoded.length);
    } else {
      console.log("Match not found, html length:", data.length);
    }
  });
});

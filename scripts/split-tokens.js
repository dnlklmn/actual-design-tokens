const fs = require("fs");
const path = require("path");

function removeTypeProperties(obj) {
  if (Array.isArray(obj)) {
    return obj.map((item) => removeTypeProperties(item));
  }
  if (typeof obj === "object" && obj !== null) {
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key !== "$type") {
        newObj[key] = removeTypeProperties(value);
      }
    }
    return newObj;
  }
  return obj;
}

function splitTokens() {
  try {
    // Read the tokens.json file
    const rawData = fs.readFileSync("tokens.json", "utf8");
    const tokens = JSON.parse(rawData);

    // Remove $type properties from the tokens
    const processedTokens = removeTypeProperties(tokens);

    // Separate dark, light and global tokens
    const { dark, light, ...globalTokens } = tokens;

    // Process tokens to remove type properties
    const processedGlobalTokens = removeTypeProperties(globalTokens);
    const processedDark = removeTypeProperties(dark);
    const processedLight = removeTypeProperties(light);

    // Write global tokens
    fs.writeFileSync("global.json", JSON.stringify(processedGlobalTokens, null, 2), "utf8");
    console.log("✓ Created global.json");

    // Write dark tokens
    fs.writeFileSync("dark.json", JSON.stringify(processedDark, null, 2), "utf8");
    console.log("✓ Created dark.json");

    // Write light tokens
    fs.writeFileSync("light.json", JSON.stringify(processedLight, null, 2), "utf8");
    console.log("✓ Created light.json");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error("Error: tokens.json file not found");
    } else if (error instanceof SyntaxError) {
      console.error("Error: Invalid JSON in tokens.json");
    } else {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

splitTokens();

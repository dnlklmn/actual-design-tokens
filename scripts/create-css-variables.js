const fs = require('fs');

// Read and parse JSON files
const readJsonFile = (filename) => {
try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
} catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return {};
}
};

// Flatten nested objects into dot notation
const flattenObject = (obj, prefix = '') => {
return Object.keys(obj).reduce((acc, key) => {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
    // If the object has a $value or value property, treat it as a leaf node
    if ('$value' in obj[key]) {
        acc[newPrefix] = obj[key].$value;
    } else if ('value' in obj[key]) {
        acc[newPrefix] = obj[key].value;
    } else {
        Object.assign(acc, flattenObject(obj[key], newPrefix));
    }
    } else {
    acc[newPrefix] = obj[key];
    }
    return acc;
}, {});
};

// Resolve color references like {purple.200}
const resolveColorReferences = (value, tokens, globals, theme = null, visited = new Set()) => {
if (typeof value !== 'string') return value;

// Keep track of paths we've visited to prevent infinite recursion
const currentVisited = new Set(visited);

const referenceRegex = /\{([^}]+)\}/g;
let result = value.replace(referenceRegex, (match, path) => {
    // Add this path to visited set to detect circular references
    if (currentVisited.has(path)) {
        console.error(`Circular reference detected: ${path}`);
        return match; // Return original reference to avoid infinite loop
    }
    currentVisited.add(path);
    
    // First check in tokens
    let resolvedValue = path.split('.').reduce((obj, key) => obj?.[key], tokens);
    
    // If not found in tokens and theme is provided, check in the theme object
    if (!resolvedValue && theme) {
        resolvedValue = path.split('.').reduce((obj, key) => obj?.[key], theme);
    }
    
    // If still not found, check in globals under the global path
    if (!resolvedValue) {
        const globalPath = `global.${path}`;
        resolvedValue = globalPath.split('.').reduce((obj, key) => obj?.[key], globals);
    }
    
    // If we found an object with a $value or value property, use that
    if (resolvedValue && typeof resolvedValue === 'object') {
        if ('$value' in resolvedValue) {
            resolvedValue = resolvedValue.$value;
        } else if ('value' in resolvedValue) {
            resolvedValue = resolvedValue.value;
        }
    }
    
    // If the resolved value contains references, resolve them recursively
    if (typeof resolvedValue === 'string' && resolvedValue.includes('{')) {
        resolvedValue = resolveColorReferences(resolvedValue, tokens, globals, theme, currentVisited);
    }
    
    return resolvedValue || match;
});

return result;
}
// Generate CSS variables
const generateCssVariables = (theme, tokens, globals) => {
const flatTheme = flattenObject(theme);
const cssVars = Object.entries(flatTheme)
    .filter(([key]) => !key.includes('$type'))
    .map(([key, value]) => {
        // Extract $value or value from objects if present
        if (typeof value === 'object' && value !== null) {
            if ('$value' in value) {
                value = value.$value;
            } else if ('value' in value) {
                value = value.value;
            }
        }
        const resolvedValue = resolveColorReferences(value, tokens, globals, theme);
        return `--${key.replace(/\./g, '-').replace(/-\$value$/, '')}: ${resolvedValue};`;
    });
return cssVars.join('\n');
};

// Main process
const main = () => {
// Read all theme files
const dark = readJsonFile('dark.json');
const light = readJsonFile('light.json');
const tokens = readJsonFile('tokens.json');
const globals = readJsonFile('global.json');

// Write CSS content to file
const writeCssFile = (filename, content) => {
try {
    fs.writeFileSync(filename, content, 'utf8');
    console.log(`Successfully wrote CSS to ${filename}`);
} catch (error) {
    console.error(`Error writing to ${filename}:`, error);
    process.exit(1);
}
};

// Generate CSS variables for dark theme
const darkCss = [
':root {',
'  /* Dark theme variables */',
generateCssVariables(dark, tokens, globals)
    .split('\n')
    .map(line => '  ' + line)
    .join('\n'),
'}'
].join('\n');

// Generate CSS variables for light theme
const lightCss = [
':root {',
'  /* Light theme variables */',
generateCssVariables(light, tokens, globals)
    .split('\n')
    .map(line => '  ' + line)
    .join('\n'),
'}'
].join('\n');
// Generate CSS variables for global variables
const globalCss = [
':root {',
'  /* Global variables */',
generateCssVariables(globals, tokens, globals)
    .split('\n')
    .map(line => '  ' + line)
    .join('\n'),
'}'
].join('\n');

writeCssFile('dark.css', darkCss);
writeCssFile('light.css', lightCss);
writeCssFile('global.css', globalCss);
};

main();


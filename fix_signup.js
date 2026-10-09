const fs = require('fs');

function fixPatterns(file) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    content = content.replace(/pattern="\[\^\\\\s@\]\+@\[\^\\\\s@\]\+\\\\.\[\^\\\\s@\]\+"/g, 'pattern="[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+"');
    // Actually, in JS string replace without regex, it's easier:
    content = content.split('pattern="[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+"').join('pattern="[^\\s@]+@[^\\s@]+\\.[^\\s@]+"');
    content = content.split('pattern="^\\\\+?\\\\d{10,15}$"').join('pattern="^\\+?\\d{10,15}$"');

    fs.writeFileSync(file, content);
    console.log(`Fixed ${file}`);
}

fixPatterns('frontend/src/SignUpPage.jsx');
fixPatterns('frontend/src/SignUpPage_temp.jsx');

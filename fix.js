const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, "index.html");
let content = fs.readFileSync(filePath, 'utf8');

// Fix string literal
const regex1 = /'sc-1-p': 'اشترِ مباشرة.*?var I18N_MAP = \[/gs;
const replacement1 = `'sc-1-p': 'اشترِ مباشرة أو عبر شبكة موزعينا العالمية المتوسعة'
            }
        };

        /* ── Add data-i18n attributes map — maps key to selector ── */
        var I18N_MAP = [`;

content = content.replace(regex1, replacement1);

// Fix trailing script tag garbage
const regex2 = /\}\(\)\);\r?\n    <\/script>.*<\/html>/gs;
const replacement2 = `}());
    </script>

</body>

</html>`;

content = content.replace(regex2, replacement2);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed index.html syntax successfully.');

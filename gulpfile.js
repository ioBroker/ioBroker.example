"use strict";

const gulp = require("gulp");
const fs = require("fs");
const pkg = require("./package.json");
const iopackage = require("./io-package.json");
const version = (pkg && pkg.version) ? pkg.version : iopackage.common.version;
const fileName = "words.js";
const EMPTY = "";
const translate = require("./lib/tools.js").translateText;
const languages = {
    en: {},
    de: {},
    ru: {},
    pt: {},
    nl: {},
    fr: {},
    it: {},
    es: {},
    pl: {},
    "zh-cn": {}
};

function lang2data(lang, isFlat) {
    let str = isFlat ? '' : '{\n';
    let count = 0;
    for (const w in lang) {
        if (lang.hasOwnProperty(w)) {
            count++;
            if (isFlat) {
                str += (lang[w] === '' ? (isFlat[w] || w) : lang[w]) + '\n';
            } else {
                const key = '  "' + w.replace(/"/g, '\\"') + '": ';
                str += key + '"' + lang[w].replace(/"/g, '\\"') + '",\n';
            }
        }
    }
    if (!count)
        return isFlat ? '' : '{\n}';
    if (isFlat) {
        return str;
    } else {
        return str.substring(0, str.length - 2) + '\n}';
    }
}

function readWordJs(src) {
    try {
        let words;
        if (fs.existsSync(src + "js/" + fileName)) {
            words = fs.readFileSync(src + "js/" + fileName).toString();
        } else {
            words = fs.readFileSync(src + fileName).toString();
        }
        words = words.substring(words.indexOf('{'), words.length);
        words = words.substring(0, words.lastIndexOf(';'));
     
        const resultFunc = new Function("return " + words + ";");

        return resultFunc();
    } catch (e) {
        return null;
    }
}

function padRight(text, totalLength) {
    return text + (text.length < totalLength ? new Array(totalLength - text.length).join(' ') : '');
}

function writeWordJs(data, src) {
    let text = '';
    text += '/*global systemDictionary:true */\n';
    text += '\'use strict\';\n\n';
    text += 'systemDictionary = {\n';
    for (const word in data) {
        if (data.hasOwnProperty(word)) {
            text += '    ' + padRight('"' + word.replace(/"/g, '\\"') + '": {', 50);
            let line = '';
            for (const lang in data[word]) {
                if (data[word].hasOwnProperty(lang)) {
                    line += '"' + lang + '": "' + padRight(data[word][lang].replace(/"/g, '\\"') + '",', 50) + ' ';
                }
            }
            if (line) {
                line = line.trim();
                line = line.substring(0, line.length - 1);
            }
            text += line + '},\n';
        }
    }
    text += '};';
    if (fs.existsSync(src + 'js/' + fileName)) {
        fs.writeFileSync(src + 'js/' + fileName, text);
    } else {
        fs.writeFileSync(src + '' + fileName, text);
    }
}

function words2languages(src) {
    const langs = Object.assign({}, languages);
    const data = readWordJs(src);
    if (data) {
        for (const word in data) {
            if (data.hasOwnProperty(word)) {
                for (const lang in data[word]) {
                    if (data[word].hasOwnProperty(lang)) {
                        langs[lang][word] = data[word][lang];
                        //  pre-fill all other languages
                        for (const j in langs) {
                            if (langs.hasOwnProperty(j)) {
                                langs[j][word] = langs[j][word] || EMPTY;
                            }
                        }
                    }
                }
            }
        }
        if (!fs.existsSync(src + 'i18n/')) {
            fs.mkdirSync(src + 'i18n/');
        }
        for (const l in langs) {
            if (!langs.hasOwnProperty(l))
                continue;
            const keys = Object.keys(langs[l]);
            keys.sort();
            const obj = {};
            for (let k = 0; k < keys.length; k++) {
                obj[keys[k]] = langs[l][keys[k]];
            }
            if (!fs.existsSync(src + 'i18n/' + l)) {
                fs.mkdirSync(src + 'i18n/' + l);
            }

            fs.writeFileSync(src + 'i18n/' + l + '/translations.json', lang2data(obj));
        }
    } else {
        console.error('Cannot read or parse ' + fileName);
    }
}

function words2languagesFlat(src) {
    const langs = Object.assign({}, languages);
    const data = readWordJs(src);
    if (data) {
        for (const word in data) {
            if (data.hasOwnProperty(word)) {
                for (const lang in data[word]) {
                    if (data[word].hasOwnProperty(lang)) {
                        langs[lang][word] = data[word][lang];
                        //  pre-fill all other languages
                        for (const j in langs) {
                            if (langs.hasOwnProperty(j)) {
                                langs[j][word] = langs[j][word] || EMPTY;
                            }
                        }
                    }
                }
            }
        }
        const keys = Object.keys(langs.en);
        keys.sort();
        for (const l in langs) {
            if (!langs.hasOwnProperty(l))
                continue;
            const obj = {};
            for (let k = 0; k < keys.length; k++) {
                obj[keys[k]] = langs[l][keys[k]];
            }
            langs[l] = obj;
        }
        if (!fs.existsSync(src + 'i18n/')) {
            fs.mkdirSync(src + 'i18n/');
        }
        for (const ll in langs) {
            if (!langs.hasOwnProperty(ll))
                continue;
            if (!fs.existsSync(src + 'i18n/' + ll)) {
                fs.mkdirSync(src + 'i18n/' + ll);
            }

            fs.writeFileSync(src + 'i18n/' + ll + '/flat.txt', lang2data(langs[ll], langs.en));
        }
        fs.writeFileSync(src + 'i18n/flat.txt', keys.join('\n'));
    } else {
        console.error('Cannot read or parse ' + fileName);
    }
}

function languagesFlat2words(src) {
    const dirs = fs.readdirSync(src + 'i18n/');
    const langs = {};
    const bigOne = {};
    const order = Object.keys(languages);
    dirs.sort(function (a, b) {
        const posA = order.indexOf(a);
        const posB = order.indexOf(b);
        if (posA === -1 && posB === -1) {
            if (a > b)
                return 1;
            if (a < b)
                return -1;
            return 0;
        } else if (posA === -1) {
            return -1;
        } else if (posB === -1) {
            return 1;
        } else {
            if (posA > posB)
                return 1;
            if (posA < posB)
                return -1;
            return 0;
        }
    });
    const keys = fs.readFileSync(src + 'i18n/flat.txt').toString().split('\n');

    for (let l = 0; l < dirs.length; l++) {
        if (dirs[l] === 'flat.txt')
            continue;
        const lang = dirs[l];
        const values = fs.readFileSync(src + 'i18n/' + lang + '/flat.txt').toString().split('\n');
        langs[lang] = {};
        keys.forEach(function (word, i) {
            langs[lang][word] = values[i];
        });

        const words = langs[lang];
        for (const word in words) {
            if (words.hasOwnProperty(word)) {
                bigOne[word] = bigOne[word] || {};
                if (words[word] !== EMPTY) {
                    bigOne[word][lang] = words[word];
                }
            }
        }
    }
    // read actual words.js
    const aWords = readWordJs();

    const temporaryIgnore = ['flat.txt'];
    if (aWords) {
        // Merge words together
        for (const w in aWords) {
            if (aWords.hasOwnProperty(w)) {
                if (!bigOne[w]) {
                    console.warn('Take from actual words.js: ' + w);
                    bigOne[w] = aWords[w];
                }
                dirs.forEach(function (lang) {
                    if (temporaryIgnore.indexOf(lang) !== -1)
                        return;
                    if (!bigOne[w][lang]) {
                        console.warn('Missing "' + lang + '": ' + w);
                    }
                });
            }
        }

    }

    writeWordJs(bigOne, src);
}

function languages2words(src) {
    const dirs = fs.readdirSync(src + 'i18n/');
    const langs = {};
    const bigOne = {};
    const order = Object.keys(languages);
    dirs.sort(function (a, b) {
        const posA = order.indexOf(a);
        const posB = order.indexOf(b);
        if (posA === -1 && posB === -1) {
            if (a > b)
                return 1;
            if (a < b)
                return -1;
            return 0;
        } else if (posA === -1) {
            return -1;
        } else if (posB === -1) {
            return 1;
        } else {
            if (posA > posB)
                return 1;
            if (posA < posB)
                return -1;
            return 0;
        }
    });
    for (let l = 0; l < dirs.length; l++) {
        if (dirs[l] === 'flat.txt')
            continue;
        const lang = dirs[l];
        langs[lang] = fs.readFileSync(src + 'i18n/' + lang + '/translations.json').toString();
        langs[lang] = JSON.parse(langs[lang]);
        const words = langs[lang];
        for (const word in words) {
            if (words.hasOwnProperty(word)) {
                bigOne[word] = bigOne[word] || {};
                if (words[word] !== EMPTY) {
                    bigOne[word][lang] = words[word];
                }
            }
        }
    }
    // read actual words.js
    const aWords = readWordJs();

    const temporaryIgnore = ['flat.txt'];
    if (aWords) {
        // Merge words together
        for (const w in aWords) {
            if (aWords.hasOwnProperty(w)) {
                if (!bigOne[w]) {
                    console.warn('Take from actual words.js: ' + w);
                    bigOne[w] = aWords[w];
                }
                dirs.forEach(function (lang) {
                    if (temporaryIgnore.indexOf(lang) !== -1)
                        return;
                    if (!bigOne[w][lang]) {
                        console.warn('Missing "' + lang + '": ' + w);
                    }
                });
            }
        }

    }

    writeWordJs(bigOne, src);
}

async function translateNotExisting(obj, baseText) {
    let t = obj['en'];
    if (!t) {
        t = baseText;
    }

    if (t) {
        for (let l in languages) {
            if (!obj[l]) {
                obj[l] = await translate(t, l);
            }
        }
    }
}

//TASKS

gulp.task('adminWords2languages', function (done) {
    words2languages('./admin/');
    done();
});

gulp.task('adminWords2languagesFlat', function (done) {
    words2languagesFlat('./admin/');
    done();
});

gulp.task('adminLanguagesFlat2words', function (done) {
    languagesFlat2words('./admin/');
    done();
});

gulp.task('adminLanguages2words', function (done) {
    languages2words('./admin/');
    done();
});

gulp.task("updatePackages", function (done) {
    iopackage.common.version = pkg.version;
    iopackage.common.news = iopackage.common.news || {};
    if (!iopackage.common.news[pkg.version]) {
        const news = iopackage.common.news;
        const newNews = {};

        newNews[pkg.version] = {
            en: "news",
            de: "neues",
            ru: "новое",
            pt: "novidades",
            nl: "nieuws",
            fr: "nouvelles",
            it: "notizie",
            es: "noticias",
            pl: "nowości",
            "zh-cn": "新"
        };
        iopackage.common.news = Object.assign(newNews, news);
    }
    fs.writeFileSync("io-package.json", JSON.stringify(iopackage, null, 4));
    done();
});

gulp.task('rename', function ()  {
    let newname;
    let author = '@@Author@@';
    let email  = '@@email@@';
    for (let a = 0; a < process.argv.length; a++) {
        if (process.argv[a] === '--name') {
            newname = process.argv[a + 1]
        } else if (process.argv[a] === '--email') {
            email = process.argv[a + 1]
        } else if (process.argv[a] === '--author') {
            author = process.argv[a + 1]
        }
    }


    console.log('Try to rename to "' + newname + '"');
    if (!newname) {
        console.log('Please write the new template name, like: "gulp rename --name mywidgetset" --author "Author Name"');
        process.exit();
    }
    if (newname.indexOf(' ') !== -1) {
        console.log('Name may not have space in it.');
        process.exit();
    }
    if (newname.toLowerCase() !== newname) {
        console.log('Name must be lower case.');
        process.exit();
    }
    if (fs.existsSync(__dirname + '/admin/template.png')) {
        fs.renameSync(__dirname + '/admin/template.png',              __dirname + '/admin/' + newname + '.png');
    }
    if (fs.existsSync(__dirname + '/widgets/template.html')) {
        fs.renameSync(__dirname + '/widgets/template.html',           __dirname + '/widgets/' + newname + '.html');
    }
    if (fs.existsSync(__dirname + '/widgets/template/js/template.js')) {
        fs.renameSync(__dirname + '/widgets/template/js/template.js', __dirname + '/widgets/template/js/' + newname + '.js');
    }
    if (fs.existsSync(__dirname + '/widgets/template')) {
        fs.renameSync(__dirname + '/widgets/template',                __dirname + '/widgets/' + newname);
    }
    let patterns = [
        {
            match: /ioBroker template Adapter/g,
            replacement: newname
        },
        {
            match: /template/g,
            replacement: newname
        },
        {
            match: /Template/g,
            replacement: newname ? (newname[0].toUpperCase() + newname.substring(1)) : 'Template'
        },
        {
            match: /@@Author@@/g,
            replacement: author
        },
        {
            match: /@@email@@/g,
            replacement: email
        }
    ];
    let files = [
        __dirname + '/io-package.json',
        __dirname + '/LICENSE',
        __dirname + '/package.json',
        __dirname + '/README.md',
        __dirname + '/main.js',
        __dirname + '/gulpfile.js',
        __dirname + '/widgets/' + newname +'.html',
        __dirname + '/www/index.html',
        __dirname + '/admin/index.html',
        __dirname + '/admin/index_m.html',
        __dirname + '/widgets/' + newname + '/js/' + newname +'.js',
        __dirname + '/widgets/' + newname + '/css/style.css'
    ];
    files.forEach(function (f) {
        try {
            if (fs.existsSync(f)) {
                let data = fs.readFileSync(f).toString('utf-8');
                for (let r = 0; r < patterns.length; r++) {
                    data = data.replace(patterns[r].match, patterns[r].replacement);
                }
                fs.writeFileSync(f, data);
            }
        } catch (e) {

        }
    });
});

gulp.task('updateReadme', function (done) {
    const readme = fs.readFileSync('README.md').toString();
    const pos = readme.indexOf('## Changelog\n');
    if (pos !== -1) {
        const readmeStart = readme.substring(0, pos + '## Changelog\n'.length);
        const readmeEnd = readme.substring(pos + '## Changelog\n'.length);

        if (readme.indexOf(version) === -1) {
            const timestamp = new Date();
            const date = timestamp.getFullYear() + '-' +
                    ('0' + (timestamp.getMonth() + 1).toString(10)).slice(-2) + '-' +
                    ('0' + (timestamp.getDate()).toString(10)).slice(-2);

            let news = '';
            if (iopackage.common.news && iopackage.common.news[pkg.version]) {
                news += '* ' + iopackage.common.news[pkg.version].en;
            }

            fs.writeFileSync('README.md', readmeStart + '### ' + version + ' (' + date + ')\n' + (news ? news + '\n\n' : '\n') + readmeEnd);
        }
    }
    done();
});

gulp.task('translate', async function (done) {
    if (iopackage && iopackage.common) {
        if (iopackage.common.news) {
            for (let k in iopackage.common.news) {
                let nw = iopackage.common.news[k];
                await translateNotExisting(nw);
            }
        }
        if (iopackage.common.titleLang) {
            await translateNotExisting(iopackage.common.titleLang, iopackage.common.title);
        }
        if (iopackage.common.desc) {
            await translateNotExisting(iopackage.common.desc);
        }

        if (fs.existsSync('./admin/i18n/en/translations.json')) {
            let enTranslations = require('./admin/i18n/en/translations.json');
            for (let l in languages) {
                let existing = {};
                if (fs.existsSync('./admin/i18n/' + l + '/translations.json')) {
                    existing = require('./admin/i18n/' + l + '/translations.json');
                }
                for (let t in enTranslations) {
                    if (!existing[t]) {
                        existing[t] = await translate(enTranslations[t], l);
                    }
                }
                if (!fs.existsSync('./admin/i18n/' + l + '/')) {
                    fs.mkdirSync('./admin/i18n/' + l + '/');
                }
                fs.writeFileSync('./admin/i18n/' + l + '/translations.json', JSON.stringify(existing, null, 4));
            }
        }

    }
    fs.writeFileSync('io-package.json', JSON.stringify(iopackage, null, 4));
});

gulp.task("translateAndUpdateWordsJS", gulp.series("translate", "adminLanguages2words"));

gulp.task('default', gulp.series('updatePackages', 'updateReadme'));
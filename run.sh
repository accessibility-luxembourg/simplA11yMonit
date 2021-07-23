rm -r out/*
cp -r static/template-grille-audit-simplifie out
NODE_ICU_DATA=./node_modules/full-icu node ./test/accessTests.js $@
fileName=$(node test/getSiteName.js $1)
cd out/template-grille-audit-simplifie
7z a -tzip  ../$fileName.xlsx * 1> /dev/null
cd .. && rm -rf template-grille-audit-simplifie
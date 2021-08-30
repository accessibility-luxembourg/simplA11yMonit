fileName=$(node test/getSiteName.js $1)
if test -f "out/$fileName.xlsx"; then
    echo "$fileName already exists"
    exit 0
else
    rm -rf tmp && mkdir tmp 
    cp -r static/template-grille-audit-simplifie tmp
    NODE_ICU_DATA=./node_modules/full-icu node ./test/accessTests.js $@
    if [ $? -eq 0 ]
    then
        cd tmp/template-grille-audit-simplifie
        7z a -tzip  ../$fileName.xlsx * 1> /dev/null
        cd ../.. && mv tmp/$fileName.xlsx out 
        rm -rf tmp
    else
        echo "Audit of $fileName failed, exit code: $?"
        exit 1
    fi
fi

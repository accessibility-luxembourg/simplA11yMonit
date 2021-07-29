./geckodriver.exe > /dev/null 2>&1 &
cat audits-src.txt | while read i; 
    do ./run.sh $i;
        if [ $? -ne 0 ]
        then
        echo "Script terminated with error"
        break
        fi
    done
taskkill //IM "geckodriver.exe" //F > /dev/null 2>&1 &
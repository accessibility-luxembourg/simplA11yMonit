mkdir tmp;
cd tmp;
NUM=0
cat ../audits-src.txt | while read i; do 
    url1=$(echo $i | cut -d' ' -f1)
    url2=$(echo $i | cut -d' ' -f2)
    url3=$(echo $i | cut -d' ' -f3)
    echo $url1; curl $url1 -s -o $NUM.html; let NUM++;
    echo $url2; curl $url2 -s -o $NUM.html; let NUM++;
    echo $url3; curl $url3 -s -o $NUM.html; let NUM++;
done
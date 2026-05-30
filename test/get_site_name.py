import re
import sys

url = sys.argv[1]
name = re.sub(r'https?://', '', url).split('/')[0].split('?')[0].split('#')[0]
print(name)

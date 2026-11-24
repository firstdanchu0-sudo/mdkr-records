"""Fetch the second leaderboard entry's character/elfin for each MDKR chart.
Run using GitHub Actions. Leave previous good values on API errors.
"""
import json, pathlib, urllib.request, urllib.error, time, datetime, concurrent.futures, os
ROOT=pathlib.Path(__file__).resolve().parents[1]
SONGS=json.loads((ROOT/'data/songs.json').read_text(encoding='utf-8'))
DEST=ROOT/'data/score_builds.json'
try: old=json.loads(DEST.read_text(encoding='utf-8'))
except (FileNotFoundError,json.JSONDecodeError): old={}
BASE='https://api.musedash.moe'
def fetch(path):
 req=urllib.request.Request(BASE+path,headers={'User-Agent':'MDKR-Records-ScoreBuilds/1.0 (+https://github.com/firstdanchu0-sudo/mdkr-records)','Accept':'application/json'})
 with urllib.request.urlopen(req,timeout=20) as r:return json.load(r)
ce=fetch('/ce')
char_names=ce['c']['Korean'];elf_names=ce['e']['Korean']
def resolve(names,raw):
 try:
  i=int(raw)
  if 0<=i<len(names) and names[i]:return str(names[i])
 except (ValueError,TypeError):pass
 return None

def work(s):
 uid=s.get('uid');di=s.get('difficulty_index');key=s.get('chart_id')
 if not uid or di is None or not key:return key,None
 for tries in range(2):
  try:
   ranking=fetch(f'/rank/{uid}/{int(di)}/all')
   if not isinstance(ranking,list) or len(ranking)<2:return key,None
   r=ranking[1] # strictly second listed entry (not second distinct score)
   if not isinstance(r,list) or len(r)<8:return key,None
   c=resolve(char_names,r[6]);e=resolve(elf_names,r[7])
   if not c or not e:return key,None
   return key,{'character':c,'elfin':e,'score':r[1],'updated_at':datetime.datetime.now(datetime.timezone.utc).date().isoformat()}
  except (urllib.error.URLError,TimeoutError,ValueError,IndexError,TypeError):
   if tries==0:time.sleep(1)
 return key,None

# Keep concurrency intentionally low to avoid overloading public API.
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 results=list(pool.map(work,SONGS))
new=dict(old);success=0
for key,result in results:
 if key and result:new[key]=result;success+=1
print(f'Collected {success}/{len(SONGS)} current results; retained {len(new)} total with previous cache.')
if success==0:raise SystemExit('No API results: keeping previous cache, no update.')
DEST.write_text(json.dumps(new,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf-8')

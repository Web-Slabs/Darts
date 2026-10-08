import re, glob, html, os

base = os.environ.get('TMPDARTS', '/tmp/darts-xls')

for d in ['killer', 'x01x', 'dscorer']:
    print(f"######## {d} ########")
    try:
        ss = open(f'{base}/{d}/xl/sharedStrings.xml', encoding='utf8').read()
        strings = [html.unescape(re.sub(r'<[^>]+>', '', m)) for m in re.findall(r'<si>(.*?)</si>', ss, re.S)]
    except FileNotFoundError:
        strings = []
    sheets = sorted(glob.glob(f'{base}/{d}/xl/worksheets/sheet*.xml'))
    for sh in sheets[:2]:
        xml = open(sh, encoding='utf8').read()
        rows = re.findall(r'<row [^>]*r="(\d+)"[^>]*>(.*?)</row>', xml, re.S)
        print(f"--- {sh} ({len(rows)} rows) ---")
        count = 0
        for r, body in rows:
            cells = re.findall(r'<c r="([A-Z]+\d+)"[^>]*?(?: t="(\w+)")?[^>]*>(?:<f>[^<]*</f>)?(?:<v>([^<]*)</v>)?', body)
            vals = []
            for ref, t, v in cells:
                if v == '':
                    continue
                if t == 's':
                    vals.append(f"{ref}={strings[int(v)]!r}")
                else:
                    vals.append(f"{ref}={v}")
            if vals:
                print(r, ' | '.join(vals[:14]))
                count += 1
            if count > 50:
                break

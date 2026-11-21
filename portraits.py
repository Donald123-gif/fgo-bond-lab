import json
from pathlib import Path

def save_portraits(servants, region, directory):
    portraits = {}
    base = f'https://static.atlasacademy.io/{region}/Faces/'
    for servant in servants:
        if servant['type'] not in ('normal','heroine') or servant['collectionNo'] <= 0:
            continue
        faces = servant['extraAssets'].get('faces', {})
        costumes = servant.get('profile', {}).get('costume', {})
        choices = []
        seen = set()
        for group in ('ascension', 'costume'):
            for key, url in faces.get(group, {}).items():
                if not url or url in seen:
                    continue
                seen.add(url)
                label = (f'再临头像 {key}' if group == 'ascension' else
                         costumes.get(key, {}).get('name') or f'灵衣 {key}')
                choices.append([label, url.removeprefix(base)])
        if choices:
            portraits[servant['id']] = choices
    (Path(directory)/f'portraits-{region}.json').write_text(json.dumps(portraits, ensure_ascii=False, separators=(',',':')), encoding='utf8')

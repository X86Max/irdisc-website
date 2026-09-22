#!/usr/bin/env python3
"""Build a portable static website. Python 3.11+, standard library only."""
import datetime as dt
import html
from urllib.parse import urlparse
import json
from pathlib import Path
import re
import shutil
import sys
import tomllib
import tempfile
import struct

HERE = Path(__file__).resolve().parent
ROOT = HERE / 'reference'

def read_post(path):
    text = path.read_text(encoding='utf-8')
    match = re.match(r'\A---\r?\n(.*?)\r?\n---\r?\n(.*)\Z', text, re.S)
    if not match:
        raise ValueError(f'{path.name}: expected --- front matter --- and Markdown body')
    meta = {}
    for line in match[1].splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        key, sep, value = line.partition(':')
        key, value = key.strip(), value.strip()
        if not sep or key not in {'title', 'date', 'author', 'description', 'slug'} or key in meta:
            raise ValueError(f'{path.name}: invalid or duplicate metadata key: {key}')
        if value.startswith('"'):
            try:
                value = json.loads(value)
            except json.JSONDecodeError as error:
                raise ValueError(f'{path.name}: invalid quoted {key}') from error
        elif value.startswith("'"):
            if not value.endswith("'") or len(value) < 2:
                raise ValueError(f'{path.name}: unclosed quote in {key}')
            value = value[1:-1].replace("''", "'")
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f'{path.name}: {key} must be a nonempty string')
        meta[key] = value
    for key in ('title', 'date', 'author', 'description'):
        if not meta.get(key):
            raise ValueError(f'{path.name}: missing {key}')
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', meta['date']):
        raise ValueError(f'{path.name}: date must be YYYY-MM-DD')
    dt.date.fromisoformat(meta['date'])
    meta['slug'] = meta.get('slug', re.sub(r'^\d{4}-\d{2}-\d{2}-', '', path.stem))
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', meta['slug']):
        raise ValueError(f'{path.name}: slug/filename must use lowercase letters, numbers and hyphens')
    if meta['slug'] == 'latest' or meta['slug'].isdigit():
        raise ValueError(f'{path.name}: slug cannot be latest or a number (reserved blog selectors)')
    meta['body'] = match[2]
    return meta

def discover_posts(folder):
    posts = [read_post(p) for p in sorted(folder.glob('*.md'))]
    if len({p['slug'] for p in posts}) != len(posts):
        raise ValueError('Duplicate blog slugs; use unique filenames or slug fields')
    return sorted(posts, key=lambda p: (p['date'], p['slug']), reverse=True)

def project_data():
    readme = (ROOT / 'README.md').read_text(encoding='utf-8')
    project = tomllib.loads((ROOT / 'pyproject.toml').read_text())['project']
    features = readme.split('## Features\n', 1)[1].split('\n## ', 1)[0]
    install = readme.split('## Installation\n', 1)[1].split('\n## ', 1)[0]
    blocks = re.findall(r'```bash\n(.*?)\n```', install, re.S)
    if len(blocks) != 3:
        raise ValueError('README installation structure changed: expected source, venv, wheel blocks')
    return dict(version='v' + project['version'], about='IRdisC is ' + readme.split('IRdisC is ', 1)[1].split('\n\n', 1)[0], features=features, installation=install, installBlocks=blocks)

def valid_url(value, *, optional=False):
    if optional and value == '':
        return value
    if not isinstance(value, str) or any(c.isspace() for c in value):
        raise ValueError('URL must be a nonempty HTTP(S) URL without whitespace')
    u = urlparse(value)
    if u.scheme not in ('https', 'http') or not u.netloc or u.username or u.password:
        raise ValueError(f'Unsafe or invalid URL: {value}')
    return value

def asset_url(value):
    if isinstance(value, str) and value.startswith(('https://', 'http://')):
        return valid_url(value)
    if not isinstance(value, str) or not value.startswith('assets/') or '..' in Path(value).parts or not (HERE / value).is_file():
        raise ValueError(f'Asset must be an existing assets/ file or HTTP(S) URL: {value}')
    return value

def community_image(value):
    if not isinstance(value, str) or not value.startswith('assets/community/') or '..' in Path(value).parts:
        raise ValueError('Community media must be a locally approved assets/community/ file')
    path = HERE / value
    if not path.is_file() or not path.resolve().is_relative_to((HERE / 'assets/community').resolve()):
        raise ValueError('Community media file is missing or outside assets/community/')
    raw = path.read_bytes()
    if raw[:6] in (b'GIF87a', b'GIF89a') and len(raw) >= 13:
        size = struct.unpack('<HH', raw[6:10])
    elif raw[:8] == b'\x89PNG\r\n\x1a\n' and len(raw) >= 33 and raw[12:16] == b'IHDR':
        size = struct.unpack('>II', raw[16:24])
    else:
        raise ValueError('Approved media must be PNG or GIF; convert other formats before adding')
    if not all(0 < n <= 16384 for n in size):
        raise ValueError('Invalid image dimensions')
    return size

def required(entry, key):
    if not isinstance(entry.get(key), str) or not entry[key].strip():
        raise ValueError(f'Missing/non-string {key}')

def valid_date(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        raise ValueError('Date must be YYYY-MM-DD')
    dt.date.fromisoformat(value)

def validate_entries(kind, entries):
    if not isinstance(entries, list):
        raise ValueError(f'{kind}: expected an array')
    ids = set()
    fields = {'community-sites': ('id','name','url','description'), 'guestbook': ('id','name','date','message'), 'showcase': ('id','title','date','author','description')}
    for i, entry in enumerate(entries):
        try:
            if not isinstance(entry, dict): raise ValueError('expected object')
            for key in fields[kind]: required(entry, key)
            if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', entry['id']) or entry['id'] in ids:
                raise ValueError('invalid or duplicate id')
            ids.add(entry['id'])
            if 'date' in entry: valid_date(entry['date'])
            for key in ('url','website'):
                if key in entry: valid_url(entry[key])
            if 'button' in entry:
                b = entry['button']
                if not isinstance(b, dict): raise ValueError('button must be an object')
                size = community_image(b.get('src'))
                for key, limit in [('width',240),('height',100)]:
                    if type(b.get(key)) is not int or not 1 <= b[key] <= limit: raise ValueError(f'invalid button {key}')
                if size != (b['width'], b['height']): raise ValueError('Declared button dimensions do not match the image')
            if 'image' in entry:
                community_image(entry['image']); required(entry,'alt')
        except (ValueError, KeyError, TypeError) as error:
            raise ValueError(f'{kind}[{i}]: {error}') from error
    return entries

def validate_config(site):
    for key in ('name','symbol','tagline','clientRepository','screenshot','button'): required(site,key)
    valid_url(site['clientRepository'])
    for key in ('publicSiteUrl','websiteRepository'): valid_url(site.get(key,''), optional=True)
    if site.get('publicSiteUrl'):
        u=urlparse(site['publicSiteUrl'])
        if u.query or u.fragment: raise ValueError('publicSiteUrl must be a base URL without query/fragment')
    asset_url(site['screenshot']); asset_url(site['button'])
    irc=site.get('irc',{})
    present=[bool(irc.get(k)) for k in ('network','server','channel')]
    if any(present) and not all(present): raise ValueError('Configure all IRC network/server/channel fields or leave all empty')
    if all(present):
        for key in ('network','server','channel'): required(irc,key)
        if not re.fullmatch(r'[A-Za-z0-9.-]+', irc['server']): raise ValueError('IRC server must be a hostname')
        if not re.fullmatch(r'[#&][^\s,]+', irc['channel']): raise ValueError('Invalid IRC channel')
    if type(irc.get('port')) is not int or not 1 <= irc['port'] <= 65535 or type(irc.get('tls')) is not bool:
        raise ValueError('IRC port/tls are invalid')
    return site

def validate_gif(path):
    raw=path.read_bytes()
    if raw[:6] not in (b'GIF87a',b'GIF89a') or int.from_bytes(raw[6:8],'little')!=88 or int.from_bytes(raw[8:10],'little')!=31:
        raise ValueError('Official web button must be an 88 x 31 GIF')

def build():
    # Validate before touching the previous successful output.
    posts, project = discover_posts(HERE / 'posts'), project_data()
    site = validate_config(json.loads((HERE / 'config/site.json').read_text()))
    community = {name: validate_entries(name, json.loads((HERE / 'data' / f'{name}.json').read_text())) for name in ('community-sites', 'guestbook', 'showcase')}
    validate_gif(HERE / site['button'])
    for key, empty in [('publicSiteUrl', not site.get('publicSiteUrl')), ('websiteRepository', not site.get('websiteRepository')), ('irc', not site['irc'].get('network'))]:
        if empty: print(f'Warning: config/site.json: {key} is unconfigured; visitor-safe fallback enabled.', file=sys.stderr)
    destination = HERE / 'dist'
    # Stage on the same filesystem. Copy/write failures leave the last build intact.
    with tempfile.TemporaryDirectory(prefix='.build-', dir=HERE) as temporary:
        out = Path(temporary) / 'dist'
        shutil.copytree(HERE / 'src', out, dirs_exist_ok=True)
        (out / 'data').mkdir(exist_ok=True)
        (out / 'assets').mkdir(exist_ok=True)
        for filename in ('screenshot.png', 'irdisc-32.png'):
            shutil.copy2(HERE / 'assets' / filename, out / 'assets' / filename)
        shutil.copytree(HERE / 'assets', out / 'assets', dirs_exist_ok=True, ignore=shutil.ignore_patterns('*.py', '__pycache__'))
        (out / 'assets/make_button.py').unlink(missing_ok=True)
        template = (HERE / 'src/index.html').read_text().replace('__PROJECT_ABOUT__', html.escape(project['about']))
        template = template.replace('__CLIENT_REPOSITORY__', html.escape(site['clientRepository'], quote=True))
        description = 'IRdisC — IRC, discomplicated. A lightweight terminal/TUI IRC client written in Python. Downloads, documentation, news and an alternate Web Terminal.'
        tags = [('og:title', site['name'] + ' — ' + site['tagline']), ('og:description', description), ('og:type', 'website')]
        if site.get('publicSiteUrl'):
            base = site['publicSiteUrl'].rstrip('/') + '/'
            tags += [('og:url', base), ('og:image', base + site['screenshot']), ('og:image:alt', 'IRdisC client screenshot')]
        template = template.replace('__SHARE_METADATA__', '\n'.join('<meta property="' + key + '" content="' + html.escape(value, quote=True) + '">' for key, value in tags))
        template = template.replace('./assets/screenshot.png', './' + html.escape(site['screenshot'], quote=True))
        (out / 'index.html').write_text(template)
        terminal = template.replace('<div id="classic">', '<div id="classic" hidden>').replace('<main hidden class="terminal"', '<main class="terminal"')
        terminal = terminal.replace('href="./style.css" disabled', 'href="./style.css"').replace('href="./classic.css"', 'href="./classic.css" disabled').replace('data-interface="classic"', 'data-interface="terminal"')
        (out / 'terminal.html').write_text(terminal)
        (out / 'site-config.js').write_text('export const SITE = ' + json.dumps(site, ensure_ascii=False) + ';\n')
        for name, data in [('posts', posts), ('project', project), ('site', site), *community.items()]:
            (out / 'data' / f'{name}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        backup = Path(temporary) / 'previous'
        if destination.exists(): destination.rename(backup)
        try:
            out.rename(destination)
        except OSError:
            if backup.exists(): backup.rename(destination)
            raise
    print(f'Built website/dist: {len(posts)} post(s), project {project["version"]}. No publication performed.')

if __name__ == '__main__':
    try:
        build()
    except (ValueError, KeyError, IndexError, OSError) as error:
        print(f'Build failed: {error}', file=sys.stderr)
        sys.exit(1)

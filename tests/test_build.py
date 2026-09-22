import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('build', Path(__file__).resolve().parents[1] / 'build.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

class BlogBuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)

    def post(self, name, date='2026-09-21', extra='', body='## Test\n\n**Bold**, *italic*, `code`.\n\n1. First\n2. Second\n\n```sh\necho test\n```'):
        path = self.folder / name
        path.write_text(f'---\ntitle: "Test: a title"\ndate: {date}\nauthor: "Max"\ndescription: "A description"\n{extra}---\n{body}', encoding='utf-8')
        return path

    def test_discovery_sorting_and_fields(self):
        self.post('2026-09-21-first.md')
        self.post('2026-10-01-newest.md', '2026-10-01')
        posts = build.discover_posts(self.folder)
        self.assertEqual([p['slug'] for p in posts], ['newest', 'first'])
        self.assertEqual(posts[0]['title'], 'Test: a title')
        self.assertEqual(posts[0]['author'], 'Max')
        self.assertIn('```sh', posts[0]['body'])
        self.assertEqual(posts[0]['description'], 'A description')

    def test_empty(self):
        self.assertEqual(build.discover_posts(self.folder), [])

    def test_bad_date(self):
        with self.assertRaises(ValueError):
            build.read_post(self.post('bad.md', '2026-02-31'))

    def test_missing_metadata(self):
        path = self.folder / 'missing.md'
        path.write_text('---\ntitle: "Only title"\n---\nBody')
        with self.assertRaisesRegex(ValueError, 'missing date'):
            build.read_post(path)

    def test_duplicate_slug(self):
        self.post('one.md', extra='slug: duplicate\n')
        self.post('two.md', extra='slug: duplicate\n')
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            build.discover_posts(self.folder)

    def test_invalid_slug(self):
        with self.assertRaises(ValueError):
            build.read_post(self.post('bad.md', extra='slug: ../unsafe\n'))

    def test_reserved_slug(self):
        for slug in ('latest', '123'):
            with self.assertRaises(ValueError):
                build.read_post(self.post('reserved.md', extra=f'slug: {slug}\n'))

    def test_source_truth(self):
        data = build.project_data()
        self.assertEqual(data['version'], 'v0.1.0')
        self.assertEqual(data['installBlocks'][0], 'python3 irdisc.py')
        self.assertIn('dist/irdisc-0.1.0-py3-none-any.whl', data['installBlocks'][2])

class CommunityTests(unittest.TestCase):
    def test_empty_data(self):
        for kind in ('community-sites','guestbook','showcase'):
            self.assertEqual(build.validate_entries(kind, []), [])

    def test_valid_entries(self):
        for kind, entry in [
            ('community-sites',dict(id='qa',name='QA only',url='https://example.com',description='Fixture')),
            ('guestbook',dict(id='qa',name='QA only',date='2026-09-21',message='<script>plain text</script>')),
            ('showcase',dict(id='qa',title='Fixture',date='2026-09-21',author='QA',description='Only a test'))
        ]:
            self.assertEqual(build.validate_entries(kind,[entry]),[entry])

    def test_invalid_data(self):
        examples=[('community-sites',[dict(id='qa',name='QA',url='javascript:alert(1)',description='X')]),
                  ('guestbook',[dict(id='qa',name='QA',date='2026-02-30',message='X')]),
                  ('showcase',[dict(id='qa',title='X',date='2026-09-21',author='QA',description='X',image='assets/missing.png')])]
        for kind, entries in examples:
            with self.assertRaises(ValueError): build.validate_entries(kind,entries)

    def test_duplicate_ids(self):
        e=dict(id='qa',name='QA',date='2026-09-21',message='X')
        with self.assertRaises(ValueError): build.validate_entries('guestbook',[e,e])

    def test_invalid_button_dimensions(self):
        e=dict(id='qa',name='QA',url='https://example.com',description='X',button=dict(src='https://example.com/test.gif',width=999,height=31))
        with self.assertRaises(ValueError): build.validate_entries('community-sites',[e])

    def test_gif(self):
        build.validate_gif(build.HERE / 'assets/irdisc-88x31.gif')

    def test_config(self):
        import json
        cfg=json.loads((build.HERE/'config/site.json').read_text())
        build.validate_config(cfg)
        cfg['irc']['channel']='#not-configured'
        with self.assertRaises(ValueError): build.validate_config(cfg)

if __name__ == '__main__':
    unittest.main()

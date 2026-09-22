import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from test_build import build

class CandidateTests(unittest.TestCase):
    def setUp(self):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup)
        self.root=Path(temp.name)/'site'
        shutil.copytree(build.HERE,self.root,ignore=shutil.ignore_patterns('dist','test-results','__pycache__','node_modules'))
        self.here=patch.object(build,'HERE',self.root);self.here.start();self.addCleanup(self.here.stop)
        self.ref=patch.object(build,'ROOT',self.root/'reference');self.ref.start();self.addCleanup(self.ref.stop)
    def snapshot(self):
        return {str(p.relative_to(self.root/'dist')):p.read_bytes() for p in (self.root/'dist').rglob('*') if p.is_file()}
    def test_clean_deterministic_build(self):
        build.build();expected=self.snapshot();(self.root/'dist/SHOULD_NOT_SURVIVE.txt').write_text('stale')
        build.build();self.assertEqual(self.snapshot(),expected)
    def test_invalid_input_preserves_dist(self):
        build.build();expected=self.snapshot();(self.root/'data/guestbook.json').write_text('[{}]')
        with self.assertRaises(ValueError):build.build()
        self.assertEqual(self.snapshot(),expected)
    def test_staging_failure_preserves_dist(self):
        build.build();expected=self.snapshot()
        with patch.object(build.shutil,'copytree',side_effect=OSError('simulated copy failure')):
            with self.assertRaises(OSError):build.build()
        self.assertEqual(self.snapshot(),expected)
    def test_local_media_and_dimensions(self):
        shutil.copy2(self.root/'assets/irdisc-88x31.gif',self.root/'assets/community/approved.gif')
        b=dict(src='assets/community/approved.gif',width=88,height=31)
        entry=dict(id='test',name='Fixture',url='https://example.com',description='Test only',button=b)
        build.validate_entries('community-sites',[entry])
        b['width']=87
        with self.assertRaisesRegex(ValueError,'dimensions'):build.validate_entries('community-sites',[entry])
        b.update(width=88,src='https://example.com/button.gif')
        with self.assertRaisesRegex(ValueError,'locally approved'):build.validate_entries('community-sites',[entry])
        with self.assertRaises(ValueError):build.community_image('assets/community/../../reference/LICENSE')
    def test_metadata_and_license(self):
        build.build();page=(self.root/'dist/index.html').read_text()
        self.assertIn('og:type',page);self.assertNotIn('og:url',page);self.assertNotIn('og:image',page)
        cfg=json.loads((self.root/'config/site.json').read_text());cfg['publicSiteUrl']='https://example.com/project/'
        (self.root/'config/site.json').write_text(json.dumps(cfg));build.build()
        page=(self.root/'dist/index.html').read_text();self.assertIn('https://example.com/project/assets/screenshot.png',page)
        self.assertIn('Copyright (c) 2026 Max',(self.root/'LICENSE').read_text())
    def test_neutral_post(self):
        text=next((self.root/'posts').glob('*.md')).read_text()
        self.assertNotIn('in this web terminal',text);self.assertIn('installation instructions',text)

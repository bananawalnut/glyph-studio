import importlib.util
import json
import tempfile
from pathlib import Path

spec=importlib.util.spec_from_file_location('attach',Path(__file__).with_name('attach.py'))
attach=importlib.util.module_from_spec(spec);spec.loader.exec_module(attach)
with tempfile.TemporaryDirectory(prefix='glyph-attach-') as temporary:
    home=Path(temporary)/'home'
    connection=Path(temporary)/'connection.json'
    plan=attach.prepare(home,connection,dry_run=True)
    assert not home.exists() and plan['dry_run']
    attach.prepare(home,connection)
    config=json.loads((home/'config.yaml').read_text())
    assert config['platform_toolsets']['cli']==['hermes-cli','glyph_studio']
    assert config['plugins']['enabled']==['glyph-studio']
    assert (home/'plugins/glyph-studio/plugin.yaml').exists()
    assert (home/'skills/creative/glyph-studio/scripts/client.py').exists()
    assert (home/'skills/creative/glyph-studio/references/scene-contract.txt').exists()
    assert (home/'plugins/glyph-studio/connection.path').read_text().strip()==str(connection.resolve())
    config['model']={'provider':'keep-existing','default':'existing-model'}
    config['plugins']['enabled'].append('another-plugin')
    (home/'config.yaml').write_text(json.dumps(config))
    try:
        attach.prepare(home,connection)
        raise AssertionError('Existing install must not be overwritten without --replace')
    except ValueError:
        pass
    attach.prepare(home,connection,replace=True)
    try:
        import yaml
        updated=yaml.safe_load((home/'config.yaml').read_text())
    except ImportError:
        updated=json.loads((home/'config.yaml').read_text())
    assert updated['model']==config['model']
    assert 'another-plugin' in updated['plugins']['enabled']
    assert list((home/'.glyph-studio-backups').rglob('config.yaml'))
print('PASS dry-run, explicit-home installation, discoverable skill, config preservation, owned replacement and backups')

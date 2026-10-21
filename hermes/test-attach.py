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
    assert not (home/'SOUL.md').exists()
    (home/'SOUL.md').write_text('Preserve this identity in a backup')
    attach.prepare(home,connection,replace=True,designer_profile=True)
    assert (home/'SOUL.md').read_text()==(attach.ROOT/'plugin/glyph-studio/designer/SOUL.md').read_text()
    assert json.loads((home/'studio-designer.json').read_text())['id']=='glyph-studio-designer'
    assert any(p.read_text()=='Preserve this identity in a backup' for p in (home/'.glyph-studio-backups').rglob('SOUL.md'))
    for skill in ['glyph-surfaces','glyph-biomotion','glyph-review']:
        assert (home/'skills/creative'/skill/'SKILL.md').is_file()
    outside=Path(temporary)/'outside';outside.write_text('untouched')
    for name in ['SOUL.md','studio-designer.json']:
        target=home/name;previous=target.read_text();target.unlink();target.symlink_to(outside)
        before=(home/'config.yaml').read_text()
        try:
            attach.prepare(home,connection,replace=True,designer_profile=True)
            raise AssertionError('Identity symlinks must be rejected before installation')
        except ValueError:
            pass
        assert outside.read_text()=='untouched'
        assert (home/'config.yaml').read_text()==before
        target.unlink();target.write_text(previous)
print('PASS dry-run, explicit-home installation, discoverable skill, config preservation, four skills, opt-in identity/backup and symlink rejection')

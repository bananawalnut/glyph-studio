"""Install the local plugin + discoverable skill into an explicitly selected Hermes home."""
from __future__ import annotations
import argparse
import copy
import datetime
import json
import os
from pathlib import Path
import shutil
import tempfile

ROOT=Path(__file__).resolve().parent
MARKER='.glyph-studio-install.json'

def prepare(home, connection, platforms=None, replace=False, dry_run=False, designer_profile=False):
    home=Path(home).expanduser().resolve()
    connection=Path(connection).expanduser().resolve()
    config_path=home/'config.yaml'
    yaml=None
    if config_path.exists():
        try:
            import yaml
            config=yaml.safe_load(config_path.read_text()) or {}
        except ImportError:
            try:
                config=json.loads(config_path.read_text())
            except ValueError as error:
                raise ValueError('Use the Python environment installed with Hermes to preserve an existing YAML config.') from error
    else:
        config={}
    if not isinstance(config,dict):
        raise ValueError('Hermes config must be a mapping')
    updated=copy.deepcopy(config)
    plugins=updated.setdefault('plugins',{})
    if not isinstance(plugins,dict):
        raise ValueError('Existing plugins config is not a mapping')
    enabled=plugins.setdefault('enabled',[])
    if not isinstance(enabled,list):
        raise ValueError('Existing plugins.enabled must be a list')
    if 'glyph-studio' not in enabled:
        enabled.append('glyph-studio')
    if 'disabled' in plugins:
        if not isinstance(plugins['disabled'],list):
            raise ValueError('Existing plugins.disabled must be a list')
        plugins['disabled']=[x for x in plugins['disabled'] if x!='glyph-studio']
    toolsets=updated.setdefault('platform_toolsets',{})
    if not isinstance(toolsets,dict):
        raise ValueError('Existing platform_toolsets must be a mapping')
    for platform in platforms or ['cli']:
        if platform not in toolsets:
            if platform!='cli':
                raise ValueError(f'Configure {platform} in Hermes first; the adapter will not guess its default toolsets.')
            toolsets[platform]=['hermes-cli']
        if not isinstance(toolsets[platform],list):
            raise ValueError(f'Existing toolsets for {platform} must be a list')
        if 'glyph_studio' not in toolsets[platform]:
            toolsets[platform].append('glyph_studio')
    destinations=[(ROOT/'plugin'/'glyph-studio',home/'plugins'/'glyph-studio'),(ROOT/'plugin'/'glyph-studio'/'skills'/'glyph-studio',home/'skills'/'creative'/'glyph-studio')]
    for skill in ['glyph-surfaces','glyph-biomotion','glyph-review','glyph-flow']:
        destinations.append((ROOT/'plugin'/'glyph-studio'/'skills'/skill,home/'skills'/'creative'/skill))
    for source,dest in destinations:
        if dest.is_symlink() or not dest.resolve().is_relative_to(home):
            raise ValueError('Installation target must remain within the selected home')
        if dest.exists() and (not replace or not (dest/MARKER).exists()):
            raise ValueError(f'Target exists: {dest}. Use --replace only for an earlier Glyph Studio installation.')
    if designer_profile:
        for name in ['SOUL.md','studio-designer.json']:
            target=home/name
            if target.is_symlink() or (target.exists() and not target.is_file()):
                raise ValueError(f'{name} must be a regular file within the selected home')
    plan={'hermes_home':str(home),'plugin':str(destinations[0][1]),'skill':str(destinations[1][1]),'connection_file':str(connection),'platforms':platforms or ['cli'],'dry_run':dry_run,'provider_changed':False,'active_profile_changed':False,'designer_profile':designer_profile}
    if dry_run:
        return plan
    home.mkdir(parents=True,exist_ok=True)
    backup=home/'.glyph-studio-backups'/datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    if config_path.exists():
        backup.mkdir(parents=True,mode=0o700)
        shutil.copy2(config_path,backup/'config.yaml')
        os.chmod(backup/'config.yaml',0o600)
    for source,dest in destinations:
        dest.parent.mkdir(parents=True,exist_ok=True)
        staged=Path(tempfile.mkdtemp(prefix='.glyph-stage-',dir=dest.parent))
        try:
            shutil.copytree(source,staged,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc','connection.path'))
            (staged/MARKER).write_text(json.dumps({'package':'glyph-studio','version':1}))
            pointer=(staged/'scripts'/'connection.path') if source.parent.name=='skills' else (staged/'connection.path')
            pointer.parent.mkdir(parents=True,exist_ok=True)
            pointer.write_text(str(connection)+'\n');os.chmod(pointer,0o600)
            if dest.exists():
                old=backup/dest.relative_to(home);old.parent.mkdir(parents=True,exist_ok=True);dest.rename(old)
            staged.rename(dest)
        finally:
            if staged.exists():
                shutil.rmtree(staged)
    if designer_profile:
        for name,source in [('SOUL.md','SOUL.md'),('studio-designer.json','profile.json')]:
            target=home/name
            if target.exists():
                backup.mkdir(parents=True,exist_ok=True,mode=0o700)
                shutil.copy2(target,backup/name)
            fd,temporary=tempfile.mkstemp(prefix='.glyph-identity-',dir=home)
            try:
                with os.fdopen(fd,'w') as stream:
                    stream.write((ROOT/'plugin/glyph-studio/designer'/source).read_text())
                Path(temporary).replace(target)
            finally:
                Path(temporary).unlink(missing_ok=True)
    content=yaml.safe_dump(updated,sort_keys=False) if yaml else json.dumps(updated,indent=2)+'\n'
    temporary=config_path.with_suffix('.yaml.glyph-tmp')
    temporary.write_text(content);os.chmod(temporary,0o600);temporary.replace(config_path)
    return plan

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--home',required=True,help='Exact Hermes home or profile directory. No implicit default.')
    parser.add_argument('--connection',required=True,help='Bridge connection.json path; its credential is never copied.')
    parser.add_argument('--platform',action='append',dest='platforms',help='Enable on an existing gateway platform as well; repeat as needed. Default: cli.')
    parser.add_argument('--replace',action='store_true')
    parser.add_argument('--designer-profile',action='store_true',help='Install Studio Designer identity in this exact home; back up an existing SOUL.md')
    parser.add_argument('--dry-run',action='store_true')
    args=parser.parse_args()
    try:
        print(json.dumps(prepare(args.home,args.connection,args.platforms,args.replace,args.dry_run,args.designer_profile),indent=2))
    except (ValueError,OSError) as error:
        parser.exit(1,str(error)+'\n')

if __name__=='__main__':
    main()

"""Run with Hermes' Python: tests its real loader/registry without inference."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile

root=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('glyph_attach',root/'attach.py')
attach=importlib.util.module_from_spec(spec);spec.loader.exec_module(attach)
with tempfile.TemporaryDirectory(prefix='glyph-native-') as temporary:
    directory=Path(temporary)
    process=subprocess.Popen(['node',str(root/'bridge.cjs'),'--port','0','--state-dir',str(directory/'bridge')],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    try:
        info=json.loads(process.stdout.readline())
        home=directory/'home';attach.prepare(home,info['connection_file'])
        os.environ['HERMES_HOME']=str(home)
        from hermes_cli.plugins import PluginManager
        from tools.registry import registry
        manager=PluginManager();plugin=home/'plugins'/'glyph-studio'
        manifest=manager._parse_manifest(plugin/'plugin.yaml',plugin,'user','')
        assert manifest is not None
        manager._load_plugin(manifest)
        loaded=manager._plugins['glyph-studio'];assert loaded.enabled,loaded.error
        assert len(loaded.tools_registered)==14
        assert manager._plugin_skills['glyph-studio:design']['path'].is_file()
        for skill in ['glyph-surfaces','glyph-biomotion','glyph-review','glyph-flow']:
            assert manager._plugin_skills['glyph-studio:'+skill]['path'].is_file()
        library=json.loads(registry.dispatch('glyph_studio_library',{'kind':'profile'}));assert library['profile']['id']=='glyph-studio-designer'
        audit=json.loads(registry.dispatch('glyph_studio_audit',{}));assert audit['valid'] and not audit['visualReview']
        flow=json.loads(registry.dispatch('glyph_flow_read',{}));assert flow['ok'] and len(flow['flow']['components'])==3
        validation=json.loads(registry.dispatch('glyph_flow_validate',{}));assert validation['valid']
        read=json.loads(registry.dispatch('glyph_studio_read',{}));assert read['ok'],read
        changed=json.loads(registry.dispatch('glyph_studio_update',{'kind':'surface','id':'body','changes':{'shape':'cylinder'},'expected_revision':read['revision']}));assert changed['ok'],changed
        assert changed['scene']['surfaces'][0]['shape']=='cylinder'
        preview=json.loads(registry.dispatch('glyph_studio_preview',{'frame':60,'expected_revision':changed['revision']}));assert preview['ok'],preview
        assert preview['view']['frame']==60
        print('PASS Hermes native manifest parsing, real plugin load, 14 registered tools, five bundled skills, library/audit and live scene/preview dispatch (no inference)')
    finally:
        process.terminate();process.communicate(timeout=10)

"""Tool definitions consumed by Hermes' native plugin registry."""
REV={'type':'integer','minimum':0,'description':'Scene revision returned by the last read. Writes fail if it is stale.'}
KIND={'type':'string','enum':['surface','object']}
def tool(name,description,properties,required=()):
    return {'name':name,'description':description,'parameters':{'type':'object','properties':properties,'required':list(required),'additionalProperties':False}}

# Explicit nested properties allow local JSON-constrained tool decoders to emit
# real patches. An untyped {type: object} can be constrained to an empty object.
import json
from pathlib import Path
from copy import deepcopy
SCENE=json.loads((Path(__file__).parent/'skills'/'glyph-studio'/'references'/'scene.schema.json').read_text())
OBJECT=SCENE['properties']['objects']['items']
SURFACE=SCENE['properties']['surfaces']['items']
def partial(schema):
    if isinstance(schema,list): return [partial(x) for x in schema]
    if not isinstance(schema,dict): return schema
    return {k:partial(v) for k,v in schema.items() if k!='required'}
PATCH=partial({'type':'object','properties':{**SURFACE['properties'],**OBJECT['properties']},'additionalProperties':False})
PATCH['properties'].pop('id',None)
DEFINITION=deepcopy(PATCH)
DEFINITION['properties']['id']=deepcopy(OBJECT['properties']['id'])
DEFINITION['required']=['id']

TOOLS=[
 tool('glyph_studio_audit','Read-only validation, loop warnings, sample counts and host dependencies for the saved recipe or candidate recipe_json. Does not render pixels, measure FPS or mutate the scene.',{'recipe_json':{'type':'string','maxLength':100000}}),
 tool('glyph_studio_library','Read the studio designer profile, a focused skill, available scene presets or Anima animal references. Omit id for a catalog. Presets are candidates, not applied edits; animal source geometry is not editable here.',{'kind':{'type':'string','enum':['profile','skill','preset','animal']},'id':{'type':'string','maxLength':100}},['kind']),
 tool('glyph_studio_read','Read the current local Glyph Studio recipe, scene revision, preview state and loop warnings.',{}),
 tool('glyph_studio_compile','Compile scene directives into a validated candidate recipe. Read-only: does not change the scene.',{'directives':{'type':'string','maxLength':100000}},['directives']),
 tool('glyph_studio_apply','Replace the local scene with a complete validated recipe. Requires the current scene revision; stale writes are rejected.',{'scene':SCENE,'expected_revision':REV},['scene','expected_revision']),
 tool('glyph_studio_update','Update one named surface or glyph object. Deep-merges supplied fields, preserves other fields and objects, validates the result, and rejects stale writes. Arrays replace whole arrays; ids cannot be renamed.',{'kind':KIND,'id':{'type':'string'},'changes':PATCH,'expected_revision':REV},['kind','id','changes','expected_revision']),
 tool('glyph_studio_add','Add a surface or glyph object using renderer defaults plus supplied definition. A mapped object requires geometry.type=mapped and geometry.host naming an existing surface. Requires a unique id and current revision.',{'kind':KIND,'definition':DEFINITION,'expected_revision':REV},['kind','definition','expected_revision']),
 tool('glyph_studio_remove','Remove one named surface or glyph object. A surface still used by glyph layers cannot be removed. Requires the current revision.',{'kind':KIND,'id':{'type':'string'},'expected_revision':REV},['kind','id','expected_revision']),
 tool('glyph_studio_preview','Select a deterministic frame in the connected preview; pause by default. Returns per-object XYZ bounds, not a screenshot. Frame is zero-based and below round(duration*fps).',{'frame':{'type':'integer','minimum':0},'playing':{'type':'boolean'},'expected_revision':REV},['frame','expected_revision']),
]

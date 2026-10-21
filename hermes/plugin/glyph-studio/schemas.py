"""Tool definitions consumed by Hermes' native plugin registry."""
REV={'type':'integer','minimum':0,'description':'Current target revision returned by its last read; flow jobs use their draft revision. Stale writes fail.'}
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
 tool('glyph_flow_read','Read the functional flow document, revision, typed method interfaces, registry and invocation receipts. In studio flow jobs this reads the staged draft.',{}),
 tool('glyph_flow_validate','Read-only validation of current flow or candidate flow_json, including current states and contracts. No pixels or formal proof.',{'flow_json':{'type':'string','maxLength':100000}}),
 tool('glyph_flow_apply','Replace the flow with a complete validated data-only flow_json. Studio flow jobs stage this proposal; they commit once after completion if the starting revision is still current.',{'flow_json':{'type':'string','maxLength':100000},'expected_revision':REV},['flow_json','expected_revision']),
 tool('glyph_flow_edit','Add, merge-patch or remove a named component, connection, contract or obstacle. update flow changes root metadata/arrays. changes_json is JSON merge patch: null deletes keys, arrays replace. Studio edits are staged.',{'action':{'type':'string','enum':['add','update','remove']},'kind':{'type':'string','enum':['component','connection','contract','obstacle','flow']},'id':{'type':'string'},'changes_json':{'type':'string','maxLength':100000},'expected_revision':REV},['action','kind','expected_revision']),
 tool('glyph_flow_invoke','Stage a typed method invocation such as source.add(record). It is queued on proposal commit and animated by an open flow browser. Do not claim delivery until a browser receipt says arrived.',{'component':{'type':'string'},'method':{'type':'string'},'payload_json':{'type':'string','maxLength':100000},'request_id':{'type':'string','maxLength':80},'expected_revision':REV},['component','method','payload_json','request_id','expected_revision']),

 tool('glyph_studio_audit','Read-only validation, loop warnings, sample counts and host dependencies for the saved recipe or candidate recipe_json. Does not render pixels, measure FPS or mutate the scene.',{'recipe_json':{'type':'string','maxLength':100000}}),
 tool('glyph_studio_library','Read the programmer math API and example source (kind program), shared design-system catalog, object/motion/material/behavior presets, studio profile, focused skills, scene presets or Anima references. Omit id for a catalog. Presets are candidates, not applied edits; animal source geometry is not editable here.',{'kind':{'type':'string','enum':['profile','skill','preset','animal','program','design-system','object','motion','material','behavior']},'id':{'type':'string','maxLength':100}},['kind']),
 tool('glyph_studio_read','Read the current local Glyph Studio recipe, scene revision, preview state and loop warnings.',{}),
 tool('glyph_studio_compile','Compile scene directives into a validated candidate recipe. Read-only: does not change the scene.',{'directives':{'type':'string','maxLength':100000}},['directives']),
 tool('glyph_studio_apply','Replace the local scene with a complete validated recipe. Requires the current scene revision; stale writes are rejected.',{'scene':SCENE,'expected_revision':REV},['scene','expected_revision']),
 tool('glyph_studio_update','Update one named surface or glyph object. Deep-merges supplied fields, preserves other fields and objects, validates the result, and rejects stale writes. Arrays replace whole arrays; ids cannot be renamed.',{'kind':KIND,'id':{'type':'string'},'changes':PATCH,'expected_revision':REV},['kind','id','changes','expected_revision']),
 tool('glyph_studio_add','Add a surface or glyph object using renderer defaults plus supplied definition. A mapped object requires geometry.type=mapped and geometry.host naming an existing surface. Requires a unique id and current revision.',{'kind':KIND,'definition':DEFINITION,'expected_revision':REV},['kind','definition','expected_revision']),
 tool('glyph_studio_remove','Remove one named surface or glyph object. A surface still used by glyph layers cannot be removed. Requires the current revision.',{'kind':KIND,'id':{'type':'string'},'expected_revision':REV},['kind','id','expected_revision']),
 tool('glyph_studio_preview','Select a deterministic frame in the connected preview; pause by default. Returns per-object XYZ bounds, not a screenshot. Frame is zero-based and below round(duration*fps).',{'frame':{'type':'integer','minimum':0},'playing':{'type':'boolean'},'expected_revision':REV},['frame','expected_revision']),
]

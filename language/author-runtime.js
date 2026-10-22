/* Inlined once into each compiled component. No compiler or renderer dependency. */
function glyphAuthorRuntime() {
  'use strict';
  const schema = {
    number: (bounds = {}) => ({type:'number', ...bounds}),
    integer: (bounds = {}) => ({type:'integer', ...bounds}),
    string: (bounds = {}) => ({type:'string', ...bounds}),
    boolean: () => ({type:'boolean'}),
    null: () => ({type:'null'}),
    enum: (...values) => ({type:typeof values[0], enum:values}),
    array: (items, bounds = {}) => ({type:'array', items, ...bounds}),
    object: properties => ({type:'object', properties, required:Object.keys(properties), additionalProperties:false})
  };
  const methods = () => (input, output, handle, options = {}) => ({...options, input, output, handle});
  function defineGlyph(spec) {
    return Object.freeze({instantiate(A, F, overrides = {}) {
      if (!spec || typeof spec.build !== 'function') throw Error('Define a build(A, props) function.');
      const metadata = F.json({name:spec.name, description:spec.description, ...(spec.atomic ? {atomic:spec.atomic} : {})});
      if (typeof metadata.name !== 'string' || !metadata.name.trim() || metadata.name.length > 80 ||
          typeof metadata.description !== 'string' || metadata.description.length > 500 ||
          metadata.atomic && !['atom','molecule','organism','template','page'].includes(metadata.atomic))
        throw Error('Use a short name, description and optional atomic design classification.');
      const defaults = F.validate(F.contract(spec.props), spec.defaults);
      const patch = F.json(overrides);
      if (!patch || Array.isArray(patch) || typeof patch !== 'object') throw Error('Props must be an object.');
      const props = F.validate(F.contract(spec.props), {...defaults, ...patch});
      const program = spec.build(A, props);
      if (!(program instanceof A.Program)) throw Error('build must return a GlyphProgram.Program.');
      if (!spec.component) return {program, metadata, props};
      const c = spec.component, initial = c.initial(props);
      const component = F.definition({
        interface:new F.ComponentInterface({description:spec.description, state:c.state, methods:c.methods}),
        initial, organize:c.organize, motion:c.motion
      });
      const params = c.params ? state => c.params(state, props) : state => state;
      // Validate initial state and parameter mapping before the product escapes.
      program.setParams(params(component.initial));
      program.sample(0);
      return {program, component, params, metadata, props};
    }});
  }
  return {schema, methods, defineGlyph};
}
if (typeof module !== 'undefined' && module.exports) module.exports = glyphAuthorRuntime;

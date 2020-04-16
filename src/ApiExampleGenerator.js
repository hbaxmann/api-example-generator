import { LitElement } from 'lit-element';
import { AmfHelperMixin } from '@api-components/amf-helper-mixin/amf-helper-mixin.js';

const UNKNOWN_TYPE = 'unknown-type';
/**
 * `api-example-generator`
 *
 * Examples generator from AMF model.
 *
 * ## Data model
 *
 * The result of calling `generatePayloadsExamples()`, `generatePayloadExamples()`,
 * or `computeExamples()` is an array of view models.
 *
 * ### ExampleModel
 *
 * - **hasRaw** `Boolean` - if true then `raw` property has a value
 * - **hasTitle** `Boolean` - if true then `title` property has a value
 * - **hasUnion** `Boolean` - if true then `values` property has a value
 * - **value** `String`, Optional - Example to render
 * - **title** - `String`, Optional - Example name, only when `hasTitle` is set
 * - **raw** `String`, Optional - Raw value of RAML example. This value is a
 * YAML or JSON schema value. This is only set when raw value is available in
 * the model and it is not JSON/XML.
 * - **values** `Array<ExampleModel>`, Optional - Only when `hasUnion` is set.
 *
 * ## Usage
 *
 * To generate examples for a list payloads
 *
 * ```javascript
 * const supportedOperation = {...}; // definition of AMF supported operation
 * const payloads = getPayloads(supportedOperation); // Extract array of payloads from e.g. Expects
 * const mediaTypes = generator.listMedia(payloads);
 * const examples = generator.generatePayloadsExamples(payloads, mediaTypes[0]);
 * console.log(examples);
 * ```
 *
 * To generate examples from a payload
 *
 * ```javascript
 * const examples = generator.generatePayloadExamples(payloads[0], 'application/json');
 * console.log(examples);
 * ```
 *
 * To generate examples from any object to any mime
 *
 * ```javascript
 * const shape = getTypeDeclaration(); // gets type definition
 * const examples = generator.computeExamples(shape, 'application/json');
 * console.log(examples);
 * ```
 *
 * ## Processing options
 *
 * - `rawOnly` - list "raw" examples only.
 * - `noAuto` - Don't generate an example from object properties if the example is
 * not defined in API file.
 * - `typeName` - Processed type name, used for XML types to use right XML element wrapper name.
 *
 * @customElement
 * @demo demo/index.html
 * @memberof ApiElements
 * @appliesMixin AmfHelperMixin
 */
export class ApiExampleGenerator extends AmfHelperMixin(LitElement) {
  /**
   * Lists media types names for payloads.
   * The `payloads` is an array of AMF Payload shape. It can be single Payload
   * shape as a convenient method for compact model.
   *
   * @param {Array<Object>|Object} payloads List of payloads AMF's Request shape.
   * @return {Array<String>|undefined} Returns a list of mime types or undefined
   * if not found.
   */
  listMedia(payloads) {
    if (!payloads) {
      return;
    }
    if (!(payloads instanceof Array)) {
      if (!this._hasType(payloads, this.ns.aml.vocabularies.apiContract.Payload)) {
        return;
      }
      return [this._getValue(payloads, this.ns.aml.vocabularies.core.mediaType)];
    }
    const result = [];
    for (let i = 0; i < payloads.length; i++) {
      const payload = this._resolve(payloads[i]);
      const mime = this._getValue(payload, this.ns.aml.vocabularies.core.mediaType);
      result[result.length] = mime;
    }
    return result;
  }
  /**
   * Generates a list of examples from an AMF Payloads array for a given media type.
   * The shape can be an Example in which case it will return the example value.
   * If the shape is other shape than Example shape then it looks for examples array and
   * use it to generate values. Otherwise it tries to generate an example from
   * object properties (if object).
   *
   * @param {Array<Object>|Object} payloads List of payloads to process.
   * @param {String} media A media to for which to generate the examles.
   * @param {Object} opts Generation options:
   * - noAuto `Boolean` - When set it only returns examples defined in API spec file.
   * When not set it generates examples from properties when the example is not
   * defined.
   * - type `String` - Type name of an union type. If not set it uses first type
   * - typeName `String` - When generating XML example name of the type to use as main node.
   * @return {String|undefined} Example value.
   */
  generatePayloadsExamples(payloads, media, opts) {
    if (!opts) {
      opts = {};
    }
    if (!payloads || !media && !opts.rawOnly) {
      return;
    }
    if (!(payloads instanceof Array)) {
      payloads = [payloads];
    }
    let result;
    for (let i = 0, len = payloads.length; i < len; i++) {
      const payload = payloads[i];
      const payloadMedia = this._getValue(payload, this.ns.aml.vocabularies.core.mediaType);
      if (media && payloadMedia !== media) {
        continue;
      }
      result = this.generatePayloadExamples(payload, media, opts);
      break;
    }
    return result;
  }
  /**
   * Generates a list of examples for a single AMF Payload shape.
   * @param {Object} payload AMF Payload shape.
   * @param {String} mime A mime type to use.
   * @param {Object} opts Generation options. See `generatePayloadsExamples()`.
   * @return {Array<Object>|undefined} List of examples.
   */
  generatePayloadExamples(payload, mime, opts) {
    if (!this._hasType(payload, this.ns.aml.vocabularies.apiContract.Payload)) {
      return;
    }
    this._resolve(payload);
    const sKey = this._getAmfKey(this.ns.aml.vocabularies.shapes.schema);
    let schema = payload[sKey];
    if (!schema) {
      return;
    }
    if (schema instanceof Array) {
      schema = schema[0];
    }
    opts.typeId = payload['@id'];
    return this.computeExamples(schema, mime, opts);
  }
  /**
   * Computes examples from an AMF shape.
   * It returns examples defined in API spec file. If examples are not defined
   * and `opts.noAuto` flag is not set then it generates an example value from
   * object properties (if an object represents scalar, object, union, or an array).
   *
   * @param {Object} schema Any AMF schema.
   * @param {String} mime Examples media type. Currently `application/json` and
   * `application/xml` are supported.
   * @param {Object} opts Generation options. See `generatePayloadsExamples()`.
   * Besides that, `opts.typeId` is required to compute examples for a payload.
   * The `typeId` is a value of `@id` of the Payload shape.
   * @return {Array<Object>|undefined}
   */
  computeExamples(schema, mime, opts) {
    if (!opts) {
      opts = {};
    }
    if (!schema || !mime && !opts.rawOnly) {
      return;
    }
    this._resolve(schema);
    if (!opts.typeName) {
      const typeName = this._getValue(schema, this.ns.w3.shacl.name);
      if (typeName && typeName.indexOf('amf_inline_type') !== 0) {
        opts.typeName = typeName;
      }
    }
    const eKey = this._getAmfKey(this.ns.aml.vocabularies.apiContract.examples);
    const examples = this._ensureArray(schema[eKey]);
    if (examples) {
      return this._computeFromExamples(examples, mime, opts);
    }
    const jsonSchema = this._readJsonSchema(schema);
    if (jsonSchema) {
      return this._exampleFromJsonSchema(schema, jsonSchema);
    }

    if (opts.rawOnly) {
      return;
    }
    if (this._hasType(schema, this.ns.aml.vocabularies.shapes.ArrayShape)) {
      const value = this._computeExampleArraySchape(schema, mime, opts);
      if (value) {
        return value;
      }
    }
    if (this._hasType(schema, this.ns.aml.vocabularies.apiContract.Example)) {
      const value = this._generateFromExample(schema, mime, opts);
      if (value) {
        return [value];
      }
    }

    if (this._hasType(schema, this.ns.aml.vocabularies.shapes.UnionShape)) {
      return this._computeUnionExamples(schema, mime, opts);
    }

    if (opts.noAuto) {
      return;
    }

    if (this._hasType(schema, this.ns.aml.vocabularies.shapes.ScalarShape)) {
      const result = this._computeJsonScalarValue(schema);
      return [{
        hasRaw: false,
        hasTitle: false,
        hasUnion: false,
        value: result,
        isScalar: true
      }];
    }

    const pKey = this._getAmfKey(this.ns.w3.shacl.property);
    const properties = this._ensureArray(schema[pKey]);
    if (properties && properties.length) {
      const value = this._exampleFromProperties(properties, mime, opts.typeName, opts.parentName);
      if (value) {
        return [value];
      }
    }
  }
  /**
   * Reads a raw value of JSON schema if available.
   * @param {Object} schema Schema shape of a type.
   * @return {String|undefined} JSON schema if exists.
   */
  _readJsonSchema(schema) {
    const sourceKey = this._getAmfKey(this.ns.raml.vocabularies.docSourceMaps.sources);
    const trackedKey = this._getAmfKey(this.ns.raml.vocabularies.docSourceMaps.parsedJsonSchema);
    const valueKey = this._getAmfKey(this.ns.raml.vocabularies.docSourceMaps.value);
    let sm = schema[sourceKey];
    if (!sm) {
      return;
    }
    if (sm instanceof Array) {
      sm = sm[0];
    }
    let tracked = sm[trackedKey];
    if (!tracked) {
      return;
    }
    if (tracked instanceof Array) {
      tracked = tracked[0];
    }
    return this._getValue(tracked, valueKey);
  }
  /**
  * Computes examples value from a list of examples.
   * @param {Array<Object>} examples List of AMF Example schapes.
   * @param {String} mime Examples media type. Currently `application/json` and
   * `application/xml` are supported.
   * @param {Object} opts Generation options. See `generatePayloadsExamples()`.
   * Besides that, `opts.typeId` is required to compute examples for a payload.
   * The `typeId` is a value of `@id` of the Payload shape.
   * @return {Array<Object>|undefined}
   */
  _computeFromExamples(examples, mime, opts) {
    examples = this._processExamples(examples);
    examples = this._listTypeExamples(examples, opts.typeId);
    if (!examples) {
      return;
    }
    const result = [];
    for (let i = 0; i < examples.length; i++) {
      const shape = examples[i];
      const value = this._generateFromExample(shape, mime, opts);
      if (value) {
        result[result.length] = value;
      }
    }
    return result;
  }
  /**
   * In AMF 4 the examples model changes from being an array of examples
   * to an object that contains an array of examples.
   * This function extracts the array of examples back to the `examples` variable,
   * respecting that the compact model can be an object instead of array.
   * If the argument is an array with more than one item it means it's pre-4.0.0
   * model.
   * @param {Array|Object} examples Examples model.
   * @return {Array|undefined} List of examples to process.
   */
  _processExamples(examples) {
    // @TODO: should it be `document.examples` or `apiContract.examples`
    const key = this._getAmfKey(this.ns.aml.vocabularies.apiContract.examples);
    if (!(examples instanceof Array)) {
      if (this._hasType(examples, this.ns.aml.vocabularies.document.NamedExamples)) {
        return this._ensureArray(examples[key]);
      }
      return;
    }
    if (examples.length === 1 && this._hasType(examples[0], this.ns.aml.vocabularies.document.NamedExamples)) {
      return this._ensureArray(examples[0][key]);
    }
    return examples;
  }
  /**
   * Uses Example shape's source maps to determine which examples should be rendered.
   * @param {Array<Object>} examples List of AMF Example schapes.
   * @param {String} typeId Payload ID
   * @return {Array<Object>|undefined}
   */
  _listTypeExamples(examples, typeId) {
    if (!typeId) {
      return examples;
    }
    const result = [];
    const sourceKey = this._getAmfKey(this.ns.raml.vocabularies.docSourceMaps.sources);
    const trackedKey = this._getAmfKey(this.ns.raml.vocabularies.docSourceMaps.trackedElement);
    const valueKey = this._getAmfKey(this.ns.raml.vocabularies.docSourceMaps.value);
    const longId = typeId.indexOf('amf') === -1 ? ('amf://id' + typeId) : typeId;
    for (let i = 0, len = examples.length; i < len; i++) {
      let example = examples[i];
      if (example instanceof Array) {
        example = example[0];
      }
      let sm = example[sourceKey];
      if (!sm) {
        result[result.length] = example;
        continue;
      }
      if (sm instanceof Array) {
        sm = sm[0];
      }
      let tracked = sm[trackedKey];
      if (!tracked) {
        result[result.length] = example;
        continue;
      }
      if (tracked instanceof Array) {
        tracked = tracked[0];
      }
      const value = this._getValue(tracked, valueKey);
      if (!value) {
        continue;
      }
      const ids = value.split(',');
      if (ids.indexOf(longId) !== -1 || ids.indexOf(typeId) !== -1) {
        result[result.length] = example;
      }
    }
    return result.length ? result : undefined;
  }
  /**
   * Generate an example from an example shape.
   *
   * @param {Object} example Resolved example.
   * @param {String} mime Example content type.
   * @param {?Object} opts Processing options.
   * @return {String|undefined}
   */
  _generateFromExample(example, mime, opts) {
    let raw = this._getValue(example, this.ns.aml.vocabularies.document.raw);
    if (!raw) {
      raw = this._getValue(example, this.ns.w3.shacl.raw);
    }
    let title = this._getValue(example, this.ns.aml.vocabularies.core.name);
    if (title && title.indexOf('example_') === 0) {
      title = undefined;
    }
    const hasRaw = !!raw;
    const result = {};
    result.hasTitle = !!title;
    result.hasUnion = false;
    if (result.hasTitle) {
      result.title = title;
    }
    if (opts.rawOnly && !raw) {
      return;
    }
    if (opts.rawOnly) {
      result.hasRaw = false;
      result.value = raw;
      result.isScalar = false;
      return result;
    }
    const isJson = mime.indexOf('json') !== -1;
    const isXml = !isJson && mime.indexOf('xml') !== -1;
    if (hasRaw) {
      if (isJson) {
        try {
          const res = JSON.parse(raw);
          const type = typeof res;
          if (type === 'string' || type === 'number' || type === 'boolean') {
            throw new Error('');
          }
          result.hasRaw = false;
          result.value = raw;
          result.isScalar = false;
          return result;
        } catch (_) {
          // ...
        }
      }
      if (isXml) {
        if (raw.trim()[0] === '<') {
          result.hasRaw = false;
          result.value = raw;
          result.isScalar = false;
          return result;
        }
      }
      result.hasRaw = true;
      result.raw = raw;
    }
    const sKey = this._getAmfKey(this.ns.aml.vocabularies.document.structuredValue);
    let structure = example[sKey];
    if (!structure) {
      if (result.raw) {
        result.value = result.raw;
      } else {
        result.value = '';
      }
      result.isScalar = false;
      return result;
    }
    if (structure instanceof Array) {
      structure = structure[0];
    }
    if (this._hasType(structure, this.ns.aml.vocabularies.data.Scalar)) {
      const value = this._getTypedValue(structure);
      result.value = value;
      result.isScalar = true;
      return result;
    }

    result.isScalar = false;
    if (isJson) {
      let data = this._jsonFromStructure(structure);
      if (data) {
        if (typeof data === 'object') {
          data = JSON.stringify(data, null, 2);
        }
        result.value = data;
        return result;
      }
    } else if (isXml) {
      const data = this._xmlFromStructure(structure, opts);
      result.value = data;
      return result;
    } else {
      if (result.raw) {
        result.value = result.raw;
      } else {
        result.value = '';
      }
      return result;
    }
  }

  _computeExampleArraySchape(schema, mime, opts) {
    const iKey = this._getAmfKey(this.ns.aml.vocabularies.shapes.items);
    const items = this._ensureArray(schema[iKey]);
    if (!items) {
      return;
    }
    const isJson = mime.indexOf('json') !== -1;
    opts = opts || {};
    opts.parentName = opts.typeName;
    delete opts.typeName;
    // We need only first type here as arras can have different types
    for (let i = 0, len = items.length; i < len; i++) {
      const item = items[i];
      const result = this.computeExamples(item, mime, opts);
      if (result) {
        if (isJson) {
          this._processJsonArrayExamples(result);
        }
        return result;
      }
    }
  }
  /**
   * Processes JSON examples that should be an arrays and adds brackets
   * if nescesary. When the example is empty string it adds empty string literal
   * to the example value.
   * It does the same for unions which has array of values.
   * @param {Array<Object>} examples
   */
  _processJsonArrayExamples(examples) {
    for (let i = 0; i < examples.length; i++) {
      const item = examples[i];
      if (item.values) {
        if (item.values[0].value !== undefined && item.values[0].value[0] !== '[') {
          if (item.values[0].value === '') {
            item.values[0].value = '""';
          }
          item.values[0].value = `[${item.values[0].value}]`;
        }
      } else if (item.value !== undefined && item.value[0] !== '[') {
        if (item.value === '') {
          item.value = '""';
        }
        item.value = '[' + item.value + ']';
      }
    }
  }

  _computeUnionExamples(schema, mime, opts) {
    const key = this._getAmfKey(this.ns.aml.vocabularies.shapes.anyOf);
    const anyOf = this._ensureArray(schema[key]);
    if (!anyOf) {
      return;
    }
    const result = {
      hasTitle: false,
      hasRaw: false,
      hasUnion: true,
      values: []
    };
    for (let i = 0, len = anyOf.length; i < len; i++) {
      let unionSchape = anyOf[i];
      if (unionSchape instanceof Array) {
        unionSchape = unionSchape[0];
      }
      this._resolve(unionSchape);
      let data = this.computeExamples(unionSchape, mime, opts);
      if (!data) {
        continue;
      }
      data = data[0];
      let name = this._getValue(unionSchape, this.ns.w3.shacl.name);
      if (!name) {
        name = 'Union #' + (i + 1);
      }
      data.hasTitle = true;
      data.title = name;
      result.values[result.values.length] = data;
    }
    return result.values.length ? [result] : undefined;
  }
  /**
   * Computes value from defined `datatype` property.
   * @param {Object} shape A shape with `datatype` property.
   * @return {String|undefined} Value of the data type.
   */
  _computeScalarType(shape) {
    const dtKey = this._getAmfKey(this.ns.w3.shacl.datatype);
    let dt = shape[dtKey];
    if (!dt) {
      return;
    }
    if (dt instanceof Array) {
      dt = dt[0];
    }
    let id = dt['@id'] ? dt['@id'] : dt;
    const w3index = id.indexOf(this.ns.w3.xmlSchema + '');
    if (w3index !== -1) {
      id = id.substr((this.ns.w3.xmlSchema + '').length);
    }
    const shapeindex = id.indexOf(this.ns.aml.vocabularies.shapes + '');
    if (shapeindex !== -1) {
      id = id.substr((this.ns.aml.vocabularies.shapes + '').length);
    }
    const index = id.indexOf(':');
    if (index !== -1) {
      id = id.substr(index);
    }
    return id[0].toUpperCase() + id.substr(1);
  }
  /**
   * Creates a JSON example representation from AMF example's structure
   * definition.
   * @param {Object} structure
   * @return {any}
   */
  _jsonFromStructure(structure) {
    if (!structure) {
      return;
    }
    if (this._hasType(structure, this.ns.aml.vocabularies.data.Scalar)) {
      return this._getTypedValue(structure);
    }
    let obj;
    let isArray = false;
    if (this._hasType(structure, this.ns.aml.vocabularies.data.Object)) {
      obj = {};
    } else if (this._hasType(structure, this.ns.aml.vocabularies.data.Array)) {
      obj = [];
      isArray = true;
    } else {
      return;
    }
    if (isArray && this._hasProperty(structure, this.ns.w3.rdfSchema.member)) {
      const key = this._getAmfKey(this.ns.w3.rdfSchema.member);
      const items = structure[key];
      for (let i = 0, len = items.length; i < len; i++) {
        const item = items[i];
        this._jsonFromStructureValue(item, obj, isArray);
      }
    } else {
      const resolvedPrefix = this._getAmfKey(this.ns.aml.vocabularies.data);
      Object.keys(structure).forEach((key) => {
        if (key.indexOf(resolvedPrefix) !== 0) {
          return;
        }
        const v = structure[key];
        this._jsonFromStructureValue(v, obj, isArray, key, resolvedPrefix);
      });
    }
    return obj;
  }

  _jsonFromStructureValue(value, obj, isArray, key, resolvedPrefix) {
    if (value instanceof Array) {
      value = value[0];
    }
    const tmp = this._jsonFromStructure(value);
    if (tmp === undefined) {
      // it can be false or null
      return;
    }
    if (isArray) {
      obj[obj.length] = tmp;
    } else {
      key = key.replace(resolvedPrefix, '');
      if (key[0] === ':') {
        key = key.substr(1);
      }
      try {
        key = decodeURIComponent(key);
      } catch (_) {
        // ...
      }
      obj[key] = tmp;
    }
  }

  _xmlFromStructure(structure, opts) {
    let typeName = opts && opts.typeName || UNKNOWN_TYPE;
    typeName = this._normalizeXmlTagName(typeName);
    const doc = document.implementation.createDocument('', typeName, null);
    const main = doc.documentElement;
    const keys = Object.keys(structure);
    const dataPrefix = this._getAmfKey(this.ns.aml.vocabularies.data);
    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i];
      if (key.indexOf(dataPrefix) !== 0) {
        continue;
      }
      let item = structure[key];
      if (item instanceof Array) {
        item = item[0];
      }
      const name = this._dataNameFromKey(key);
      this._xmlProcessDataProperty(doc, main, item, name);
    }
    const s = new XMLSerializer();
    let value = s.serializeToString(doc);
    value = '<?xml version="1.0" encoding="UTF-8"?>' + value;
    return this.formatXml(value);
  }
  /**
   * Formats XML string into pretty printed value.
   * https://stackoverflow.com/a/2893259/1127848
   * @param {String} xml The XML to process
   * @return {String} Formatted XML
   */
  formatXml(xml) {
    const reg = /(>)\s*(<)(\/*)/g; // updated Mar 30, 2015
    const wsexp = / *(.*) +\n/g;
    const contexp = /(<.+>)(.+\n)/g;
    xml = xml.replace(reg, '$1\n$2$3').replace(wsexp, '$1\n').replace(contexp, '$1\n$2');
    let formatted = '';
    const lines = xml.split('\n');
    let indent = 0;
    let lastType = 'other';
    // 4 types of tags - single, closing, opening, other (text, doctype, comment) - 4*4 = 16 transitions
    const transitions = {
      'single->single': 0,
      'single->closing': -2,
      'single->opening': 0,
      'single->other': 0,
      'closing->single': 0,
      'closing->closing': -2,
      'closing->opening': 0,
      'closing->other': 0,
      'opening->single': 2,
      'opening->closing': 0,
      'opening->opening': 2,
      'opening->other': 2,
      'other->single': 0,
      'other->closing': -2,
      'other->opening': 0,
      'other->other': 0
    };

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (ln.match(/\s*<\?xml/)) {
        formatted += ln + '\n';
        continue;
      }
      const single = Boolean(ln.match(/<.+\/>/));
      const closing = Boolean(ln.match(/<\/.+>/));
      const opening = Boolean(ln.match(/<[^!].*>/));
      const type = single ? 'single' : closing ? 'closing' : opening ? 'opening' : 'other';
      const fromTo = lastType + '->' + type;
      lastType = type;
      let padding = '';
      indent += transitions[fromTo];
      for (let j = 0; j < indent; j++) {
        padding += ' ';
      }
      if (fromTo == 'opening->closing') {
        formatted = formatted.substr(0, formatted.length - 1) + ln + '\n';
      } else {
        formatted += padding + ln + '\n';
      }
    }
    return formatted;
  }

  _getTypedValue(structure) {
    const key = this._getAmfKey(this.ns.aml.vocabularies.data.value);
    let shape = structure[key];
    if (!shape) {
      return;
    }
    if (shape instanceof Array) {
      shape = shape[0];
    }
    const value = typeof shape === 'object' ? shape['@value'] : shape;
    if (!value) {
      return value;
    }
    let dt = shape['@type'];
    if (!dt) {
      const dtKey = this._getAmfKey(this.ns.w3.shacl.datatype);
      dt = this._ensureArray(structure[dtKey]);
      if (dt) {
        dt = dt[0]['@id'];
      }
    }
    if (!dt) {
      return value || '';
    }
    if (dt instanceof Array) {
      dt = dt[0];
    }
    return this._typeToValue(value, dt);
  }
  /**
   * Creates a example structure for the JSON schema.
   * Old but still in use.
   * @param {Object} schema AMF schema schape
   * @param {String} jsonSchema Raw JSON schema value
   * @return {Array<Object>} Generated example model.
   */
  _exampleFromJsonSchema(schema, jsonSchema) {
    const pKey = this._getAmfKey(this.ns.w3.shacl.property);
    const properties = this._ensureArray(schema[pKey]);
    let example;
    if (properties && properties.length) {
      const typeName = this._getValue(schema, this.ns.w3.shacl.name) || UNKNOWN_TYPE;
      example = this._exampleFromProperties(properties, 'application/json', typeName);
    }
    if (example) {
      example.hasRaw = true;
      example.raw = jsonSchema;
    } else {
      example = {
        hasRaw: false,
        hasTitle: false,
        hasUnion: false,
        value: jsonSchema
      };
    }
    return [example];
  }
  /**
   * Creates an example from RAML type properties.
   * @param {Array} properties
   * @param {String} mime Media type
   * @param {?String} typeName Name of the RAML type.
   * @param {?String} parentType For XML processing, parent type name in case of Array type.
   * @return {String|undefined}
   */
  _exampleFromProperties(properties, mime, typeName, parentType) {
    typeName = typeName || UNKNOWN_TYPE;
    let result;
    if (mime.indexOf('json') !== -1) {
      const value = this._jsonExampleFromProperties(properties);
      if (value) {
        result = JSON.stringify(value, null, 2);
      }
    } else if (mime.indexOf('xml') !== -1) {
      result = this._xmlExampleFromProperties(properties, typeName, parentType);
      if (result) {
        result = '<?xml version="1.0" encoding="UTF-8"?>' + result;
        result = this.formatXml(result);
      }
    }
    if (result) {
      return {
        hasRaw: false,
        hasTitle: false,
        hasUnion: false,
        value: result
      };
    }
  }
  /**
   * Generates a JSON example from RAML's type properties.
   * @param {Array} properties List of type properties
   * @return {String|undefined}
   */
  _jsonExampleFromProperties(properties) {
    const result = {};
    for (let i = 0, len = properties.length; i < len; i++) {
      const property = properties[i];
      const name = this._getValue(property, this.ns.w3.shacl.name);
      if (!name) {
        continue;
      }
      const rKey = this._getAmfKey(this.ns.aml.vocabularies.shapes.range);
      let range = property[rKey];
      if (!range) {
        continue;
      }
      if (range instanceof Array) {
        range = range[0];
      }
      const eKey = this._getAmfKey(this.ns.aml.vocabularies.apiContract.examples);
      const examples = this._ensureArray(range[eKey]);
      if (examples) {
        const sKey = this._getAmfKey(this.ns.aml.vocabularies.document.structuredValue);
        examples.forEach((example) => {
          let structure = example[sKey];
          if (!structure) {
            result[name] = '';
            return;
          }
          if (structure instanceof Array) {
            structure = structure[0];
          }
          const data = this._jsonFromStructure(structure);
          if (data !== undefined) {
            result[name] = data;
          }
        });
      } else {
        let value = this._computeJsonProperyValue(range);
        if (value === undefined) {
          value = '';
        }
        result[name] = value;
      }
    }
    return result;
  }
  /**
   * Computes JSON value from a range shape.
   * @param {Object} range AMF's range model.
   * @param {?String} typeName Optional, type name to use in Union type. By default first NodeShape.
   * @return {any}
   */
  _computeJsonProperyValue(range, typeName) {
    if (this._hasType(range, this.ns.aml.vocabularies.shapes.ScalarShape)) {
      return this._computeJsonScalarValue(range);
    }
    if (this._hasType(range, this.ns.aml.vocabularies.shapes.UnionShape)) {
      return this._computeJsonUnionValue(range, typeName);
    }
    if (this._hasType(range, this.ns.w3.shacl.NodeShape)) {
      return this._computeJsonObjectValue(range);
    }
    if (this._hasType(range, this.ns.aml.vocabularies.shapes.ArrayShape)) {
      return this._computeJsonArrayValue(range);
    }
    if (this._hasType(range, this.ns.aml.vocabularies.shapes.NilShape)) {
      return null;
    }
  }
  _computeJsonScalarValue(range) {
    const value = this._getTypeScalarValue(range);
    if (!value) {
      // This is to work with mocking services when the user just want to send an
      // example value to the server. This ensures valid input from the client
      // even of this alters the `default` value for the API (when one does not
      // exist)
      const type = this._computeScalarType(range);
      switch (type) {
        case 'Number':
        case 'Integer':
        case 'Long':
        case 'Float':
        case 'Double': return 0;
        case 'Boolean': return false;
        case 'Nil':
        case 'Null': return null;
        default: return '';
      }
    }
    const dtKey = this._getAmfKey(this.ns.w3.shacl.datatype);
    let dt = range[dtKey];
    if (!dt) {
      return value || '';
    }
    if (dt instanceof Array) {
      dt = dt[0];
    }
    return this._typeToValue(value, dt['@id']);
  }
  /**
   * Casts the value to given data type represented in AMF notation.
   * @param {String} value Value encoded in AMF
   * @param {String} type AMF data type
   * @return {String|Number|Boolean} Casted value.
   */
  _typeToValue(value, type) {
    switch (type) {
      case this._getAmfKey(this.ns.w3.xmlSchema.boolean):
      case this._getAmfKey(this.ns.aml.vocabularies.shapes.boolean):
      case this.ns.w3.xmlSchema.boolean:
      case this.ns.aml.vocabularies.shapes.boolean:
        if (value !== undefined) {
          return value === 'true' ? true : false;
        }
        return value;

      case this._getAmfKey(this.ns.w3.xmlSchema.nil):
      case this._getAmfKey(this.ns.aml.vocabularies.shapes.nil):
      case this.ns.w3.xmlSchema.nil:
      case this.ns.aml.vocabularies.shapes.nil:
        return null;
      case this._getAmfKey(this.ns.w3.xmlSchema.integer):
      case this._getAmfKey(this.ns.aml.vocabularies.shapes.integer):
      case this.ns.w3.xmlSchema.integer:
      case this.ns.aml.vocabularies.shapes.integer:
      case this.ns.w3.xmlSchema.number:
      case this._getAmfKey(this.ns.aml.vocabularies.shapes.number):
      case this.ns.aml.vocabularies.shapes.number:
      case this._getAmfKey(this.ns.w3.xmlSchema.long):
      case this.ns.w3.xmlSchema.long:
      case this._getAmfKey(this.ns.aml.vocabularies.shapes.long):
      case this.ns.aml.vocabularies.shapes.long:
      case this._getAmfKey(this.ns.w3.xmlSchema.double):
      case this.ns.w3.xmlSchema.double:
      case this._getAmfKey(this.ns.aml.vocabularies.shapes.double):
      case this.ns.aml.vocabularies.shapes.double:
      case this._getAmfKey(this.ns.w3.xmlSchema.float):
      case this.ns.w3.xmlSchema.float:
      case this._getAmfKey(this.ns.aml.vocabularies.shapes.float):
      case this.ns.aml.vocabularies.shapes.float:
        if (value) {
          if (isNaN(value)) {
            return 0;
          }
          return Number(value);
        }
        return 0;
      default: return value || '';
    }
  }
  /**
   * Computes JSON example from UnionShape
   * @param {Object} range Type definition
   * @param {?String} typeName Optional, type name to use. By default first NodeShape.
   * @return {Object|undefined}
   */
  _computeJsonUnionValue(range, typeName) {
    const key = this._getAmfKey(this.ns.aml.vocabularies.shapes.anyOf);
    const list = this._ensureArray(range[key]);
    if (!list) {
      return;
    }
    const pKey = this._getAmfKey(this.ns.w3.shacl.property);
    for (let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      if (item instanceof Array) {
        item = item[0];
      }
      this._resolve(item);
      if (typeName) {
        const name = this._getValue(item, this.ns.w3.shacl.name);
        if (typeName !== name) {
          continue;
        }
      }
      if (this._hasType(item, this.ns.w3.shacl.NodeShape)) {
        item = this._resolve(item);
        const data = this._ensureArray(item[pKey]);
        if (data) {
          return this._jsonExampleFromProperties(data);
        }
      }
    }
  }

  _computeJsonObjectValue(range) {
    const pKey = this._getAmfKey(this.ns.w3.shacl.property);
    const properties = this._ensureArray(range[pKey]);
    if (properties && properties.length) {
      return this._jsonExampleFromProperties(properties);
    }
  }

  _computeJsonArrayValue(range) {
    const key = this._getAmfKey(this.ns.aml.vocabularies.shapes.items);
    const items = this._ensureArray(range[key]);
    if (!items) {
      return;
    }
    const result = [];
    for (let i = 0, len = items.length; i < len; i++) {
      let item = items[i];
      if (item instanceof Array) {
        item = item[0];
      }
      this._resolve(item);
      const value = this._computeJsonProperyValue(item);
      if (value !== undefined) {
        result[result.length] = value;
      }
    }
    return result;
  }

  _extractExampleRawValue(example) {
    if (example instanceof Array) {
      example = example[0];
    }
    if (this._hasType(example, this.ns.aml.vocabularies.document.NamedExamples)) {
      const key = this._getAmfKey(this.ns.aml.vocabularies.apiContract.examples);
      example = example[key];
      if (example instanceof Array) {
        example = example[0];
      }
    }
    return this._getValue(example, this.ns.aml.vocabularies.document.raw);
  }
  /**
   * Gets a value from a Range shape for a scalar value.
   * @param {Object} range AMF's range model.
   * @return {any}
   */
  _getTypeScalarValue(range) {
    const dvKey = this._getAmfKey(this.ns.w3.shacl.defaultValue);
    let dv = range[dvKey];
    if (dv) {
      if (dv instanceof Array) {
        dv = dv[0];
      }
      return this._getValue(dv, this.ns.aml.vocabularies.data.value);
    }
    const rKey = this._getAmfKey(this.ns.aml.vocabularies.apiContract.examples);
    const ex = range[rKey];
    if (ex) {
      return this._extractExampleRawValue(ex);
    }
  }
  /**
   * Computes example from RAML type for XML media type.
   * @param {Array<Object>} properties
   * @param {?String} typeName RAML type name
   * @param {?String} parentType When the XML is an array type it is the parent type
   * @return {String}
   */
  _xmlExampleFromProperties(properties, typeName, parentType) {
    typeName = this._normalizeXmlTagName(typeName);
    if (parentType) {
      parentType = this._normalizeXmlTagName(parentType);
    }
    const doc = document.implementation.createDocument('', parentType || typeName, null);
    let main = doc.documentElement;
    if (parentType) {
      const element = doc.createElement(typeName);
      main.appendChild(element);
      main = element;
    }
    for (let i = 0, len = properties.length; i < len; i++) {
      this._xmlProcessProperty(doc, main, properties[i]);
    }
    const s = new XMLSerializer();
    return s.serializeToString(doc);
  }
  /**
   * Processes an XML property
   * @param {Document} doc Main document
   * @param {Element} node Current node
   * @param {Object} property AMF property
   */
  _xmlProcessProperty(doc, node, property) {
    if (!property) {
      return;
    }
    if (this._hasType(property, this.ns.w3.shacl.NodeShape)) {
      const pKey = this._getAmfKey(this.ns.w3.shacl.property);
      const properties = this._ensureArray(property[pKey]);
      if (!properties) {
        return;
      }
      for (let i = 0, len = properties.length; i < len; i++) {
        this._xmlProcessProperty(doc, node, properties[i]);
      }
      return;
    }
    const rKey = this._getAmfKey(this.ns.aml.vocabularies.shapes.range);
    let range = property[rKey];
    if (!range) {
      return;
    }
    if (range instanceof Array) {
      range = range[0];
    }
    const sKey = this._getAmfKey(this.ns.aml.vocabularies.shapes.xmlSerialization);
    let serialization = range[sKey];
    if (serialization instanceof Array) {
      serialization = serialization[0];
    }
    const eKey = this._getAmfKey(this.ns.aml.vocabularies.apiContract.examples);
    const examples = this._ensureArray(range[eKey]);
    if (examples && examples.length) {
      let name = this._getValue(serialization, this.ns.aml.vocabularies.shapes.xmlName);
      if (!name) {
        name = this._getValue(range, this.ns.w3.shacl.name);
      }
      this._xmlFromExamples(doc, node, examples[0], name);
      return;
    }
    if (this._hasType(range, this.ns.aml.vocabularies.shapes.UnionShape)) {
      const key = this._getAmfKey(this.ns.aml.vocabularies.shapes.anyOf);
      const list = this._ensureArray(range[key]);
      if (!list) {
        return;
      }
      const shape = list[0];
      if (this._hasType(shape, this.ns.aml.vocabularies.shapes.ScalarShape)) {
        this._xmlProcessUnionScalarProperty(doc, node, property, shape);
      } else {
        this._xmlProcessProperty(doc, node, shape);
      }
      return;
    }
    let isWrapped = false;
    if (serialization) {
      const isAtribute = this._getValue(serialization, this.ns.aml.vocabularies.shapes.xmlAttribute);
      if (isAtribute) {
        this._appendXmlAttribute(node, property, range, serialization);
        return;
      }
      isWrapped = this._getValue(serialization, this.ns.aml.vocabularies.shapes.xmlWrapped);
    }
    if (this._hasType(range, this.ns.w3.shacl.NodeShape)) {
      this._appendXmlElements(doc, node, property, range);
      return;
    }
    if (this._hasType(range, this.ns.aml.vocabularies.shapes.ArrayShape)) {
      this._appendXmlArray(doc, node, property, range, isWrapped);
      return;
    }
    this._appendXmlElement(doc, node, range);
  }
  /**
   * Appends XML example data to a node from an example defined on a "range"
   * property. This way it does not generate example values from type values
   * but uses object's example.
   *
   * @param {Document} doc XML document
   * @param {Node} node A node to which append values
   * @param {Object} example AMF's example definition.
   * @param {String} propertyName Name of the property being processed
   */
  _xmlFromExamples(doc, node, example, propertyName) {
    const sKey = this._getAmfKey(this.ns.aml.vocabularies.document.structuredValue);
    let structure = example[sKey];
    if (structure instanceof Array) {
      structure = structure[0];
    }
    if (!structure) {
      return;
    }
    this._xmlProcessDataProperty(doc, node, structure, propertyName);
  }
  /**
   * Reads property data type.
   * @param {Object} shape
   * @return {String} Data type
   */
  _readDataType(shape) {
    const dtKey = this._getAmfKey(this.ns.w3.shacl.datatype);
    let dataType = shape[dtKey];
    if (!dataType) {
      return;
    }
    if (dataType instanceof Array) {
      dataType = dataType[0];
    }
    dataType = dataType['@id'];
    return this._dataNameFromKey(dataType);
  }
  /**
   * Appends an attribute to the node from AMF property
   * @param {Element} node Current node
   * @param {Object} property AMF property
   * @param {Object} range AMF range
   * @param {Object} serialization Serialization info
   */
  _appendXmlAttribute(node, property, range, serialization) {
    let name = this._getValue(serialization, this.ns.aml.vocabularies.shapes.xmlName);
    if (!name) {
      name = this._getValue(range, this.ns.w3.shacl.name);
    }
    if (!name) {
      return;
    }
    if (name.indexOf('?') !== -1) {
      name = name.replace('?', '');
    }
    let value = this._readDataType(range);
    if (!value) {
      value = '';
    }
    node.setAttribute(name, value);
  }
  /**
   * Appends an element to the node tree from a type
   * @param {Document} doc Main document
   * @param {Element} node Current node
   * @param {Object} range AMF range
   * @return {Element} Newly created element
   */
  _appendXmlElement(doc, node, range) {
    let name = this._getValue(range, this.ns.w3.shacl.name);
    if (!name) {
      return;
    }
    let nodeValue = this._getValue(range, this.ns.w3.shacl.defaultValueStr);
    if (!nodeValue) {
      const eKey = this._getAmfKey(this.ns.aml.vocabularies.apiContract.examples);
      const example = range[eKey];
      if (example) {
        nodeValue = this._extractExampleRawValue(example);
      }
    }
    if (!nodeValue) {
      nodeValue = ' ';
      // Do not add default type name as users do not like this.
      // Mocking service would mark is as an error.
      // this._readDataType(range);
    }
    name = name.replace(/[^a-zA-Z0-9-]*/g, '');
    const element = doc.createElement(name);
    if (nodeValue) {
      const vn = doc.createTextNode(nodeValue);
      element.appendChild(vn);
    }
    node.appendChild(element);
    return element;
  }

  _appendXmlElements(doc, node, property, range) {
    const pKey = this._getAmfKey(this.ns.w3.shacl.property);
    const properties = this._ensureArray(range[pKey]);
    const element = this._appendXmlElement(doc, node, range);
    if (!properties) {
      return;
    }
    for (let i = 0, len = properties.length; i < len; i++) {
      this._xmlProcessProperty(doc, element, properties[i]);
    }
  }

  _appendXmlArray(doc, node, property, range, isWrapped) {
    if (isWrapped) {
      const element = this._appendXmlElement(doc, node, range);
      node.appendChild(element);
      node = element;
    }
    const pKey = this._getAmfKey(this.ns.aml.vocabularies.shapes.items);
    const properties = this._ensureArray(range[pKey]);
    if (!properties) {
      return;
    }
    for (let i = 0, len = properties.length; i < len; i++) {
      const prop = properties[i];
      if (isWrapped) {
        const name = this._getValue(prop, this.ns.w3.shacl.name);
        if (!name) {
          continue;
        }
        const element = doc.createElement(name);
        node.appendChild(element);
        node = element;
      }
      this._xmlProcessProperty(doc, node, properties[i]);
    }
  }

  _xmlProcessUnionScalarProperty(doc, node, property, shape) {
    const name = this._getValue(property, this.ns.w3.shacl.name) || 'unknown';
    const type = this._readDataType(shape);
    const element = doc.createElement(name);
    element.appendChild(doc.createTextNode(type));
  }
  /**
   * Normalizes given name to a value that can be accepted by `createElement`
   * function on a document object.
   * @param {String} name A name to process
   * @return {String} Normalized name
   */
  _normalizeXmlTagName(name) {
    return name.replace(/[^a-zA-Z0-9-_]/g, '');
  }
  /**
   * Processes XML property from a data shape.
   * @param {Document} doc Main document
   * @param {Element} node Current node
   * @param {Object} property AMF property
   * @param {String} name Current property name
   */
  _xmlProcessDataProperty(doc, node, property, name) {
    if (!property || !name) {
      return;
    }
    name = this._normalizeXmlTagName(name);
    const element = doc.createElement(name);
    if (this._hasType(property, this.ns.aml.vocabularies.data.Scalar)) {
      const value = this._computeStructuredExampleValue(property);
      if (value !== undefined) {
        const vn = doc.createTextNode(value);
        element.appendChild(vn);
      }
    } else if (this._hasType(property, this.ns.aml.vocabularies.data.Array)) {
      this._processDataArrayProperties(doc, element, property, name);
    } else if (this._hasType(property, this.ns.aml.vocabularies.data.Object)) {
      this._processDataObjectProperties(doc, element, property, name);
    } else if (property['@value']) {
      const vn = doc.createTextNode(property['@value']);
      node.appendChild(vn);
      // Skips adding new element
      return;
    }
    node.appendChild(element);
  }
  /**
   * Computes an example from example structured value.
   *
   * @param {Object} model `structuredValue` item model.
   * @return {Object|Array} Javascript object or array with structured value.
   * @deprecated Use `amf-excample-generator` for examples generation.
   */
  _computeExampleFromStructuredValue(model) {
    if (this._hasType(model, this.ns.aml.vocabularies.data.Scalar)) {
      return this._computeStructuredExampleValue(this._getValue(model, this.ns.aml.vocabularies.data.value));
    }
    const isObject = this._hasType(model, this.ns.aml.vocabularies.data.Object);
    const result = isObject ? {} : [];
    const modelKeys = ['@id', '@type'];
    Object.keys(model).forEach((key) => {
      if (modelKeys.indexOf(key) !== -1) {
        return;
      }
      const value = this._computeStructuredExampleValue(model[key][0]);
      if (isObject) {
        const name = key.substr(key.indexOf('#') + 1);
        result[name] = value;
      } else {
        result.push(value);
      }
    });
    return result;
  }
  /**
   * Computes value with propert data type for a structured example.
   * @param {Object} model Structured example item model.
   * @return {String|Boolean|Number} Value for the example.
   * @deprecated Use `amf-excample-generator` for examples generation.
   */
  _computeStructuredExampleValue(model) {
    if (!model) {
      return;
    }
    if (typeof model === 'string') {
      return model;
    }
    if (this._hasType(model, this.ns.aml.vocabularies.data.Scalar)) {
      const key = this._getAmfKey(this.ns.aml.vocabularies.data.value);
      const mValue = this._ensureArray(model[key])[0];
      const value = mValue['@value'];
      let type = mValue['@type'];
      if (!type) {
        const dtKey = this._getAmfKey(this.ns.w3.shacl.datatype);
        type = this._ensureArray(model[dtKey]);
        if (type) {
          type = type[0]['@id'];
        }
      }
      switch (type) {
        case this.ns.w3.xmlSchema.boolean:
          return value === 'true' ? true : false;
        case this.ns.w3.xmlSchema.integer:
        case this.ns.w3.xmlSchema.long:
        case this.ns.w3.xmlSchema.double:
        case this.ns.w3.xmlSchema.float:
        case this.ns.aml.vocabularies.shapes.number:
          return Number(value);
        default:
          return value;
      }
    }
    return this._computeExampleFromStructuredValue(model);
  }

  _processDataArrayProperties(doc, node, property, name) {
    let childName;
    if (name.substr(-2) === 'es') {
      childName = name.substr(0, name.length - 2);
    } else if (name.substr(-1) === 's') {
      childName = name.substr(0, name.length - 1);
    } else {
      childName = name;
    }
    const key = this._getAmfKey(this.ns.w3.rdfSchema.member);
    const items = this._ensureArray(property[key]);
    for (let i = 0, len = items.length; i < len; i++) {
      let item = items[i];
      if (item instanceof Array) {
        item = item[0];
      }
      this._xmlProcessDataProperty(doc, node, item, childName);
    }
  }

  _processDataObjectProperties(doc, node, property) {
    const prefix = this.ns.aml.vocabularies.data;
    const resolvedPrefix = this._getAmfKey(prefix);
    Object.keys(property).forEach((key) => {
      if (key.indexOf(resolvedPrefix) !== 0) {
        return;
      }
      let item = property[key];
      if (item instanceof Array) {
        item = item[0];
      }
      const name = this._dataNameFromKey(key);
      this._xmlProcessDataProperty(doc, node, item, name);
    });
  }

  _dataNameFromKey(key) {
    let index = key.indexOf('#');
    if (index !== -1) {
      key = key.substr(index + 1);
    } else {
      index = key.indexOf(':');
      if (index !== -1) {
        key = key.substr(index + 1);
      }
    }
    return key;
  }
}

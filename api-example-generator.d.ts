/**
 * DO NOT EDIT
 *
 * This file was automatically generated by
 *   https://github.com/Polymer/tools/tree/master/packages/gen-typescript-declarations
 *
 * To modify these typings, edit the source file(s):
 *   api-example-generator.html
 */

/// <reference path="../polymer/types/polymer-element.d.ts" />
/// <reference path="../amf-helper-mixin/amf-helper-mixin.d.ts" />

declare namespace ApiElements {

  /**
   * `api-example-generator`
   *
   * Examples generator from AMF model
   */
  class ApiExampleGenerator extends
    ApiElements.AmfHelperMixin(
    Object) {

    /**
     * AMF `http://a.ml/vocabularies/http#Payload` shape type.
     * Note, you must set `amfModel` property to resolve references in
     * the model.
     */
    shape: object|null;

    /**
     * Auto generated example.
     */
    readonly example: string|null|undefined;

    /**
     * When set it automatically generates the example when shape value change
     */
    auto: boolean|null|undefined;

    /**
     * Generates example when shape changes when `auto` is set to true.
     */
    _shapeAutoChanged(shape: any[]|object|null, auto: Boolean|null): void;

    /**
     * Generates the example from a shape.
     *
     * @param shape AMF shape definition
     * @param opts Generation options:
     * - type `String` - Type name of an union type. If not set it uses first type
     * in the union.
     * @returns Example value.
     */
    generate(shape: any[]|object|null, opts: object|null): String|null|undefined;

    /**
     * Computes an example for given media type.
     *
     * @param type Media type
     * @param schema Payload's schema
     * @param opts Generation options:
     * - type `String` - Type name of an union type. If not set it uses first type
     * in the union.
     */
    computeExample(type: String|null, schema: object|null, opts: object|null): String|null|undefined;

    /**
     * Computes value from defined `datatype` property.
     *
     * @param shape A shape with `datatype` property.
     * @returns Value of the data type.
     */
    _computeScalarType(shape: object|null): String|null|undefined;

    /**
     * Gets a shape for union type
     *
     * @param schema Union's model
     * @param opts See `computeExample()` for description
     * @returns Model for shape or un defined if not found
     */
    _getUnionShape(schema: object|null, opts: object|null): object|null|undefined;

    /**
     * Searches for an example in examples array by it's media type.
     *
     * @param type Payload's media type
     * @param examples List of examples
     * @returns Example's model or undefined if not found.
     */
    _exampleFromMediaType(type: String|null, examples: Array<object|null>|null): object|null|undefined;

    /**
     * Generate an example from the examples array.
     *
     * @param type Bosy content type.
     * @param examples Resolved examples.
     */
    _exampleFromExamples(type: String|null, examples: Array<object|null>|null): String|null|undefined;

    /**
     * Creates a JSON example representation from AMF example's structure
     * definition.
     */
    _jsonFromStructure(structure: object|null): any|null;
    _jsonFromStructureValue(value: any, obj: any, isArray: any, key: any, resolvedPrefix: any): void;
    _getTypedValue(shape: any): any;

    /**
     * Creates an example from RAML type properties.
     *
     * @param type Media type
     * @param typeName Name of the RAML type.
     */
    _exampleFromProperties(type: String|null, properties: any[]|null, typeName: String|null): any|null;

    /**
     * Generates a JSON example from RAML's type properties.
     *
     * @param properties List of type properties
     */
    _jsonExampleFromProperties(properties: any[]|null): String|null|undefined;

    /**
     * Computes JSON value from a range shape.
     *
     * @param range AMF's range model.
     */
    _computeJsonProperyValue(range: object|null): any|null;
    _computeJsonScalarValue(range: any): any;
    _computeJsonUnionValue(range: any): any;
    _computeJsonObjectValue(range: any): any;
    _computeJsonArrayValue(range: any): any;

    /**
     * Gets a value from a Range shape for a scalar value.
     *
     * @param range AMF's range model.
     */
    _getTypeScalarValue(range: object|null): any|null;

    /**
     * Computes example from RAML type for XML media type.
     *
     * @param typeName RAML type name
     */
    _xmlExampleFromProperties(properties: Array<object|null>|null, typeName: String|null): String|null;

    /**
     * Processes an XML property
     *
     * @param doc Main document
     * @param node Current node
     * @param property AMF property
     */
    _xmlProcessProperty(doc: Document|null, node: Element|null, property: object|null): void;

    /**
     * Reads property data type.
     *
     * @returns Data type
     */
    _readDataType(shape: object|null): String|null;

    /**
     * Appends an attribute to the node from AMF property
     *
     * @param node Current node
     * @param property AMF property
     * @param range AMF range
     * @param serialization Serialization info
     */
    _appendXmlAttribute(node: Element|null, property: object|null, range: object|null, serialization: object|null): void;

    /**
     * Appends an element to the node tree from a type
     *
     * @param doc Main document
     * @param node Current node
     * @param property AMF property
     * @param range AMF range
     * @returns Newly created element
     */
    _appendXmlElement(doc: Document|null, node: Element|null, property: object|null, range: object|null): Element|null;
    _appendXmlElements(doc: any, node: any, property: any, range: any): void;
    _appendXmlArray(doc: any, node: any, property: any, range: any, isWrapped: any): void;
  }
}

interface HTMLElementTagNameMap {
  "api-example-generator": ApiElements.ApiExampleGenerator;
}
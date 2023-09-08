// Import des modules requis
const SwaggerParser = require('@apidevtools/swagger-parser');
const YAML = SwaggerParser.YAML;
const path = require('path');

// Références communes utilisées dans le schéma
const common = {
  address: 'https://jason-fox.github.io/swagger-datamodel-test/common.yaml#/address',
  description: 'https://jason-fox.github.io/swagger-datamodel-test/common.yaml#/description',
  location: 'https://jason-fox.github.io/swagger-datamodel-test/common.yaml#/location',
  name: 'https://jason-fox.github.io/swagger-datamodel-test/common.yaml#/name'
};

/**
 * Détermine le modèle NGSI en fonction des propriétés.
 * @param {Object} value - Propriété à évaluer.
 * @param {Object} ngsi - Objet NGSI en cours de construction.
 */
function getModel(value, ngsi) {
  switch(value.format) {
    case 'uri':
    case 'url':
      ngsi.model = 'https://schema.org/URL';
      break;
    case 'date-time':
      ngsi.model = 'https://schema.org/DateTime';
      break;
    case 'string':
      ngsi.model = 'https://schema.org/Text';
      break;
    case 'integer':
      ngsi.model = 'https://schema.org/Integer';
      break;
    case 'float':
      ngsi.model = 'https://schema.org/Number';
      break;
  }
}

/**
 * Convertis un schéma en format YAML.
 * @param {Object} obj - Schéma à convertir.
 * @returns {string} Schéma au format YAML.
 */
function schemaToYaml(obj) {
  // Extraction de l'identifiant à partir du chemin du schéma
  const id = path.parse(path.parse(obj.$id).dir).name;
  const ordered = {}; // Utilisation d'un objet ordonné

  const obj2 = {
    required: obj.required,
    allOf: [
      {
        $ref: 'https://jason-fox.github.io/swagger-datamodel-test/common.yaml#/Common'
      }
    ],
    type: obj.type,
    description: obj.description,
    properties: {}
  };

  obj.allOf.forEach(function (element) {
    let properties = element.properties;
    if (properties) {
      Object.keys(properties).forEach(key => {
        if (common[key]) {
          obj2.properties[key] = { $ref: common[key] }; // Ajout direct dans obj2.properties
        } else {
          const value = properties[key];
          if (value.type) {
            const inner = {
              'x-ngsi': {
                type: 'Property'
              },
              type: value.type,
              description: value.description || '',
              format: value.format || (value.type === 'integer' ? 'int32' : undefined),
              items: value.type === 'array' ? value.items : undefined
            };

            getModel(value, inner['x-ngsi']);

            obj2.properties[key] = inner; // Ajout direct dans obj2.properties
          }
        }
      });
    }
  });

  // Suppression des propriétés indésirables
  delete obj2.properties.id;
  delete obj2.properties.type;
  delete obj2.properties.dateCreated;
  delete obj2.properties.dateModified;

  // Tri des propriétés par ordre alphabétique
  Object.keys(obj2.properties)
      .sort()
      .forEach(function (key) {
        ordered[key] = obj2.properties[key];
      });

  const obj3 = {};
  obj3[id] = obj2;

  return YAML.stringify(obj3);
}

// Export de la fonction
exports.schemaToYaml = schemaToYaml;

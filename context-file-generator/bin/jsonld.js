// Liste de contextes
const commonContexts = [ // 0.0.3 - Tous les contextes ont été commentés pour avoir les hyperliens
  /*
  { key: 'ngsi-ld',           url: 'https://uri.etsi.org/ngsi-ld/' },
  { key: 'fiware',            url: 'https://uri.fiware.org/ns/data-models#' },
  { key: 'schema',            url: 'https://schema.org/' },
  { key: 'smartdatamodels',   url: 'https://smartdatamodels.org/' },
  { key: 'livebuildings',     url: 'https://live-buildings.github.io/data-model/terms#' },
  { key: 'purl',              url: 'http://purl.org/' }
   */
];

// Liste des entrées undefined à vérifier par la suite
const undefinedEntries = [];

/**
 * Ajoute des URL de contexte communes à l'objet context
 * @param {Object} context - L'objet contexte auquel ajouter les URL de contexte communes
 */
function addCommonContextURLs(context) {
  commonContexts.forEach(ctx => {
    context[ctx.key] = ctx.url;
  });
}

/**
 * Ajoute des URL de contexte spécifiques au graphe à l'objet context
 * @param {Object} context - L'objet contexte auquel ajouter les URL de contexte pour le graphe
 */
function addCommonGraphURLs(context) {
  context.rdfs = 'http://www.w3.org/2000/01/rdf-schema#'; // URL de contexte pour RDFS (RDF Schema)
  context.xsd = 'http://www.w3.org/2001/XMLSchema#'; // URL de contexte pour XSD (XML Schema Definition)
}

/**
 * Remplace les URL de contexte communes dans le texte spécifié par des raccourcis plus courts
 * @param {string} text - Le texte contenant les URL de contexte à remplacer
 * @returns {string} Le texte avec les URL de contexte remplacées par des raccourcis
 */
function replaceCommonContextURLs(text) {
  commonContexts.forEach(ctx => {
    // Crée une regex pour rechercher et remplacer les URL de contexte communes.
    const regex = new RegExp(ctx.url.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');

    // Remplace toutes les occurrences de l'URL de contexte commune par son raccourci.
    text = text.replace(regex, ctx.key + ':');
  });
  return text;
}

/**
 * Ajoute une entrée dans le texte spécifié en fonction des paramètres fournis
 * @param {Array} text - Le tableau où ajouter l'entrée
 * @param {string} type - Le type de l'entrée (Property, Relationship, EnumProperty, GeoProperty)
 * @param {string} key - La clé de l'entrée
 * @param {string} uri - L'URI de l'entrée
 * @param {Object} value - La valeur de l'entrée
 * @param {boolean} expand - Indique si les URL de contexte doivent être étendues ou non
 */
function addEntry(text, type, key, uri, value, expand) {
  let entry;

  if (expand) {
    switch (type) {
      case 'Property':
      case 'GeoProperty':
        if (value.type === 'object') {
          entry = `"${key}": "${uri}"`;
        } else if (value.format === 'date-time') {
          entry = `"${key}": {"@id": "${uri}", "@type": "xs:dateTime"}`;
        } else if (value.format === 'URL' || value.format === 'uri') {
          entry = `"${key}": {"@id": "${uri}", "@type": "xs:anyURI"}`;
        } else {
          entry = `"${key}": {"@id": "${uri}", "@type": "xsd:${value.type}"}`;
        }
        break;
      case 'Relationship':
        entry = `"${key}": {"@id": "${uri}", "@type": "@id"}`;
        break;
      case 'EnumProperty':
        entry = `"${key}": {"@id": "${uri}", "@type": "@vocab"}`;
        break;
    }
  } else if (['Property', 'Relationship', 'EnumProperty', 'GeoProperty'].includes(type)) {
    entry = `"${key}": "${uri}"`;
  }

  if (entry) {
    text.push(entry);
  }
}

/**
 * Génère le contexte de l'API à partir de l'objet api fourni
 * @param {Object} api - L'objet API contenant les composants de schéma
 * @param {Object} context - L'objet contexte initial
 * @param {boolean} expand - Indique si les URL de contexte doivent être étendues ou non
 * @returns {Object} L'objet contexte généré à partir de l'API
 */
function getContext(api, context, expand) {
  const text = []; // Tableau pour stocker les définitions de contexte

  // Parcour des schemas de l'api
  Object.keys(api.components.schemas).forEach(obj => {
    const schema = api.components.schemas[obj];
    const ngsi = schema['x-ngsi'] || {};

    const uri = ngsi['uri'] || '';
    const uriPrefix = ngsi['uri-prefix'] || '';

    // 0.0.3 - Correction du shortUri des schemas en cas de non-possession de l'URI
    const shortUri = uri ? replaceCommonContextURLs(uri) : uriPrefix ? replaceCommonContextURLs(uriPrefix) + obj : 'undefined';

    text.push(`"${obj}": "${shortUri}"`);

    if (schema.allOf) {
      processSchema(ngsi, schema.allOf, text, expand, false);
    }

    if (schema.properties) {
      processSchema(ngsi, schema.properties, text, expand, true);
    }

    if (schema.enum) {
      schema.enum.forEach(enumKey => text.push(`"${enumKey}": "${uriPrefix}${enumKey}"`));
    }
  });

  // Création d'un objet JSON à partir du texte formaté
  const unordered = JSON.parse(`{${replaceCommonContextURLs(text.join(',\n  '))}}`);

  // Suppression de clés spécifiques
  delete unordered.id;
  delete unordered.type;

  // Tri des clés du contexte
  Object.keys(unordered)
      .sort()
      .forEach(key => {
        context[key] = unordered[key];
      });

  if (undefinedEntries.length > 0) {
    console.error("/!\\ Followed properties have an undefined uri AND an undefined prefixUri, be careful :\n    ", undefinedEntries.join(', '));
  }

  return { '@context':
        [context, 'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld']
  }; // 0.0.3 - Transformation du contexte en liste et ajout en dur de l'uri
}

/**
 * Ajoute les définitions de contexte pour les propriétés et les valeurs dans les schémas
 * @param {Object} ngsi - L'objet contexte pour les schémas
 * @param {Object} schemaProperties - Les propriétés du schéma en cours de traitement
 * @param {Array} text - Le tableau où ajouter les définitions de contexte
 * @param {boolean} expand - Indique si les URL de contexte doivent être étendues ou non
 * @param {boolean} addKeys - Indique si les clés doivent être ajoutées pour les propriétés et les valeurs
 */
function processSchema(ngsi, schemaProperties, text, expand, addKeys) {
  function processInnerSchema(key, innerValue, innerProp, prop) {
    const innerUriPrefix = innerProp['uri-prefix'] || prop['uri-prefix'];
    const innerUri = innerProp.uri || innerUriPrefix + key;

    if (innerUri.includes("undefined")) {
      undefinedEntries.push(key);
    }

    const innerType = innerProp.type || 'Property';

    addEntry(text, innerType, key, innerUri, innerValue, expand);
  }

  Object.keys(schemaProperties).forEach(key => {
    const value = schemaProperties[key];
    const prop = value['x-ngsi'] || {};

    const uriPrefix = prop['uri-prefix'] || ngsi['uri-prefix'];
    const uri = prop.uri || uriPrefix + key;
    const type = prop.type || 'Property';

    if (addKeys) {
      addEntry(text, type, key, uri, value, expand);
    }

    if (value.properties || value.allOf) {
      const propertiesToProcess = value.allOf ? value.allOf.filter(elem => elem.properties) : [value];

      propertiesToProcess.forEach(elem => {
        const properties = elem.properties || {};

        Object.keys(properties).forEach(innerKey => {
          const innerValue = properties[innerKey];
          const innerProp = innerValue['x-ngsi'] || {};

          processInnerSchema(innerKey, innerValue, innerProp, prop);
        });
      });
    }

    if (!expand && prop.properties) {
      Object.keys(prop.properties).forEach(innerKey => {
        const innerValue = prop.properties[innerKey] || {};
        const innerProp = innerValue['x-ngsi'] || {};

        processInnerSchema(innerKey, innerValue, innerProp, prop);
      });
    }
  });
}

/**
 * Génère un graph RDF à partir de l'API en utilisant le contexte spécifié
 * @param {Object} api - L'objet API contenant les composants de schéma
 * @param {Object} context - L'objet contexte contenant les URL de contexte pour le graphe
 * @returns {Object} L'objet contexte mis à jour avec le graphe RDF généré
 */
function addGraph(api, context) {
  const graph = [];

  function processSchemaRDF(obj, schema, ngsi) {
    if (!schema.enum) {
      const shortUri = ngsi['uri-prefix'] ? replaceCommonContextURLs(ngsi['uri-prefix']) : '';

      graph.push({
        '@id': shortUri + obj,
        '@type': 'rdfs:Class',
        'rdfs:comment': [
          {
            '@language': 'en',
            '@value': (schema.description || '').trim()
          }
        ],
        'rdfs:label': [
          {
            '@language': 'en',
            '@value': obj
          }
        ],
        'rdfs:subClassOf': {
          '@id': 'schema:Thing'
        }
      });
    }

    if (schema.properties) {
      Object.keys(schema.properties).forEach(key => {
        const value = schema.properties[key];
        const ngsi = value['x-ngsi'] || {};
        const type = ngsi.type || 'Property';

        if (!value.enum) {
          const shortUri = ngsi['uri-prefix'] ? replaceCommonContextURLs(ngsi['uri-prefix']) : '';

          graph.push({
            '@id': shortUri + key,
            '@type': 'ngsi-ld:' + type,
            'rdfs:comment': [
              {
                '@language': 'en',
                '@value': (value.description || '').trim()
              }
            ],
            'rdfs:label': [
              {
                '@language': 'en',
                '@value': key
              }
            ]
          });
        }
      });
    }
  }

  Object.keys(api.components.schemas).forEach(obj => {
    const schema = api.components.schemas[obj];
    const ngsi = schema['x-ngsi'] || {};

    processSchemaRDF(obj, schema, ngsi);
  });

  context['@graph'] = graph;

  return context;
}

// Exporte les fonctions pour les rendre disponibles à l'extérieur du module
exports.addCommonContextURLs = addCommonContextURLs;
exports.addCommonGraphURLs = addCommonGraphURLs;
exports.getContext = getContext;
exports.addGraph = addGraph;

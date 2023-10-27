const SwaggerParser = require('@apidevtools/swagger-parser');
const Markdown = require('./markdown.js');
const JSONLD = require('./jsonld.js');

let api;

const context = {
  type: '@type',
  id: '@id'
};

async function dereferenceYaml(file) {
  try {
    api = await SwaggerParser.dereference(file);
  } catch (err) {
    console.error('Cannot dereference file. The file is invalid. ' + err.message);
  }
}

async function markdown(input, _) {
  const text = [];
  try {
    await SwaggerParser.validate(input);
    await dereferenceYaml(input);

    Markdown.addText(text, api);
    Markdown.addExamples(text, api);
    console.log(text.join('\n'));
  } catch (err) {
    console.error('Onoes! The API is invalid. ' + err.message);
  }
}

async function ngsi(input, _) {
  try {
    await SwaggerParser.validate(input);
    JSONLD.addCommonContextURLs(context);
    await dereferenceYaml(input);

    console.log(JSON.stringify(JSONLD.getFullContext(JSONLD.getContext(api, context, false)), null, 4));
  } catch (err) {
    console.error('Onoes! The API is invalid. ' + err.message);
  }
}

async function simpler(input, _) {
  try {
    await SwaggerParser.validate(input);
    JSONLD.addCommonContextURLs(context);
    await dereferenceYaml(input);

    console.log(JSON.stringify(JSONLD.getSimpleContext(JSONLD.getContext(api, context, false)), null, 4));
  } catch (err) {
    console.error('Onoes! The API is invalid. ' + err.message);
  }
}

async function jsonld(input, _) {
  try {
    await SwaggerParser.validate(input);

    JSONLD.addCommonContextURLs(context);
    JSONLD.addCommonGraphURLs(context);

    await dereferenceYaml(input);

    console.log(JSON.stringify(JSONLD.addGraph(api, JSONLD.getFullContext(JSONLD.getContext(api, context, true))), null, 4));
  } catch (err) {
    console.error('Onoes! The API is invalid. ' + err.message);
  }
}

exports.markdown = markdown;
exports.jsonld = jsonld;
exports.simpler = simpler;
exports.ngsi = ngsi;

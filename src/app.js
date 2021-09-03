var CSV_CHAR = ",";
var COLON_CHAR = ":";
var SEMI_COLON_CHAR = ";";
var SESSION_KEY = "session";
var ID_KEY = "id";
var LABEL_KEY = "label";
var TYPE_KEY = "type";
var FILE_FIELD_TYPE_KEY = "fileFieldType";
var KEY_VALUE_SELECT = "key-value-select";

function checkValue(value) {
    if (!value)
        return value;

    if (!isNaN(value)) {
        value = parseInt(value);
    }

    if (typeof value === "boolean" ||
        typeof value === "string" && (value.toLowerCase() === "true" || value.toLowerCase() === "false")
    ) {
        value = Boolean(value);
    }

    return value;
}

function transformToJson(headers, values) {
    var item = {};
    var id = values[headers.indexOf(ID_KEY)];
    var indexFileFieldType = headers.indexOf(FILE_FIELD_TYPE_KEY);
    var indexType = headers.indexOf(TYPE_KEY);

    for (let index = 0; index < headers.length; index++) {
        var key = headers[index];
        var value = values[index];

        if (value && key !== SESSION_KEY) {
            if (key.includes(COLON_CHAR)) {
                var arrayHeaders = key.split(COLON_CHAR);
                var keyArray = arrayHeaders.shift();
                var arrayRecords = value.slice(1, value.length -1).split(SEMI_COLON_CHAR);

                item[keyArray] = arrayRecords.map(elem => {
                    var arrayValues = elem.split(COLON_CHAR);
                    return transformToJson(arrayHeaders, arrayValues);
                });

            } else {
                item[key] = checkValue(value);
                item[LABEL_KEY] = id;
            }
        }
    }
    
    return Object.assign({}, item);
}

function translate(headers, csvRecords) {
    var optionsTraslate = {};
    csvRecords.slice(1).forEach((line) => {
        var values = line.split(CSV_CHAR);
        var id = values[headers.indexOf(ID_KEY)];
        var label = values[headers.indexOf(LABEL_KEY)];
        var type = values[headers.indexOf(TYPE_KEY)];
        
        optionsTraslate[id] = label;

        if (type === KEY_VALUE_SELECT) {
            var options = values[8].slice(1, values[8].length - 1);
            var optionsArray =  options.split(SEMI_COLON_CHAR);
            
            for(let item of optionsArray) {
                var options = item.split(COLON_CHAR);
                var value = options[1];
                optionsTraslate[`O${value}`] = value;
            }
        }
        
    });

    return optionsTraslate;
}

function createTab(session, headers, records) {
    return {
        label: session,
        id: session,
        type: "section",
        layout: "tabs",
        fields: records.map((values) => transformToJson(headers, values))
    }
}

function createTagsBySession(headers, records) {
    var sessionIndex = headers.indexOf(SESSION_KEY);
    var sessions = records.map(elem => elem[sessionIndex]);
    var groupedSessions = [];

    sessions.forEach(elem => {
        if (elem && !groupedSessions.includes(elem)) {
            groupedSessions.push(elem);
        }
    });

    return groupedSessions.map(session =>  {
        var sessionRecords = records.filter(elem => elem.includes(session));
        return createTab(session, headers, sessionRecords)
    });
}

function createTemplate(product, headers, records) {
    return {
        "CONFIG_HEADER": {
          "Product": product,
          "Config_version": "1"
        },
        "CONFIG_TEMPLATE": {
          "label": "Config",
          "id": "Config_id",
          "type": "section",
          "layout": "menu",
          "fields":  createTagsBySession(headers, records)
        }
    }
}


var csvRecords = require("fs").readFileSync("file.csv", "utf8").split("\r\n");
var headers = csvRecords[0].split(CSV_CHAR);
var records =  csvRecords.slice(1).map((line) => line.split(CSV_CHAR));

var args = process.argv.slice(2);
var product = args[0] || "";
var template = createTemplate(product, headers, records);
var translate = translate(headers, csvRecords);


console.log("Translate: " + JSON.stringify(translate));
console.log("\n");
console.log("Template: " + JSON.stringify(template));
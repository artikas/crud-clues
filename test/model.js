var crud = require('../index');

crud.mongoose.connect('mongodb://localhost:27017/crud-test');

var genericObject = {
	name : String,
	number : Number,
	requiredField : { type : String, required : true },
};

var schema = new crud.mongoose.Schema(genericObject),
    model = crud.mongoose.model('crudTest',schema);

module.exports = model;
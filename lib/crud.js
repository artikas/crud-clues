// This is a general single record CRUD framework that is instantiated with a promisified
// Mongo collection.   The output of record is provided through 'data'
var mongoose = require('mongoose'),
  Promise = require('clues').Promise;

Promise.promisifyAll(mongoose);

// Provide xflash style validation errors from the native mongoose validation
mongoose.Document.prototype.xflash = function() {
  return this.validateAsync()
    .catch(function(e) {
      e.xflash = e.xflash || {};
      Object.keys(e.errors).forEach(function(key) {
        var error = e.errors[key];
        if (error.kind == 'user defined')
          e.xflash[key] = error.message;
        else if (error.kind == 'required')
          e.xflash[key] = 'Required input';
        else
          e.xflash[key] = 'Invalid input';
      });
      throw {
        message: 'VALIDATION_ERROR',
        error: e,
        xflash: e.xflash
      };
    });
};


var crud = {
  // This is a 'where' condition executed for any query to prevent unauthorized access
  // For unlimited access, simply set to {}
  user_access: undefined,

  write_access: function(user_access) {
    return user_access;
  },

  read_access: function(user_access) {
    return user_access;
  },

  // The input_data function should select the right
  // data from the user-supplied 'input' object
  input_data: undefined,

  // By default, this function performs the mongoose validation and refactors the
  // response into a simple xflash property.  Can easily be overwritten with 
  // a more custom functionality. Goes throguh the mongoose model so that the
  // object constraints are enforced.
  valid_input: function($model, input_data) {
    var mongoose_obj = new $model(input_data);
    return mongoose_obj
      .xflash()
      .then(function() {
        var jsObject = mongoose_obj.toObject();
        if (!input_data._id) delete jsObject._id;
        return jsObject;
      });
  },

  // Checks if the object has an _id and returns it. If not, it returns the user supplied id field.
  id: function(_valid_input) {
    if (_valid_input && _valid_input._id) return _valid_input._id;
    else return ['input.id', Object];
  },

  // Returns the Mongo native id object 
  mongo_id: function(id) {
    try {
      return mongoose.Types.ObjectId.createFromHexString(id.toString());
    } catch (e) {
      throw {
        message: 'INVALID_ID'
      };
    }
  },

  // The default query fetches by query_id (custom query needs to be provided)
  // This function should be overwritten where more complex selection is needed
  query: function(mongo_id) {
    return {
      _id: mongo_id
    };
  },

  // Default save function for data.
  save: function(_update) {
    if (_update)
      return _update;

    return function(create) {
      return create;
    };
  },

  // A simple check to see if record saved (or return validation errors etc if fail)
  record_saved: function(save) {
    return 'ok';
  },

  // FORMAL CRUD BLOCK
  create: function($model, valid_input) {
    return $model.collection
      .insertAsync(valid_input)
      .then(function(d) {
        if (!d.result || !d.result.ok)
          throw 'COULD_NOT_CREATE_RECORD';
        return valid_input;
      }, function(e) {
        if (e.code === 11000) throw 'RECORD_EXISTS';
        else throw e;
      });
  },

  // Default read function for data
  read: function($model, read_access, query, _name) {
    return $model.collection
      .findOneAsync({
        $and: [
          read_access,
          query
        ]
      })
      .then(function(d) {
        if (!d) throw {
          message: 'RECORD_NOT_FOUND',
          name: _name
        };
        return d;
      });
  },

  update: function($model, query, write_access, valid_input) {
    if (valid_input._id) {
      query = {
        _id: valid_input._id
      };
    }
    return $model //call the model's update directly so update hooks are executed (as opposed to calling $model.collection...).
      .findOneAndUpdateAsync({
          $and: [
            write_access,
            query
          ]
        },
        valid_input, {
          new: true,
          upsert: false
        })
      .then(function(result) {
        if (result === null && typeof result === "object") throw 'RECORD_NOT_FOUND';
        return valid_input;
      });
  },

  delete: function($model, query, write_access) {
    return $model.collection.removeAsync({
        $and: [
          write_access,
          query
        ]
      })
      .then(function(d) {
        if (!d.result.n) throw 'RECORD_NOT_FOUND';
        else return 'OK';
      });
  },

  // When we fetch data we try both to 'save' and 'load'
  // if we did not provide any input data, or input failed validation
  // the 'save' will fail and this function will return the 
  // 'loaded' data, or error if the load is unsuccessful
  data: function(_save) {
    if (_save)
      return _save;
    else
    // We run load as a function to ensure any error gets reported
    // instead of undefined (as _load argument is undefined upon error)
      return function(read) {
      return read;
    };
  },

  // To be owerwritten as needed
  valid_data: function(raw_data) {
    return raw_data;
  }
};

module.exports = function(extend) {
  var obj = Object.create(crud);
  if (extend)
    for (var key in extend)
      obj[key] = extend[key];
  return obj;
};

module.exports.crud = crud;
module.exports.mongoose = mongoose;
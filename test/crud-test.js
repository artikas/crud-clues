var clues = require('clues'),
  crud = require('../index'),
  model = require('./model'),
  assert = require('chai').assert;

function shouldError(d) {
  throw Error('Should Error - got ' + JSON.stringify(d));
}

function assertError(msg) {
  return function(e) {
    assert.equal(e.message, msg);
  };
}

var crudModel = crud({
  user_access: {},
  $model: model,
  input_data: ['input.data', Object],
});

var api = function() {
  return Object.create(crudModel);
};

describe('CRUD', function() {
  var record;

  before(function() {
    return model.removeAsync({});
  });

  describe('CREATE', function() {

    describe('with valid data', function() {
      it('should create record', function() {
        return clues(api, 'create', {
            input: {
              data: {
                name: 'tito',
                number: 7,
                requiredField: 'req'
              }
            }
          })
          .then(function(d) {
            record = d;
            assert.equal(record.name, 'tito');
            assert.equal(record.number, 7);
            assert.equal(record.requiredField, 'req');
          });
      });

      it('should end up with a valid _id', function() {
        assert(record._id);
      });

      it('should fail on second create', function() {
        return clues(api, 'create', {
            input: {
              data: record
            }
          })
          .then(shouldError, assertError('RECORD_EXISTS'));
      });
    });

    describe('with invalid data', function() {
      it('returns xflash error', function() {
        return clues(api, 'create', {
            input: {
              data: {
                name: 'tito',
                number: 7
              }
            }
          })
          .then(shouldError, function(e) {
            assert(e.message, 'VALIDATION_ERROR');
            assert(e.xflash.requiredField, 'Required Input');
          });
      });

      it('object does not have fields not present in model', function() {
        return clues(api, 'create', {
            input: {
              data: {
                name: 'tito',
                requiredField: 'req',
                extraField: 'random'
              }
            }
          })
          .then(function(d) {
            assert.equal(d.name, 'tito');
            assert.equal(d.requiredField, 'req');
            assert.notProperty(d, 'extraField');
          });
      });
    });

  });

  describe('READ', function() {
    it('should fail without any input data', function() {
      return clues(api, 'read', {
          input: {}
        })
        .then(shouldError, function(e) {
          assert(e.message, 'data not defined');
        });
    });

    it('should fail if the id doesnt exist', function() {
      return clues(api, 'read', {
          input: {
            id: '55566f586c74cc3152aad3b8'
          }
        })
        .then(shouldError, assertError('RECORD_NOT_FOUND'));
    });

    it('should return the saved data with valid id', function() {
      return clues(api, 'read', {
          input: {
            id: record._id.toString()
          }
        })
        .then(function(d) {
          assert.deepEqual(record, d);
        });
    });
  });

  describe('UPDATE', function() {
    var global = {
      input: {
        data: {
          name: 'tito 2',
          requiredField: 'req',
          extraField: 'random'
        }
      }
    };

    describe('without an id', function() {
      it('should fail', function() {
        return clues(api, 'update', global).then(shouldError, assertError('id not defined'));
      });
    });

    describe('invalid id', function() {
      it('should error RECORD_NOT_FOUND', function() {
        global.input.id = '55566f586c74cc3152aad3b8';
        return clues(api, 'update', global).then(shouldError, assertError('RECORD_NOT_FOUND'));

      });
    });

    describe('valid id', function() {
      it('should update', function() {
        global.input.id = record._id.toString();
        return clues(api, 'update', global);
      });

      it('reading should return updated data', function() {
        return clues(api, 'read', {
            input: {
              id: record._id.toString()
            }
          })
          .then(function(result) {
            global.input.data._id = record._id;
            assert.equal(result.name, 'tito 2');
            assert.equal(result.requiredField, 'req');
            assert.notProperty(result, 'extraField');
          });
      });
    });
  });

  describe('DELETE', function() {
    describe('without an id', function() {
      it('should fail', function() {
        return clues(api, 'delete', {
            input: {}
          })
          .then(shouldError, assertError('id not defined'));
      });
    });

    describe('with an invalid id', function() {
      it('should fail', function() {
        return clues(api, 'delete', {
            input: {
              id: '55566f586c74cc3152aad3b8'
            }
          })
          .then(shouldError, assertError('RECORD_NOT_FOUND'));
      });
    });

    describe('with a valid id', function() {
      it('should succeed', function() {
        return clues(api, 'delete', {
            input: {
              id: record._id.toString()
            }
          })
          .then(function(d) {
            assert(d, 'OK');
          });
      });
    });
  });
});

describe('SAVE', function() {
  var record = {
    name: 'tito 3',
    number: 11,
    requiredField: 'req'
  };
  it('should save item that doesn\'t already exist', function() {
    return clues(api, 'save', {
        input: {
          data: record
        }
      })
      .then(function(savedItem) {
        assert.equal(savedItem.name, 'tito 3');
        assert.equal(savedItem.number, 11);
        assert.equal(savedItem.requiredField, 'req');
        record = savedItem;
      });
  });

  it('should verify that the item was saved', function() {
    return clues(api, 'read', {
        input: {
          id: record._id
        }
      })
      .then(function(retrievedItem) {
        assert.equal(retrievedItem._id, record._id.toString());
        assert.equal(retrievedItem.name, 'tito 3');
        assert.equal(retrievedItem.number, 11);
        assert.equal(retrievedItem.requiredField, 'req');
      });
  });

  it('should save updates', function() {
    record.name = 'tito 3 updated';
    return clues(api, 'save', {
        input: {
          data: record
        }
      })
      .then(function(retrievedItem) {
        record = retrievedItem;
        assert.equal(retrievedItem._id, record._id.toString());
        assert.equal(retrievedItem.name, 'tito 3 updated');
      });
  });

  it('should save another update', function() {
    record.name = 'tito 3 updated yet again';
    record.number = 11 + 1;
    return clues(api, 'save', {
        input: {
          data: record
        }
      })
      .then(function(retrievedItem) {
        assert.equal(retrievedItem._id, record._id.toString());
        assert.equal(retrievedItem.name, 'tito 3 updated yet again');
        assert.equal(retrievedItem.number, 12);
      });
  });

});
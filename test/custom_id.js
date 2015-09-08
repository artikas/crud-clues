var clues = require('clues'),
  model = require('./model'),
  crud = require('../index'),
  assert = require('assert');

function shouldError(d) {
  throw Error('Should Error - got ' + JSON.stringify(d));
}

function assertError(msg) {
  return function(e) {
    assert.equal(e.message, msg);
  };
}

var crudModel = crud({
  user_access: function(user_id) {
    return {
      user_id: user_id
    };
  },

  $model: model,

  id : ['input.id',String],

  query: function query(_id, _custom_id) {
    if (_id) return {
      _id: _id
    };
    else if (_custom_id) return {
      custom_id: _custom_id
    };
    else throw 'MISSING_ID';
  },

  custom_id: ['_input.custom_id', '_input_data.custom_id', function(_custom_id, _data_id) {
    if (!_custom_id && !_data_id) throw 'INVALID_custom_id';
    return _custom_id || _data_id;
  }],

  input_data: ['input.data', function(d) {
    return d;
  }],
  
});


var api = function(user_id) {
  return Object.create(crudModel, {
    user_id: {
      value: user_id
    }
  });
};

describe('Custom id', function() {
  var record;

  before(function() {
    return model.removeAsync({});
  });

  describe('user a', function() {
    it('no problem creating', function() {
      return clues(api('a'), 'create', {
          input: {
            data: {
              name: 'tito a',
              number: 7,
              requiredField: 'req',
              custom_id: 'myref'
            }
          }
        })
        .then(function(d) {
          assert.equal(d.name, 'tito a');
          assert.equal(d.number, 7);
          assert.equal(d.requiredField, 'req');
          assert.equal(d.custom_id, 'myref');
          record = d;
        });
    });
  });

  describe('user b', function() {
    describe('with same _id', function() {
      it('fails to create', function() {
        return clues(api('b'), 'create', {
            input: {
              id: record._id.toString(),
              data: {
                name: 'tito',
                number: 7,
                requiredField: 'req',
                custom_id: 'myref'
              }
            }
          })
          .then(shouldError,assertError('RECORD_EXISTS'));
      });
    });

    describe('without _id', function() {
      it('fails to update without own record', function() {
        return clues(api('b'), 'update', {
            input: {
              data: {
                name: 'tito',
                number: 7,
                requiredField: 'req',
                custom_id: 'myref'
              }
            }
          })
          .then(shouldError, assertError('RECORD_NOT_FOUND'));
      });

      it('succeeds in create', function() {
        return clues(api('b'), 'create', {
          input: {
              data: {
                name: 'tito',
                number: 7,
                requiredField: 'req',
                custom_id: 'myref'
              }
          }
        })
        .then(function(d){
          assert.equal(d.name, 'tito');
          assert.equal(d.number, 7);
          assert.equal(d.requiredField, 'req');
          assert.equal(d.custom_id, 'myref');
        });
      });

      it('succeeds in subsequent update', function() {
        return clues(api('b'), 'update', {
          input: {
            data: {
              name: 'tito updated',
              number: 7,
              requiredField: 'req',
              custom_id: 'myref'
            }
          }
        })
        .then(function(d){
          assert.equal(d.name, 'tito updated');
          assert.equal(d.number, 7);
          assert.equal(d.requiredField, 'req');
          assert.equal(d.custom_id, 'myref');
        });
      });
    });

  });

  describe('reading same custom_ref',function() {
    it('works for a',function() {
      return clues(api('a'),'read',{input:{custom_id:'myref'}})
        .then(function(d) {
          assert.equal(d.name,'tito a');
        });
    });

    it('works for b',function() {
      return clues(api('b'),'read',{input:{custom_id:'myref'}})
        .then(function(d) {
          assert.equal(d.name,'tito updated');
        });
    });
  });
});
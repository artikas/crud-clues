var clues = require('clues'),
    model = require('./model'),
    crud = require('../index'),
    assert = require('assert');

function shouldError(d) { throw Error('Should Error - got '+JSON.stringify(d));}
function assertError(msg) { return function(e) { assert.equal(e.message,msg);};}

var crudModel = crud({
  user_access : function(user_id) { return {user_id:user_id};},
  $model : model,
  input_data : ['input.data',function(d) { return d;}],
  valid_input : ['input_data','user_id',function(d,user_id) { d.user_id = user_id; return d;}]
});


var api = function(user_id) {
  return Object.create(crudModel,{
    user_id : {value: user_id}
  });
};

describe('Multiple tenants (a and b)',function() {
  var record;

  before(function() {
    return model.removeAsync({});
  });
  
  describe('user a',function() {
    it('no problem creating',function() {
      return clues(api('a'),'create',{input:{data:{custom_id:'abged'}}})
        .then(function(d) {
          record = d;
        });
    });
  });

  describe('user b - same record',function() {
    it('create fails',function() {
      return clues(api('b'),'create',{input:{data:record}})
        .then(shouldError,assertError('RECORD_EXISTS'));
    });

    it('update fails',function() {
      record.custom_id = 'abfdsfdsged';
      return clues(api('b'),'update',{input:{data:record}})
        .then(shouldError,assertError('RECORD_NOT_FOUND'));
      });

    it('delete fails',function() {
      return clues(api('b'),'delete',{input:{id:record._id.toString()}})
        .then(shouldError,assertError('RECORD_NOT_FOUND'));
    });
  });
  

  describe('user a - same record',function() {
    it('updates',function() {
      record.custom_id = 'UPDATED_ID';
      return clues(api('a'),'update',{input:{data:record}});
    });

    //todo: check why this test doesn't pass
    it('reads',function() {
      return clues(api('a'),'read',{input:{id:record._id.toString()}})
        .then(function(d) {
          assert.deepEqual(d._id,record._id);
          assert.equal(d.custom_id,'UPDATED_ID');
        });
    });

    it('deletes',function() {
      return clues(api('a'),'delete',{input:{id:record._id.toString()}});
    });
   });
});
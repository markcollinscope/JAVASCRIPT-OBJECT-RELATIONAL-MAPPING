'use strict';

var ass = require('./ass');
var uts = require('./utils');
var dbSync = require('./db');
var dbtx = require('./dbtxwrap');

function DomainObject
(
	theTypeName,		// DO name: 'User', 'Account', 'HireCar', 'Shop', ... etc.
	theTable, 			// DB table name for above. E.g. 'db_user, 'mydb_account' ... as per DB definition.
	theIDKeyField, 		// Primary key of 'User' (whatever) DO. E.g. 'userID' - as per DB definitions.
	theMandatory, 		// Fields that must always be present in the DomainObect - IDs, addresses ...
	theOptional, 		// Fields that may be present, but may also be undefined. e.g. secondardyEmail
	theCreateTSField,   // which field stores the create timestamp.
	theUpdateTSField,   // which field stores the update timestamp.
	theValidationFn, 	// Domain object specific validation function. Use function() {}, if none.
	theID 				// the actual Primary Key ID of the DO we are dealing with.
) 
{
	//---
	ass.ok(theTypeName, "DO: TypeName Arg Missing");
	ass.ok(theTable, "DO: Table Arg Missing");
	ass.ok(theIDKeyField, "DO: IDKeyField Arg Missing");
	ass.ok(theMandatory, "DO: Mandatory Fields Arg Missing" );
	ass.ok(theOptional, "DO: Optional Fields Arg Missing");
	ass.ok(theCreateTSField, "DO: CreateTSField Arg Missing");
	ass.ok(theUpdateTSField, "DO UpdateTSField Arg Missing");
	ass.ok(uts.isFunction(theValidationFn), "DO Validation Function Arg Missing");

	//---
	var _id = undefined;
	var _data = undefined;
	var _defaultCx = dbSync.cxDefault();


	//---
	var _typeName = theTypeName;
	var _table = theTable;
	var _idKeyField = theIDKeyField;
	var _mandatory = theMandatory;
	var _optional = theOptional;
	var _createTSField = theCreateTSField;
	var _updateTSField = theUpdateTSField;
	var _DOSpecificValidationFn = theValidationFn;

	//---
	// initialise domain object - dependent on ID.
	if (theID) _lazy(theID); else _new();

	//---
	// sets domain object to be loaded from DB on demand.
	function _lazy(theID) 
	{
		ass.ok(theID);
		ass.ok(dbSync.isExistingID(theID));		// cannot be a domain object that has never been saved.
		ass.ok(_data === undefined);			// data cannot already be loaded - as per above.

		_id = theID;
	}
	
	// setup domain object as new - ie. it has never been stored to DB, as yet, 
	// so will be autoallocated ID on save by DB itself.
	function _new() 
	{							
		_id = dbSync.newID();			// set ID to trigger a Create new row on the DB.
	}
	
	function _isAlreadyStoredIntheDB()
	{ 
		return _id !== dbSync.newID();	
	}

	//--- (lazy) load if DO data not loaded from DB already
	function _loadFromDBIfNeeded() 
	{
		if ( !_data && _isAlreadyStoredIntheDB() )
		{		
			var aWhere = dbSync.simpleWhere(_idKeyField, _id );
			var returnDataArray = dbSync.query(_defaultCx, '*', _table, aWhere);
			
			var returnLen = returnDataArray.length;
			
			ass.ok(
				returnLen !== 0,
				"database does not have Object with given ID (" + _typeName + "," + _id + ")"				
			);
			
			ass.ok(
				returnLen === 1,	// !== 0 as well, to get here
				"database has mutliple DOs with same IDs (" + _typeName + "," + _id + ")"
			);
			
			var returnData = returnDataArray[0];
			
			// make a copy to ensure full encapsulation
			_data = uts.objSimpleCopy(returnData);
		}
	}

	function _validateDomainObjectIfDataSet()
	{
		ass.ok(_id !== undefined);
		if (_data) 
		{
			ass.ok(_data[_idKeyField] === _id, "PROG ERROR: " + _typeName + " DO - Inconsistent internal state (forget to parseInt?)");
			uts.checkObject(_data, _mandatory, _optional);

			// this is overriddden by objects that inherit (prototype sense) from DomainObject.
			_DOSpecificValidationFn();
		}
	}

	function _save(theCx)
	{
		ass.ok(theCx, "Attempt to save DO without a DB Connection");
		ass.ok(dbSync.inTransaction(theCx), "Attempt to save DO whilst not in DB Transaction");
		ass.ok(_data, "Attempt so save DO when no values have been set");

		_validateDomainObjectIfDataSet();

		if (dbSync.isExistingID(_id)) 
		{
			//--- save pre-existing (on DB) domain object.

			var nowTS = uts.dateString();
			var aRes = dbSync.updateRow(theCx, _table, _data, _idKeyField, _id, _updateTSField, nowTS);
			var isSuccess = dbSync.isSuccess(aRes);

			if (!isSuccess) throw new Error("Unable to update data");

			// update local updated TS to match DB. Note - get() required to access this.
			_data[_updateTSField] = nowTS;
		}
		else 
		{
			//--- save new domain object to DB.
			ass.ok( _id === dbSync.newID() );

			// sort timestamp for creation / first update date.
			var now = uts.dateString();
			_data[_createTSField] = now;
			_data[_updateTSField] = now;
			
			var aResult = dbSync.createRow(theCx, _table, _data);
			var isASuccess = dbSync.isSuccess(aResult);

			if (!isASuccess) throw new Error("Unable to create object in DB:" + _typeName);

			_id = dbSync.createdID(aResult);
			_data[_idKeyField] = _id;
		}
		return this;			// TODO REVIEW USE OF THIS AS IT IS DODGY, METHINKS!
	}

	return {
		save: _save,

		id: function()
		{
			_validateDomainObjectIfDataSet();
			return _id;
		},
		
		get: function(
			isToBeValidated		// set to false if calling from a 'sub-class' DO - stops mutually recursive calls.
		) 
		{
			//---
			isToBeValidated = (isToBeValidated === undefined) ? true : isToBeValidated;

			//---
			_loadFromDBIfNeeded();
			ass.ok(_data);
			if (isToBeValidated) _validateDomainObjectIfDataSet();

			return uts.objSimpleCopy(_data);
		},

		set: function(
			theData, 			// data to be set.
			theIDOverride		// allow _data ID to override _id - default false. See 'allowIDOverride' below.
		)
		{
			ass.ok(theData);
			ass.okIfUndefined(theIDOverride);

			if (theIDOverride) 
			{
				_id = theData[_idKeyField];
			}
			
			ass.ok(theData[_idKeyField] === _id, "Can't 'set' a DO with a different 'ID' (" + theData[_idKeyField] + ',' + _id + ')');

			_data = uts.objSimpleCopy(theData);
			_validateDomainObjectIfDataSet();

			return this;
		},

		txSave: function()
		{
			var txOk = dbtx.doTransaction(
				function(theCx)
				{
					_save(theCx);
				}
			);
			ass.ok(txOk, "Unknown transaction failure");
		},

		setDBCx(theCx)
		{
			ass.ok(theCx);
			_defaultCx = theCx;
			
			return this;
		},

		field: function(theFieldName)
		{
			var isFieldMandatory = uts.arrContainsValue(_mandatory, theFieldName);
			var isFieldOptional = uts.arrContainsValue(_optional, theFieldName);
			ass.ok
			(
				isFieldMandatory || isFieldOptional,
				"DO: Unknown field in DO.field request (" + theFieldName + ")"
			);
			return _table + '.' + theFieldName;
		},

		table: function()
		{
			return _table;
		},

		getMF() 
		{
			return _mandatory;
		},

		getOF()
		{
			return _optional;
		},

		getAllF()
		{
			return _mandatory.concat(_optional);
		},

		allowIDOverride: function() { return true; } 	// use this for readablity with the get() fn.
	};
}

module.exports = DomainObject;
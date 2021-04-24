'use strict';

// npm packages. *** uncomment when installed. commented to pass nodejs checks... ***
const mysql = {} 	// require('mysql');
const waitfor = {} 	// require('wait.for');	// similar to 'await'. only runs in node.js fiber.

// default functions / values ... can be overriden.
var _dbWaitFor = function()
{
	var result = waitfor.apply(this, arguments);
	return result;
};

var _assert = function(theValue, theMsg) 
{ 
	theMsg = theMsg || 'no specific error message given';
	if (!theValue) throw new Error("DB ASSERT FAILURE: " + theValue + " - " + theMsg);
};

var _logFn = function(theMsg)
{
	// no default.
};

var db = (function() 
{
	//-- configurable functions - pass in value.
	function _setAssert(theOkFn)
	{
		_assert = theOkFn;
	}

	function _setLogFn(theLogFn)
	{
		_logFn = theLogFn;
	}

	function _setWaitFor(theFn)
	{
		_dbWaitFor = theFn;
	}
	
	//--- utility DB logging fns which call the above Fns.
	function _logIfDbError(err)
	{
		if (err) 
		{
			var msg = 'DB ERROR RETURNED: ' + JSON.stringify(err);
			_logFn(msg);
		}	
	}

	//--- connection and connection pooling + transactions.
	var _cxCount = undefined;
	var _cxPool = undefined;

	// stored for potential use in logging.
	var _cxLimit = undefined;
	var _user = undefined;
	var _password = undefined;
	var _database = undefined;
	var _host = undefined;
	var _port = undefined;

	function _assertCxInitOk()
	{
		_assert(_cxLimit && _user && _password && _database && _host && _port, "Failure to Initialise DB Connection Correctly");
	}

	function _setDBConnection(theCxLimit, theUser, thePassword, theDatabase, theHost, thePort)
	{
		_assert(!isNaN(theCxLimit) && theCxLimit > 0);
		_assert(theUser);
		_assert(thePassword);
		_assert(theDatabase);
		_assert(theHost);
		_assert(thePort);

		_cxLimit = theCxLimit;
		_user = theUser;
		_password = thePassword;
		_database = theDatabase;
		_host = theHost;
		_port = thePort;
	
		_cxCount = 0;
	
		_cxPool = mysql.createPool(
		{
			connectionLimit 	: _cxLimit,
			user     			: _user,
			password 			: _password,
			database 			: _database,
			host  				: _host,
			port 				: _port,
			dateStrings 		: true, 		// datetime returned as strings.
		});
	}

	function _dbLogNumberOfConnections() 
	{
		_logFn("Connection count: " + _cxCount);
	}

	//-- Access/Update the DB Fns.
	function _doSQL(theCxn, theSQL, theFn) // Any SQL - used mostly to INSERT/UPDATE rows, COMMIT, ROLLBACK, Etc.
	{
		_assertCxInitOk();
		_assert(theCxn);
		_assert(theSQL);
		
		theFn = theFn || _logIfDbError;
		
		var dbCxID = ( !_isCxDefault(theCxn) ? theCxn.threadId : 'DEFAULT' );
		
		var aCx = undefined;
		
		if (_isCxDefault(theCxn))
		{
			aCx = _cxPool;
		}
		else
		{
			aCx = theCxn;
		}
		var anSQLString = theSQL;

		//--
		var aLogString = "{DBCxID: " + dbCxID + "} " + anSQLString;

		var now = new Date();
		aCx.query(anSQLString, theFn);
		
		var later = new Date();
		var duration = later - now;

		aLogString += " {time taken: " + duration + " ms}";
		_logFn(aLogString);
	}

	function _query(theCxn, theWhat, theTable, theWhere, theFn) 	// Read only query - select theWhat from theTable where theWhere ...
	{
		_assertCxInitOk();
		_assert(theCxn !== undefined);
		_assert(theWhat);
		_assert(theTable);
		_assert(theWhere !== undefined);
		
		theFn = theFn || _logIfDbError;

		var anSQLString = 'SELECT ' + theWhat + ' FROM ' + theTable;
		if (theWhere !== '') {
			anSQLString += ' WHERE ' + theWhere;
		}

		_doSQL(theCxn, anSQLString, theFn);
	}

	//-- Transaction Management.
	var _txDepth = [];				// check transaction status on a particular connection.
	function _incTxDepth(theCx)
	{
		if (_txDepth[theCx] === undefined) _txDepth[theCx] = 0;
		_txDepth[theCx]++;
		_logFn("Transaction depth: " + _txDepth[theCx] + " - DBconnectionID: " + theCx.threadId );
	}

	function _beginTransaction(theFn) 
	{
		_assertCxInitOk();
		_assert(theFn);

		_cxPool.getConnection(function(err, theCx) 
		{
			_incTxDepth(theCx);
  			_logIfDbError(err);
  			_assert(_cxCount >= 0);

  			var anSQLString = 'START TRANSACTION';
			_doSQL(theCx, anSQLString, function(err) 
			{
	  			_logIfDbError(err);
	  			_cxCount++; _dbLogNumberOfConnections();
	  			theFn(null, theCx);
			});
		});
	}

	function _endTransaction(theCx, isRollbackCondition, theFn) 
	{
		_assertCxInitOk();
		_assert(theCx);
		_assert(!_isCxDefault(theCx), "cannot use default connection to DB when ending a DB Transaction");

		// ok if isRollbackCondition undefined => false.
		
		theFn = theFn || _logIfDbError;

		_assert(_cxCount >= 1, "connection to DB - count error: " + _cxCount);
		_assert(_txDepth[theCx] >= 1, "attempt to end transactions when not in one");

		var commitSQLString = 'COMMIT';
		var rollbackSQLString = "ROLLBACK";
		var isCommitSuccess = !isRollbackCondition;
		var anSQLString = isRollbackCondition ? rollbackSQLString : commitSQLString;

		_doSQL(theCx, anSQLString, function(err) 
		{
			if (err) {
				isCommitSuccess = false;
				_logFn(rollbackSQLString);
				theCx.query(rollbackSQLString, theFn);
			}
		
			theCx.release();
			
			_cxCount--; _dbLogNumberOfConnections();

  			theFn(null, isCommitSuccess);
		});
		_txDepth[theCx]--;
	}

	function _inTransaction(theCx) 
	{
		_assert(theCx);
		return _txDepth[theCx] === 1;			// no 'nested' transactions - so tight constraint here.
	}
	
	// To be used 'constant' value - when do not wish to create a specific Tx. Typically Queries where no COMMIT is required.
	function _cxDefault() { return -1000; }
	
	function _isCxDefault(theCx)
	{
		return (theCx === _cxDefault());
	}

	
	//-- helper functions for *simple* queries.
	function _simpleWhere(theFieldName, theValue, isNotToBeEscaped) // "WHERE theFieldName = theValue"
	{
		_assert(theFieldName);
		_assert(theValue);
		// isNotToBeEscaped can be undefined.

		var aValue = (isNotToBeEscaped ? theValue : mysql.escape(theValue));
		return theFieldName + '=' + aValue;
	}

	function _tsWhere(theFieldName, theValue, theTSFieldName, theTimestamp) // "WHERE theFieldName = theValue AND theTSFieldName = theTimestamp"
	{
		_assert(theFieldName);
		_assert(theValue);
		_assert(theTSFieldName);

		var retval = 
			_simpleWhere(theFieldName, theValue) + 
			' AND ' + 
			theTSFieldName + ' = ' + mysql.escape(theTimestamp);

		return retval;
	}


	//---
	function _createRow(theCx, theTable, theValues, theFn)
	{
		_assert(theCx);
		_assert(!_isCxDefault(theCx), "cannot use default connection to DB for Creating a Row, must be in transaction");

		_assert(theTable);
		_assert(theValues);

		theFn = theFn || _logIfDbError;

		var numFields = Object.keys(theValues).length;

		var anSQLString = 'INSERT INTO ' + theTable + '(';

		var aCount = 0;
		for (var l in theValues) {
			aCount++;
			anSQLString += (l);
			if (aCount !== numFields) {
				anSQLString += ',';
			}
		}
		anSQLString += ') VALUE(';
		
		var anotherCount = 0;
		for (var m in theValues) {
			anotherCount++;
			anSQLString += mysql.escape(theValues[m]) ;
			if (anotherCount !== numFields) {
				anSQLString += ',';
			}
		}
		anSQLString += ')';
		
		_doSQL(theCx, anSQLString, theFn);
	}

	//---
	function _updateRow(theCx, theTable, theValues, theKey, theID, theUpdateTSField, theTS, theFn)
	{
		_assert(theCx);
		_assert(!_isCxDefault(theCx), "cannot use default connection to DB for Updating a Row, must be in transaction");

		_assert(theTable);
		_assert(theValues);
		_assert(theKey);
		_assert(theID);
		_assert(theUpdateTSField);
		_assert(theTS);
	
		//--
		_assert(theValues[theUpdateTSField]);

		var lastUpdateTS = theValues[theUpdateTSField];
		theValues[theUpdateTSField] = theTS;

		var anSQLString = 'UPDATE ' + theTable + ' SET ';
		var numFields = Object.keys(theValues).length;

		var aCount = 0;
		for (var k in theValues) 
		{
			aCount++;
			anSQLString += (k + '=' + mysql.escape(theValues[k]));
			if (aCount !== numFields) 
			{
				anSQLString += ', ';
			}
		}
		var aWhere = _tsWhere(theKey, theID, theUpdateTSField, lastUpdateTS);
		
		anSQLString += " WHERE " + aWhere;
		
		_doSQL(theCx, anSQLString, theFn);
	}

	// helper fn - used in testing.
	function _createTable(theTable, theStructure, theFn)
	{
		_assert(theTable);
		_assert(theStructure);
		theFn = theFn || _logIfDbError;
	
		var anSQLString = 'CREATE TABLE ' + theTable + '(';

		var numFields = theStructure.length;
		var aCount = 0;
		for (var k of theStructure) {
			aCount++;
			anSQLString += k;
			if (aCount !== numFields) {
				anSQLString += ' , ';
			}
		}
		anSQLString += ')';
		_cxPool.query(anSQLString, theFn);	// only place where _cxPool is used directly - bar _doSQL and _query.
	}

	return {
		//-- override default fns.
		setAssert: 				_setAssert,
		setLogFn: 				_setLogFn,
		setWaitFor:				_setWaitFor,

		//-- must be set before starting
		setDBConnection: 		_setDBConnection,

		createdID: 				function(theResult) { return theResult.insertId; },
		isSuccess: 				function(theResult) {return theResult.affectedRows === 1; },
		isExistingID: 			function(theID) { return theID && (theID > 0); },
		newID: 					function() { return 0; },

		simpleWhere: 			_simpleWhere,
		tsWhere: 				_tsWhere,

		cxDefault: 				_cxDefault,
		query: 					_query,
		createRow:     			_createRow,
		updateRow: 				_updateRow,
		beginTransaction: 		_beginTransaction,
		endTransaction: 		_endTransaction,
		inTransaction: 			_inTransaction,
		format: 				mysql.format,
		doSQL: 					_doSQL,
		createTable: 			_createTable,
	};
})();

// this code will only run in a Fiber - using wait.launchFiber(function(){ ... });
// The Fiber must be started at an appropriate external place.
// Bear in mind that Fibers run asychronously with respect to each other, so results are out of sync.
// TESTS will need to grap their own Fiber, so must be co-ordinated accordingly.

var dbSync = (function() 
{
	function _query(theCx, theWhat, theTable, theWhere) 
	{
		_assert(theCx !== undefined);
		_assert(theWhat);
		_assert(theTable);
		theWhere = theWhere || '';

		var aResult = _dbWaitFor( db.query, theCx, theWhat, theTable, theWhere );
		return aResult;
	}

	function _doSQL(theCx, theSQL)
	{
		_assert(theCx !== undefined);
		_assert(theSQL);

		var aResult = _dbWaitFor(db.doSQL, theCx, theSQL);
		return aResult;
	}

	function _beginTransaction() 
	{
		var aResult = _dbWaitFor(db.beginTransaction);
		return aResult;
	}

	function _endTransaction(theCx, isRollbackCondition) 
	{ 
		_assert(theCx);
		// isRollbackCondition can be undefined, in which case false.

		var aResult = _dbWaitFor(db.endTransaction, theCx, isRollbackCondition);
		return aResult;
	}

	function _createRow(theCx, theTable, theValues) 
	{
		_assert(theCx);
		_assert(theTable);
		_assert(theValues);

		var aResult = _dbWaitFor(db.createRow, theCx, theTable, theValues);
		return aResult;
	}

	function _updateRow(theCx, theTable, theValues, theKey, theID, theUpdateTSField, theTS)
	{ 
		_assert(theCx);
		_assert(theTable);
		_assert(theValues);
		_assert(theKey);
		_assert(theID);
		_assert(theUpdateTSField);
		_assert(theTS);

		var aResult = _dbWaitFor(db.updateRow, theCx, theTable, theValues, theKey, theID, theUpdateTSField, theTS);
		return aResult;
	}

	return {
		query: 					_query,
		beginTransaction: 		_beginTransaction,
		endTransaction: 		_endTransaction,
		createRow:  			_createRow,
		updateRow: 				_updateRow,
		doSQL: 					_doSQL,

		//-- override default fns.
		setAssert: 				db.setAssert,
		setLogFn: 				db.setLogFn,
		setWaitFor:				db.setWaitFor,

		//-- must be set before starting
		setDBConnection: 		db.setDBConnection,
		createdID: 				db.createdID,
		isSuccess: 				db.isSuccess,
		cxDefault:  			db.cxDefault,
		format: 				db.format,
		isExistingID: 			db.isExistingID,
		newID: 					db.newID,
		simpleWhere: 			db.simpleWhere,
		tsWhere: 				db.tsWhere,
		inTransaction: 			db.inTransaction,

	};
})();

module.exports = dbSync;

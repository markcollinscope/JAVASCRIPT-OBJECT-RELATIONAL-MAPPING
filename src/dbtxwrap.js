'use strict';

// simple wrapper to make life easy when using transactions in the dbSync module
// also placeholder for in memory-cache of domain objects, which would almost certainly require 
// to interract with transactions.

//---
//---
var dbSync = require('./db');

var dbTransactionWrap = (function()
{
	function _doTransaction(theTxFunction)
	{
		var aCx = dbSync.beginTransaction();
		var isOk = undefined;
		var doRollback = false;
		try 
		{
			theTxFunction(aCx);
		}
		catch(err)
		{
			doRollback = true;
			throw err;
		}
		finally
		{
			isOk = dbSync.endTransaction(aCx, doRollback);			
		}
		return isOk;	// only tells if tx failed on the end transaction - not very useful.
	}

	return {
		doTransaction: 		_doTransaction,
	};
})();

module.exports = dbTransactionWrap;

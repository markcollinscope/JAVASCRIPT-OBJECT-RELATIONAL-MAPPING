'use strict'

var ass = require('./ass');
var uts = require('./utils');

var ErrorDataModule = (function() {
	var _type = 'user validation';

	// error exception type - either pass a simple message or build up a complex set of errors.
	function _error(theSimpleMessage)
	{
		var _singleErrMsg = undefined;
		var _errors = [];
		var _errorCount = 0;

		if (theSimpleMessage) _addError(theSimpleMessage);

		function _addError(theErrorText, theFieldName) 
		{
			ass.ok(theErrorText);
		
			theFieldName = theFieldName || 'no field specfied';
		
			_errors.push( {
				message: 	theErrorText,
				field: 		theFieldName,
			});
			_errorCount++;

			_singleErrMsg = _singleErrMsg ? _singleErrMsg + '... ' : '\n';
			_singleErrMsg += theErrorText;

			_uedLog("ERR MSG NOW: " + _singleErrMsg);
		}

		function _hasErrors()
		{
			return _errorCount !== 0;
		}

		function _getErrors()
		{
			return _errors;
		}

		function _message()
		{
	   		return _singleErrMsg;
		}

		return {
			addError: 	_addError,
			hasErrors:  _hasErrors,
			getErrors: 	_getErrors,
			type: 		_type,
			message: 	_message,
		};
	}

	function _isError(theError)
 	{
		return theError.type && theError.type === _type;
	}

	function _throw(theE) 
	{ 
		if (theE.hasErrors())
		{
		 	throw theUE; 
		}
	}

	return {
		error: 					_error,
		isError:  				_isError,
		throw: 					_throw
	}	
})();

module.exports = ErrorDataModule;

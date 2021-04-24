'use strict';

// custom assertion module that can be switched off.
// does a lot of JS type checking (runtime)

var _assert = (function()
{
	// historically theArr.includes() wasn't available! maintained for back compatibitily.
	var _arrContainsValue = (function(theArr, theValue) 
	{
		return theArr.includes(theValue);
	});

	// Field = Prop - NB: will include any props from base objects.
	var _objContainsField =  (function(theObj, theValue) 
	{
		var isContained = false;
		for (var v in theObj) {
			isContained = (v === theValue);
			if (isContained) break;
		}
		return isContained;
	});

	var _objMustHaveFields = (function(theObj, theValues) 
	{
		if (theValues.length === 0 || !theObj) return true;

		var isContaining = true;
		for (var v of theValues) {
			if (!_objContainsField(theObj, v)) {
				isContaining = false;
				break;
			}
		}
		return isContaining;
	});

	var _objCanOnlyHaveFields = (function(theObj, theValues)
	{
		var isOkay = true;
		if (!theObj) return isOkay;
		
		for (var v in theObj) {
			isOkay = (_arrContainsValue(theValues, v ));
			if (!isOkay) break;
		}
		return isOkay;
	});

	var _assertionOn = true;

	function _setAssertionOff()
	{
		_assertionOn = false;
	}

	var _checkObject = (function(theObject, theMandatory, theOptional, theMsg)
	{
		var allFields = theMandatory.concat(theOptional);
		_ok(_objMustHaveFields(theObject, theMandatory), theMsg);
		_ok(_objCanOnlyHaveFields(theObject, allFields), theMsg);
	});

	//---
	function _ok(theConstraint, theMessage)
	{
		if (!_assertionOn) return;
		_okIfUndefined(theMessage);

		if (!theConstraint) 
		{
			var aMessage = theMessage;
			aMessage = "Assertion Error: " + aMessage + '\n\n' + new Date() + '\n';
			
			throw aMessage;
		}
		return;
	}

	function _okFunction(theFn)
	{
		if (!_assertionOn) return;
		_ok(typeof theFn === 'function', 'error - not a function: ' + theFn);
	}

	function _okArray(theArr, allowUndefined = false)
	{
		if (!_assertionOn) return;

		if ( ! (allowUndefined && (theArr === undefined)) )
		{	
			var isArray = (theArr && theArr.constructor === Array);
			_ok(isArray, 'Error - not an Array: ' + JSON.stringify(theArr));
		}
	}

	function _okObject(theObj, allowNullOrUndefined)
	{
		if (!_assertionOn) return;

		var isObject = false;
		
		if ( allowNullOrUndefined && ((theObj === null) || (theObj === undefined)) )
			isObject = true;
		else 
			isObject = (typeof theObj === 'object');

		_ok(isObject, 'Error - not an Object: ' + JSON.stringify(theObj));
	}

	function _okString(theString)
	{
		if (!_assertionOn) return;
		_ok(typeof theString === 'string', 'error - not a string: ' + theString);
	}

	function _okNum(theNum)
	{
		if (!_assertionOn) return;
		_ok( theNum !== 'NaN' && typeof theNum === 'number' , 'error - not a number: ' + theNum);
	}

	function _okIfUndefined()
	{
		return;
	}

	function _okIfZero(theValue)
	{
		if (!_assertionOn || theValue || (theValue === 0)) return;
		_ok(false, "Value is not Zero and is Falsy");
	}

	function _notUndefined(theValue)
	{
		if ( !_assertionOn || (theValue !== undefined) ) return;
		_ok(false, "Value is Undefined - shound not be: " + theValue);
	}

	//---
	var _typeArr = [];
	function _regType(theTypeName, theMandatory, theOptional, allowDuplicateOverride)
	{
		_ok(theTypeName);
		_okIfUndefined(theMandatory);
		_okIfUndefined(theOptional);

		if (!allowDuplicateOverride)
		{
			_ok(!_typeArr[theTypeName], "Duplidate type: " + theTypeName);
		}

		var t = _typeArr[theTypeName] = {};
		t.mandatory = theMandatory || [];
		t.optional = theOptional || [];

		return theTypeName;
	}

	function _okType(theTypeName, theObject, theMsg)
	{
		if (!_assertionOn) return;

		_ok( _typeArr[theTypeName], "No such type: " + theTypeName + " " + theMsg);
		var m = _typeArr[theTypeName].mandatory;
		var o = _typeArr[theTypeName].optional;
		
		_checkObject(theObject, m, o, theMsg);
	}

	//---
	var _enums = {};
	function _regEnum(theEnumName, theEnumValues, allowDuplicateOverride)
	{

		if (!allowDuplicateOverride)
		{
			_ok(!_enums[theEnumName], "Duplidate Enum: " + theEnumName);
		}

		_enums[theEnumName] = theEnumValues;

		return theEnumName;
	}

	function _okEnum(theEnumName, theValue, theMsg)
	{
		if (!_assertionOn) return;
		
		var allowed = _enums[theEnumName];

		if (theValue !== undefined)
		{
			const isAllowedValue = allowed.includes(theValue);
			_ok(isAllowedValue, theMsg + "Enum value error (enum, value) " + theEnumName + " " + theValue);
		}
	}

	function _okImplies(theCondition, theImpliedValue, theMsg)	// theCondition -> theImpliedValue
	{
		if (!_assertionOn) return;
		_ok(!theCondition || theImpliedValue, "assert implication rule broken " + theMsg);
	}

	function _notYetUsed(theValue, theMsg) 
	{
		if (!_assertionOn) return;
		_ok(theValue === undefined, theMsg);
	}

	return {
		setAssertionOff: 		_setAssertionOff,
		ok: 					_ok,
		okIfUndefined: 			_okIfUndefined,
		okIfUndefinedOrFalsy: 	_okIfUndefined,
		okIfUOF: 				_okIfUndefined,
		notUndefined: 			_notUndefined,
		okImplies: 				_okImplies,
		okIfZero: 				_okIfZero,
		regType: 				_regType,
		okType: 				_okType,
		regEnum: 				_regEnum,
		okEnum:  				_okEnum,
		okFunction: 			_okFunction,
		okArray: 				_okArray,
		okObject: 				_okObject,
		okString: 				_okString,
		okNum: 					_okNum,
		toDeprecate: 			_okIfUndefined,
		notYetUsed: 			_notYetUsed,
	};
})();

module.exports = _assert;
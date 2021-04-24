'use strict';

const ass = require('./ass');

//---
const utils = (function() {
	const _arrContainsValue = (function(theArr, theValue) 
	{
		var isContained = false;
		for (var v of theArr) 
		{
			isContained = (v === theValue);
			if (isContained) break;
		}
		return isContained;
	});

	const _objContainsField =  (function(theObj, theValue) 
	{
		var isContained = false;
		for (var v in theObj) {
			isContained = (v === theValue);
			if (isContained) break;
		}
		return isContained;
	});

	function _leftPad(number, targetLength) 
	{
    	var output = number + '';
    	while (output.length < targetLength) 
    	{
	        output = '0' + output;
	    }
      	return output;
	}

	// formats
	const SHORT = 'date-short';
	const LONG = 'date-long';
	const SINCE = 'date-since';
		
	// locales
	const UK_LOCALE = 1;

	// human readable relative times
	const MIN = 1000 * 60;
	const MIN_NOW = 4;
	const FEW_MINUTES = 20;
	const HOUR_IN_MINUTES = 60;

	const HOUR = MIN * 60;
	const FEW_HOURS = 3;
	const DAY_IN_HOURS = 24;
	
	const DAY = HOUR * 24;
	const WEEK_IN_DAYS = 7;

	const WEEK = DAY * 7;

	function _sinceDate(theDate)
	{
		var now = new Date();
		var msDiff = now - theDate;

		var minutes = Math.floor(msDiff / MIN);
		if (minutes < MIN_NOW) return 'just now';
		if (minutes < FEW_MINUTES) return 'a few minutes ago';
		if (minutes < HOUR_IN_MINUTES) return minutes + ' minutes ago';

		var hours = Math.floor(msDiff / HOUR);
		if (hours < FEW_HOURS) return 'a couple of hours ago';
		if (hours < DAY_IN_HOURS) return hours + ' hours ago';

		var days = Math.floor(msDiff / DAY);
		if (days === 1) return 'about a day ago';
		if (days < WEEK_IN_DAYS) return days + ' days ago';

		var weeks = Math.floor(msDiff / WEEK);
		if (weeks === 1) return 'about a week ago';
		
		return weeks + ' weeks ago';
	}

	const _dateString = (function(theFormatSpecifier, theDate, theLocale)
	{
		var format = theFormatSpecifier || LONG;
		var d = theDate ? new Date(theDate) : new Date();
		var locale = theLocale || UK_LOCALE;

		ass.ok(locale === UK_LOCALE, "only UK date formats supported currently");

		var dt = '';
		if (format === LONG) 
		{
			dt += d.getFullYear() + '/';
			dt += _leftPad(d.getMonth()+1,2) + '/';
			dt += _leftPad(d.getDate(),2) + '/';
			dt += _leftPad(d.getHours(),2) + ':';
			dt += _leftPad(d.getMinutes(),2) + ':';
			dt += _leftPad(d.getSeconds(),2) + ':';
			dt += _leftPad(d.getMilliseconds(),3);
		}
		else if (format === SHORT)
		{
			dt += _leftPad(d.getDate(),2) + '/';
			dt += _leftPad(d.getMonth()+1,2) + '/';
			dt += d.getFullYear();
		}
		else if (format === SINCE)
		{
			dt = _sinceDate(d);
		}
		else
		{
			ass.ok(false, 'invalid date string format/length given');
		}
		
		return dt;
	});

	function _defaultTrue(theBool)
	{
		return (theBool === undefined) ? true : theBool;
	}

	function _firstDefinedIndex(theArray) 
	{
		ass.ok(theArray);
		
		var count = undefined;
		var found = false;
		for (var i = 0; i < theArray.length; i++)
		{
			if (theArray[i])
			{
				found = true;
				count = i;
				break;
			}
		}
		return count;
	}

	function _firstDefinedValue(theArray) 
	{
		var index = _firstDefinedIndex(theArray);

		var retVal = undefined;
		if (index !== undefined) retVal = theArray[index];

		return retVal;
	}

	function _reExport(theSelf, theInterfaceToReExport)
	{
		ass.ok(theSelf);
		ass.ok(theInterfaceToReExport);

		var iface = theInterfaceToReExport;

		for (var k in iface)
		{
			ass.ok(! _objContainsField(theSelf, k), "Duplicate value in re-export: " + k);
			theSelf[k] = iface[k];
		}
	}

	const _objMustHaveFields = (function(theObj, theValues) 
	{
		var isContaining = true;
		for (var v of theValues) {
			if (!_objContainsField(theObj, v)) {
				console.log("POSSIBLE PROG ERROR: Object DOES NOT have field: ", v);
				isContaining = false;
				break;
			}
		}
		return isContaining;
	});

	const _objCanOnlyHaveFields = (function(theObj, theValues)
	{
		var isOkay = true;
		for (var v in theObj) {
			isOkay = (_arrContainsValue(theValues, v ));
			if (!isOkay) 
			{
				console.log("PROG ERROR: Object should NOT have field", v);
				break;
			}
		}
		return isOkay;
	});

	const _checkObject = (function(theObject, theMandatory, theOptional)
	{
		var allFields = theMandatory.concat(theOptional);
		ass.ok(_objMustHaveFields(theObject, theMandatory));
		ass.ok(_objCanOnlyHaveFields(theObject, allFields));
	});

	//---
	var _typeArr = [];
	function _regType(theTypeName, theMandatory, theOptional)
	{
		ass.ok(theTypeName);
		ass.okIfUndefined(theMandatory);
		ass.okIfUndefined(theOptional);
		ass.ok(!_typeArr[theTypeName], "Duplidate type: " + theTypeName);

		var t = _typeArr[theTypeName] = {};
		t.mandatory = theMandatory;
		t.optional = theOptional;
	}

	function _okType(theObject, theTypeName)	// TODO Deprecate.
	{
		ass.ok( _typeArr[theTypeName], "No such type: " + theTypeName );
		var m = _typeArr[theTypeName].mandatory;
		var o = _typeArr[theTypeName].optional;
		
		_checkObject(theObject, m, o);
	}
	//---

	const _isFunction = (function(theFn)
	{ 
		return typeof theFn === 'function'; 
	});

	const _randomValue = (function(upperLimit) 
	{
		return Math.floor(Math.random() * upperLimit);
	});

	const _newObjFromPrototype = (function(newProperties, oldObj, ignoreUndefined) 
	{
		var newObj = {};
		for (var okey in oldObj)
		{
			var v = oldObj[okey];
			if (!ignoreUndefined || (v !== undefined))
			{
				newObj[okey] = oldObj[okey];
			}
		}

		for (var pkey in newProperties) 
		{
			var w = newProperties[pkey];
			if (!ignoreUndefined || (w !== undefined))
			{
				newObj[pkey] = newProperties[pkey];
			}
		}
		return newObj;
	});

	function _parseIntReturnUndefinedIfNan(theInt)
	{
		var retval = parseInt(theInt);
		retval = (isNaN(retval) ? undefined : retval);
		return retval;
	}

	//---
	function _stringSubst(theString, theSubstObject)
	{
		ass.okObject(theSubstObject);
		ass.okString(theString);
		//---

		var newString = theString;
		for (var key in theSubstObject)
		{
			var valueToSubst = theSubstObject[key];
			newString = newString.replace(key, valueToSubst);
		}
		return newString;
	}

	return {
		// constants.
		SHORT: 							SHORT,
		LONG: 							LONG,
		SINCE: 							SINCE,
		UK_LOCALE: 						UK_LOCALE,

		// fns.
		stringSubst: 					_stringSubst,
		randomValue: 					_randomValue,
		dateString: 					_dateString,
		isFunction: 					_isFunction,

		newObjFromPrototype: 			_newObjFromPrototype,	
		newObjFromProperties: 			_newObjFromPrototype,
		addFieldsToObject: 				_newObjFromPrototype,

		//---
		objMustHaveFields: 				_objMustHaveFields,
		objCanOnlyHaveFields: 			_objCanOnlyHaveFields,
		checkObject: 					_checkObject,

		arrContainsValue: 				_arrContainsValue,
		objContainsField: 				_objContainsField,

		parseIntReturnUndefinedIfNan: 	_parseIntReturnUndefinedIfNan,
		parseIntRUIN: 					_parseIntReturnUndefinedIfNan,					

		reExport: 						_reExport,
		defaultTrue: 					_defaultTrue,
		firstDefinedIndex: 				_firstDefinedIndex,
		firstDefinedValue: 				_firstDefinedValue,

		defaultFn: (function(theFn, theDefaultFn) 
		{ 
			ass.ok(theFn === undefined || _isFunction(theFn));
			return theFn || theDefaultFn;
		}),

		//---
		objSimpleCopy: (function(theObj) 
		{
			var newObj = {};
			for (var k in theObj) {
				newObj[k] = theObj[k];
			}
			return newObj;
		}),

		copyKVByKList: (function(pArr, oldObj) 
		{
			var newObj = {};
			for (var p in pArr) {
				newObj[pArr[p]] = oldObj[pArr[p]];
			}
			return newObj;
		}),

		// TODO - See if this is duplicate of Object.keys, etc.
		kvToArrK: (function(kvObj) 
		{
			var newKArr = [];
			for (var k in kvObj) {
				newKArr.push(k);
			}
			return newKArr;
		}),

		kvToArrV: (function(kvObj) 
		{
			var newVArr = [];
			for (var k in kvObj) {
				newVArr.push(kvObj[k]);
			}
			return newVArr;
		}),

		nullFn: (function() {}),

		//---
		toImperialHeight: function(theFeet, theInches)
		{
			if (theFeet && theInches)
				return (theFeet * 12) + theInches;
			else
				return 0;
		},

		fromImperialHeight: function (theInches)
		{
			theInches = theInches || 0;

			var feet = Math.floor(theInches / 12);
			var inches = theInches % 12;
		
			return feet + "' " + inches + '"';
		},

		randomString: function(theLength, onlyDigits) 
		{
			var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
			if (onlyDigits)
				chars = "0123456789";

			var chlen = chars.length;

			var aString = '';
			for (var i=0; i<theLength; i++) {
				aString += chars[_randomValue(chlen)];
			}
			return aString;
		},

		truncateString: function(theString, theLen)
		{
			var aString = theString;
			
			if (theString && (theString.length > theLen))
			{
				aString = theString.substring(0,theLen);
			}
			return aString;
		},

		jss: 	function(theString) {
			return JSON.stringify(theString);
		},
	};
})();

module.exports = utils;

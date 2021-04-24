'use strict';

// edit as necessary. min lengths for name/passwd.
const MINNICKNAME = 	5;
const MINPASSWD =		8;

// npm packages. uncomment when installed.
const encrypt = 	{} 	// require('encrypt');
const val = 		{}  // require('validator');

//---
const ass = 			require('./ass');
const dbSync = 			require('./db');
const DomainObject = 	require('./DomainObject');

var errMod = 			require('./ErrorData');
var errObj = 			require('./ErrorData').error;

var User = function(theID)
{
	var  _typeName = "User";
	var _table = 'ha_user';
	var _IDKeyField = 'userID';

	var _mandatoryFields = [
		"userID", 
		"userEmail", 
		"userNickname", 
		"userPassword",
		"userValidated",
	];
	
	// TS Optional as they don't have to be set. DO deals with that on save().
	var _optionalFields = [
		"userName",
		"userFamilyName",
		"userSecretCode",
		"userIsAdmin",
		"userRegion",	// mv to mandatory when deprecating default in DB. TODO
		"userDeleted",
		"userPhotoID",
		"userAge",
		"userSummary",
		"userCreateTS", 
		"userUpdateTS"
	];
	var _createTS = "userCreateTS";
	var _updateTS = "userUpdateTS";

	var _baseDomainObject = DomainObject(
		_typeName,
		_table,
		_IDKeyField,
		_mandatoryFields,
		_optionalFields,
		_createTS,
		_updateTS,
		_doUserSpecificValidation,
		theID
	);

	function _doUserSpecificValidation()
	{
		// uses the public interface of DomainObject - no private access.
		var aUserData = _baseDomainObject.get(false);	// false - stop mutual rrecursion.
		function _validate() 
		{
			ass.ok(aUserData.userNickname);
			var minNicknameLen = MINNICKNAME;
			var minPasswordLen = MINPASSWD;

			var anErr = uErrObj();

			if (aUserData.userNickname.length < minNicknameLen)
			{
				anErr.addError("nickname too short - minimum is " + minNicknameLen + " characters");
			}
			if (aUserData.userPassword.length < minPasswordLen)
			{
				anErr.addError("password too short - minimum is " + minPasswordLen + " characters");
			}
		
			// don't validate encrypted password.
			if (!val.isEmail(aUserData.userEmail))
			{
				anErr.addError("invalid email address:" + aUserData.userEmail + " please try again");
			}
			uErrMod.throw(anErr);
		}
		
		_validate();
	}

	//--- User specifc functions to assist in login (don't follow normal DO access pattern)
	//--- can be considered 'static' -- access using User().idByEmail(email) - for example.
	var emailField = 'userEmail';
	var nicknameField = 'userNickname';

	function _idByEmail(theEmail)
	{
		ass.ok(theEmail !== undefined );

		var aWhere = dbSync.simpleWhere(emailField, theEmail );
		var returnDataArray = dbSync.query(dbSync.cxDefault(), '*', _table, aWhere);
		var returnData = returnDataArray ? returnDataArray[0] : undefined;
		var retID = returnData ? returnData.userID : undefined;
		return retID;
	}

	function _idByNickname(theNickname)
	{
		ass.ok(theNickname !== undefined);

		var aWhere = dbSync.simpleWhere(nicknameField, theNickname );
		var returnDataArray = dbSync.query(dbSync.cxDefault(), '*', _table, aWhere);
		var returnData = returnDataArray ? returnDataArray[0] : undefined;
		var retID = returnData ? returnData.userID : undefined;

		return retID;
	}

	function _passwordByID(theID)
	{
		ass.ok(theID !== undefined);

		var aWhere = dbSync.simpleWhere(_IDKeyField, theID );
		var returnDataArray = dbSync.query(dbSync.cxDefault(), '*', _table, aWhere);
		var returnData = returnDataArray ? returnDataArray[0] : undefined;
		var retPassword = returnData ? returnData.userPassword : undefined;

		return retPassword;
	}

	function _login(theEmail, thePassword) 
	{
		var aPasswordMatch = false;
		var anID = undefined;

		if (theEmail)
		{
			anID = _idByEmail(theEmail);
			if (anID)
			{
				var aPassword = _passwordByID(anID);
				aPasswordMatch = encrypt.isCorrectPassword(thePassword, aPassword);
			
				var aUser = User(anID);
				var userData = aUser.get();
				if (userData['userDeleted']) aPasswordMatch = false;
			}	
		}

		var anErr = errObj();
		if (!anID || !aPasswordMatch) anErr.addError('login incorrect');
		uErrMod.throw(anErr);

		var userd = User(anID).get();
		if (!userd.userValidated) anErr.addError('this email has not yet been validated - try again after validation');
		
		errMod.throw(anErr);
		return anID;
	}


	// return object with _baseDomainObject as prototype - inherit all methods, data, etc. +
	var _self = Object.create(_baseDomainObject);

	_self.idByEmail = _idByEmail;
	_self.idByNickname = _idByNickname;
	_self.login = _login;

	return _self;
};

module.exports = User;

'use strict';

var uts = require('./utils');
var DomainObject = require('./DomainObject');

//---
var Photo = function(theID)
{
	var _fields = {
		ID : 			'photoID',
		USER_ID : 		'photoUserID',
		THUMB : 		'photoThumb',
		LARGE : 		'photoLarge',
		REPORTED :  	'photoReported',
		DELETED : 		'photoDeleted',
		ADULT : 		'photoAdult',
		APPROVED : 		'photoApproved',
		ADMIN_NOTES : 	'photoAdminNotes',
		REPORTED_NOTES: 'photoReportedNotes',
		CREATE_TS: 		'photoCreateTS',
		UPDATE_TS: 		'photoUpdateTS'
	};

	const  _typeName = "Photo";
	const _table = 'ha_photo';
	const _IDKeyField = _fields.ID;

	const _createTS = _fields.CREATE_TS;
	const _updateTS = _fields.UPDATE_TS;

	// this stuff is used for run time checking, mapping to DB tables...
	var _mandatoryFields = [
		_IDKeyField,
		_fields.USER_ID,
		_fields.THUMB,
		_fields.LARGE,
		_fields.REPORTED,
		_fields.DELETED,
		_fields.ADULT,
		_fields.APPROVED
	];

	var _optionalFields = [
		_fields.REPORTED_NOTES,
		_fields.ADMIN_NOTES,
		_createTS,
		_updateTS,
	];

	// 'inheritance' the prototype way.
	var _baseDomainObject = DomainObject(
		_typeName,
		_table,
		_IDKeyField,
		_mandatoryFields,
		_optionalFields,
		_createTS,
		_updateTS,
		_doPhotoSpecificValidation,
		theID
	);

	// no photo specific validation.
	function _doPhotoSpecificValidation() {}
	
	var _self = 	Object.create(_baseDomainObject);
	_self = 		uts.addFieldsToObject(_fields, _self);
	_self.fields = _fields;

	//---
	return _self;
};

module.exports = Photo;

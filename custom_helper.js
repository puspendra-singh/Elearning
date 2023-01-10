/** Load All required Modules */
const {book_new,aoa_to_sheet,book_append_sheet} = require("xlsx").utils;
const {unlink,stat,existsSync,mkdirSync} = require("fs");
const {Provider,Notification}	= require("apn");
const {createTransport}	= require("nodemailer");
const {write} 		= require("xlsx");
const {renderFile} 	= require("ejs");
const slug 			= require("slug");
const clone			= require("clone");
const asyncEach		= require("async/each");
const asyncParallel	= require("async/parallel");
const {ObjectId}	= require("mongodb");
const dateFormat	= require("dateformat");
const {exec} 		= require("child_process");
const {generate} 	= require("randomstring");

/**
 * Function for parse validation
 *
 * @param validationErrors  As validationErrors Array
 * @param req				As Request Data
 *
 * @return array
 */
parseValidation = (validationErrors,req)=>{
	let usedFields 		= [];
	let newValidations 	= [];
	if(Array.isArray(validationErrors)){
		validationErrors.map((item)=>{
			if(usedFields.indexOf(item.param) == -1){
				usedFields.push(item.param);
				newValidations.push(item);
			}
		});
		return newValidations;
	}else{
		return false;
	}
}//End parseValidation();


/**
 * Function for parse validation
 *
 * @param validationErrors  As validationErrors Array
 * @param req				As Request Data
 *
 * @return object
 */
 parseValidationFront = (validationErrors,req)=>{
	let usedFields 		= [];
	let newValidations 	= [];
	if(Array.isArray(validationErrors)){
		validationErrors.map((item)=>{
			if(usedFields.indexOf(item.param) == -1){
				newValidations.push(item.msg)
			}
		});
		return newValidations;
	}else{
		return false;
	}
}//End parseValidation();



/** User email and phone unique validation 
 * @options table_name as collection name
 * @options field_value as search value
 * @options field_name as collection column name
*/
checkUniqueValue = (options)=>{
	return new Promise(resolve=>{
	  let collectionName  = (options.table_name)     ? options.table_name : '';
	  let fieldValue      = (options.field_value)    ? options.field_value : '';
	  let fieldName       = (options.field_name)     ? options.field_name : '';
	  let oldId           = (options.old_id)         ? options.old_id : '';
	  let countryCode     = (options.country_code)   ? options.country_code : '';
  
	  /** Invalid */
	  if(!collectionName || !fieldValue || !fieldName) return resolve({status : STATUS_ERROR,result : {}})
  
	  /** Search condition */
	  let searchCondition = {is_deleted : NOT_DELETED};
	  if(oldId) searchCondition['_id'] = {$ne : ObjectId(oldId)};
  
	  if(fieldName == USER_VERIFICATION_TYPE_EMAIL){
		searchCondition['email'] = { $regex: new RegExp("^" + fieldValue, "i") } 
	  }
	  if(fieldName == USER_VERIFICATION_TYPE_MOBILE){
		searchCondition['phone'] = fieldValue
		searchCondition['country_code'] = { $regex: new RegExp("^" +countryCode, "i") };
	  }

	  /** Search data in collection */
	  let collection = db.collection(String(collectionName));
	  collection.findOne(searchCondition,(err, result)=>{
		if(!err && !result){
		  return resolve({
			status  : STATUS_SUCCESS,
			result  : result
		  })
		}else{
		  return resolve({
			status : STATUS_ERROR,
			result : result
		  })
		} 
	  })
	})
  }

/**
 * Function to send Email
 *
 * @param to		As Recipient Email Address
 * @param repArray  As Response Array
 * @param action  	As Email Action
 *
 * @return array
 */
sendMail = (req,res,options)=>{
	try{
		let to				=	(options && options.to)			?	options.to			:"";
		let repArray		=	(options && options.rep_array)	?	options.rep_array	:"";
		let action			=	(options && options.action)		?	options.action		:"";
		let attachments		=	(options && options.attachments)?	options.attachments	:"";
		let subject			=	(options && options.subject)	?	options.subject		:"";

		let userEmail		=	res.locals.settings["Email.user_email"];
		let emailHost		=	res.locals.settings["Email.host"];
		let emailPassword	=	res.locals.settings["Email.password"];
		let emailUserName	=	res.locals.settings["Email.user_name"];
		let emailPort		=	res.locals.settings["Email.port"];

		const transporter 	= 	createTransport({
			host	: 	emailHost,
			port	: 	emailPort,
			secure	: 	(emailPort == 465) ? true : false, // true for 465, false for other ports
			auth	: 	{
				user: userEmail, // generated ethereal user
				pass: emailPassword // generated ethereal password
			},
			tls: {
				rejectUnauthorized: true
			}
		});

		const email_templates	=	db.collection('email_templates');
		const email_actions		= 	db.collection('email_actions');

		/** Get Email template details **/
		email_templates.findOne({action : action},{projection:{_id:1,name:1,subject:1,body:1}},(err, result)=>{
			
			if(!err && result){

				let emailTemplateResult	= result;

				/** Get Email action details **/
				email_actions.findOne({action : action},{projection:{_id:1,options:1}},(emailErr, emailResult)=>{
					if(!emailErr && emailResult){

						let actionData 		= 	emailResult;
						let actionOptions 	= 	actionData.options.toString().split(",");
						let body			= 	emailTemplateResult.body;
						subject				= 	(subject) ? subject : emailTemplateResult.subject;
						actionOptions.forEach((value,key)=>{
							body = body.replace(RegExp('{'+value+'}','g'),repArray[key]);
						});

						/** get email layout **/
						renderFile(WEBSITE_LAYOUT_PATH + 'email.html',{settings:res.locals.settings},'',(err, html)=>{
							html 		= html.replace(RegExp('{{MESSAGE_BODY}}','g'),body);
							let mailOptions = {
								from	: 	emailUserName,
								to		: 	to,
								subject	: 	subject,
								html	: 	html
							};

							/** Send  attachment **/
							if(attachments){
								mailOptions["attachments"]	=	{
									path :	attachments
								};
							}

							/**Send email*/
							transporter.sendMail(mailOptions,(error, info)=>{
								/** Save email logs details **/
								const email_logs = db.collection("email_logs");
								mailOptions.is_sent = (error) ? false :true;
								mailOptions.error	= error;
								mailOptions.created = getUtcDate();
								email_logs.insertOne(mailOptions);

								if(error){
									console.error('error');
									return console.error(error);
								}
							});
						});
					}else{
						return console.log('Error in email action');
					}
				})
			}else{
				return console.log('Error in email template');
			}
		})
	}catch(e){
		console.log("email error in sendMail function");
		console.log(e);
	}
};//end sendMail();


/**
 * Function for socket request from any where
 *
 * @param req		As Request Data
 * @param res		As Response Data
 * @param options	As options
 *
 * @return null
 */
socketRequest = (req,res,options)=>{
	if(SOCKET_ENABLE){
		if(typeof options.room_id !== typeof undefined && typeof options.emit_function !== typeof undefined){
			clientSideSocket.emit('socketRequest', options);
		}else{
			return res.__("system.missing_parameters");
		}
	}
};//end socketRequest()

/**
 * Function to get date in any format with utc format
 *
 * @param date 		as	Date object
 * @param format 	as 	Date format
 *
 * @reference Site : https://www.npmjs.com/package/dateformat
 *
 * @return date string
 */
getUtcDate = (date,format)=>{
	if(date){
		var now = new Date(date);
	}else{
		var now = new Date();
	}
	//let changedDate = 	now.setTimezone("UTC");
	if(format){
		return dateFormat(now, format);
	}else{
		return now;
	}
};//end getUtcDate();

/**
 * Function to get date in any format
 *
 * @param date 		as	Date object
 * @param format 	as 	Date format
 *
 * @return date string
 */
newDate = (date,format)=>{
	if(date){
		var now 			= new Date(date);
	}else{
		var now 			= new Date();
	}
	if(format){
		return dateFormat(now, format);
	}else{
		return now;
	}
};//end newDate();

/**
 * Function for change file name
 *
 * @param fileName AS File Name
 *
 * @return filename
 */
changeFileName = (fileName)=>{
	let fileData		=	(fileName) ? fileName.split('.') : [];
	let extension		=	(fileData) ? fileData.pop() : '';
	fileName			=	fileName.replace('.'+extension,'');
	fileName			= 	fileName.replace(RegExp('[^0-9a-zA-Z\.]+','g'),'');
	fileName			= 	fileName.replace('.','');
	return fileName+'.'+extension;
};//end changeFileName();

/**
 * Function for make string to title case
 *
 * @param str AS String
 *
 * @return string
 */
toTitleCase = (str)=>{
	return str.replace(/\w\S*/g,(txt)=>{return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};//end toTitleCase();

/**
 * Function to get data base slug
 *
 * @param tableName AS Table Name
 * @param title AS Title
 * @param slugField AS Slug Field Name in database
 *
 * @return string
 */
getDatabaseSlug = (options)=>{
	return new Promise(resolve=>{
		let tableName 	= (options && options.table_name)	?	options.table_name	:"";
		let title		= (options && options.title)		?	options.title		:"";
		let slugField	= (options && options.slug_field)	?	options.slug_field	:"";

		if(title=='' || tableName == "") return resolve({title : "", options	: options});

		let convertTitleIntoSlug 	=	slug(title).toLowerCase();
		let collectionName  		= 	db.collection(String(tableName));

		/** Set conditions **/
		let conditions 			= 	{};
		conditions[slugField] 	=  	{$regex : new RegExp(convertTitleIntoSlug, "i")};

		/** Get count from table **/
		collectionName.countDocuments(conditions,(err,count)=>{
			/** Send response **/
			resolve({
				title 	: (count > 0) ? convertTitleIntoSlug+'-'+count :convertTitleIntoSlug
			});
		});

	});
};//end getDatabaseSlug();

/**
 * Function for sanitize form data
 *
 * @param data				As Request Body
 * @param notAllowedTags	As Array of not allowed tags
 *
 * @return json
 */
sanitizeData = (data,notAllowedTags)=>{
	let sanitized = arrayStripTags(data,notAllowedTags);
	return sanitized;
};//End sanitizeData()

/**
 * Function to strip not allowed tags from array
 *
 * @param array				As Data Array
 * @param notAllowedTags	As Tags to be removed
 *
 * @return array
 */
arrayStripTags = (array,notAllowedTags)=>{
	if (array.constructor === Object){
		var result = {};
	}else{
		var result = [];
	}
	for(let key in array){
		let value = (array[key] != null) ? array[key] : '';
		if(value.constructor === Array || value.constructor === Object) {
			result[key] = arrayStripTags(value,notAllowedTags);
		}else{
			result[key] = stripHtml(value.toString().trim(),notAllowedTags);
		}
	}
	return result;
};//End arrayStripTags()

/**
 * Function to Remove Unwanted tags from html
 *
 * @param html				As Html Code
 * @param notAllowedTags	As Tags to be removed
 *
 * @return html
 */
stripHtml = (html,notAllowedTags)=>{
	let unwantedTags= notAllowedTags;
	for(let j = 0;j < unwantedTags.length;j++){
		html = html.replace(unwantedTags[j],'');
	}
	return html;
};//end stripHtml();

/**
 * Function to upload image
 *
 * @param options	As data in Object
 *
 * @return json
 */
moveUploadedFile = (req,res,options)=>{
	return new Promise(resolve=>{
		let image 				=	(options && options.image)				?	options.image				:"";
		let filePath 			=	(options && options.filePath)			?	options.filePath				:"";
		let oldPath 			=	(options && options.oldPath)			?	options.oldPath				:"";
		let allowedExtensions 	=	(options && options.allowedExtensions)	?	options.allowedExtensions	:ALLOWED_IMAGE_EXTENSIONS;
		let allowedImageError 	=	(options && options.allowedImageError)	?	options.allowedImageError	:ALLOWED_IMAGE_ERROR_MESSAGE;
		let allowedMimeTypes 	=	(options && options.allowedMimeTypes)	?	options.allowedMimeTypes	:ALLOWED_IMAGE_MIME_EXTENSIONS;
		let allowedMimeError 	=	(options && options.allowedMimeError)	?	options.allowedMimeError	:ALLOWED_IMAGE_MIME_ERROR_MESSAGE;

		/** Send success response **/
		if(image == '') return resolve({status : STATUS_SUCCESS, fileName : oldPath});

		let fileData	= (image.name)	? 	image.name.split('.') 			:[];
		let imageName	= (image.name)	? 	image.name 						:'';

		let extension	= (fileData)	?	fileData.pop().toLowerCase()	:'';

		/** Send error response **/
		if (allowedExtensions.indexOf(extension) == -1) return resolve({status : STATUS_ERROR, message : allowedImageError});

		/** Create new folder of this month **/
		let newFolder	= 	(newDate("","mmm")+ newDate("","yyyy")).toUpperCase()+'/';

		createFolder(filePath+newFolder);

		let newFileName 	= newFolder + Date.now()+ '-' +changeFileName(imageName);
		let uploadedFile	= filePath+newFileName;

		/** move image to folder*/
		image.mv(uploadedFile,(err)=>{
			if(err){
				/** Send error response **/
				return resolve({
					status	: 	STATUS_ERROR,
					message	:	res.__("admin.system.something_going_wrong_please_try_again")
				});
			}

			/** check mime type*/
			exec('file --mime-type -b '+uploadedFile,(err, out, code)=>{
				if (allowedMimeTypes.indexOf(out.trim()) == -1){
					unlink(uploadedFile,(err)=>{
						if (err){
							/** Send error response **/
							return resolve({
								status	: 	STATUS_ERROR,
								message	:	res.__("admin.system.something_going_wrong_please_try_again")
							});
						}

						/** Send error response **/
						resolve({
							status	: 	STATUS_ERROR,
							message	:	allowedMimeError
						});
					});
				}else{
					/** Send success response **/
					resolve({status : STATUS_SUCCESS, fileName:	newFileName});

					/** remove old images*/
					if(oldPath) removeFile({file_path : filePath+oldPath}).then((imageResponse)=>{});
				}
			});
		});
	});
};//End moveUploadedFile()

/**
 * Function for remove file from root path
 *
 * @param options As data in file root path
 *
 * @return json
 */
removeFile = (options)=>{
	return new Promise(resolve=>{
		var filePath	=	(options.file_path)	?	options.file_path	:"";
		let response = {
			status	: 	STATUS_SUCCESS
		};

		if(filePath !=""){
			/** remove file **/
			unlink(filePath,(err)=>{
				if(!err){
					/** Send success response **/
					resolve(response);
				}else{
					/** Send error response **/
					response.status = STATUS_ERROR;
					resolve(response);
				}
			});
		}else{
			/** Send error response **/
			response.status = STATUS_ERROR;
			resolve(response);
		}
	})
};//end removeFile()

/**
 * Function to Make full image path and check file is exist or not
 *
 * @param options As data in Object format (like :-  file url,file path,result,database field name)
 *
 * @return json
 */
appendFileExistData = (options)=>{
	return new Promise(resolve=>{
		var fileUrl 			= 	(options.file_url)			?	options.file_url			:"";
		var filePath 			= 	(options.file_path)			?	options.file_path			:"";
		var result 				= 	(options.result)			?	options.result				:[];
		var databaseField 		= 	(options.database_field)	?	options.database_field		:"";
		var image_placeholder 	= 	(options.image_placeholder)	?	options.image_placeholder	:IMAGE_FIELD_NAME;
		var noImageAvailable	=	(options.no_image_available)?	options.no_image_available	:NO_IMAGE_AVAILABLE;
		var multitoSingleImg	=	(options.multi_single_img)  ?	options.multi_single_img	:"";

		if(result.length > 0){
			let index = 0;
			result.forEach((record,recordIndex)=>{
				var file = (record[databaseField] != '' && record[databaseField]!=undefined) ? ((record[databaseField]) ? filePath+record[databaseField]: ''): '';
				result[recordIndex][image_placeholder] = noImageAvailable;
				/** Set check file data **/
				let checkFileData = {
					"file" 					: 	file,
					"file_url" 				: 	fileUrl,
					"image_name" 			: 	record[databaseField],
					"record_index" 			: 	recordIndex,
					"no_image_available" 	: 	noImageAvailable
				}

				checkFileExist(checkFileData).then((fileResponse)=>{
					let recordIndexResponse = 	(typeof fileResponse.record_index !== typeof undefined)	?	fileResponse.record_index	:"";
					let imageResponse		=	(fileResponse.file_url)		?	fileResponse.file_url		:"";
					result[recordIndexResponse][image_placeholder] = imageResponse;

					if(result.length-1 == index){
						/** Send response **/
						let response = {
							result	: 	result
						};
						resolve(response);
					}
					index++;
				});
			});
		}else{
			if(multitoSingleImg) result.push({ image:'no-image.jpg',_id:"",full_image_path: noImageAvailable });
			/** Send response **/
			let response = {
				result	: 	result
			};
			resolve(response);
		}
	});
};//End appendFileExistData()

/**
 * Function to check a file is exist in folder or not
 *
 * @param options As data in Object format (like :-  file,file url,image name,index)
 *
 * @return  json
 */
checkFileExist = (options)=>{
	return new Promise(resolve=>{
		var file 				= 	(options.file) ?	options.file :"";
		var fileUrl 			=	(options.file_url) ? options.file_url :"";
		var imageName 			= 	(options.image_name) ?	options.image_name	:"";
		var recordIndex			= 	(typeof options.record_index !== typeof undefined)	?	options.record_index :"";
		var noImageAvailable 	= 	(options.no_image_available) ? options.no_image_available :"";

		stat(file,(err, stat)=>{
			if(!err) {
				/** Send response **/
				let response = {
					file_url		: 	fileUrl+imageName,
					record_index	:	recordIndex
				};
				resolve(response);
			}else{
				/** Send response **/
				let response = {
					file_url		: 	(noImageAvailable) ? noImageAvailable : NO_IMAGE_AVAILABLE,
					record_index	:	recordIndex
				};
				resolve(response);
			}
		});
	});
};//end checkFileExist()

/**
 * Function to send SMS
 *
 * @param req		As 	Request Data
 * @param res		As 	Response Data
 * @param options	As	Data object
 *
 * @return message
 */
sendSMS = (req,res,options)=>{
	return new Promise(resolve=>{

		let mobileNumber	=	(options && options.mobile_number)	?	options.mobile_number		:"";
		let userId			=	(options && options.user_id)		?	ObjectId(options.user_id)	:"";

		/** Send error response **/
		if(!mobileNumber) return resolve({status : STATUS_ERROR, options : options, message : res.__("system.something_going_wrong_please_try_again")});

		let msgBody			= (options && options.sms_template) 	? 	options.sms_template 	:"";
		let accountSid		= res.locals.settings['Twilio.account_sid'];
		let authToken		= res.locals.settings['Twilio.auth_token'];
		let twilioNumber	= res.locals.settings['Twilio.phone_number'];
		const {messages}	= require("twilio")(accountSid, authToken);

		/** Save sms logs data **/
		let saveData 				= 	{};
		saveData["user_id"] 		= 	(options.user_id)	?	ObjectId(options.user_id) :"";
		saveData["mobile_number"] 	= 	mobileNumber;
		saveData["message"] 		= 	msgBody;
		saveData["created"] 		= 	getUtcDate();

		/** Send SMS **/
		messages.create({
			body	: 	msgBody,
			to		: 	mobileNumber,
			from	:	twilioNumber
		},(err,message)=>{
			if(err){
				/********** Save sms logs ************/
					saveData["status"] 		= 	NOT_SENT;
					saveData["response"] 	= 	err;

					saveSmsLogs(saveData);
				/********** Save sms logs ************/

				/** Send error response **/
				return resolve({
					status	:	STATUS_ERROR,
					message	: 	err
				});
			}
			/********** Save sms logs ************/
				saveData["status"]	= 	SENT;
				saveData["response"]=	message;

				saveSmsLogs(saveData);
			/********** Save sms logs ************/

			/** Send success response **/
			resolve({
				status	:	STATUS_SUCCESS,
				message	: 	message
			});
		});
	});
}//sendSMS()

/**
 * Function to save sms logs
 *
 * @param options As	Data object
 *
 * @return null
 */
saveSmsLogs = (options)=>{
	/** Save sms logs **/
	const sms_logs = db.collection('sms_logs');
	sms_logs.insertOne(options,(err,result)=>{});
	return;
};//End saveSmsLogs();

/**
 * Function to check mobile number is valid or not
 *
 * @param req		As 	Request Data
 * @param res		As 	Response Data
 * @param options	As	Data object
 *
 * @return message
 */
checkMobileNumber = (req,res,options)=>{
	return new Promise(resolve=>{
		let accountSid		= res.locals.settings['Twilio.account_sid'];
		let authToken		= res.locals.settings['Twilio.auth_token'];
		let mobileNumber	= (options && options.mobile_number)	?	options.mobile_number	:"";
		const lookups		= require("twilio")(accountSid, authToken);

		/** Check mobile number*/
		try{
			let response = {
				status	:	STATUS_SUCCESS
			};
			resolve(response);

		}catch(e){
			/** Send error response **/
			let response = {
				status	:	STATUS_ERROR
			};
			resolve(response);
		}
	});
};//checkMobileNumber()

/**
 * Function to Check request is called from mobile of web
 *
 * @param req	As Request Data
 * @param res	As Response Data
 *
 * @return boolean
 */
isMobileApi = (req,res)=>{
	if(typeof req.headers !== typeof undefined && typeof req.headers.authkey !== undefined &&  req.headers.authkey == WEBSITE_HEADER_AUTH_KEY && typeof req.route !== typeof undefined && typeof req.route.path !== typeof undefined && req.route.path == '/mobile_api'){
		return true;
	}else{
		return false;
	}
};//End isMobileApi()

/**
 * Datatable configuration
 *
 * @param req		As	Request Data
 * @param res		As 	Response Data
 * @param options	As Object of data have multiple values
 *
 * @return json
 */
configDatatable = (req,res,options)=>{
	return new Promise(resolve=>{
		var resultDraw		= 	(req.body.draw)	? req.body.draw : 1;
		var sortIndex	 	= 	(req.body.order && req.body.order[0]['column']) 	? 	req.body.order[0]['column']		: '' ;
		var sortOrder	 	= 	(req.body.order && req.body.order[0]['dir'] && (req.body.order[0]['dir'] == 'asc')) ? SORT_ASC :SORT_DESC;

		/** Searching  **/
		var conditions 		=	{};
		var searchData 		=	(req.body.columns) ? req.body.columns :[];
		if(searchData.length > 0){
			searchData.forEach((record,index)=>{
				let fieldName 	= ((record.field_name) ? record.field_name : ((record.data) ? record.data : ''));
				let searchValue	= (record.search && record.search.value) ? record.search.value.trim() : '';
				let fieldType	= (record.field_type) ? record.field_type : '';
				if(searchValue && fieldName){
					switch(fieldType){
						case NUMERIC_FIELD:
							conditions[fieldName] = parseInt(searchValue);
						break;
						case OBJECT_ID_FIELD:
							conditions[fieldName] = ObjectId(searchValue);
						break;
						case EXACT_FIELD:
							conditions[fieldName] = searchValue;
						break;
						default:
							try{
								searchValue 			= cleanRegex(searchValue);
								conditions[fieldName] 	= new RegExp(searchValue, "i");
							}catch(e){
								conditions[fieldName] 	= searchValue;
							}
						break;
					}
				}
			});
		}

		/** Sorting **/
		var sortConditions = {};
		if(sortIndex !=''){
			if(searchData[sortIndex]){
				if(searchData[sortIndex].field_name){
					sortConditions[searchData[sortIndex].field_name] = sortOrder;
				}else if(searchData[sortIndex].data){
					sortConditions[searchData[sortIndex].data] = sortOrder;
				}
			}
		}else{
			sortConditions['_id'] = sortOrder;
		}
		resolve({
			sort_conditions : sortConditions,
			conditions 		: conditions,
			result_draw 	: resultDraw
		});
	});
}//End configDatatable()

/**
 * Function to genrate random otp
 *
 * @param null
 *
 * @return OTP
 */
getRandomOTP = ()=> {
	return new Promise(resolve=>{
		const otpGenerator = require('otp-generator')
		// resolve(Number(otpGenerator.generate(4, { 
		// 	lowerCaseAlphabets: false, 
		// 	upperCaseAlphabets: false, 
		// 	specialChars: false
		// })));
		resolve(Number(1234))
	});
}//end getRandomOTP();

/**
 * Function to convert multipart form data
 *
 * @param req As Request Data
 * @param res As Response Data
 *
 * @return json
 */
convertMultipartFormData = (req,res) =>{
	return new Promise(resolve=>{
		if(req.body && Object.keys(req.body).length >0){
			Object.keys(req.body).forEach((key)=>{
				try{
					req.body[key] = JSON.parse(req.body[key]);
				}catch(e){
					req.body[key] = req.body[key];
				}
			});
		}
		if(req.files && Object.keys(req.files).length >0){
			Object.keys(req.files).forEach((key)=>{
				try{
					key = JSON.parse(key);
				}catch(e){
					key = key;
				}
				try{
					req.files[key] = JSON.parse(req.files[key]);
				}catch(e){
					req.files[key] = req.files[key];
				}
			});
		}
		resolve();
	});
}//end convertMultipartFormData();

/**
 *  Function to Round the number
 *
 * @param value		As Number To be round
 * @param precision As Precision
 *
 * @return number
 */
round = (value, precision)=>{
	try{
		if(!value || isNaN(value)){
			return value;
		}else{
			precision = (typeof precision != typeof undefined && precision) ? precision :ROUND_PRECISION;
			var multiplier = Math.pow(10, precision || 0);
			return Math.round(value * multiplier) / multiplier;
		}
	}catch(e){
		return value;
	}
}// end round()

/**
 * Function for get languages list
 *
 * @param defaultLanguage	As Default Language
 *
 * @return json
 */
getLanguages = (defaultLanguage) =>{
	return new Promise(resolve=>{
		try{
			/** Set  Conditios **/
			var conditions	=	{active : ACTIVE};
	
			/** Get Language List **/
			var languages = db.collection('languages');
			languages.find(
				conditions
			).toArray((err,result)=>{
				if(result){
					/** Send success response **/
					resolve(result);
				}else{
					/** Send blank response **/
					resolve([]);
				}
			});
		}catch(e){
			/** Send blank response **/
			resolve([]);
		}
	});
}//End getLanguages()

/**
 * Function to get master list
 *
 * @param to		As	Recipient Email Address
 * @param repArray  As 	Response Array
 * @param options  	As 	data as json format
 *
 * @return json
 */
getMasterList = (req,res,next,options)=>{
	return new Promise(resolve=>{
		try{
			if(!options || !options.type || options.type.constructor !== Array || options.type.length <=0){
				/** Send error response **/
				return resolve({
					status 	:	STATUS_ERROR,
					message	: 	res.__("admin.system.something_going_wrong_please_try_again")
				});
			}

			let masterConditions = {
				status			:	ACTIVE,
				dropdown_type	:	{$in : options["type"]},
			};
			if(options.parent_id) masterConditions["parent_id"] = ObjectId(options.parent_id);

			/** Get master List **/
			const masters = db.collection('masters');
			masters.aggregate([
				{$match 	: 	masterConditions},
				{$sort : {name : SORT_ASC}},
				{$group	:	{
					_id		:	"$dropdown_type",
					data	:	{$push : {
									id 		: "$_id",
									name 	: "$name",
									slug 	: "$slug"
								}}
				}},
			]).toArray((err, result)=>{
				if(err) return resolve({status : STATUS_ERROR, message : res.__("admin.system.something_going_wrong_please_try_again")});

				let finalResult = {};
				if(result && result.length >0){
					result.map((item,index)=>{
						let masterType =	(item._id)	?	item._id	:"";
						let masterData =	(item.data)	?	item.data	:[];

						if(masterType){
							finalResult[masterType] = masterData;
						}
					});
				}

				/** Send success response **/
				resolve({
					status 	: 	STATUS_SUCCESS,
					result 	: 	finalResult,
				});
			});
		}catch(e){
			/** Send error response **/
			resolve({
				status 	:	STATUS_ERROR,
				message	: 	res.__("admin.system.something_going_wrong_please_try_again")
			});
		}
	}).catch(next);
}// end getMasterList()

/**
 * Function to add days in current date
 *
 * @param addDay AS Number Of Hours to be added
 *
 * @return date string
 */
addDate = (hours)=>{
	var	addDayTimestamp = hours * 60 * 60 * 1000;
	now	= new Date(Date.now() + addDayTimestamp);
	return now;
}//end addDate();

/**
 * Function to add days in given date
 *
 * @param hours AS Number Of Hours to be added
 *
 * @return date string
 */
addDaysToDate = (hours,date)=>{
	let addDayTimestamp = hours * 60 * 60 * 1000;
	let baseTimestamp	= (typeof date !== typeof undefined && date) ? new Date(date).getTime() : Date.now();
	now	= new Date(baseTimestamp + addDayTimestamp);
	return now;
}//end addDaysToDate();

/**
 * Function to subtract days in given date
 *
 * @param Hours AS Number Of Days to be subtracted
 *
 * @return date string
 */
subtractDate = (Hours)=>{
	var subtractHoursTimestamp = Hours * 60 * 60 * 1000;
	now 	= new Date(Date.now() - subtractHoursTimestamp);
	return now;
}//end subtractDate();

/**
 * Function to subtract minute in current date time
 *
 * @param minute AS minute to be subtracted
 *
 * @return date string
 */
subtractMinute = (minute)=>{
	var subtractMinuteTimestamp = minute * 60 * 1000;
	now 	= new Date(Date.now() - subtractMinuteTimestamp);
	return now;
}//end subtractMinute();

/**
 * Function to add minute in current date time
 *
 * @param minute AS minute to be subtracted
 *
 * @return date string
 */
addMinute = function(minute) {
	var addMinuteTimestamp = minute * 60 * 1000;
	now 	= new Date(Date.now() + addMinuteTimestamp);
	return now;
}//end addMinute();

/**
* Function to get difference in two dates in seconds
*
* @param startDate AS start date
* @param endDate AS end date
*
* @return difference between two days in seconds
*/
getDifferenceBetweenTwoDates = function(startDate,endDate) {
	startDate 	= startDate;
	endDate 	= (endDate) ? endDate : new Date();
	var diff =(endDate.getTime() - startDate.getTime()) / 1000;
	diff /= (60);
	return Math.abs(Math.round(diff*60));
}//end getDifferenceBetweenTwoDates();


/**
 * To check request method is post or get
 *
 * @param req	As Request Data
 * @param res	As Response Data
 *
 * @return boolean
 */
isPost = (req)=>{
	if(typeof req.body !== typeof undefined && Object.keys(req.body).length != 0){
		return true;
	}else{
		return false;
	}
}//End isPost()


/**
 *  Function to get dropdown list with html
 *
 * @param req 				As Request Data
 * @param res 				As Response Data
 * @param options			As options
 *
 * @return object
 */
getDropdownList = (req,res,next,options)=>{
	return new Promise(resolve=>{
        var collections	    = (options.collections) ? options.collections :[];
        var responseSend    = false;
        var finalHtmlData   = {};
		if(collections && collections.length >0){
            let index = 0;
            collections.map((collectionRecords,j)=>{
				let collection  	= (collectionRecords["collection"]) ? collectionRecords["collection"] 	: "";
				let selectedValues 	= (collectionRecords["selected"]) 	? collectionRecords["selected"] 	: [];
                let columns			= (collectionRecords.columns)	    ? collectionRecords.columns 		: [];
                let columnKey		= (columns[0]) ? columns[0] : "";
                let columnValue		= (columns[1]) ? columns[1] : "";
                let conditions		= (collectionRecords.conditions) ? collectionRecords.conditions :{};// First parameter should be key, and second should be value
                let levelName		= (collectionRecords.level_name) ? collectionRecords.level_name : "";
				let finalHtml		= (levelName) ? '<option value="">'+levelName+'</option>' : '';
                if(columnKey && columnValue && conditions){
					let sortConditions 			= 	{};
					sortConditions[columnValue]	= 	SORT_ASC;

					if(collectionRecords["sort_conditions"]){
						sortConditions	= collectionRecords["sort_conditions"];
					}

                    let finalColumns= {};
                    finalColumns[columnKey] 	= 1;
                    finalColumns[columnValue] 	= 1;

                    var collectionObject = db.collection(collection);
                    collectionObject.find(
                        conditions,
                        finalColumns
                    ).collation(COLLATION_VALUE).sort(sortConditions).toArray((err,result)=>{
                        if(!err){
                            for(let i=0;i<result.length;i++){
								let records 		= (result[i]) ? result[i] : "";
								let selectedHtml 	= "";
								for(let i = 0;i<selectedValues.length;i++){
									if(String(selectedValues[i]) == String(records[columnKey])){
										selectedHtml = 'selected="selected"';
									}
								}

                                finalHtml 	+= '<option value="'+records[columnKey]+', '+records[columnValue]+'" '+selectedHtml+'>'+records[columnValue]+'</option>';
                            }
                            finalHtmlData[j] = finalHtml;
                            if(Object.keys(collections).length-1 == index){
                                if(!responseSend){
                                    let resolveResponse = {
                                        status 			: 	STATUS_SUCCESS,
                                        final_html_data	: 	finalHtmlData
                                    }
                                    resolve(resolveResponse);
                                }
                            }
                        }else{
                            if(!responseSend){
                                let resolveResponse = {
                                    status 		: 	STATUS_ERROR,
                                    message		:	res.__("admin.system.something_going_wrong_please_try_again")
                                }
                                resolve(resolveResponse);
                            }
                        }
                        index++;
                    });
                }else{
                    if(!responseSend){
                        let resolveResponse = {
                            status 		: 	STATUS_ERROR,
                            message		:	res.__("admin.system.missing_parameters")
                        }
                        resolve(resolveResponse);
                    }
                    index++;
                }
			});
		}else{
			let resolveResponse = {
				status 		: 	STATUS_ERROR,
				message		:	res.__("admin.system.missing_parameters")
			}
			resolve(resolveResponse);
		}
	});
}//End getDropdownList()

/** Send email */
sendEmail = (req,res,options)=>{
	try{
		let to			=	(options && options.to)			    ?	options.to:"";
		let repArray	=	(options && options.rep_array)		?	options.rep_array	:"";
		let action		=	(options && options.action)		  	?	options.action:"";
		let attachments	=	(options && options.attachments)	?	options.attachments	:"";
	  	let subject		=	(options && options.subject)	  	?	options.subject	:"";

		let userEmail		=	res.locals.settings["Email.user_email"];
		let emailHost		=	res.locals.settings["Email.host"];
		let emailPassword	=	res.locals.settings["Email.password"];
		let emailUserName	=	res.locals.settings["Email.user_name"];
		let emailPort		=	res.locals.settings["Email.port"];
  
		const transporter 	= 	createTransport({
			host	  : 	emailHost,
			port	  : 	emailPort,
			secure	: 	(emailPort == 465) ? true : false, // true for 465, false for other ports
			auth	: 	{
				user: emailUserName, // generated ethereal user
				pass: emailPassword // generated ethereal password
			},
			tls: {
				rejectUnauthorized: true
			}
		});
  
		const email_templates	=	db.collection('email_templates');
		const email_actions		= 	db.collection('email_actions');

		/** Get Email template details **/
		email_templates.findOne({action : action},{projection:{_id:1,name:1,subject:1,email_descriptions:1}},(err, result)=>{
			if(!err && result){

				let emailTemplateResult	= result;

				/** Get Email action details **/
				email_actions.findOne({action : action},{projection:{_id:1,options:1}},(emailErr, emailResult)=>{
					if(!emailErr && emailResult){

						let actionData 		= 	emailResult;
						let actionOptions 	= 	actionData.options.toString().split(",");
						let body			= 	emailTemplateResult.email_descriptions["5fa923fb8fb791c512f7dc9a"]['body'];
						subject				= 	emailTemplateResult.email_descriptions["5fa923fb8fb791c512f7dc9a"]['subject'];
			
						actionOptions.forEach((value,key)=>{
							body = body.replace(RegExp('{'+value+'}','g'),repArray[key]);
						});

						/** get email layout **/
						renderFile(WEBSITE_LAYOUT_PATH + 'email.html',{settings:res.locals.settings},'',(err, html)=>{
							html 		= html.replace(RegExp('{{MESSAGE_BODY}}','g'),body);
							let mailOptions = {
								from	: 	userEmail,
								to		: 	to,
								subject	: 	subject,
								html	: 	html
							};

							/** Send  attachment **/
							if(attachments){
								mailOptions["attachments"]	=	{
									path :	attachments
								};
							}

							/**Send email*/
							transporter.sendMail(mailOptions,(error, info)=>{
								/** Save email logs details **/
								const email_logs = db.collection("email_logs");
								mailOptions.is_sent = (error) ? false :true;
								mailOptions.error	= error;
								mailOptions.created = getUtcDate();
								email_logs.insertOne(mailOptions);

								if(error){
									console.error('error');
									return console.error(error);
								}
							});
						});
					}else{
						return console.log('Error in email action');
					}
				})
			}else{
				return console.log('Error in email template');
			}
		})
	  }catch(e){
		  console.log("email error in sendMail function");
		  console.log(e);
	  }
}


/** Send notification
 * options as require data
 */
sendNotifications = (options)=>{
	const FCM 	= require('fcm-node');
	const fcm 	= new FCM(FCM_SERVER_KEY);
	
    var message = {
        registration_ids	: options['to'], 
        collapse_key		: 'TEST',
        // notification		: {
        //     title: options['title'],  
        //     body: options['message']
        // },
        data : {  //you can send only notification or only data(or include both)
            title	: options['title'],  
            body	: options['message']
        }
    };
    
    fcm.send(message, function(err, response){
        if (err) {
            console.log(err,"Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
}

/**
 *  Function to save notifications
 *
 * @param req 			As Request Data
 * @param res 			As Response Data
 * @param options		As options
 *
 * @return array
 */
 saveNotifications = (req, res, options) => {
	return new Promise((resolve) => {
	  	let userIds = options && options.users ? options.users : [];

		/** Set insertable data **/
		let notificationsList = [];
		userIds.map((records) => {
		  let tempNotificationData = {
			user_id : ObjectId(records),
			is_seen : NOT,
			title 	: options.title ? options.title : '',
			message : options.message ? options.message : '',
			created : getUtcDate()
		  };
		  notificationsList.push(tempNotificationData)
		});
		
		console.log(userIds,"notificationsList");

		/** Insert in notification table **/
		const notifications = db.collection("notifications");
		notifications.insertMany(
		  notificationsList,
		  { forceServerObjectId: true },
		  (notificationErr, notificationResult) => {
			if (!notificationErr) {
				let resolveResponse = {
					status: STATUS_SUCCESS
				}
			  	resolve(resolveResponse);
			} else {
			  	let resolveResponse = {
					status: STATUS_ERROR
				};
			  resolve(resolveResponse);
			}
		  }
		);
	});
  }; // end saveNotifications()

/**
 *  Function to generate a random sting
 *
 * @param req 		As Request Data
 * @param res 		As Response Data
 * @param options	As options
 *
 * @return string
 */
getRandomString = (req,res,options)=>{
	return new Promise(resolve=>{
		let srtingLength	= (options && options.srting_length) ? parseInt(options.srting_length) : DEFAULT_RANDOM_NUMBER_LENGTH;

		/**Generate random string **/
		let unique = generate({
			length			: srtingLength,
			charset			: 'alphanumeric',
			capitalization	: 'uppercase'
		});
		return resolve({
			status 	: 	STATUS_SUCCESS,
			result	:	unique
		});
    });
}//End getRandomString()

/**
 *  Function to create a new folder
 *
 * @param path	As	folder path
 *
 * @return Object
 */
createFolder = (path)=>{
	return new Promise(resolve=>{
		let filePathData 	= path.split('/');
		let fullPath 		= "/";

		if(filePathData.length>0){
			asyncEach(filePathData,(folderName, asyncCallback)=>{
				if(folderName!=""){
					fullPath += folderName+"/";
				}
			
				if(!existsSync(fullPath)){
					mkdirSync(fullPath);
				}
				asyncCallback(null);
			},asyncErr=>{
				/** Send success response **/
				resolve({status	: STATUS_SUCCESS});
			});
		}else{
			/** Send success response **/
			resolve({status	: STATUS_SUCCESS});
		}
	});
}// end createFolder()

/**
 * to replace /n with <br> tag
 *
 * @param html	As Html
 *
 * @return html
 */
nl2br = (html)=>{
	if(html){
		return html.replace(/\n/g, "<br />");
	}else{
		return html;
	}
}//end nl2br

/**
 * function is used to clear regular expression string
 *
 * @param regex	As Regular expression
 *
 * @return regular expression
 */
cleanRegex = (regex)=>{
	if(NOT_ALLOWED_CHARACTERS_FOR_REGEX && NOT_ALLOWED_CHARACTERS_FOR_REGEX.length>0){
		for(let i in NOT_ALLOWED_CHARACTERS_FOR_REGEX){
			regex = regex.split(NOT_ALLOWED_CHARACTERS_FOR_REGEX[i]).join('\\'+NOT_ALLOWED_CHARACTERS_FOR_REGEX[i]);
		}
		return regex;
	}else{
		return regex;
	}
}//end cleanRegex

/**
 * function is used to update user wise module flag
 *
 * @param userId as User Id
 * @param data as Data to be updated
 * @param type as update Type : delete/add/get
 *
 * @return regular expression
 */
userModuleFlagAction = (userId,data,type)=>{
	var adminModulesList = myCache.get( "admin_modules_list" );
	if(typeof adminModulesList === typeof undefined){
		adminModulesList = {};
	}
	if(type == "add"){
		adminModulesList[userId] 			= data;
		myCache.set( "admin_modules_list", adminModulesList , 0 );
		return true;
	}else if(type == "delete"){
		delete adminModulesList[userId];
		myCache.set( "admin_modules_list", adminModulesList , 0 );
		return true;
	}else if(type == "get"){
		return adminModulesList[userId];
	}
}//end userModuleFlagAction

/**
 * Function to Remove html tags from string
 *
 * @param string As text string
 *
 * @return html
 */
stripTag = (string)=>{
	return string.replace(/(<([^>]+)>)/ig," ");
}//end stripTag();

/**
 * Function to get current timestamp
 *
 * @param null
 *
 * @return timestamp
 */
currentTimeStamp = ()=>{
	return new Date().getTime();
};//end currentTimeStamp();


/**
 * Function to convert Object to array
 *
 * @param array  	As Array
 *
 * @return json
 */
convertObjectToArray = (obj)=>{
	if(obj.constructor !== Object) return obj;
	let newArray = Object.keys(obj).map(objKey=>{return obj[objKey]});
	return newArray;
};

/**
 * Function to convert Object to array
 *
 * @param array  	As Array
 *
 * @return json
 */
convertArrayToObject = (arr,key)=>{
	if(arr.constructor !== Array) return arr;
	let newObj = {};
	arr.map(arrRecord=>{
		newObj[arrRecord[key]] = arrRecord;
	});
	return newObj;
};


/**
 * Function to use to print data in cmd panel
 *
 * @param message as printable data
 *
 * @return void
 */
logger = (message)=>{
	const debug	=	JSON.parse(process.env.DEBUG);
	if(debug){
		return console.log(message);
	}else{
		return;
	}
};// end logger()


/**
 * Function to get master values
 *
 * @param req 		As	Request Data
 * @param res 		As	Response Data
 * @param next		As	Callback argument to the middleware function
 * @param options	As	Request Options
 *
 * @return json
 */
getMasterValues = (req,res,next,options)=>{
	return new Promise(resolve=>{
		let masterIds	= (options.master_ids)	? options.master_ids	:[];
		let conditions	= {};
		let masterObjectIds = masterIds.map(recordId=>{ return ObjectId(String(recordId))});

		if(masterIds) conditions["_id"] = {$in : masterObjectIds};

		/** Get master **/
		const masters = db.collection('masters');
		masters.find(conditions,{projection : {_id:1,name:1}}).toArray((err,result)=>{
			if(err && result.length < 1) return resolve({});
			let data = {};
			if(result.length > 0){
				result.map(record=>{
					data[record._id] = record.name;
				});
			}
			/** Send response **/
			resolve((data) ? data : {});
		});
	}).catch(next);
}// end getMasterValues()

/**
 * Function to get master values slug
 *
 * @param req 		As	Request Data
 * @param res 		As	Response Data
 * @param next		As	Callback argument to the middleware function
 * @param options	As	Request Options
 *
 * @return json
 */
getMasterValuesSlug = (req,res,next,options)=>{
	return new Promise(resolve=>{
		let masterIds	= (options.master_ids)	? options.master_ids	:[];
		let conditions	= {};
		let masterObjectIds = masterIds.map(recordId=>{ return ObjectId(String(recordId))});

		if(masterIds) conditions["_id"] = {$in : masterObjectIds};

		/** Get master **/
		const masters = db.collection('masters');
		masters.find(conditions,{projection : {_id:1,name:1,slug:1}}).toArray((err,result)=>{
			if(err && result.length < 1) return resolve({});
			/** Send response **/
			resolve((result) ? result : {});
		});
	}).catch(next);
}// end getMasterValuesSlug()

/**
 *  Function is genrate notification url
 *
 * @param req As request Data
 *
 * @return Json
 */
generateNotificationUrl = (req,res,options)=>{
	return new Promise(resolve=>{
		let notificationList = [];
		let notificationData = (options.result) ? options.result : [];
		if(!notificationData || notificationData.length < 1){
			return resolve({data : [],options:options});
		}

		notificationData.map((notification)=>{
			let type 		= (notification.notification_type) ? notification.notification_type : "";
			let userRoleId	= (notification.user_role_id) 	   ? notification.user_role_id : "";
			let extraParams = (notification.extra_parameters)  ? notification.extra_parameters  : "";
			switch(type) {
				case NOTIFICATION_USER_REGISTER:
					if(extraParams.user_id && extraParams.user_type){
						notification["url"] = WEBSITE_ADMIN_URL+"users/"+extraParams.user_type+"/view/"+extraParams.user_id;
					}else{
						notification["url"] = "javascript:void(0);";
					}
				break;
				default:
					let defaultURL = "javascript:void(0);";
					if(userRoleId == FRONT_USER_ROLE_ID) defaultURL = WEBSITE_URL+"notifications";
					notification["url"] = defaultURL;
			}
			notificationList.push(notification);
		});
		resolve({data : notificationList,options:options});
	});
};//End generateNotificationUrl()


/**
 * Function to get user data
 *
 * @param req		As	Request Data
 * @param res		As 	Response Data
 * @param options	As  object of data
 *
 * @return json
 **/
getUserData = (req,res,next,options) =>{
	return new Promise(resolve=>{

		let conditions	= (options.conditions)	? options.conditions	:{};
		let fields		= (options.fields)		? options.fields		:{};
		if(!conditions){
			/** Send error response **/
			return resolve({
				status	: STATUS_ERROR,
				message	: res.__("system.something_going_wrong_please_try_again")
			});
		}

		/** Get user details **/
		const users	= db.collection("users");
		users.findOne(conditions,{projection: fields},(err,result)=>{
			if(err){
				/** Send error response **/
				let response = {
					status	: STATUS_ERROR,
					message	: res.__("system.something_going_wrong_please_try_again")
				};
				return resolve(response);
			}

			/** Send success response **/
			if(!result)return resolve({status : STATUS_SUCCESS,result : {}});

			/** Send success response **/
			if(!result.profile_image)return resolve({status	: STATUS_SUCCESS,result : result});

			/** Set options for append image **/
			let imageOptions = {
				"file_url" 			: USERS_URL,
				"file_path" 		: USERS_FILE_PATH,
				"result" 			: [result],
				"database_field" 	: "profile_image"
			};

			/** Append image with full path **/
			appendFileExistData(imageOptions).then(fileResponse=>{
				/** Send success response **/
				resolve({
					status	: STATUS_SUCCESS,
					result 	: (fileResponse && fileResponse.result && fileResponse.result[0])	?	fileResponse.result[0]	:{}
				});
			});
		});
	}).catch(next);
};// end getUserData()

/**
 * Function is used to convert elements of array in object
 *
 * @param classes as a array
 *
 * @return class name
 */
arrayToObject = (arr)=>{
	if(!arr || arr.constructor !== Array || arr.length == 0) return [];
		return arr.map((arrayElem)=>{
		return ObjectId(arrayElem);
	});
}// arrayToObject();

/**
 * Function to use to print message in page
 *
 * @param message as printable data
 *
 * @return void
 */

setErrorSuccessMessage = (req,res,next,type,message)=>{
	let messageType = "";
	if(type == STATUS_SUCCESS){
		messageType = STATUS_SUCCESS;
	}else if(type == STATUS_ERROR){
		messageType = STATUS_ERROR;
	}else{
		messageType = STATUS_OTHER;
	}
	req.session.message_content = message;
	req.session.message_type 	= messageType;
};// end setErrorSuccessMessage()

/** Generate JWT */
generateJWT =(data)=>{
	let jwt   = require('jsonwebtoken');
	let token = jwt.sign(data, JWT_CONFIG.private_key, { expiresIn: JWT_CONFIG.expire_time });
	return token;
}//End generateJWT


/** allow user to access api */
userAuthorization = (req,res,next)=>{
	if(DEFAULT_AUTH_TOKEN === req.headers["authorization"]){
		next();
	}else{
		return res.send({
			status : API_STATUS_ERROR,
			message: "Not an authorized user, access denied",
			result : {},
			error  : {}
		});
	}
}


convertStringToObject = (string)=>{
	let newObject = JSON.stringify(string.substring(1,string.length - 1));
	return JSON.parse(newObject);
}
/**
 * Convert minutes to miliseconds
 * param data as minutes 
 * @return number
 */
convertMinutesToMilisecods = (data)=>{
	let minutes = (data*60)*1000;
	return minutes;
}
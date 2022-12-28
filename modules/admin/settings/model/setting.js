const asyncParallel	= require("async/parallel");
const fsWriteFile	= require("fs").writeFile;

function Setting() {

	/**
	 *  Function to get settings list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.getSettingList = (req, res)=>{
		if(isPost(req)){
			let limit			= 	(req.body.length)	?	parseInt(req.body.length)	:ADMIN_LISTING_LIMIT;
			let skip			=	(req.body.start) 	? 	parseInt(req.body.start)	:DEFAULT_SKIP;
			const collection	= 	db.collection('settings');

			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				asyncParallel([
					(callback)=>{
						/** Get list of setting **/
						collection.find(dataTableConfig.conditions,{projection: {_id:1,title:1,value:1,modified:1,key_value:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err,result)=>{
								callback(err, result);
						});
					},
					(callback)=>{
						/** Get total number of records in settings collection **/
						collection.countDocuments({},(err,countResult)=>{
							callback(err, countResult);
						});
					},
					(callback)=>{
						/** Get filtered records counting in settings **/
						collection.countDocuments(dataTableConfig.conditions,(err,filterContResult)=>{
							callback(err, filterContResult);
						});
					}
				],
				(err, response)=>{
					/** Send response **/
					res.send({
						status			: 	(!err) ? STATUS_SUCCESS 		: STATUS_ERROR,
						draw			:	dataTableConfig.result_draw,
						data			: 	(response[0])	? 	response[0] : [],
						recordsFiltered	: 	(response[2]) 	? 	response[2]	: 0,
						recordsTotal	: 	(response[1]) 	?	response[1] : 0
					});
				});
			});
		}else{
			/** render listing page **/
			req.breadcrumbs(BREADCRUMBS["admin/setting/list"]);
			res.render('list');
		}
	};//End getSettingList()

	/**
	 * Function for add setting
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
   	this.addSetting = (req, res)=>{
		if(isPost(req)){
			req.body 		=	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let title 		= 	(req.body.title)			? 	req.body.title			:"";
			let value 		= 	(req.body.value)			?	req.body.value			:"";
			let keyValue 	= 	(req.body.key_value)		? 	req.body.key_value		:"";
			let inputType 	= 	(req.body.input_type)		? 	req.body.input_type		:"";
			let validatType = 	(req.body.validate_type)	? 	req.body.validate_type	:"";
			let order 		= 	(req.body.order)			? 	req.body.order			:"";
			let editable 	= 	(req.body.editable)			? 	req.body.editable		:0;
			let required 	= 	(req.body.required)			? 	req.body.required		:0;
			let validRegx	= 	/^[0-9]+$/;

			/** Check validation **/
			req.checkBody({
				'title': {
					notEmpty: true,
					errorMessage: res.__("admin.setting.please_enter_title")
				},
				"value": {
					notEmpty: true,
					errorMessage: res.__("admin.settings.please_enter_value")
				},
				'key_value': {
					notEmpty: true,
					errorMessage: res.__("admin.setting.please_enter_key_value")
				},
				'input_type': {
					notEmpty: true,
					errorMessage: res.__("admin.setting.please_select_input_type")
				},
			});

			/** parse Validation array  **/
			var errors = parseValidation(req.validationErrors(),req);
			if(!validRegx.test(order) && order != ""){
				if(!errors){
					var errors=[];
				}
				errors.push({"param":'order',"msg":res.__("admin.setting.please_enter_valid_order")});
			}
			if (!errors) {
				try {
					/** Configure settings unique conditions*/
					const settings 	= 	db.collection("settings");
					settings.findOne({
							key_value 	: 	{$regex : "^"+keyValue+"$",$options : "i"},
						},
						{projection: {
							_id:1
						}},(err, result)=>{
							if(!result){
								let type 	=	keyValue.split('.');
									type	=	(type[0])		?	type[0]			:"";
									order	=	(order !="")	?	parseInt(order)	:"";

								settings.insertOne({
										type 			: type,
										title 			: title,
										key_value		: keyValue,
										input_type 		: inputType,
										validate_type 	: validatType,
										value 			: value,
										order_weight 	: order,
										editable		: parseInt(editable),
										required		: parseInt(required),
										created			: getUtcDate(),
										modified 		: getUtcDate(),
									},(error,qryResult)=>{
										if(!error) {
											/** Write setting in file **/
											writeSettingDetails(req, res).then(response=>{
												/** Send success response **/
												req.flash(STATUS_SUCCESS,res.__("admin.setting.setting_has_been_added_successfully"));
												res.send({
													status		: 	STATUS_SUCCESS,
													redirect_url: 	WEBSITE_ADMIN_URL+"settings",
													message		:	res.__("admin.setting.setting_has_been_added_successfully")
												});
											});
										}else{
											/** Send error response **/
											res.send({
												status : STATUS_ERROR,
												message: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again ")}],
											});
										}
									}
								);
							}else{
								/** Send error response **/
								res.send({
									status  : STATUS_ERROR,
									message : [{"param":"key_value","msg":res.__("admin.setting.key_value_is_already_exist")}],
								});
							}
						}
					);
				}catch(e){
					/** Send error response **/
					res.send({
						status	: STATUS_ERROR,
						message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again ")}]
					});
				}
			}else {
				/** Send error response **/
				res.send({
					status	: STATUS_ERROR,
					message	: errors,
				});
			}
		}else{
			/** Render view file **/
			req.breadcrumbs(BREADCRUMBS["admin/setting/add"]);
			res.render('add');
		}
	};//End addSetting()

	 /**
	 * Function for delete setting
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return null
	 */
	this.deleteSetting = (req, res)=>{
		let id	= (req.params.id) ? req.params.id : '';
		if(id) {
			try {
				/** Delete setting*/
				const settings 	= 	db.collection('settings');
				settings.deleteOne({_id : ObjectId(id)},(err,result)=>{
					if(!err){
						/** Write setting in file **/
						writeSettingDetails(req, res).then(response=>{
							/** Send success response **/
							req.flash(STATUS_SUCCESS,res.__("admin.setting.setting_deleted_successfully"));
							res.redirect(WEBSITE_ADMIN_URL+"settings");
						});
					}else{
						/** Send error response **/
						req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
						res.redirect(WEBSITE_ADMIN_URL+"settings");
					}
				});
			}catch(e) {
				/** Send error response **/
				req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
				res.redirect(WEBSITE_ADMIN_URL+"settings");
			}
		}else {
			/** Send error response **/
			req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
			res.redirect(WEBSITE_ADMIN_URL+"settings");
		}
	};//End deleteSetting()

	/**
	 *  Function to get detail of a setting
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return json
	 */
	let getSettingDetails = (req,res)=>{
		return new Promise(resolve=>{
			let settingId = (req.params.id) ? req.params.id : "";
			if(!settingId || settingId ==""){
				let response = {
					status	: STATUS_ERROR,
					message	: res.__("admin.system.invalid_access")
				};
				resolve(response);
			}else{
				try{
					/**Get settings details*/
					const settings = db.collection("settings");
					settings.findOne({
							_id : ObjectId(settingId)
						},(err, result)=>{
							if(result){
								/** Send success response **/
								let response = {
									status	: STATUS_SUCCESS,
									result	: result
								};
								resolve(response);
							}else{
								/** Send error response **/
								let response = {
									status	: STATUS_ERROR,
									message	: res.__("admin.system.invalid_access")
								};
								resolve(response);
							}
						}
					);
				}catch(e){
					/** Send error response */
					let response = {
						status	: STATUS_ERROR,
						message	: res.__("admin.system.something_going_wrong_please_try_again")
					};
					resolve(response);
				}
			}
		});
	};//End settingDetails()

	/**
	 * Function for update setting details
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.editSetting = (req, res)=>{
		let id 		   = 	(req.params.id)	? 	req.params.id	:"";
		if(isPost(req)){
			/** Sanitize Data **/
			req.body 		=	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let title 		= 	(req.body.title)		?	req.body.title			:"";
			let value 		= 	(req.body.value)		?	req.body.value			:"";
			let keyValue 	= 	(req.body.key_value)	?	req.body.key_value		:"";
			let inputType 	= 	(req.body.input_type)	? 	req.body.input_type		:"";
			let validatType	= 	(req.body.validate_type)? 	req.body.validate_type	:"";
			let order 		= 	(req.body.order)		? 	req.body.order			:"";
			let editable 	= 	(req.body.editable)		? 	req.body.editable		:0;
			let required 	= 	(req.body.required)		? 	req.body.required		:0;
			let validRegx 	= 	/^[0-9]+$/;

			/** Check validation **/
			req.checkBody({
				"title": {
					notEmpty: true,
					errorMessage: res.__("admin.setting.please_enter_title")
				},
				"value": {
					notEmpty: true,
					errorMessage: res.__("admin.settings.please_enter_value")
				},
				"key_value": {
					notEmpty: true,
					errorMessage: res.__("admin.setting.please_enter_key_value")
				},
				'input_type': {
					notEmpty: true,
					errorMessage: res.__("admin.setting.please_select_input_type")
				},
			});

			/** parse Validation array  **/
			var errors = parseValidation(req.validationErrors(),req);
			if(!validRegx.test(order) && order != ""){
				if(!errors){
					var errors=[];
				}
				errors.push({"param":'order',"msg":res.__("admin.setting.please_enter_valid_order")});
			}
			if (!errors) {
				try{
					/** Configure user unique conditions*/
					const settings = db.collection("settings");
					settings.findOne({
							_id   		: 	{$ne :ObjectId(id)},
							key_value	:	{$regex : "^"+keyValue+"$",$options : "i"},
						},{projection: {_id :1}},
						(err, result)=>{
							if(!result){
								let type 	=	keyValue.split('.');
									type	=	(type[0])		?	type[0]			:"";
									order	=	(order !="")	?	parseInt(order)	:"";

								/** update setting data*/
								settings.updateOne({
										_id : ObjectId(id)
									},
									{$set: {
										type 			: type,
										title 			: title,
										key_value		: keyValue,
										input_type 		: inputType,
										validate_type 	: validatType,
										value 			: value,
										order_weight 	: order,
										editable		: parseInt(editable),
										required		: parseInt(required),
										modified 		: getUtcDate()
									}},(err,result)=>{
										if(!err){
											/** Write setting in file **/
											writeSettingDetails(req, res).then(response=>{
												/** Send success response **/
												req.flash(STATUS_SUCCESS,res.__("admin.setting.setting_has_been_updated_successfully"));
												res.send({
													status		 : STATUS_SUCCESS,
													redirect_url : 	WEBSITE_ADMIN_URL+'settings',
													message		 : res.__("admin.setting.setting_has_been_updated_successfully"),
												});
											});
										}else{
											/** Send error response **/
											res.send({
												status : STATUS_ERROR,
												message: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}],
											});
										}
									}
								);
							}else{
								/** Send error response **/
								res.send({
									status  : STATUS_ERROR,
									message : [{"param":"key_value","msg":res.__("admin.setting.key_value_is_already_exist")}],
								});
							}
						}
					);
				} catch(e) {
					/** Send error response **/
					res.send({
						status : STATUS_ERROR,
						message: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
					});
				}
			} else {
				/** Send error response **/
				res.send({
					status	: STATUS_ERROR,
					message	: errors,
				});
			}
		} else {
			getSettingDetails(req, res).then((response)=>{
				if(response.status == STATUS_SUCCESS){
					/** Render edit page  **/
					req.breadcrumbs(BREADCRUMBS['admin/setting/edit']);
					res.render('edit',{
						result	: response.result,
					});
				}else{
					/** Send error response **/
					req.flash(STATUS_ERROR,response.message);
					res.redirect(WEBSITE_ADMIN_URL+'settings');
				}
			});
		}
	};//End editSetting()

	/**
	 *  Function to get settings list and update settings
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.prefix = (req, res)=>{
		let type		=	(req.params.type) ? req.params.type	:"";
		let displayType	= 	type.replace(RegExp("_","g")," ");
		if(isPost(req)){
			/** Sanitize Data **/
			req.body 	= 	sanitizeData(req.body,[/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi]);
			let errors 	= 	[];
			if(typeof req.body.settings !== typeof undefined && req.body.settings.length >0){
				let startDate	=	"";
				let endDate		=	"";
				req.body.settings.forEach((records,index)=>{
					let value 			=	(records.value)					?	records.value				:"";
					let title 			= 	(records.title)					?	records.title.toLowerCase()	:"";
					let uppercasetitle 	= 	(records.title)					?	records.title				:"";
					let required 		= 	(records.required)				?	records.required			:"";
					let inputType 		= 	(records.input_type)			?	records.input_type			:"";
					let validateType 	= 	(records.validate_type)			?	records.validate_type		:"";
					startDate			=	((validateType == "start_time") || (validateType == "start_date"))	?	value	:startDate;
					endDate				=	((validateType == "end_time") || (validateType == "end_date"))		?	value	:endDate;

					if(value =="" && required == REQUIRED && inputType !="checkbox"){
						errors.push({"param":"setting_"+index+"_value","msg":res.__("admin.setting.please_enter_value",title)});
					}else if(validateType == "number"){
						let validRegx 	= 	/^[0-9]+$/;
						if(!validRegx.test(value)){
							errors.push({"param":"setting_"+index+"_value","msg":res.__("admin.setting.please_enter_valid_value",title)});
						}
					}else if(validateType == "float"){
						let validRegx 	= 	/^[0-9]+([.][0-9]+)?$/;
						if(!validRegx.test(value)){
							errors.push({"param":"setting_"+index+"_value","msg":res.__("admin.setting.please_enter_valid_value",title)});
						}
					}else if(validateType == "percentage"){
						let validRegx 	= 	/^[0-9]+([.][0-9]+)?$/;
						if(!validRegx.test(value)){
							errors.push({"param":"setting_"+index+"_value","msg":res.__("admin.setting.please_enter_valid_value",title)});
						}else if(value < 0 || value >100){
							errors.push({"param":"setting_"+index+"_value","msg":res.__("admin.setting.please_enter_valid_value",title)});
						}
					}

					if(required == REQUIRED && (validateType == "number" || validateType == "float")){
						if(value <= 0){
							errors.push({"param":"setting_"+index+"_value","msg":res.__("admin.setting.value_should_be_greater_than",uppercasetitle)});
						}
					}

					if((startDate !="" && endDate !="") && (validateType == "end_time" || validateType == "end_date")){
						if(startDate >= endDate){
							message = (validateType == "end_time")	?	res.__("admin.setting.end_time_should_be_greater_than_start_time")	:	res.__("admin.setting.end_date_should_be_greater_than_start_date");
							errors.push({"param":"setting_"+index+"_value","msg":message});
						}
					}

					if(req.body.settings.length-1 == index){
						if(errors.length > 0){
							res.send({
								/** Send error response **/
								status	: STATUS_ERROR,
								message	: errors,
							});
						}else{
							try{
								req.body.settings.forEach((data,dataIndex)=>{
									let value 		=	(data.value)	?	data.value	:"";
									let settingId	= 	(data.id)		?	data.id		:"";
									if(settingId && settingId!=""){
										try{
											/** Update settings details **/
											const settings = db.collection("settings");
											settings.updateOne({
													"_id" : ObjectId(settingId),
												},
												{$set:{
													"value" 	: 	value,
													"modified"	: 	getUtcDate()
												}},(err,result)=>{
													if(!err){
														if(req.body.settings.length-1 == dataIndex){
															/** Write setting in file **/
															writeSettingDetails(req, res).then(response=>{
																/** Send success response **/
																req.flash(STATUS_SUCCESS,res.__("admin.setting.setting_details_has_been_updated_successfully"));
																res.send({
																	status: STATUS_SUCCESS,
																	redirect_url : WEBSITE_ADMIN_URL+"settings/prefix/"+type,
																	message: res.__("admin.setting.setting_details_has_been_updated_successfully"),
																});
															});
														}
													}else{
														/** Send error response **/
														res.send({
															status	:	STATUS_ERROR,
															message	: 	[{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
														});
													}
												}
											);
										}catch(e){
											/** Send error response **/
											res.send({
												status	:	STATUS_ERROR,
												message	: 	[{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
											});
										}
									}else{
										if(req.body.settings.length-1 == dataIndex){
											/** Send success response **/
											req.flash(STATUS_SUCCESS,res.__("admin.setting.setting_details_has_been_updated_successfully"));
											res.send({
												status: STATUS_SUCCESS,
												redirect_url : WEBSITE_ADMIN_URL+"settings/prefix/"+type,
												message: res.__("admin.setting.setting_details_has_been_updated_successfully"),
											});
										}
									}
								});
							}catch(e){
								/** Send error response **/
								res.send({
									status	:	STATUS_ERROR,
									message	: 	[{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
								});
							}
						}
					}
				});
			}else{
				/** Send error response **/
				res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}
		}else{
			/** Get settings details **/
			getPrefixSettingDetails(req, res).then(response=>{
				if(response.status == STATUS_SUCCESS){
					/**Render edit page*/
					req.breadcrumbs(BREADCRUMBS["admin/setting/prefix"]);
					res.render("prefix",{
						result				: response.result,
						type 				: type,
						dynamic_variable 	: displayType+" "+res.__("admin.setting.settings"),
						dynamic_url			: type,
						displayType			: displayType
					});
				}else{
					req.flash("error",response.message);
					res.redirect(WEBSITE_ADMIN_URL+"dashboard");
				}
			});
		}
	};//End prefix()

	/**
	 *  Function to get detail of a setting
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return json
	 */
	let getPrefixSettingDetails = (req,res)=>{
		return new Promise(resolve=>{
			let type	=	(req.params.type) ? req.params.type	:"";
			if(!type || type ==""){
				let response = {
					status	: STATUS_ERROR,
					message	: res.__("admin.system.invalid_access")
				};
				resolve(response);
			}else{
				try{
					/**Get settings details*/
					const settings = db.collection("settings");
					settings.find({
						"key_value" : {$regex : type},
						"editable"	: {$ne:0}
					}).sort({order_weight : 1}).toArray((err, result)=>{
						if(typeof result != typeof undefined && result && result.length > 0){
							/** Send success response */
							let response = {
								status	: STATUS_SUCCESS,
								result	: result
							};
							resolve(response);
						}else{
							/** Send error response */
							let response = {
								status	: STATUS_ERROR,
								message	: res.__("admin.system.invalid_access")
							};
							resolve(response);
						}
					});
				}catch(e){
					/** Send error response */
					let response = {
						status	: STATUS_ERROR,
						message	: res.__("admin.system.something_going_wrong_please_try_again")
					};
					resolve(response);
				}
			}
		});
	};//End getPrefixSettingDetails()

	/**
	 *  Function to write setting details
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return json
	 */
	let writeSettingDetails = (req,res)=>{
		return new Promise(resolve=>{
			const settings 	= 	db.collection("settings");
			settings.find({},{projection: {_id:1,key_value:1,value:1}}).toArray((err, result)=>{
				if(!err){
					let settingsObj = {};
					result.map(record=>{
						let settingKey 		=	(record.key_value)	?	record.key_value	:"";
						let settingValue	= 	(record.value)		?	record.value		:"";

							settingKey 		= 	settingKey.replace(/"/g,'\\"');
							settingKey 		=	settingKey.replace(/'/g,"\\'");
							settingValue 	= 	settingValue.replace(/"/g,'\\"');
							settingValue 	= 	settingValue.replace(/'/g,"\\'");

						settingsObj[settingKey] = settingValue;
					});
					fsWriteFile(WEBSITE_ROOT_PATH+"config/settings.json", JSON.stringify(settingsObj), "utf8",function(err){});
				}
			});

			setTimeout(function(){
				myCache.del( "settings" );
			},5000);

			/** Send success response */
			let response = {
				status	: STATUS_SUCCESS,
			};
			resolve(response);
		});
	};//End writeSettingDetails()
}

module.exports = new Setting();

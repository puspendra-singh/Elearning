const bcrypt    	= require("bcryptjs");
const asyncParallel	= require("async/parallel");
const adminModule 	= require(WEBSITE_ADMIN_MODULES_PATH+"admin_modules/model/admin_module");

function AdminPermission(){

	const saltRounds= BCRYPT_PASSWORD_SALT_ROUNDS;

	/**
	 * Function to get admin permission list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.list = (req, res)=>{
		if(isPost(req)){
			let limit			= 	(req.body.length)	? parseInt(req.body.length)	: ADMIN_LISTING_LIMIT;
			let skip			= 	(req.body.start) 	? parseInt(req.body.start)	: DEFAULT_SKIP;
			const collection	= 	db.collection('users');
			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				commonConditions = {
					is_sub_admin : IS_SUBADMIN,
					is_deleted 	 : NOT_DELETED
				};
				dataTableConfig.conditions = Object.assign(dataTableConfig.conditions,commonConditions);

				asyncParallel([
					(callback)=>{
						/** Get list of sub admin **/
						collection.aggregate([
							{$match :  dataTableConfig.conditions},
							{$sort 	:  dataTableConfig.sort_conditions},
							{$skip 	:  skip},
							{$limit :  limit},
							{$lookup : {
								"from" 			: 	"admin_roles",
								"localField" 	:	"user_role_id",
								"foreignField" 	: 	"role_id",
								"as" 			: 	"role_detail"
							}},
							{$project :	{
								_id : 1, full_name : 1,email : 1,modified : 1, user_role_id	: 1,active : 1,
								role_name	: {$arrayElemAt : ["$role_detail.role_name",0]},
							}},
						]).toArray((err, result)=>{
							callback(err, result);
						});
					},
					(callback)=>{
						/** Get total number of records in admin permission collection **/
						collection.countDocuments(commonConditions,(err,countResult)=>{
							callback(err, countResult);
						});
					},
					(callback)=>{
						/** Get filtered records counting in admin permission **/
						collection.countDocuments(dataTableConfig.conditions,(err,filterContResult)=>{
							callback(err, filterContResult);
						});
					}
				],
				(err, response)=>{
					/** Send response **/
					res.send({
						status			: (!err) ? STATUS_SUCCESS 		: STATUS_ERROR,
						draw			: dataTableConfig.result_draw,
						data			: (response[0]) ? response[0] 	: [],
						recordsFiltered	: (response[2]) ? response[2]	: 0,
						recordsTotal	: (response[1]) ? response[1] 	: 0
					});
				});
			});
		}else{
			/** render listing page **/
			req.breadcrumbs(BREADCRUMBS['admin/admin_permissions/list']);
			res.render('list');
		}
	};//End list()

	/**
	 * Function for add admin permission
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
   	this.add = (req, res)=> {
		if(isPost(req)){
			/** Sanitize Data **/
			req.body 		= 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let password	=	(req.body.password)	? 	req.body.password	:"";
			let userRole	= 	(req.body.user_role)?	req.body.user_role	:"";

			/** Check validation **/
			req.checkBody({
				"first_name": {
					notEmpty: true,
					errorMessage: res.__("admin.admin_permissions.please_enter_first_name")
				},
				"last_name": {
					notEmpty: true,
					errorMessage: res.__("admin.admin_permissions.please_enter_last_name")
				},
				"user_role": {
					notEmpty: true,
					errorMessage: res.__("admin.admin_permissions.please_select_user_role")
				},
				'email': {
					notEmpty: true,
					errorMessage: res.__("admin.admin_permissions.please_enter_mail"),
					isEmail: {
						errorMessage: res.__("admin.admin_permissions.please_enter_valid_email_address")
					},
				},
				"password": {
					notEmpty: true,
					isLength:{
						options: PASSWORD_LENGTH,
						errorMessage: res.__("admin.admin_permissions.password_length_should_be_minimum_6_character")
					},
					errorMessage: res.__("admin.admin_permissions.please_enter_password")
				},
				"confirm_password": {
					notEmpty: true,
					isLength:{
						options: PASSWORD_LENGTH,
						errorMessage: res.__("admin.admin_permissions.password_length_should_be_minimum_6_character")
					},
					errorMessage: res.__("admin.admin_permissions.please_enter_confirm_password")
				},
				"module_ids": {
					notEmpty: true,
					errorMessage: res.__("admin.admin_permissions.please_select_modules")
				}
			});
			req.checkBody("confirm_password", res.__("admin.admin_permissions.confirm_password_should_be_same_as_password")).equals(password);

			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			if (!errors) {
				let firstName 	= 	(req.body.first_name)	?	req.body.first_name	:"";
				let lastName 	= 	(req.body.last_name)	? 	req.body.last_name	:"";
				let email 		= 	(req.body.email)		? 	req.body.email		:"";
				let fullName	= 	firstName+' '+ lastName;

				try {
					/**Check email is unique*/
					const users 	= db.collection("users");
					users.findOne({
							is_deleted	: NOT_DELETED,
							email 		: {$regex : '^'+email+'$',$options : 'i'}
						},
						{projection: {
							_id:1,email:1,
						}},(err, result)=>{
							if(!result){

								/** Set requested Data **/
								let options = {
									title 		: fullName,
									table_name 	: "users",
									slug_field 	: "slug"
								};

								/** Get slug **/
								getDatabaseSlug(options).then(response=>{
									/** Include admin modules Module **/
									adminModule.formatModuleIdsArray(req, res).then(moduleArray=>{
										/**Genrate password hash */
										bcrypt.hash(password, saltRounds).then(newPassword=>{

											/** Save user password **/
											users.insertOne({
												user_role_id	: userRole,
												first_name 		: firstName,
												last_name 		: lastName,
												full_name		: fullName,
												slug 			: (response && response.title)	?	response.title	:"",
												email 			: email,
												username 		: email,
												password		: newPassword,
												module_ids		: moduleArray,
												is_sub_admin	: IS_SUBADMIN,
												active 			: ACTIVE,
												is_verified 	: VERIFIED,
												is_deleted 		: NOT_DELETED,
												created 		: getUtcDate(),
												modified 		: getUtcDate()
											},(error,qryResult)=>{
												if(!error){
													/** Set requested data for send email **/
													let emailOptions = {
														to 			: email,
														action 		: "add_user",
														rep_array 	: [fullName,email,password,WEBSITE_ADMIN_URL]
													};
													/** Send email **/
													sendMail(req,res,emailOptions);

													/** Send success response **/
													req.flash(STATUS_SUCCESS,res.__("admin.admin_permissions.admin_permissions_has_been_added_successfully"));
													res.send({
														status		: STATUS_SUCCESS,
														redirect_url: WEBSITE_ADMIN_URL+"admin_permissions",
														message		: res.__("admin.admin_permissions.admin_permissions_has_been_added_successfully")
													});
												}else{
													/** Send error response **/
													res.send({
														status : STATUS_ERROR,
														message: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}],
													});
												}
											});
										});
									});
								},(error) =>{
									/** Send error response **/
									res.send({
										status  : STATUS_ERROR,
										message : [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
									});
								});
							}else{
								res.send({
									status	: STATUS_ERROR,
									message	: [{param:'email',msg:res.__("admin.admin_permissions.your_email_id_is_already_exist")}]
								});
							}
						}
					);
				}catch(e){
					/** Send error response **/
					res.send({
						status	: STATUS_ERROR,
						message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
					});
				}
			}else{
				/** Send error response **/
				res.send({
					status	: STATUS_ERROR,
					message	: errors,
				});
			}
		}else{
			getAdminRoleList(req, res).then(response=>{
				if(response.status == STATUS_SUCCESS){
					/** Include admin modules Module **/
					adminModule.getAdminModulesTree(req, res).then((moduleResponse)=>{
						req.breadcrumbs(BREADCRUMBS['admin/admin_permissions/add']);
						res.render('add',{
							adminRoles		: 	(response.result)		?	response.result			:{},
							admin_modules   :	(moduleResponse.result)	? 	moduleResponse.result	:[]
						});
					});
				}else{
					/** Send error response **/
					req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
					res.redirect(WEBSITE_ADMIN_URL+"admin_permissions");
				}
			});
		}
	};//End add()

	/**
	 * Function for edit admin permission
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return null
	 */
	this.edit = (req, res)=> {
		let id 	= (req.params.id)	? req.params.id	: "";
		if(id && id != ""){
			if(isPost(req)){
				/** Sanitize Data **/
				req.body			= 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
				let userRole		= 	(req.body.user_role)		? 	req.body.user_role	 		:"";
				let password		= 	(req.body.password)			?	req.body.password			:"";
				let confirmPassword	=	(req.body.confirm_password)	? 	req.body.confirm_password	:"";

				/** Check validation **/
				req.checkBody({
					"first_name": {
						notEmpty: true,
						errorMessage: res.__("admin.admin_permissions.please_enter_first_name")
					},
					"last_name": {
						notEmpty: true,
						errorMessage: res.__("admin.admin_permissions.please_enter_last_name")
					},
					"user_role": {
						notEmpty: true,
						errorMessage: res.__("admin.admin_permissions.please_select_user_role")
					},
					'email': {
						notEmpty: true,
						errorMessage: res.__("admin.admin_permissions.please_enter_mail"),
						isEmail: {
							errorMessage: res.__("admin.admin_permissions.please_enter_valid_email_address")
						},
					},
					"module_ids": {
						notEmpty: true,
						errorMessage: res.__("admin.admin_permissions.please_select_modules")
					}
				});

				if(password != '' || confirmPassword != ''){
					/** Check validation  if password changed*/
					req.checkBody({
						'password': {
							notEmpty: true,
							isLength:{
								options: PASSWORD_LENGTH,
								errorMessage: res.__("admin.admin_permissions.password_length_should_be_minimum_6_character")
							},
							errorMessage: res.__("admin.admin_permissions.please_enter_password")
						},
						"confirm_password": {
							notEmpty: true,
							isLength:{
								options: PASSWORD_LENGTH,
								errorMessage: res.__("admin.admin_permissions.password_length_should_be_minimum_6_character")
							},
							errorMessage: res.__("admin.admin_permissions.please_enter_confirm_password")
						}
					});
					/** Validate confirm password*/
					req.checkBody('confirm_password', res.__("admin.user.confirm_password_should_be_same_as_password")).equals(password);
				}

				/** parse Validation array  **/
				let errors = parseValidation(req.validationErrors(),req);
				if (!errors) {
					try{
						/** Include admin modules Module **/
						adminModule.formatModuleIdsArray(req,res).then(moduleArray=>{
							let email		=	(req.body.email)		? 	req.body.email		:"";
							let firstName	= 	(req.body.first_name)	? 	req.body.first_name	:"";
							let lastName 	= 	(req.body.last_name)	? 	req.body.last_name	:"";
							let fullName 	=	firstName+' '+ lastName;

							/** Configure  unique  email conditions*/
							const users = db.collection('users');
							users.findOne({
									_id   		: {$ne :ObjectId(id)},
									is_deleted 	: NOT_DELETED,
									email		: {$regex : '^'+email+'$',$options : 'i'}
								},
								{projection: {
									_id:1,email:1,
								}},(err, result)=>{
									if(!result){
										let updateData	=	{
											user_role_id 	: userRole,
											first_name		: firstName,
											last_name 		: lastName,
											full_name		: fullName,
											email 			: email,
											module_ids		: moduleArray,
											modified 		: getUtcDate()
										};

										/**Genrate password hash */
										bcrypt.hash(password, saltRounds).then(newPassword=>{
											if(password != ""){
												updateData['password']	=	newPassword;
											}

											/** update admin permission data*/
											users.updateOne({
													_id : ObjectId(id)
												},
												{$set: updateData},
												(err,result)=>{
													if(!err){
														/** Delete user Modules list Flag **/
														userModuleFlagAction(id,"","delete");

														/** Send success response **/
														req.flash(STATUS_SUCCESS,res.__("admin.admin_permissions.admin_permissions_updated_successfully"));
														res.send({
															status		: STATUS_SUCCESS,
															redirect_url: WEBSITE_ADMIN_URL+"admin_permissions",
															message		: res.__("admin.admin_permissions.admin_permissions_updated_successfully"),
														});
													}else{
														/** Send error response **/
														res.send({
															status	: STATUS_ERROR,
															message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}],
														});
													}
												}
											);
										});
									}else{
										/** Send error response **/
										res.send({
											status : STATUS_ERROR,
											message: [{param:'email',msg:res.__("admin.admin_permissions.your_email_id_is_already_exist")}]
										});
									}
								}
							);
						});
					}catch(e){
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
				getAdminPermissionDetails(req, res).then(response=>{
					getAdminRoleList(req, res).then(roleResponse=>{
						if(response.status == STATUS_SUCCESS){
							/** Include admin modules Module **/
							adminModule.getAdminModulesTree(req, res).then((moduleResponse)=>{
								/** Render edit page  **/
								req.breadcrumbs(BREADCRUMBS['admin/admin_permissions/edit']);
								res.render('edit',{
									result			: 	(response.result) 		? response.result 		: {},
									adminRoles 		: 	(roleResponse.result) 	? roleResponse.result 	: {},
									admin_modules   : 	(moduleResponse.result)	? moduleResponse.result	: []
								});
							});
						}else{
							/** Send error response **/
							req.flash(STATUS_ERROR,response.message);
							res.redirect(WEBSITE_ADMIN_URL+'admin_permissions');
						}
					});
				});
			}
		}else{
			/** Send error response **/
			req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
			res.redirect(WEBSITE_ADMIN_URL+'admin_permissions');
		}
	};//End edit()

	/**
	 * Function for delete
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return null
	 */
	this.delete = (req, res)=> {
		let id	= (req.params.id) ? req.params.id : '';
		if(id && id != ""){
			try{
				/** Delete admin permission*/
				const users = db.collection("users");
				users.updateOne({
						_id : ObjectId(id)
					},
					{$set : {
						is_deleted 	: DELETED,
						deleted_at	: getUtcDate(),
						modified	: getUtcDate()
					}},(err,result)=>{
						if(!err){

							/** Delete user Modules list Flag **/
							userModuleFlagAction(id,"","delete");

							/** Send success response **/
							req.flash(STATUS_SUCCESS,res.__("admin.admin_permissions.admin_permissions_deleted_successfully"));
							res.redirect(WEBSITE_ADMIN_URL+"admin_permissions");
						}else{
							/** Send error response **/
							req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
							res.redirect(WEBSITE_ADMIN_URL+"admin_permissions");
						}
					}
				);
			}catch(e){
				/** Send error response **/
				req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
				res.redirect(WEBSITE_ADMIN_URL+"admin_permissions");
			}
		}else{
			/** Send error response **/
			req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
			res.redirect(WEBSITE_ADMIN_URL+"admin_permissions");
		}
	};//End delete()

	/**
	 * Function for get Admin Permission Details
	 *
	 * @param req	As Request Data
	 * @param res 	As Response Data
	 *
	 * @return json
	 */
	let getAdminPermissionDetails = (req,res)=>{
		return new Promise(resolve=>{
			let id	=	(req.params.id)	? req.params.id	: "";
			if(!id || id ==''){
				let response = {
					status	: STATUS_ERROR,
					message	: res.__("admin.system.invalid_access")
				};
				resolve(response);
			}else{
				try{
					const users	= db.collection('users');
					users.aggregate([
						{$match :{
							_id			: ObjectId(id),
							is_deleted	: NOT_DELETED
						}},
						{$lookup : {
							"from" 			: 	"admin_roles",
							"localField" 	:	"user_role_id",
							"foreignField" 	: 	"role_id",
							"as" 			: 	"role_detail"
						}},
						{$project :	{
							_id : 1, first_name : 1, last_name : 1, full_name : 1,email : 1,modified : 1,active : 1,user_role_id : 1,role_id : 1,module_ids : 1,
							role_name	:	{$arrayElemAt : ["$role_detail.role_name",0] },
						}},
					]).toArray((err, result)=>{
						if(!err && result && result[0]){
							/** Send success response **/
							let response = {
								status	: STATUS_SUCCESS,
								result	: result[0]
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
					});
				}catch(e){
					/** Send error response **/
					let response = {
						status	: STATUS_ERROR,
						message	: res.__("admin.system.something_going_wrong_please_try_again")
					};
					resolve(response);
				}
			}
		});
	};//End getAdminPermissionDetails();

	/**
	 * Function to get admin roles list
	 *
	 * @param req	As Request Data
	 * @param res	As Response Data
	 *
	 * @return json
	 */
	let	getAdminRoleList = (req,res)=>{
		return new Promise(resolve=>{
		 	try{
				/** Get  admin role details **/
				const admin_roles = db.collection('admin_roles');
				admin_roles.find({is_shown : SHOWN},{projection: {_id:1,role_name:1}}).collation(COLLATION_VALUE).sort({"role_name":1}).toArray((err,result)=>{
					if(result){
						/** Send success response **/
						let response = {
							status	: STATUS_SUCCESS,
							result	: result
						};
						resolve(response);
					}else{
						/** Send error response */
						let response = {
							status	: STATUS_ERROR,
							message	: res.__("admin.system.something_going_wrong_please_try_again")
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
		});
	};// End getAdminRoleList()

	/**
	 * Function for view Admin Permission Details
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render
	 */
	this.viewDetials = (req, res)=>{
		let id	= (req.params.id)	? req.params.id	: "";
		if(id && id != ""){
			try{
				/** Get Admin Permission details **/
				getAdminPermissionDetails(req, res).then((response)=>{
					if(response.status == STATUS_SUCCESS){
						req.breadcrumbs(BREADCRUMBS['admin/admin_permissions/view']);
						/** Render view page*/
						res.render('view',{
							result : 	response.result
						});
					}else{
						/** Send error response **/
						req.flash(STATUS_ERROR,response.message);
						res.redirect(WEBSITE_ADMIN_URL+"admin_permissions");
					}
				});
			}catch(e){
				/** Send error response **/
				req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
				res.redirect(WEBSITE_ADMIN_URL+"admin_permissions");
			}
		}else{
			/** Send error response **/
			req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
			res.redirect(WEBSITE_ADMIN_URL+"admin_permissions");
		}
	};//End viewDetials()

	/**
	 * Function for view modules of selected role
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render
	 */
	this.getAdminRoleModulesData = (req, res)=>{
		let roleId = (req.body.id) ? req.body.id : "";
		if(roleId){
			try{
				const admin_roles	= db.collection("admin_roles");
				admin_roles.findOne({_id : ObjectId(roleId)},{projection: {_id : 1,role_name :1,module_ids:1}},(err,result)=> {
					if(!err && result){
						res.send({
							status : STATUS_SUCCESS,
							result : result
						});
					}else{
						res.send({
							status 	: STATUS_ERROR,
							message : res.__("admin.system.something_going_wrong_please_try_again")
						});
					}
				});
			}catch(e){
				res.send({
					status 	: STATUS_ERROR,
					message : res.__("admin.system.something_going_wrong_please_try_again")
				});
			}
		}else{
			res.send({
				status 	: STATUS_ERROR,
				message : res.__("admin.system.invalid_access")
			});
		}
	};//end getAdminRoleModulesData()

	/**
	 * Function for update active/ deactive status
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return null
	 */
	this.updateStatus  = (req, res)=>{
		let userId = (req.params.id) ? req.params.id : "";
		let status	 = (req.params.status==ACTIVE) ? DEACTIVE : ACTIVE;
		if(userId){
			try{
				const users = db.collection('users');
				users.updateOne({
					_id : ObjectId(userId)
				},
				{$set : {
					active	 : status,
					modified : getUtcDate()
				}},(err,result)=>{
					if(!err){
						/** Send success response **/
						req.flash(STATUS_SUCCESS,res.__("admin.admin_permissions.status_updated_successfully"));
						res.redirect(WEBSITE_ADMIN_URL+'admin_permissions');
					}else{
						/** Send error response **/
						req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
						res.redirect(WEBSITE_ADMIN_URL+'admin_permissions');
					}
				});
			}catch(e){
				/** Send error response **/
				req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
				res.redirect(WEBSITE_ADMIN_URL+'admin_permissions');
			}
		}else{
			/** Send error response **/
			req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
			res.redirect(WEBSITE_ADMIN_URL+'admin_permissions');
		}
	};// end updateStatus()

	/**
	 * Function to send new login credentials to user
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return null
	 */
	this.sendLoginCredentials = (req, res)=>{
		let userId	= (req.params.id) ? req.params.id : "";
		if(userId){
			try{
				/** Get user details **/
				getAdminPermissionShortDetails(req, res).then(response=>{
					if(response.status == STATUS_SUCCESS){
						let userResult = response.result;
						getRandomString(req,res,null).then(randomResponse=>{
							if(randomResponse.status == STATUS_SUCCESS){
								let password 	= (randomResponse.result)	?	randomResponse.result	:"";

								/**Genrate password hash */
								bcrypt.hash(password, saltRounds).then(newPassword=>{

									/** Update password **/
									const users = db.collection("users");
									users.updateOne({
										_id : ObjectId(userId)
									},
									{$set : {
										password : newPassword,
										modified : getUtcDate()
									}},(err,result)=>{
										if(!err){
											let userEmail	= (userResult.email)		? userResult.email		: "";
											let userName	= (userResult.full_name)	? userResult.full_name	: "";

											/** Set requested data for send email **/
											let emailOptions = {
												to 			: userEmail,
												action 		: "send_login_credentials",
												rep_array 	: [userName,userEmail,password,WEBSITE_ADMIN_URL]
											};

											/** Send email **/
											sendMail(req,res,emailOptions);

											req.flash(STATUS_SUCCESS,res.__("admin.admin_permissions.login_credentials_send_successfully"));
											res.redirect(WEBSITE_ADMIN_URL+"admin_permissions");
										}else{
											/** Send error response  **/
											req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
											res.redirect(WEBSITE_ADMIN_URL+"admin_permissions");
										}
									});
								});
							}else{
								/** Send error response  **/
								req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
								res.redirect(WEBSITE_ADMIN_URL+"admin_permissions");
							}
						});
					}else{
						/** Send error response  **/
						req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
						res.redirect(WEBSITE_ADMIN_URL+"admin_permissions");
					}
				});
			}catch(e){
				/** Send error response  **/
				req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
				res.redirect(WEBSITE_ADMIN_URL+"admin_permissions");
			}
		}else{
			/** Send error response  **/
			req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
			res.redirect(WEBSITE_ADMIN_URL+"admin_permissions");
		}
	};//End sendLoginCredentials()

	/**
	 * Function for get Admin Permission Short Details
	 *
	 * @param req	As Request Data
	 * @param res 	As Response Data
	 *
	 * @return json
	 */
	let getAdminPermissionShortDetails = (req,res)=>{
		return new Promise(resolve=>{
			let id	=	(req.params.id)	? req.params.id	: "";
			if(!id || id ==''){
				let response = {
					status	: STATUS_ERROR,
					message	: res.__("admin.system.invalid_access")
				};
				resolve(response);
			}else{
				try{
					const users	= db.collection('users');
					users.findOne({
						_id			: ObjectId(id),
						is_deleted	: NOT_DELETED
					},{projection: {email:1,full_name:1,user_role_id:1}},
					(err, result)=>{
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
					});
				}catch(e){
					/** Send error response **/
					let response = {
						status	: STATUS_ERROR,
						message	: res.__("admin.system.something_going_wrong_please_try_again")
					};
					resolve(response);
				}
			}
		});
	};//End getAdminPermissionShortDetails();
}
module.exports = new AdminPermission();

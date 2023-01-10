const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const asyncForEachOf    = require("async/forEachOf");
const asyncParallel	= require("async/parallel");

function User(req, res) {

  /** Function is used to user login **/
  this.login = async(req, res)=> {
    req.body          = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let mobileOtp     = await getRandomOTP()
    if(!req.body.social_type){
      let phone         = (req.body.phone) ? req.body.phone : '';
      let password      = (req.body.password) ? req.body.password : '';
      let countryCode   = (req.body.country_code) ? req.body.country_code : '';
      let deviceId      = (req.body.device_id) ? req.body.device_id : "";
      let deviceType    = (req.body.device_type) ? req.body.device_type : "";

      /** Check body */
      req.checkBody({	
        "country_code" :{
          notEmpty		:true,
          errorMessage	:res.__("front.user.please_select_country_code")
        },
        "phone" :{
          notEmpty		:true,
          errorMessage	:res.__("front.user.please_enter_your_phone")
        },
        "password":{
          notEmpty		:true,
          errorMessage	:res.__("admin.user.please_enter_password")
        },
        "device_id":{
          notEmpty		:true,
          errorMessage	:res.__("admin.user.device_id_is_not_available")
        },
        "device_type":{
          notEmpty		:true,
          errorMessage	:res.__("admin.user.device_type_is_not_available")
        },
      });

      let errors  = parseValidationFront(req.validationErrors());
      errors      = (errors && errors.length>0) ? errors : [];
      console.log(errors, "errors");

      if(errors.length == NOT){
        let searchCondition               = { is_deleted : NOT_DELETED};
        searchCondition['phone']          = phone;
        searchCondition['country_code']   = { $regex: new RegExp("^" +countryCode, "i") }
       

        /** get user */
        let collection = db.collection('users');
        collection.findOne(searchCondition, async (err, result)=>{
          let userDetail = (result && Object.keys(result).length > NOT) ? result :{};
          if(err) return next(err);

          if(Object.keys(userDetail).length == NOT){
            return res.send({
              status		:	API_STATUS_ERROR,
              message		:	res.__("front.user.login.invalid_username_password"),
              result    : {},
              error		  :	errors[0],
            });
          }

          /** Compare password */
          const bcrypt = require("bcryptjs");
          bcrypt.compare(password, result.password, async (err, isMatch) => {
            if(result && Object.keys(result).length > NOT && isMatch){
              let response = {
                status          : API_STATUS_SUCCESS,
                message         : res.__("front.user.login.successfully_login"),
                result          : {},
                error		        :	"",
                multi_login     : false
              };

              if(result.is_active == DEACTIVE) {
                response['status']		=	API_STATUS_ERROR;
                response['message']   = res.__("front.user.login.account_deactivate_contact_to_admin");
              }else if(result.phone_verified == NOT_VERIFIED) {
                  response['result']    = {validate_string : result.phone_validate_string, phone : result.phone}
                  response['status']		=	API_STATUS_ERROR; 
                  response['message']   = res.__("front.user.login.mobile_not_verified")
              }else if(result.device_id && result.device_id != deviceId ) {
                let validateString = await getRandomString(VALIDATE_STRING_ROUND);
                
                /***Send SMS */
                let phoneOptions = {
                  mobile_number : "+"+result["dial_code"]+result["phone"],
                  sms_template  : "OTP for login "+ mobileOtp
                };

                await sendSMS(req,res,phoneOptions); 
                
                collection.updateOne({phone : result.phone},{$set:{'otp' : Number(mobileOtp), phone_validate_string : validateString.result}})
                response['result']    = {phone : result.phone, validate_string : validateString.result}
                
                response['status']		=	API_STATUS_ERROR; 
                response['multiple_user_login'] = true;
                response['message']   = res.__("front.user.login.already_login_with_another_device")
              }else{
                let updateData = {
                  'modified': getUtcDate(),
                  'fcm_key' : (req.body.fcm_key) ? req.body.fcm_key : "",
                }
                if(!result.device_id){
                  updateData['device_id'] =  deviceId;
                  updateData['device_type'] = deviceType;
                }
                
                collection.updateOne({"is_deleted" : NOT_DELETED, phone : phone},{$set:updateData})

                /*** End user detail */
                let JWTData = {user_id : result._id}
                response['result']  = {user_id : result._id, token : generateJWT(JWTData)}; 
              }

              return res.send(response);
            }else{
              return res.send({
                status		:	API_STATUS_ERROR,
                message		:	res.__("front.user.login.invalid_username_password"),
                result    : {},
                error		  :	res.__("front.user.login.invalid_username_password"),
              });
            }
          }) 
        })
      }
  
    }else{

      let email       = (req.body.email) ? req.body.email : "";
      let phone       = (req.body.phone) ? req.body.phone : "";
      let fcmKey      = (req.body.fcm_key) ? req.body.fcm_key : "";
      let deviceId    = (req.body.device_id) ? req.body.device_id : "";
      let deviceType  = (req.body.device_type) ? req.body.device_type : "";
      let fullName    = (req.body.full_name) ? req.body.full_name : "";
      let socialId    = (req.body.social_id) ? req.body.social_id : "";
      let socialType  = (req.body.social_type) ? req.body.social_type : "";

      if(!deviceId || !socialId){
        return res.send({
          status		:	API_STATUS_ERROR,
          message		:	res.__("front.user.invalid_request"),
          result    : {},
          error		  :	res.__("front.user.invalid_request"),
        });
      }

      let searchCondition = {
        social_id   : socialId,
        social_type : socialType,
        is_deleted  : NOT_DELETED
      };

      /** get user */
      let collection = db.collection('users');
      collection.findOne(searchCondition, async (err, result)=>{
        let userDetail = (result && Object.keys(result).length > NOT) ? result :{};
        if(err) return next(err);

        if(Object.keys(userDetail).length == NOT){
          collection.insertOne({
            email : email,
            phone : phone,
            full_name : fullName,
            fcm_key : fcmKey,
            device_id : deviceId,
            device_type : deviceType,
            social_id : socialId,
            social_type : socialType,
            user_role_id						  :	FRONT_USER_ROLE_ID,
            email_verified				    :	VERIFIED,
            phone_verified				    :	VERIFIED,
            phone_validate_string   	: "",
            otp                       : "",
            is_notification_on        : ACTIVE,
            is_email_on               : ACTIVE,
            is_active					        :	ACTIVE,
            is_deleted					      :	NOT_DELETED,
            created						        :	getUtcDate()
          },  (err, result)=>{
            let JWTData = {user_id : result.insertedId}
            return res.send({
              status : API_STATUS_SUCCESS,
              result : {user_id : result.insertedId, token : generateJWT(JWTData)},
              message : res.__("front.user.login.successfully_login"),
              error : ""
            })
          });
        }else{
          if(result.device_id && result.device_id != deviceId ) {

            /*** Resend otp */
            let mobileValidateOTP = await getRandomOTP();

            /***Send SMS */
            let phoneOptions = {
              mobile_number : "+"+userDetail["dial_code"]+userDetail["phone"],
              sms_template  : "OTP for login "+ mobileValidateOTP
            };

            await sendSMS(req,res,phoneOptions); 

            collection.updateOne({social_id : socialId},{$set:{'otp' : mobileValidateOTP}});
            return res.send({
              status  : API_STATUS_ERROR,
              result  : {},
              error   : "",
              multi_login : true,
              message : res.__("front.user.login.already_login_with_another_device")
            })
          }
          /*** End user detail */
          let updateData = {
            'modified': getUtcDate(),
            'fcm_key' : (req.body.fcm_key) ? req.body.fcm_key : "",
          }
          if(!result.device_id){
            updateData['device_id'] =  deviceId;
            updateData['device_type'] = deviceType;
          }
          collection.updateOne(searchCondition,{$set:updateData})
          
          let JWTData = {user_id : result._id}
          return res.send({
            status : API_STATUS_SUCCESS,
            result : {user_id : result._id, token : generateJWT(JWTData)},
            error : "",
            message : res.__("front.user.login.successfully_login")
          })
        }
      })
    }
  }

  /** Function is used to other user logout **/
  this.logOutOther = async(req, res)=> {
    req.body  = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let otp   = (req.body.otp) ? Number(req.body.otp) : "";
    let phone = (req.body.phone) ? req.body.phone : "";
    let deviceId = (req.body.device_id) ? req.body.device_id : "";
    let deviceType = (req.body.device_type) ? req.body.device_type : "";
    let fcmKey   = (req.body.fcm_key) ? req.body.fcm_key : "";

    if(!otp || !phone || !deviceId || !deviceType){
      return res.send({
        status		:	API_STATUS_ERROR,
        message		:	res.__("front.user.invalid_request"),
        result    : {},
        error		  :	res.__("front.user.invalid_request"),
      });
    }

    let collection = db.collection("users");
    collection.findOneAndUpdate({
      phone : phone, otp : Number(otp)
    },{$set:{
      device_id : deviceId, device_type: deviceType, fcm_key : fcmKey
    }},{projection:{_id : 1}},(error, result)=>{
      if(error) {
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.something_went_wrong_please_try_again_later"),
          result    : {},
          error     : res.__("front.something_went_wrong_please_try_again_later"),
        })
      }else if(result.lastErrorObject && !result.lastErrorObject.updatedExisting){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.user.mobile_otp_has_been_expired_invalid_otp"),
          result    : {},
          error     : res.__("front.user.mobile_otp_has_been_expired_invalid_otp"),
        })
      }else{
            /*** End user detail */
            let JWTData = {user_id : result.value._id}
            return res.send({
              status    : API_STATUS_SUCCESS,
              message   : res.__("front.user.login.successfully_login"),
              result    : {user_id : (result.value) ? result.value._id : '', token : generateJWT(JWTData)},
              error     : '',
            })
      }
    })
  }

  /** Function is used to user logout **/
  this.logOut = async(req, res)=> {
    req.body  = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let userId   = (req.body.user_id) ? req.body.user_id : ObjectId();

    let collection = db.collection("users");
    collection.findOneAndUpdate({
      _id : ObjectId(userId)
    },{$set:{
      device_id : "", device_type: ""
    }},{projection:{_id : 1}},(error, result)=>{
      if(error) {
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.something_went_wrong_please_try_again_later"),
          result    : [],
          error     : res.__("front.something_went_wrong_please_try_again_later"),
        })
      }else if(result.lastErrorObject && !result.lastErrorObject.updatedExisting){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.user.invalid_request"),
          result    : [],
          error     : res.__("front.user.invalid_request"),
        })
      }else{
        /*** End user detail */
        return res.send({
          status    : API_STATUS_SUCCESS,
          message   : res.__("front.user.login.successfully_logout"),
          result    : {},
          error     : '',
        })
      }
    })
  }

  /** Function is used to user signup **/
  this.signup = async (req, res, next)=> {
    req.body      = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);

    /*** Common validation for all types of user */
    req.checkBody({	
      "full_name":{
        notEmpty		:true,
        errorMessage	:res.__("front.user.please_enter_full_name")
      },
      "email":{
        notEmpty		:false,
        isEmail			:{
          errorMessage:res.__("front.user.please_enter_a_valid_email")
        }
      },
      "phone":{
        notEmpty		:true,
        errorMessage	:res.__("front.user.please_enter_mobile"),
      },
      "country_code":{
        notEmpty		:true,
        errorMessage	:res.__("front.user.please_select_country_code")
      },
      "grade":{
        notEmpty		:true,
        errorMessage	:res.__("front.user.please_select_grade_courses"),
      },
      "device_type":{
        notEmpty		:true,
        errorMessage	:res.__("front.user.device_type_not_available")
      },
      "device_id":{
        notEmpty		:true,
        errorMessage	:res.__("front.user.device_id_not_available")
      },
      "password":{
        isLength		:{
          options    : {min : PASSWORD_MIN_LENGTH , max : PASSWORD_MAX_LENGTH},
          errorMessage:res.__("front.user.invalid_password")
        },
        matches	 : {
          options    	: PASSWORD_ALPHANUMERIC_REGEX,
          errorMessage:res.__("front.user.invalid_password")
        },
        notEmpty		:true,
        errorMessage	:res.__("admin.user.please_enter_password")
      },
      "confirm_password":{ 
        isLength		:{
          options    : {min :PASSWORD_MIN_LENGTH,  max : PASSWORD_MAX_LENGTH},
          errorMessage:res.__("front.user.invalid_password")
        },
        matches	 : {
          options    	: PASSWORD_ALPHANUMERIC_REGEX,
          errorMessage:res.__("front.user.invalid_password")
        },
        notEmpty : true,
        errorMessage	:res.__("admin.user.please_enter_confirm_password")	
      },
    });
    
    let email 					       = (req.body.email)						   ?	req.body.email:'';
    let dialCode 					     = (req.body.dial_code)		       ?	req.body.dial_code:'';
    let countryCode 					 = (req.body.country_code)		   ?	req.body.country_code:'';
    let phone 					       = (req.body.phone)						   ?	req.body.phone:{};
    let fullName				       = (req.body.full_name)			     ?	req.body.full_name:'';
    let grade				           = (req.body.grade)			         ?	req.body.grade:'';
    let deviceId				       = (req.body.device_id)			     ?	req.body.device_id:'';
    let deviceType				     = (req.body.device_type)			   ?	req.body.device_type:'';
    let password 				       = (req.body.password)					 ?	req.body.password:'';
    let confirmPassword 		   = (req.body.confirm_password)   ?	req.body.confirm_password:'';
    let encryptPassword 		   = bcrypt.hashSync(password, BCRYPT_PASSWORD_SALT_ROUNDS);

    /** Match password with confirm password */
    if (password && confirmPassword) {
      req.checkBody("confirm_password", "admin.user.password_does_not_matched").equals(req.body.password);
    }

    let errors  = parseValidationFront(req.validationErrors());
    errors      = (errors && errors.length>0) ? errors :  [];

    /** user mobile unique options */
    if(phone){
      let mobileUniqueOptions = {
        table_name  : "users",
        field_value : phone,
        field_name  : 'phone',
        country_code: countryCode
      };
  
      let isMobileUnique  = await checkUniqueValue(mobileUniqueOptions);
      
      if(isMobileUnique && isMobileUnique.status == STATUS_ERROR){
        errors.push(res.__("front.user.phone_is_already_in_use_please_try_something_different"))
      }
    }

    if(errors && errors.length == NOT){
      /** Slug options */
      let slugOptions = {
        table_name  : "users",
        title       : fullName,
        slug_field  : 'full_name'
      };

      let mobileValidateOTP = await getRandomOTP();

      /** get slug form database */
      getDatabaseSlug(slugOptions).then(responseSlug=>{
        let slug  = (responseSlug.title) ? responseSlug.title  : '';

        /** get string */
        getRandomString(VALIDATE_STRING_ROUND).then(responseString=>{
          let phoneValidateString   = (responseString.result) ? responseString.result : '';
          let insertData = {
            full_name					        :	fullName,
            slug                      : slug,
            email						          :	email,
            phone						          :	phone,
            dial_code						      :	dialCode,
            country_code						  :	countryCode,
            grade                     : {_id : ObjectId(grade._id), name : grade.name},
            device_id						      :	deviceId,
            deviceType						    :	deviceType,
            password					        :	encryptPassword,
            user_role_id						  :	FRONT_USER_ROLE_ID,
            email_verified				    :	NOT_VERIFIED,
            phone_verified				    :	NOT_VERIFIED,
            phone_validate_string   	: phoneValidateString,
            phone_link_expired        : getUtcDate,
            otp                       : Number(mobileValidateOTP),
            is_notification_on        : ACTIVE,
            is_email_on               : ACTIVE,
            is_active					        :	ACTIVE,
            is_deleted					      :	NOT_DELETED,
            is_subscription           : false,
            created						        :	getUtcDate()
          };
          signupUser(req,res,insertData)
        }).catch(next);
      }).catch(next);
    }else{
      res.send({
        status	:	API_STATUS_ERROR,
        error		:	errors[0],
        result  : {},
        message : ''
      });
    }
  }

  /** Function is used to signup user */
	signupUser    = async (req,res,insertData)=>{
		const users	=	db.collection('users');
		users.insertOne(insertData,async (error,result)=>{
      if(error) return next();

      /***Send SMS */
      let mobileValidateOTP = insertData['otp'];
      let phoneOptions = {
        mobile_number : '+'+insertData['dial_code']+insertData['phone'],
        sms_template  : "OTP for mobile verification "+ mobileValidateOTP
      };

      await sendSMS(req,res,phoneOptions);

      /*** return success */ 
      insertData['validate_string'] = insertData.phone_validate_string
			return res.send({
        status		:	API_STATUS_SUCCESS,
        message		:	res.__("front.user.you_have_successfully_registered_on_e_learning"),
        result    : insertData,
        error		  :	"",
      });
		})
  };// End signupUser
  
  /** Function is used to verify mobile **/
  this.phoneVerification = async (req, res, next)=> {
    req.body            = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let validateOtp     = (req.body.validate_otp)     ? req.body.validate_otp : '';
    let validateString  = (req.body.validate_string)  ? req.body.validate_string : '';
    let fcmKey          = (req.body.fcm_key)          ? req.body.fcm_key : '';

    /*** Invalid request */
    if(!validateOtp || !validateString) return res.send({
      status		:	API_STATUS_ERROR,
      message		:	res.__("front.user.invalid_request"),
      result    : {},
      error		  :	res.__("front.user.invalid_request"),
    });

    /** search condition */
    let conditionSearch  = {is_deleted  : NOT_DELETED};
    conditionSearch['otp'] = Number(validateOtp);
    conditionSearch['phone_validate_string']  = validateString;

    /** update condition */
    let conditionUpdate = {};
    conditionUpdate['otp'] = null;
    conditionUpdate['fcm_key']  = fcmKey;
    conditionUpdate['phone_verified'] = VERIFIED;


      let collection = db.collection('users');
      collection.findOneAndUpdate(conditionSearch,{$set:conditionUpdate},{"projection": {_id : 1, full_name:1, email:1}}, async (err, result)=>{
        if(!err && result && result.lastErrorObject.updatedExisting  == true){
            /*** End user detail */
            let JWTData = {user_id : result.value._id}
            
            /*** return success */
            return res.send({
              status		:	API_STATUS_SUCCESS,
              message		:	res.__("front.user.mobile_has_been_verified"),
              result    : {user_id : result.value._id, token : generateJWT(JWTData)},
              error		  :	"", 
            });
          
        }else{

          /*** return error */
          if(result && result.lastErrorObject.updatedExisting  == false){
            return res.send({
              status		:	API_STATUS_ERROR,
              message		:	res.__("front.user.mobile_otp_has_been_expired_invalid_otp"),
              result    : {},
              error		  :	res.__("front.user.mobile_otp_has_been_expired_invalid_otp"), 
            });
          }
        }
      })
  };

  /** Function is used to resend otp **/
  this.resendOtp = async(req, res, next)=> {
    req.body      = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let string    = (req.body.validate_string) ? req.body.validate_string : '';

    /** Invalid Request */
    if(!string) return res.send({
      status		:	API_STATUS_ERROR,
      message		:	res.__("front.user.invalid_request"),
      result    : {},
      error		  :	res.__("front.user.invalid_request"),
    })

    /*** Resend otp */
    let mobileValidateOTP = await getRandomOTP();

    /** search condition */
    let conditionSearch = { is_deleted  : NOT_DELETED};         
    conditionSearch['phone_validate_string'] = string;

    /** update condition */
    let conditionUpdate = {};
    conditionUpdate['otp']  = Number(mobileValidateOTP);
    //conditionUpdate['phone_validate_string'] = null;
    conditionUpdate['phone_link_expired']   = getUtcDate();

    let collection = db.collection('users');
    collection.findOneAndUpdate(conditionSearch,{$set:conditionUpdate},{"projection": {full_name:1, email:1, phone : 1, dial_code:1}}, async (err, result)=>{
      if(!err && result && result.lastErrorObject.updatedExisting  == true){

        /***Send SMS */
        let phoneOptions = {
          mobile_number : "+"+result["value"]["dial_code"]+result["value"]["phone"],
          sms_template  : "OTP for mobile verification "+ mobileValidateOTP
        };

        await sendSMS(req,res,phoneOptions);

        /*** return success */
        return res.send({
          status		:	API_STATUS_SUCCESS,
          message		:	res.__("front.user.otp_has_been_sent_on_your_registered_mobile_for_verification"),
          result    : {},
          error		  :	"",
        });
      }else{
        /*** return error */
        return res.send({
          status		:	API_STATUS_ERROR,
          message		:	res.__("front.user.mobile_does_not_exist_in_our_database"),
          result    : {},
          error		  :	res.__("front.user.mobile_does_not_exist_in_our_database"),
        });
      }
    });  
  }

  /** Function is used to send otp or email to reset password **/
  this.forgotPassword = async (req, res, next)=> {
    req.body      = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let phone     = (req.body.phone) ? req.body.phone : '';
    let countryCode     = (req.body.country_code) ? req.body.country_code : '';

    req.checkBody({	
      "phone":{
        notEmpty		:true,
        errorMessage	:res.__("front.user.please_enter_your_mobile_number"),
      },
      "country_code":{
        notEmpty		:true,
        errorMessage	:res.__("front.user.please_select_country_code"),
      },
    })

    let errors  = parseValidationFront(req.validationErrors());
    errors      = (errors && Object.keys(errors).length>0) ? errors :  {};

    /** Check errors */
    if(Object.keys(errors).length == NOT){
      /*** Resend otp */
      let mobileValidateOTP = await getRandomOTP();

      /*** Get random string */
      await getRandomString(VALIDATE_STRING_ROUND).then(responseString=>{
        let validateString   = (responseString.result) ? responseString.result : '';
        

        /** search condition */
        let searchCondition       = { is_deleted : NOT_DELETED};
        searchCondition['phone']  = phone
        searchCondition['country_code']  = countryCode

        /** update condition */
        let conditionUpdate = {};
        conditionUpdate['otp']  = Number(mobileValidateOTP);
        conditionUpdate['phone_validate_string']  = validateString;

        let collection = db.collection('users');
        collection.findOneAndUpdate(searchCondition,{$set:conditionUpdate},{"projection": {full_name:1, dial_code :1,phone:1}}, async(err, result)=>{
          if(!err && result && result.lastErrorObject.updatedExisting  == true){
            /***Send SMS */
            let phoneOptions = {
              mobile_number : "+"+result["value"]["dial_code"]+result["value"]["phone"],
              sms_template  : "OTP for reset password "+ mobileValidateOTP
            };
            await sendSMS(req,res,phoneOptions);

            /*** return success */
            return res.send({
              status		:	API_STATUS_SUCCESS,
              message		:	res.__("front.user.otp_has_been_sent_on_your_registered_phone"),
              result    : {validate_string : validateString},
              error		  :	"",
            });
          }else{
            /*** return error */
            return res.send({
              status		:	API_STATUS_ERROR,
              message		:	res.__("front.user.mobile_does_not_exist_in_our_database"),
              result    : {},
              error		  :	res.__("front.user.mobile_does_not_exist_in_our_database"),
            });
          }
        });
      }).catch(next);
    }else{
      /*** return error */
      return res.send({
        status		:	API_STATUS_ERROR,
        message		:	'',
        result    : {},
        error		  :	errors[0],
      });
    }
  }

  /** Function is used to reset password **/
  this.resetPassword = async (req, res,next)=> {
    req.body            = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let validateString  = (req.body.validate_string)  ? req.body.validate_string : '';
    let password        = (req.body.password)         ? req.body.password : '';
    let confirmPassword = (req.body.confirm_password) ? req.body.confirm_password : '';

    if(!validateString) return res.send({
      status		:	API_STATUS_ERROR,
      message		:	res.__("front.user.invalid_request"),
      result    : {},
      error		  :	res.__("front.user.invalid_request"),
    });

    req.checkBody({	
      "password":{
        isLength		:{
          options    : {min : PASSWORD_MIN_LENGTH , max : PASSWORD_MAX_LENGTH},
          errorMessage:res.__("admin.user.password_should_be_6_characters_long")
        },
        matches	 : {
          options    	: PASSWORD_ALPHANUMERIC_REGEX,
          errorMessage:res.__("admin.user.password.it_should_be_alphanumeric")
        },
        notEmpty		:true,
        errorMessage	:res.__("admin.user.please_enter_password")
      },
      "confirm_password":{ 
        isLength		:{
          options    : {min :PASSWORD_MIN_LENGTH,  max : PASSWORD_MAX_LENGTH},
          errorMessage:res.__("admin.user.password.it_should_be_6_characters_long")
        },
        matches	 : {
          options    	: PASSWORD_ALPHANUMERIC_REGEX,
          errorMessage:res.__("admin.user.password.it_should_be_alphanumeric")
        },
        notEmpty : true,
        errorMessage	:res.__("admin.user.please_enter_confirm_password")	
      },
    });

    /** Match password with confirm password */
    if (password && confirmPassword) {
      req.checkBody("confirm_password", "admin.user.password_does_not_matched").equals(req.body.password);
    }

    let encryptPassword 	= bcrypt.hashSync(password, BCRYPT_PASSWORD_SALT_ROUNDS);
    let errors  = parseValidationFront(req.validationErrors());
    errors      = (errors && errors.length>0) ? errors :  [];

    if(errors.length == NOT){

        /** search condition */
      let conditionSearch = { 
        is_deleted  : NOT_DELETED, 
        is_active   : ACTIVE,
        phone_validate_string : validateString
      };
  
      /** update condition */
      let conditionUpdate = {password : encryptPassword};

      let collection = db.collection('users');
      collection.updateOne(conditionSearch,{$set:conditionUpdate},(err, result)=>{
        if(!err && result && result.modifiedCount > NOT){
          return res.send({
            status		:	API_STATUS_SUCCESS,
            message		:	res.__("front.user.password_has_been_changed_successfully"),
            result    : {},
            error		  :	"",
          });
        }else{
          return res.send({
            status		:	API_STATUS_ERROR,
            message		:	res.__("front.something_went_wrong_please_try_again_later")	,
            result    : {},
            error		  :	res.__("front.something_went_wrong_please_try_again_later"),
          });
        }
      });
    }else{
      return res.send({
        status		:	API_STATUS_ERROR,
        message		:	'',
        result    : {},
        error		  :	errors[0],
      });
    }
  }

  /** Routing is used to get user data **/
  this.getUserDetail = async(req, res, next)=> {
    req.body         = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let userId       = (req.body.user_id)     ? req.body.user_id : "";
    
    /** Check invalid request*/
    if(!userId && (ObjectId.isValid(userId) == false) ) return res.send({
      status    : API_STATUS_ERROR,
      message   : res.__("front.user.invalid_request"),
      result    : {},
      error     : res.__("front.user.invalid_request"),
    });

    /*** Get user detail */
    const collection = db.collection("users");
    collection.aggregate([
      {$match:{
        is_deleted : NOT_DELETED, 
        is_active  : ACTIVE, 
        _id        : ObjectId(userId)
      }},
      {$lookup:{
        from: "notifications",
        pipeline: [
            {$match: {
                $expr: {
                    $and: [
                        { $eq: ["$user_id", ObjectId(userId)] },
                        { $eq: ["$is_seen", NOT] },
                    ],
                },
            }},
        ],
        as: "not_seen_notifications",
      }},
      {$addFields:{
        new_notificaitons : {$size : "$not_seen_notifications"}
      }},
      {$project:{
        password : 0, 
        otp:0, 
        is_active : 0, 
        is_deleted : 0,
        deleted_at : 0,
        modified :0,
        created : 0,
        is_email_on : 0,
        email_verified : 0,
        user_role_id : 0,
        is_notification_on : 0,
        not_seen_notifications : 0
      }}
    ]).toArray((err, result)=>{
        if(err) return next();

        let options = {
          "file_url"          :   USERS_URL,
          "file_path"         :   USERS_FILE_PATH,
          "result"            :   result,
          "database_field"    :   "profile_image"
        };
        appendFileExistData(options).then(response=>{
          /** return success */
          return res.send({
            status		:	API_STATUS_SUCCESS,
            message		:	'',
            result    : (response && response.result) ? response.result[0] : {},
            error		  :	"",
          });
        })
    })
  }

  /** Function is used to update user profile **/
  this.updateProfile  = async(req, res, next)=> {

    req.body          = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let userId        = (req.body.user_id)        ? req.body.user_id:'';
    let password      = (req.body.password)       ? req.body.password:'';
    let email         = (req.body.email)          ? req.body.email:'';
    let phone         = (req.body.phone)          ? req.body.phone:'';
    let fullName      = (req.body.full_name)      ? req.body.full_name:'';
    let countryCode   = (req.body.country_code)	  ?	req.body.country_code:'';
    let dialCode      = (req.body.dial_code)	    ?	req.body.dial_code:'';
    let address       = (req.body.address)	      ?	req.body.address:'';
    let encryptPassword = bcrypt.hashSync(password, BCRYPT_PASSWORD_SALT_ROUNDS);
    let oldPassword       = (req.body.old_password)  ? req.body.old_password:'';
    let encryptOldPassword= bcrypt.hashSync(oldPassword, BCRYPT_PASSWORD_SALT_ROUNDS)
    let confirmPassword   = (req.body.confirm_password)  ? req.body.confirm_password:'';
   
    /** Check invalid request*/
    if(!userId) return res.send({
      status    : API_STATUS_ERROR,
      message   : res.__("front.user.invalid_request"),
      result    : {},
      error     : res.__("front.user.invalid_request"),
    });


    /** set to search data */
    let conditionSearch = {
      _id         :  ObjectId(userId),
      is_deleted  :  NOT_DELETED
    };

    if(phone){
      req.checkBody({ 
        "country_code":{
          notEmpty		:true,
          errorMessage	:res.__("front.user.please_select_country_code")
        },
      })
    }

    if(email){
      req.checkBody({
        isEmail			:{
          errorMessage:res.__("front.user.please_enter_a_valid_email")
        }
      })
    }

    if(password || confirmPassword || oldPassword){
      req.checkBody({
        "password":{
          isLength		:{
            options    : {min : PASSWORD_MIN_LENGTH , max : PASSWORD_MAX_LENGTH},
            errorMessage:res.__("front.user.invalid_password")
          },
          matches	 : {
            options    	: PASSWORD_ALPHANUMERIC_REGEX,
            errorMessage:res.__("front.user.invalid_password")
          },
          notEmpty		:true,
          errorMessage	:res.__("admin.user.please_enter_password")
        },
        "old_password":{
          isLength		:{
            options    : {min : PASSWORD_MIN_LENGTH , max : PASSWORD_MAX_LENGTH},
            errorMessage:res.__("front.user.invalid_password")
          },
          matches	 : {
            options    	: PASSWORD_ALPHANUMERIC_REGEX,
            errorMessage:res.__("front.user.invalid_password")
          },
          notEmpty		:true,
          errorMessage	:res.__("admin.user.please_enter_old_password")
        },
        "confirm_password":{ 
          isLength		:{
            options    : {min :PASSWORD_MIN_LENGTH,  max : PASSWORD_MAX_LENGTH},
            errorMessage:res.__("front.user.invalid_password")
          },
          matches	 : {
            options    	: PASSWORD_ALPHANUMERIC_REGEX,
            errorMessage:res.__("front.user.invalid_password")
          },
          notEmpty : true,
          errorMessage	:res.__("admin.user.please_enter_confirm_password")	
        }
      });

      /** Match password with confirm password */
      if (password && confirmPassword) {
        req.checkBody("confirm_password", "front.user.password_does_not_matched").equals(req.body.password);
      }
    }

    /** set validation */
    let errors  = parseValidationFront(req.validationErrors());
    errors      = (errors && errors.length > NOT) ? errors :  [];

    /** user mobile unique options */
    if(phone){
      let mobileUniqueOptions = {
        table_name  : "users",
        field_value : phone,
        field_name  : 'phone',
        country_code: countryCode,
        old_id      : ObjectId(userId) 
      };
  
      let isMobileUnique  = await checkUniqueValue(mobileUniqueOptions);
      
      if(isMobileUnique && isMobileUnique.status == STATUS_ERROR){
        errors.push(res.__("front.user.phone_is_already_in_use_please_try_something_different"))
      }
    }

    updateData = {$set:{
      'modified'    : getUtcDate()
    }}

    if(email) updateData["$set"]["email"] = email
    if(fullName) updateData["$set"]["full_name"] = fullName
    if(phone) updateData["$set"]["phone"] = phone
    if(countryCode) updateData["$set"]["country_code"] = countryCode
    if(dialCode) updateData["$set"]["dial_code"] = dialCode
    updateData["$set"]["address"] = address
    if(password && confirmPassword) {
      let collection = db.collection("users");
      collection.findOne(conditionSearch,(errorUser,resultUser)=>{
        /** Compare password */
        const bcrypt = require("bcryptjs");
        bcrypt.compare(oldPassword, resultUser.password, async (err, isMatch) => {
          if(resultUser && Object.keys(resultUser).length > NOT && isMatch){
            updateData["$set"]["password"] = encryptPassword
            editProfile(req,res,errors,conditionSearch,updateData)
          }else{
            /** return error */
            return res.send({
              status    : API_STATUS_ERROR,
              message   : res.__("front.user.incorrect_old_password"),
              result    : {},
              error     : res.__("front.user.incorrect_old_password"),
            });
          }
        });
      });
    }else{
      editProfile(req,res,errors,conditionSearch,updateData)
    }
  }// End updateProfile

  /** Function is used to update user detail */
  editProfile    =  async(req,res,errors,conditionSearch,updateData)=>{
    if(errors && errors.length == NOT){
      let image   =   (req.files && req.files.profile_image)  ?   req.files.profile_image :"";
      let imgaeOptions    =   {
        'image'     :   image,
        'filePath'  :   USERS_FILE_PATH
      };
  
      if(image){
        /** Upload user image **/
        let imageResponse = await moveUploadedFile(req, res,imgaeOptions)
        if(imageResponse.status == STATUS_ERROR){
          /** Send error response **/
          return res.send({
              status  : STATUS_ERROR,
              message : imageResponse.message,
              result  : {},
              error   : imageResponse.message,
          });
        }
        updateData["$set"]["profile_image"] = imageResponse.fileName
      }
      
        
      let collection = db.collection('users');
      collection.findOneAndUpdate(conditionSearch, updateData, {'projection' : {password : 0, is_deleted : 0, user_role_id:0,phone_verified :0}},(err, result)=>{
        if(!err){

          let options = {
            conditions : conditionSearch,
            fields     : {password : 0, is_deleted : 0, user_role_id:0,phone_verified :0}
          }
          getUserData('','','',options).then(responseUser=>{
            /** return success */
            return res.send({
              status    : API_STATUS_SUCCESS,
              message   : res.__("front.user.profile_has_been_updated_successfully"),
              result    : (responseUser.result) ? responseUser.result : {},
              error     : '',
            });
          })
        }else{
          /** return error */
          return res.send({
            status    : API_STATUS_ERROR,
            message   : res.__("front.something_went_wrong_please_try_again_later"),
            result    : {},
            error     : res.__("front.something_went_wrong_please_try_again_later"),
          });
        }
      });

    }else{
      return res.send({
        status  : API_STATUS_ERROR,
        error   : errors[0],
        result  : {},
        message : ''
      });
    }
  }

  /*** Function to get other resources data */
  this.getOtherResources = (req,res,next)=>{
    let page      = (req.params.page) ? req.params.page : ACTIVE;
    let skip      = (page - ACTIVE)*FRONT_LISTING_LIMIT;

    let collection = db.collection("other_resources");
    asyncParallel([
      (callback)=>{
        /** Get list of syllabus **/
        collection.find({}).skip(skip).limit(FRONT_LISTING_LIMIT).toArray((err,result)=>{
          let options = {
            "file_url"          :   OTHER_RESOURCES_URL,
            "file_path"         :   OTHER_RESOURCES_FILE_PATH,
            "result"            :   result,
            "database_field"    :   "document"
          };
          appendFileExistData(options).then(response=>{
            callback(err, result);
          })
        });
      },
      (callback)=>{
        /** Get total number of records(syllabus) in collection **/
        collection.countDocuments({},(err,countResult)=>{
          callback(err, countResult);
        });
      }
    ],
    (error, response)=>{
      if(error){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.something_went_wrong_please_try_again_later"),
          totalRecords : NOT,
          result    : [],
          error     : res.__("front.something_went_wrong_please_try_again_later"),
        })
      }

      return res.send({
        status          : API_STATUS_SUCCESS,
        error           : '',
        message         : '',
        totalRecords    :  (response[1]) ? response[1] : NOT,
        result          : (response[0]) ? response[0] : []
      });
    });
  }// End getOtherResources

  /*** Function to get masters*/
  this.getMasters = (req,res,next)=>{
    let dropdownType = (req.params.dropdown_type) ? req.params.dropdown_type : "";
    let masters = db.collection("masters");
    masters.find({'dropdown_type' : dropdownType, 'status' : ACTIVE},{projection : {name :1,slug:1, image:1}}).toArray((error, result)=>{

      if(error){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.something_went_wrong_please_try_again_later"),
          result    : [],
          error     : res.__("front.something_went_wrong_please_try_again_later"),
        })
      }

      /*** Configuration unit data type  */
      if(dropdownType == 'unit_document_type'){
        result.map((record,index)=>{
          if(record._id == STANDARD_EXAM_SOLUTIONS){
            result[index-1]['solutions'] = record
          }
        });
        result.splice(result.findIndex(element => element._id == STANDARD_EXAM_SOLUTIONS) , 1);
      }

      /** Set options for appened image full path **/
      let options = {
        "file_url" 			: 	MASTER_FILE_URL,
        "file_path" 		: 	MASTER_FILE_PATH,
        "result" 			  : 	result,
        "database_field": 	"image"
      };
      /** Appened image with full path **/
      appendFileExistData(options).then(imageResponse=>{
        return res.send({
          status  : API_STATUS_SUCCESS,
          error   : '',
          message : '',
          result	: (imageResponse && imageResponse.result && imageResponse.result)	?	imageResponse.result	:[]
        });
      }).catch(next)
      
    })
  }// End getMasters

  /*** Function to get subjects*/
  this.getSubjects = (req,res,next)=>{
    req.body     = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let levelId  = (req.body.level_id) ? req.body.level_id : "";
    let keyword  = (req.body.keyword) ? req.body.keyword : "";
    
    if(!levelId && !keyword){
      return res.send({
        status    : API_STATUS_ERROR,
        message   : res.__("front.user.invalid_request"),
        result    : {},
        error     : res.__("front.user.invalid_request"),
      })
    }
    
    let searchCondition = {};

    if(levelId) searchCondition['level_id'] = ObjectId(levelId)
    if(keyword) searchCondition['name'] = { $regex: keyword, $options: 'i' }

    let subjects = db.collection("subjects");
    subjects.aggregate([
        {$match:searchCondition},
        {$lookup:{
          from: "masters",
          let :{levelId : '$level_id'},
          pipeline: [
              {$match: {
                  $expr: {
                      $and: [
                          { $eq: ["$_id", "$$levelId"] }
                      ],
                  },
              }},
              {$project : {name : 1}}
          ],
          as: "level_detail",
        }},
        {$project : {
          name :1, 
          level_id :1,
          icon_image : 1,
          level_name : {$arrayElemAt: ["$level_detail.name", NOT]}
        }}
      ]).toArray((error, result)=>{
      if(error){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.something_went_wrong_please_try_again_later"),
          result    : [],
          error     : res.__("front.something_went_wrong_please_try_again_later"),
        })
      }

      let options = {
        "file_url" 			: SUBJECT_ICON_URL,
        "file_path" 		: SUBJECT_ICON_FILE_PATH,
        "result" 			  : result,
        "database_field": "icon_image"
      };

      appendFileExistData(options).then(fileResponse=>{
        return res.send({
          status          : API_STATUS_SUCCESS,
          error           : '',
          message         : '',
          result          : (fileResponse && fileResponse.result && fileResponse.result)	?	fileResponse.result	:{}
        });
      })
    })
  }// End getSubjects

  /*** Function to get video lesson */
  this.getVideoLesson = async(req,res,next)=>{
    req.body     = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let levelId  = (req.body.level_id) ? req.body.level_id : "";
    let subjectId = (req.body.subject_id) ? req.body.subject_id : "";
    let page      = (req.body.page) ? req.body.page : ACTIVE;
    let skip      = (page - ACTIVE)*FRONT_LISTING_LIMIT

    /** Invalid request */
    if(!levelId || !subjectId){
      return res.send({
        status    : API_STATUS_ERROR,
        message   : res.__("front.user.invalid_request"),
        result    : {},
        error     : res.__("front.user.invalid_request"),
      });
    }

    let collection = db.collection("video_lessons");
    asyncParallel([
      (callback)=>{
        /** Get list of syllabus **/
        collection.find({'level._id'   : ObjectId(levelId),'subject._id' : ObjectId(subjectId)}).skip(skip).limit(FRONT_LISTING_LIMIT).toArray((err,result)=>{
          let options = {
            "file_url"          :   VIDEO_LESSON_URL,
            "file_path"         :   VIDEO_LESSON_FILE_PATH,
            "result"            :   result,
            "database_field"    :   "image"
          };
          appendFileExistData(options).then(response=>{
            callback(err, result);
          })
        });
      },
      (callback)=>{
        /** Get total number of records(syllabus) in collection **/
        collection.countDocuments({'level._id'   : ObjectId(levelId),'subject._id' : ObjectId(subjectId)},(err,countResult)=>{
          callback(err, countResult);
        });
      }
    ],
    (error, response)=>{
      if(error){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.something_went_wrong_please_try_again_later"),
          totalRecords : NOT,
          result    : [],
          error     : res.__("front.something_went_wrong_please_try_again_later"),
        })
      }

      return res.send({
        status          : API_STATUS_SUCCESS,
        error           : '',
        message         : '',
        totalRecords    :  (response[1]) ? response[1] : NOT,
        result          : (response[0]) ? response[0] : []
      });
    });
  }// End getVideoLesson

  /*** Function to get units */
  this.getUnits = async(req,res,next)=>{
    req.body     = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let levelId  = (req.body.level_id) ? req.body.level_id : "";
    let subjectId = (req.body.subject_id) ? req.body.subject_id : "";
    let page      = (req.body.page) ? req.body.page : ACTIVE;
    let skip      = (page - ACTIVE)*FRONT_LISTING_LIMIT;

    /** Invalid request */
    if(!levelId || !subjectId){
      return res.send({
        status    : API_STATUS_ERROR,
        message   : res.__("front.user.invalid_request"),
        result    : {},
        error     : res.__("front.user.invalid_request"),
      });
    }

    let collection = db.collection("units");
    asyncParallel([
      (callback)=>{
        /** Get list of syllabus **/
        collection.find({'level._id'   : ObjectId(levelId),'subject._id' : ObjectId(subjectId)}).sort({order: SORT_ASC}).skip(skip).limit(FRONT_LISTING_LIMIT).toArray((err,result)=>{
            callback(err, result);
        });
      },
      (callback)=>{
        /** Get total number of records(syllabus) in collection **/
        collection.countDocuments({'level._id'   : ObjectId(levelId),'subject._id' : ObjectId(subjectId)},(err,countResult)=>{
          callback(err, countResult);
        });
      }
    ],
    (error, response)=>{
      if(error){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.something_went_wrong_please_try_again_later"),
          totalRecords : NOT,
          result    : [],
          error     : res.__("front.something_went_wrong_please_try_again_later"),
        })
      }

      return res.send({
        status          : API_STATUS_SUCCESS,
        error           : '',
        message         : '',
        totalRecords    :  (response[1]) ? response[1] : NOT,
        result          : (response[0]) ? response[0] : []
      });
    });
  }// End getUnits

  /*** Function to get unit document */
  this.getUnitDocuments = async(req,res,next)=>{
    req.body      = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let userId    = (req.body.user_id) ? req.body.user_id : ObjectId();
    let unitId    = (req.body.unit_id) ? req.body.unit_id : "";
    let levelId   = (req.body.level_id) ? req.body.level_id : ObjectId();
    let documentType = (req.body.document_type) ? req.body.document_type : {};
    let page      = (req.body.page) ? req.body.page : ACTIVE;
    let skip      = (page - ACTIVE)*FRONT_LISTING_LIMIT;
    let isSubscription = false;

    /** Invalid request */
    if(!unitId || !documentType){
      return res.send({
        status    : API_STATUS_ERROR,
        message   : res.__("front.user.invalid_request"),
        result    : {},
        error     : res.__("front.user.invalid_request"),
      });
    }

    let collection = db.collection("unit_documents");
    asyncParallel([
      (callback)=>{
        /** Get list of documents **/
        collection.find({'unit_id'   : ObjectId(unitId),'document_type._id' : ObjectId(documentType['_id'])}).skip(skip).limit(FRONT_LISTING_LIMIT).toArray((err,result)=>{
          let options = {
            "file_url"          :   EXAMINER_MIND_FILE_URL,
            "file_path"         :   EXAMINER_MIND_FILE_PATH,
            "result"            :   result,
            "database_field"    :   "document"
          };
          appendFileExistData(options).then(response=>{  
            callback(err, response.result);
          });
        });
      },
      (callback)=>{
        /** Get total number of records(document) in collection **/
        collection.countDocuments({'unit_id'   : ObjectId(unitId),'document_type._id' : ObjectId(documentType._id)},(err,countResult)=>{
          callback(err, countResult);
        });
      },
      (callback)=>{
        /** check plan status **/
        let collection = db.collection("users");
        collection.findOne({'_id'   : ObjectId(userId)},(err,result)=>{
          isSubscription = (result && result.is_subscription) ? result.is_subscription : false
          callback(err, result);
        });
      }
    ],
    (error, response)=>{
      if(error){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.something_went_wrong_please_try_again_later"),
          totalRecords : NOT,
          result    : [],
          error     : res.__("front.something_went_wrong_please_try_again_later"),
        })
      }

      return res.send({
        status          : API_STATUS_SUCCESS,
        error           : '',
        message         : '',
        is_subscription : isSubscription,
        totalRecords    : (response[1]) ? response[1] : NOT,
        result          : (response[0]) ? response[0] : []
      });
    });
  }// End getUnitDocuments

  /*** Function to get subscription plans */
  this.getSubscriptionPlas = (req,res,next)=>{
    let level      = (req.params.level) ? ObjectId(req.params.level) : ""; 
    
    let condition  = {is_active : ACTIVE};
    if(level) condition['level._id'] =  level;

    /** Get list of plans **/
    let collection = db.collection("subscription_plans");
    collection.find(condition,{projection:{price : 1, title : 1, description : 1, slug :1}}).toArray((error,result)=>{
    
      if(error){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.something_went_wrong_please_try_again_later"),
          totalRecords : NOT,
          result    : [],
          error     : res.__("front.something_went_wrong_please_try_again_later"),
        })
      }

      return res.send({
        status          : API_STATUS_SUCCESS,
        error           : '',
        message         : '',
        result          : (result) ? result : []
      });
    });
  }// End getSubscriptionPlas

  /*** Function to get faq list */
  this.getFaq = (req,res,next)=>{
    let collection = db.collection("faqs");

    /** Get list of plans **/
    collection.find({},{projection:{order : 1, question : 1, faq_ans : 1}}).sort({order : SORT_ASC}).toArray((error,result)=>{
      if(error){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.something_went_wrong_please_try_again_later"),
          totalRecords : NOT,
          result    : [],
          error     : res.__("front.something_went_wrong_please_try_again_later"),
        })
      }

      return res.send({
        status          : API_STATUS_SUCCESS,
        error           : '',
        message         : '',
        result          : (result) ? result : []
      });
    });
  }// End getFaq

  /*** Function to get past paper */
  this.getPastPapers = async(req,res,next)=>{
    req.body      = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let levelId   = (req.body.level_id) ? req.body.level_id : "";
    let subjectId = (req.body.subject_id) ? req.body.subject_id : "";
    let page      = (req.body.page) ? req.body.page : ACTIVE;
    let skip      = (page - ACTIVE)*FRONT_LISTING_LIMIT;

    /** Invalid request */
    if(!levelId || !subjectId){
      return res.send({
        status    : API_STATUS_ERROR,
        message   : res.__("front.user.invalid_request"),
        result    : {},
        error     : res.__("front.user.invalid_request"),
      });
    }

    let collection = db.collection("past_papers");
    asyncParallel([
      (callback)=>{
        /** Get list of documents **/
        collection.find({'level._id'   : ObjectId(levelId),'subject._id' : ObjectId(subjectId)}).skip(skip).limit(FRONT_LISTING_LIMIT).toArray((err,result)=>{
          let options = {
            "file_url"          :   PAST_PAPER_FILE_URL,
            "file_path"         :   PAST_PAPER_FILE_PATH,
            "result"            :   result,
            "database_field"    :   "document"
          };
          appendFileExistData(options).then(response=>{  
            callback(err, response.result);
          });
        });
      },
      (callback)=>{
        /** Get total number of records(document) in collection **/
        collection.countDocuments({'level._id'   : ObjectId(levelId),'subject._id' : ObjectId(subjectId)},(err,countResult)=>{
          callback(err, countResult);
        });
      }
    ],
    (error, response)=>{
      if(error){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.something_went_wrong_please_try_again_later"),
          totalRecords : NOT,
          result    : [],
          error     : res.__("front.something_went_wrong_please_try_again_later"),
        })
      }

      return res.send({
        status          : API_STATUS_SUCCESS,
        error           : '',
        message         : '',
        totalRecords    :  (response[1]) ? response[1] : NOT,
        result          : (response[0]) ? response[0] : []
      });
    });
  }// End getPastPapers

  /*** Function to get exam list */
  this.getExamList = async(req,res,next)=>{
    req.body      = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let userId    = (req.body.user_id) ? req.body.user_id : ObjectId();
    let levelId   = (req.body.level_id) ? req.body.level_id : "";
    let subjectId = (req.body.subject_id) ? req.body.subject_id : "";
    let examType  = (req.body.exam_type) ? req.body.exam_type : "";
    let page      = (req.body.page) ? req.body.page : ACTIVE;
    let skip      = (page - ACTIVE)*FRONT_LISTING_LIMIT
    let isSubscription = false;

    /** Invalid request */
    if(!levelId || !subjectId || !examType){
      return res.send({
        status    : API_STATUS_ERROR,
        message   : res.__("front.user.invalid_request"),
        result    : {},
        error     : res.__("front.user.invalid_request"),
      });
    }

    let userSubscriptinos = db.collection("user_subscriptions");
    await userSubscriptinos.find({level_id : ObjectId(levelId), user_id: ObjectId(userId)}).toArray((error, result)=>{
      if(result && result.length){
        isSubscription = true;
      }
    });

    let examCompleted = (examType != "current_test") ? {is_completed : {$gt : NOT}} : {}
    let collection = db.collection("examinations");
    asyncParallel([
      (callback)=>{
        /** Get list of syllabus **/
        collection.aggregate([
          {$match:{
            'level._id' : ObjectId(levelId),
            'subject._id' : ObjectId(subjectId)
          }},
          {$lookup:{
            from: "exam_answers",
            let :{examId : '$_id'},
            pipeline: [
              {$match: {
                  $expr: {
                    $and: [
                      { $eq: ["$exam_id", "$$examId"] },
                      { $eq: ["$user_id", ObjectId(userId)] },
                    ],
                  },
              }},
              {$project : {exam_result : 1}}
            ],
            as: "exam_result",
          }},
          {$project:{
            _id : 1, name:1,
            is_completed : {$size : "$exam_result"}
          }},
          {$match : examCompleted},
          {$skip: skip},
          {$limit: FRONT_LISTING_LIMIT}
        ]).toArray((err,result)=>{
          callback(err, result);
        });
      },
      (callback)=>{
        /** Get total number of records(syllabus) in collection **/
        collection.aggregate([
          {$match:{
            'level._id' : ObjectId(levelId),
            'subject._id' : ObjectId(subjectId)
          }},
          {$lookup:{
            from: "exam_answers",
            let :{examId : '$_id'},
            pipeline: [
              {$match: {
                  $expr: {
                      $and: [
                          { $eq: ["$exam_id", "$$examId"] },
                          { $eq: ["$user_id", ObjectId(userId)] },
                      ],
                  },
              }},
              {$project : {exam_result : 1}}
            ],
            as: "exam_result",
          }},
          {$project:{
            _id : 1, name:1,
            is_completed : {$size : "$exam_result"}
          }},
          {$match : examCompleted},
        ]).toArray((err,result)=>{
          callback(err, result.length);
        });
      }
    ],
    (error, response)=>{
      if(error){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.something_went_wrong_please_try_again_later"),
          totalRecords : NOT,
          result    : [],
          is_subscription  : isSubscription,
          error     : res.__("front.something_went_wrong_please_try_again_later"),
        })
      }

      return res.send({
        status          : API_STATUS_SUCCESS,
        error           : '',
        message         : '',
        is_subscription  : isSubscription,
        totalRecords    : (response[1]) ? response[1] : NOT,
        result          : (response[0]) ? response[0] : []
      });
    });
  }// End getExamList

  /*** Function to get exam detail */
  this.getExamDetail = (req,res,next)=>{
    let examId     = (req.body.exam_id) ? req.body.exam_id : "";
    let userId     = (req.body.user_id) ? req.body.user_id : ObjectId();
    if(!examId){
      return res.send({
        status    : API_STATUS_ERROR,
        message   : res.__("front.user.invalid_request"),
        result    : {},
        error     : res.__("front.user.invalid_request"),
      })
    }

    /** Get list of plans **/
    let collection = db.collection("examinations");
    collection.aggregate([
        {$match : {_id : ObjectId(examId)}},
        {$lookup:{
          from: "exam_answers",
          let :{examId : '$_id'},
          pipeline: [
              {$match: {
                  $expr: {
                      $and: [
                          { $eq: ["$exam_id", "$$examId"] },
                          { $eq: ["$user_id", ObjectId(userId)] },
                      ],
                  },
              }},
              {$project : {exam_result : 1}}
          ],
          as: "exam_result",
        }},
        {$project:{time_duration : 1, description : 1, exam_questions : 1, exam_result : {$arrayElemAt:["$exam_result.exam_result",0]}}}
    ]).toArray((error,result)=>{
      if(error){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.something_went_wrong_please_try_again_later"),
          totalRecords : NOT,
          result    : [],
          error     : res.__("front.something_went_wrong_please_try_again_later"),
        })
      }
      let finalResult = (result) ? result[0] : {};
      finalResult['time_duration'] = (finalResult.time_duration) ? convertMinutesToMilisecods(Number(finalResult.time_duration))  : NOT;
      return res.send({
        status          : API_STATUS_SUCCESS,
        error           : '',
        message         : '',
        result          : (finalResult) ? finalResult : {}
      });
    });
  }// End getExamDetail

  /*** Function is used to purchase a plan 
  */
  runBillPayment = (mobile, channel, amount, API_ID, API_KEY, MERCHANT_ID, PAYMENT_URL)=>{
    return new Promise(resolve=>{
      const axios = require("axios");
      axios.create({
        baseURL: '',
        timeout: 1000,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type' : 'application/json'
        }
      });

      axios({
        method: 'post',
        url: PAYMENT_URL,
        data: {
          "auth":{
            "api_id"      : API_ID,
            "api_key"     : API_KEY,
            "channel"     : channel,
            "service_id"  : "1002",
            "merchant_id" : MERCHANT_ID
          },
          "data":{
            "method" : "runBillPayment",
            "amount"  : String(amount),
            "sender_id" : String(mobile),
            "request_id"  : String(ObjectId()),
            "reference_no"  : String(ObjectId())
          },
          "userdata":{
            "udf1":"ZynlePay System"
          }
        }
      }).then(response=>{
        let finalResponse = (response.data && response.data['response']) ? response.data['response'] : {};
        return resolve(finalResponse)
      })
    });
  }

  /*** Function is used to purchase a plan */
  checkPlanStatus = (levelId, planId, userId)=>{
    return new Promise(resolve=>{
      let collection = db.collection("user_subscriptions");

      /** If payment not done with in 300 seconds, update status as expired **/
      collection.findOne({
        'level_id' : ObjectId(levelId), 
        'user_id'  : ObjectId(userId),
        "plan_id"  : ObjectId(planId),
        'status'   : DEACTIVE
      },(err,result)=>{
        if(err) return resolve({status : STATUS_ERROR});
        if(result){
          let createdDate = (result.created) ? result.created : getUtcDate();
          let diffTime = getDifferenceBetweenTwoDates(createdDate,getUtcDate());
          if(diffTime > PAYMENT_TIME_OUT){
            collection.updateOne(
              {
                'level_id' : ObjectId(levelId), 
                'user_id'  : ObjectId(userId),
                'status'   : DEACTIVE
              },{$set:{
                'status'   : REJECTED,
                "modified" : getUtcDate()
              }},(errorExpireTime, resultExpireTime)=>{
                if(errorExpireTime) return resolve({status  :  STATUS_ERROR})
              }
            )
          }
        }
      });


      asyncParallel([
        (callback)=>{
          /** Get active plan **/
          collection.findOne({
            'level_id' : ObjectId(levelId), 
            'user_id'  : ObjectId(userId),
            "plan_id"  : ObjectId(planId),
            'status'   : ACTIVE
          },(err,result)=>{
              callback(err, result);
          });
        },
        (callback)=>{
          /** Get inactive plan **/
          collection.findOne({
            'level_id' : ObjectId(levelId), 
            'user_id'  : ObjectId(userId),
            "plan_id"  : ObjectId(planId),
            'status'   : DEACTIVE
          },(err,result)=>{
            callback(err, result);
          });
        },
        (callback)=>{
          /** Get expired plan **/
          collection.findOne({
            'level_id' : ObjectId(levelId), 
            'user_id'  : ObjectId(userId),
            "plan_id"  : ObjectId(planId),
            'status'   : REJECTED
          },(err,result)=>{
            callback(err, result);
          });
        }
      ],
      (error, response)=>{
        if(error) return resolve({status : STATUS_ERROR})

        return resolve({
          status    :  STATUS_SUCCESS,
          result    : (response[0]) ? 'active' : ((response[1]) ? 'inactive': ((response[2]) ? 'expired': 'not_purchased'))
        })
      });
    });
  }

  /*** Function is used to get purchase plan */
  this.purchasePlan = async(req,res,next)=>{

    /** Sanitize Data **/
    req.body            = sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
  
    let slug        = (req.body.slug)     ? req.body.slug : "";
    let mobile      = (req.body.mobile)   ? req.body.mobile : "";
    let amount      = (req.body.amount)   ? req.body.amount : '1';
    let userId      = (req.body.user_id)  ? req.body.user_id : "";
    let planId      = (req.body.plan_id)  ? req.body.plan_id : "";
    let channel     = (req.body.channel)  ? req.body.channel : "momo";
    let levelId     = (req.body.level_id) ? req.body.level_id : "";
    let dialCode    = (req.body.dial_code) ? req.body.dial_code : "";
    mobile          = dialCode+mobile;
    
    if(!planId || !userId || !slug || !levelId || !mobile){
      return res.send({
        status    : API_STATUS_ERROR,
        message   : res.__("front.user.invalid_request"),
        result    : {},
        error     : res.__("front.user.invalid_request"),
      })
    }

    /** payment request*/
    let API_ID		    =	res.locals.settings["Zynlepay.payment.api_id"];
    let API_KEY		    =	res.locals.settings["Zynlepay.payment.api_key"];
    let MERCHANT_ID   =	res.locals.settings["Zynlepay.payment.merchant_id"];
    let PAYMENT_URL	  =	res.locals.settings["Zynlepay.payment.request_url"];
    let PAYMENT_STATUS_URL =	res.locals.settings["Zynlepay.payment.check_payment_status"];

    /** Function is used to check payment and update status accordingly */
    await checkPaymentStatus(levelId, userId, PAYMENT_STATUS_URL);

    /** Function is used to check plan status */
    let planStatus = await checkPlanStatus(levelId, planId, userId);
    if(planStatus.status == STATUS_ERROR){
      return res.send({
        status    : API_STATUS_ERROR,
        message   : res.__("front.something_went_wrong_please_try_again_later"),
        result    : [],
        error     : res.__("front.something_went_wrong_please_try_again_later"),
      })
    }

    if(planStatus.result){
      if(planStatus.result == 'inactive'){
        return res.send({
          status          : API_STATUS_SUCCESS,
          error           : '',
          message         : res.__("front.plan.transaction_in_process"),
        });
      }
      else if(planStatus.result == 'active'){
        return res.send({
          status          : API_STATUS_SUCCESS,
          error           : '',
          message         : res.__("front.plan.already_you_have_active_plan"),
        });
      }
      // else if(planStatus.result == 'not_purchased'){
      //   return res.send({
      //     status          : API_STATUS_SUCCESS,
      //     error           : '',
      //     message         : res.__("front.plan.plan_not_exist"),
      //   });
      // }
    }

    /** config start and end date of plan **/
    let date = new Date();
    let start_date = getUtcDate(date);
    let end_date = getUtcDate(new Date(date.setDate(date.getDate() + 364)));

    if(slug == "monthly"){
      let endDate   = new Date(date.setDate(date.getDate() + 29));
      start_date = getUtcDate(date)
      end_date   = getUtcDate(endDate)
    }



    runBillPayment(
      mobile, channel, amount, API_ID, API_KEY, MERCHANT_ID, PAYMENT_URL
    ).then(finalResponse=>{
      let referenceNo   = (finalResponse.reference_no) ? finalResponse.reference_no : '';
      let transactionId = (finalResponse.transaction_id) ? finalResponse.transaction_id : '';
      let responseCode  = (finalResponse.response_code) ? finalResponse.response_code : '';
      finalResponse['date'] = getUtcDate();

      if(responseCode == '990'){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.momo.mobile_does_not_exist"),
          error     : res.__("front.momo.mobile_does_not_exist")
        })
      }else if(responseCode == '120'){

        let collection = db.collection("user_subscriptions");
        collection.insertOne({
            'start_date': start_date, 
            'end_date'  : end_date,
            'status'    : NOT, 
            'level_id'  : ObjectId(levelId), 
            'user_id'   : ObjectId(userId), 
            'plan_id'   : ObjectId(planId),
            'created'   : getUtcDate()
          },(error,result)=>{
            if(error){
              return res.send({
                status    : API_STATUS_ERROR,
                message   : res.__("front.something_went_wrong_please_try_again_later"),
                result    : [],
                error     : res.__("front.something_went_wrong_please_try_again_later"),
              })
            }

            let transactions = db.collection('transactions');
            transactions.insertOne({
              user_id : ObjectId(userId),
              plan_id : ObjectId(planId),
              amount : Number(amount),
              mobile : mobile,
              reference_no : referenceNo,
              transaction_id : transactionId,
              payment_status : responseCode,
              payment_response : [finalResponse],
              created : getUtcDate(),
              modified : getUtcDate(),
            },(errorTransaction, resultTransaction)=>{
              if(errorTransaction){
                return res.send({
                  status    : API_STATUS_ERROR,
                  message   : res.__("front.something_went_wrong_please_try_again_later"),
                  result    : [],
                  error     : res.__("front.something_went_wrong_please_try_again_later"),
                })
              }else{
                return res.send({
                  status          : API_STATUS_SUCCESS,
                  error           : '',
                  message         : res.__("front.subscription_plan.you_have_successfully_made_a_payment_request_to_purchase_a_plan"),
                  result          : resultTransaction
                });
              }
            });
          }
        );
      }
    })
      
  }// End purchasePlan

  /***
   * Function is used to update payment status
  */
  checkPaymentStatus = async(levelId, userId, paymentStatusUrl)=>{
    return  new Promise( async resolve=>{

      let userSubscriptions = db.collection('user_subscriptions');
      let userSubscriptionsDetail = await userSubscriptions.findOne({"level_id" :  ObjectId(levelId), "user_id" : ObjectId(userId)})
      let planId = (userSubscriptionsDetail) ? userSubscriptionsDetail.plan_id : ObjectId();
      
      let transactions = db.collection('transactions');
      transactions.findOne(
        {
          "plan_id" : ObjectId(planId), 
          "user_id" : ObjectId(userId),
          "payment_status" : "120"
        },(error, result)=>{
        if(!error && result){
          
          let axios = require("axios");
          axios.create({
            baseURL: '',
            timeout: 1000,
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
              'Content-Type' : 'application/json'
            }
          });

          axios({
            method: 'post',
            url: paymentStatusUrl,
            data: {"reference_no" : String(result.reference_no)}
          }).then(response=>{
            let finalResponse  = (response.data) ? response.data : {};
            if(finalResponse){
              let isSubscription = false;
              let subscriptinoStatus = DEACTIVE;
              let transactionStatus  = "120";

              if(finalResponse && finalResponse.response_code == "100"){
                isSubscription = true;
                transactionStatus = "100";
                subscriptinoStatus = ACTIVE;
              }

              if(finalResponse && finalResponse.response_code == "995"){
                isSubscription = false;
                transactionStatus = "995";
                subscriptinoStatus = NOT_COMPLETED;
              }

              asyncParallel([
                (callback)=>{
                  finalResponse['date'] = getUtcDate()
                  let transactions = db.collection('transactions');
                  transactions.updateOne(
                    {
                      reference_no : String(result.reference_no)
                    },
                    {$set : {
                      payment_status : transactionStatus, 
                      modified : getUtcDate()
                    },$addToSet: { 
                      "payment_response": finalResponse 
                    }},(errorTransaction, resultTransaction)=>{
                      callback(errorTransaction, resultTransaction)
                    }
                  );
                },
                (callback)=>{
                  userSubscriptions.updateOne(
                    {
                      plan_id : ObjectId(planId),
                      user_id : ObjectId(userId)
                    },
                    {$set : {
                      status : subscriptinoStatus,
                      modified : getUtcDate()
                    }},(errorSubscription, resultSubscription)=>{
                      callback(errorSubscription, resultSubscription)
                  });
                },
                (callback)=>{
                  let users = db.collection('users');
                  users.updateOne(
                    {
                      _id : ObjectId(userId)
                    },
                    {$set : {
                      is_subscription : isSubscription, 
                      modified : getUtcDate()
                    }},(errorUser, resultUser)=>{
                      callback(errorUser, resultUser)
                  });
                }
              ],(errorUpdate, responseUpdate)=>{
                if(errorUpdate) console.log(errorUpdate)
                if(responseUpdate) console.log("success")
                return resolve()
              });
            }else{
              console.log("not matched")
              return resolve()
            }
          })
        }else{
          console.log("not matched 2")
          return resolve()
        }
      })
    })
  } //checkPaymentStatus

  /** Function is used to save exam data */
  this.examSubmission = async(req, res, next)=>{
    req.body   = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let userId = (req.body.user_id) ? req.body.user_id : "";
    let examId = (req.body.exam_id) ? req.body.exam_id : "";
    let examAnswers = (req.body.exam_answers) ? req.body.exam_answers : [];

    if(!userId || !examId || !examAnswers){
      return res.send({
        status    : API_STATUS_ERROR,
        message   : res.__("front.user.invalid_request"),
        result    : {},
        error     : res.__("front.user.invalid_request"),
      });
    }
    
    let totalCorrectQuestion = NOT;
    let totalAttempt = NOT;
    await examAnswers.map((record, index)=>{
      if(record.select_answer) totalAttempt++
      record['_id']           = ObjectId(record._id);
      record['is_correct']    = (record.correct_answer == record.select_answer) ? true : false;
      if(record['is_correct'] == true) totalCorrectQuestion++
      return record;
    })

    let totalQuestions = examAnswers.length
    let collection = db.collection("exam_answers");
    collection.updateOne(
      {
        exam_id : ObjectId(examId), 
        user_id : ObjectId(userId),

      },
      {$set:{
        exam_result  : {'total_attempt' : totalAttempt, 'percentage':(totalCorrectQuestion*100)/totalQuestions, 'total_questions' : totalQuestions, 'total_correct' : totalCorrectQuestion },
        exam_answers : examAnswers,
        modified     : getUtcDate()
      },$setOnInsert:{
        exam_id : ObjectId(examId),
        user_id : ObjectId(userId),
        created : getUtcDate()
      }},
      {upsert : true},(error, result)=>{
        if(error){
          return res.send({
            status    : API_STATUS_ERROR,
            message   : res.__("front.something_went_wrong_please_try_again_later"),
            result    : [],
            error     : res.__("front.something_went_wrong_please_try_again_later"),
          })
        }

        return res.send({
          status    : API_STATUS_SUCCESS,
          message   : res.__("front.exam_submission.exam_has_been_submitted_successfully"),
          result    : [],
          error     : "",
        })
      }
    )
  }//examSubmission

  /*** Function to get notifications */
  this.notifications = async(req,res,next)=>{
    req.body      = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let userId    = (req.body.user_id) ? req.body.user_id : "";
    let page      = (req.body.page) ? req.body.page : ACTIVE;
    let skip      = (page - ACTIVE)*FRONT_LISTING_LIMIT;

    /** Invalid request */
    if(!userId){
      return res.send({
        status    : API_STATUS_ERROR,
        message   : res.__("front.user.invalid_request"),
        result    : {},
        error     : res.__("front.user.invalid_request"),
      });
    }

    let collection = db.collection("notifications");
    asyncParallel([
      (callback)=>{
        /** Get list of notification **/
        collection.find({'user_id'   : ObjectId(userId)}).skip(skip).limit(FRONT_LISTING_LIMIT).sort({created : SORT_DESC}).toArray((err,result)=>{
          callback(err, result);
        });
      },
      (callback)=>{
        /** Get total number of records(document) in collection **/
        collection.countDocuments({'user_id'   : ObjectId(userId)},(err,countResult)=>{
          callback(err, countResult);
        });
      }
    ],
    (error, response)=>{
      if(error){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.something_went_wrong_please_try_again_later"),
          totalRecords : NOT,
          result    : [],
          error     : res.__("front.something_went_wrong_please_try_again_later"),
        })
      }

      return res.send({
        status          : API_STATUS_SUCCESS,
        error           : '',
        message         : '',
        totalRecords    :  (response[1]) ? response[1] : NOT,
        result          : (response[0]) ? response[0] : []
      });
    });
  }// End notifications

  /** This function is used to update notification status */
  this.notificationUpdate = (req, res, next)=>{
    req.body      = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let userId    = (req.body.user_id) ? req.body.user_id : "";
    let notificationIds  = (req.body.notification_ids) ? req.body.notification_ids : [];

    /** Invalid request */
    if(!userId || notificationIds.length == NOT){
      return res.send({
        status    : API_STATUS_ERROR,
        message   : res.__("front.user.invalid_request"),
        result    : {},
        error     : res.__("front.user.invalid_request"),
      });
    }

    let notificationObjectId = [];
    notificationIds.map(records=>{
      notificationObjectId.push(ObjectId(records));
    });

    let collection = db.collection("notifications");
    collection.updateMany({_id : {$in : notificationObjectId}},{$set : {is_seen : ACTIVE}},(error, result)=>{
      if(error){
        return res.send({
          status    : API_STATUS_ERROR,
          message   : res.__("front.something_went_wrong_please_try_again_later"),
          result    : [],
          error     : res.__("front.something_went_wrong_please_try_again_later"),
        })
      }else{
        return res.send({
          status    : API_STATUS_SUCCESS,
          message   : res.__("front.notifications.status_has_been_updated_successfully"),
          result    : [],
          error     : "",
        })
      }
    })
  } //notificationUpdate

  /** Function is used to update plan status */
  this.updatePlanStatus = (req, res, next)=>{
    let userSubscriptinos = db.collection("user_subscriptions");
    userSubscriptinos.updateMany({"end_date" : {$lt:getUtcDate()}},{$set : {status : REJECTED}}); 
  }
}

module.exports = new User();
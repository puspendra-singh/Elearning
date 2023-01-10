const bcrypt        = require('bcryptjs');
const asyncParallel = require("async/parallel");
const crypto        = require("crypto");
const { ObjectId } = require('mongodb');

function User() {

    const UserModel         = this;
    const saltRounds= BCRYPT_PASSWORD_SALT_ROUNDS;

    /** Use in export data **/
    let exportNumber                    = 0;
    let exportFilterConditions          = {};
    let exportSortConditions            = {};
    let exportCommonConditions          = {};
    exportSortConditions[exportNumber]  = {_id:SORT_DESC};

    /**
     * Function for login
     *
     * @param req   As  Request Data
     * @param res   As  Response Data
     * @param next  As  Callback argument to the middleware function
     *
     * @return render/json
     */
    this.login = (req, res,next)=>{
        if(isPost(req)){
            /** Sanitize Data **/
            req.body            = sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
            let username        = (req.body.username)   ? req.body.username : "";
            let simplePassword  = (req.body.password)   ? req.body.password : "";

            /** Check validation **/
            req.checkBody({
                "username": {
                    notEmpty: true,
                    errorMessage: res.__("admin.user.please_enter_email"),
                    isEmail: {
                        errorMessage: res.__("admin.user.please_enter_valid_email_address")
                    }
                },
                "password": {
                    notEmpty: true,
                    errorMessage: res.__("admin.user.please_enter_password")
                },
            });

            /** parse Validation array  **/
            let errors = parseValidation(req.validationErrors(),req);
            if (errors) {
                /** Send error response **/
                return res.send({
                    status  : STATUS_ERROR,
                    message : errors,
                });
            }

            /** Set login options **/
            let loginOptions = {
                user_name   :   username,
                password    :   simplePassword
            };

            /** call login function **/
            adminLoginFunction(req,res,next,loginOptions).then(responseData=>{
                
                if(responseData.status  != STATUS_SUCCESS){
                    /** Send error response **/
                    return res.send({
                        status  : STATUS_ERROR,
                        message : (responseData.errors) ?   responseData.errors :[],
                    });
                }

                /** Send success response **/
                res.send({
                    redirect_url    : WEBSITE_ADMIN_URL+"dashboard",
                    status          : STATUS_SUCCESS,
                });
            }).catch(next);
        }else{
            if(ALLOWED_ADMIN_TO_SET_COOKIE != ACTIVE){
                res.render("login");
                return;
            }

            /** Login user using cookie*/
            let cookie = req.cookies.adminLoggedIn;
            if(!cookie){
                res.render("login");
                return;
            }

            let username            =   (cookie.username)   ?   cookie.username :"";
            let password            =   (cookie.password)   ?   cookie.password :"";
            let decipherUser        =   crypto.createDecipher("aes256", "username");
            let decryptedUsername   =   decipherUser.update(username, "hex", "utf8") + decipherUser.final("utf8");
            let decipherPassword    =   crypto.createDecipher("aes256", "password");
            let decryptedPassword   =   decipherPassword.update(password, "hex", "utf8") + decipherPassword.final("utf8");

            /** Set login options **/
            let loginOptions = {
                user_name   :   decryptedUsername,
                password    :   decryptedPassword
            };

            /** call login function **/
            adminLoginFunction(req,res,next,loginOptions).then(responseData=>{
                if(responseData.status  != STATUS_SUCCESS){
                    /** Delete cookie*/
                    res.clearCookie("adminLoggedIn");
                    res.render("login");
                    return;
                }

                /** Redirect to dashboard*/
                res.redirect(WEBSITE_ADMIN_URL+"dashboard");
            }).catch(next);
        }
    };//End login()

    /**
     * Function for login
     *
     * @param req       As  Request Data
     * @param res       As  Response Data
     * @param next      As  Callback argument to the middleware function
     * @param options   As  Object that have user name and password
     *
     * @return json
     */
    let adminLoginFunction = (req,res,next,options)=>{
        return new Promise(resolve=>{
            let username        = (options.user_name)       ? options.user_name     : "";
            let simplePassword  = (options.password)        ? options.password      : "";
            let rememberMe      = (req.body.remember_me)    ? req.body.remember_me  : false;

            /** Get user Details **/
            const users = db.collection("users");
            users.findOne({
                "is_deleted"    : NOT_DELETED,
                "email"         : {$regex : "^"+username+"$",$options : "i"},
                "user_role_id"  : {$nin:[FRONT_USER_ROLE_ID]}
            },{projection: {
                user_role_id:1,first_name: 1,last_name:1,full_name:1,slug:1,email:1,is_active:1,created:1,password:1
            }},(err, resultData)=>{
                

                if(err) return next(err);

                if(!resultData){
                    /** Send error response **/
                    let response = {
                        status  :   STATUS_ERROR,
                        errors  :   [{"param":"password","msg":res.__("admin.user.please_enter_correct_email_or_password")}],
                        options :   options
                    };
                    return resolve(response);
                }

                /**Compare password */
                let password =  (resultData.password) ? resultData.password : "";
                bcrypt.compare(simplePassword, password).then(passwordMatch=> {
                    if(!passwordMatch){
                        /** Send error response **/
                        let response = {
                            status  :   STATUS_ERROR,
                            errors  :   [{"param":"password","msg":res.__("admin.user.please_enter_correct_email_or_password")}],
                            options :   options
                        };
                        return resolve(response);
                    }

                    if(resultData.is_active != ACTIVE) {
                        /** Send error response **/
                        let response = {
                            status  :   STATUS_ERROR,
                            errors  :   [{"param":"password","msg":res.__("admin.user.account_temporarily_disabled")}],
                            options :   options
                        };
                        return resolve(response);
                    }

                    /** If user check stay sign in check box*/
                    if(rememberMe  == true){
                        let cookie = req.cookies.adminLoggedIn;
                        if (cookie === undefined){
                            let userCipher          = crypto.createCipher("aes256", "username");
                            let encryptedUserName   = userCipher.update(username, "utf8", "hex") + userCipher.final("hex");
                            let passwordCipher      = crypto.createCipher("aes256", "password");
                            let encryptedPassword   = passwordCipher.update(simplePassword, "utf8", "hex") + passwordCipher.final("hex");

                            /**set a new cookie*/
                            res.cookie("adminLoggedIn",{username:encryptedUserName,password:encryptedPassword}, { maxAge: ADMIN_LOGGED_IN_COOKIE_EXPIRE_TIME, httpOnly: true });
                        }
                    }
                    req.session.user = resultData;

                    /** Send success response **/
                    let response = {
                        status  :   STATUS_SUCCESS,
                        options :   options
                    };
                    
                    return resolve(response);

                    
                });
            });
        });
    };//End adminLoginFunction()

    /**
     * Function for show dashboard
     *
     * @param req As Request Data
     * @param res As Response Data
     *
     * @return render
     */
    this.dashboard = (req, res, next)=>{
        asyncParallel({
            totalUsers : (callback)=>{
                let users =   db.collection("users");
                users.countDocuments({is_deleted : NOT_DELETED, user_role_id : FRONT_USER_ROLE_ID},(error,result)=>{
                    callback(error, result)
                })
            },
            totalVideoLessions : (callback)=>{
                let videos = db.collection('video_lessons');
                videos.countDocuments({},(error,result)=>{
                    callback(error, result)
                })
            },
            totalEarnings : (callback)=>{
                let transactions = db.collection('transactions');
                transactions.aggregate([
                    {$match:{
                        "payment_status" : "100"
                    }},
                    {$group:{
                        _id : null,
                        sum : {$sum : "$amount"}
                    }}
                ]).toArray((error,result)=>{
                    let totalEearning = (result && result.length > NOT) ? result[0]['sum'] : NOT 
                    callback(error, totalEearning)
                })
            },
            totalInquiries : (callback)=>{
                let contactUs = db.collection('contact_us');
                contactUs.countDocuments({},(error,result)=>{
                    callback(error, result)
                })
            },
            monthYearWiseUsers: (callback) => {
                let users =   db.collection("users");
                users
                  .aggregate([
                    {
                      $match: {
                        user_role_id : FRONT_USER_ROLE_ID,
                        is_deleted: NOT_DELETED,
                      },
                    },
                    {
                      $project: {
                        month: { $month: '$created' },
                        year: { $year: '$created' },
                      },
                    },
                    {
                      $group: {
                        _id: { month: '$month', year: '$year' },
                        count: { $sum: 1 },
                      },
                    },
                    {$project: { 
                        month_year: { $concat: [ { $toString: "$_id.month" }, "-", { $toString: "$_id.year" } ] } ,
                        total_user: "$count"
                    }}
                  ])
                  .toArray((err, result) => {
                    result.map((records,index)=>{
                        records[records.month_year] = {'total_users': records.total_user}
                    });
                    callback(err, result);
                });
            },
            monthYearWiseDataEarning: (callback) => {
                let transactions =   db.collection("transactions");
                transactions
                  .aggregate([
                    {
                      $match: {
                        "payment_status" : "100"
                      },
                    },
                    {
                      $project: {
                        month: { $month: '$created' },
                        year: { $year: '$created' },
                        amount : 1
                      },
                    },
                    {
                      $group: {
                        _id: { month: '$month', year: '$year' },
                        sum: { $sum: "$amount" },
                      },
                    },
                    {$project: { 
                        month_year: { $concat: [ { $toString: "$_id.month" }, "-", { $toString: "$_id.year" } ] } ,
                        total_amount: "$sum"
                    }}
                  ])
                  .toArray((err, result) => {
                    result.map((records,index)=>{
                        records[records.month_year] = {'total_amount': records.total_amount}
                    });
                    callback(err, result);
                });
            }
        },(err, response)=>{

            /**Render dashboard page*/
            req.breadcrumbs(BREADCRUMBS["admin/dashboard"]);
            res.render("dashboard", {
                result : {
                    'totalUsers' : response.totalUsers,
                    'totalVideoLessions' : response.totalVideoLessions,
                    'totalInquiries' : response.totalInquiries,
                    'totalEarnings' : response.totalEarnings,
                    'monthYearWiseData' : response.monthYearWiseUsers,
                    'monthYearWiseDataEarning' : response.monthYearWiseDataEarning
                }
            });
        });
    };//End dashboard()


    /**
     * Function for edit admin' s profile details
     *
     * @param req As Request Data
     * @param res As Response Data
     *
     * @return render/json
     */
    this.editProfile = (req, res)=>{
        if(isPost(req)){
            /** Sanitize Data **/
            req.body            = sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
            let password        = (req.body.password)           ? req.body.password         : "";
            let confirmPassword = (req.body.confirm_password)   ? req.body.confirm_password : "";
            let oldPassword     = (req.body.old_password)       ? req.body.old_password     : "";
            let id              = (req.session.user)            ? req.session.user._id      : "";
            if(id){
                /** Check validation **/
                req.checkBody({
                    "full_name": {
                        notEmpty: true,
                        isLength:{
                            options: {
                                min    : NAME_MIN_LENGTH,
                                max    : NAME_MAX_LENGTH,
                            },
                            errorMessage: res.__("admin.user.please_enter_name_min_max",NAME_MIN_LENGTH,NAME_MAX_LENGTH)
                        },
                        matches	 : {
                            options    	: NAME_ALPHANUMERIC_REGEX,
                            errorMessage:res.__("front.user.invalid_name")
                        },
                        errorMessage: res.__("admin.user.please_enter_full_name")
                    }
                });

                let passChanged = 0;
                if(password != "" || confirmPassword != "" || oldPassword != ""){
                    passChanged = 1;
                    /** Validate password if password changed*/
                    req.checkBody({
                        "password": {
                            notEmpty: true,
                            isLength:{
                                options: PASSWORD_LENGTH,
                                errorMessage: res.__("admin.user.password_length_should_be_minimum_6_character")
                            },
                            errorMessage: res.__("admin.user.please_enter_your_password")
                        },
                        "old_password": {
                            notEmpty: true,
                            errorMessage: res.__("admin.user.please_enter_your_old_password")
                        },
                        "confirm_password": {
                            notEmpty: true,
                            isLength:{
                                options: PASSWORD_LENGTH,
                                errorMessage: res.__("admin.user.password_length_should_be_minimum_6_character")
                            },
                            errorMessage: res.__("admin.user.please_enter_confirm_password")
                        },
                    });
                    /**Validate confirm password*/
                    req.checkBody("confirm_password", res.__("admin.user.confirm_password_should_be_same_as_password")).equals(password);
                }

                /** parse Validation array  **/
                let errors = parseValidation(req.validationErrors(),req);
                if (!errors) {
                    let fullName    = (req.body.full_name)  ? req.body.full_name    :"";
                    let email       = (req.body.email)      ? req.body.email        :"";
                    const users     = db.collection("users");
                    try{
                        users.findOne({
                                is_deleted  : NOT_DELETED,
                                _id         : {$ne:ObjectId(id)},
                                email       : {$regex : "^"+email+"$",$options:"i"},
                            },
                            {projection: {_id:1,email:1}},
                            (errs,emailResult)=>{
                                if(!emailResult){
                                    if(passChanged){
                                        try{
                                            users.findOne(
                                                {_id : ObjectId(id)},
                                                {projection: {password:1}},(error,userResult)=>{
                                                    if(error || !userResult){
                                                        /** Send error response **/
                                                        return res.send({
                                                            status  : STATUS_ERROR,
                                                            message : [{"param":"old_password","msg":res.__("admin.user_profile.old_password_you_entered_did_not_matched")}],
                                                        });
                                                    }

                                                    bcrypt.compare(oldPassword,userResult.password).then(passwordMatched=>{
                                                        if(!passwordMatched){
                                                            /** Send error response **/
                                                            return res.send({
                                                                status  : STATUS_ERROR,
                                                                message : [{"param":"old_password","msg":res.__("admin.user_profile.old_password_you_entered_did_not_matched")}],
                                                            });
                                                        }

                                                        /** update admin's profile details **/
                                                        bcrypt.hash(password, saltRounds).then(newPassword=>{
                                                            let insertData = {
                                                                full_name : fullName,
                                                                password  : newPassword,
                                                                modified  : getUtcDate()
                                                            };
                                                            updateAdminProfile(insertData,req,res);
                                                        });
                                                    });
                                                }
                                            )
                                        }catch(e){
                                            /** Send error response **/
                                            res.send({
                                                status  : STATUS_ERROR,
                                                message : [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
                                            });
                                        }
                                    }else{
                                        /** update admin 's profile details **/
                                        let insertData  =  {
                                            full_name   :   fullName,
                                            modified    :   getUtcDate()
                                        };
                                        updateAdminProfile(insertData,req,res);
                                    }
                                }else{
                                    /** Send error response **/
                                    res.send({
                                        status  : STATUS_ERROR,
                                        message : [{'param':'email','msg':res.__("admin.user.your_email_id_is_already_exist")}]
                                    });
                                }
                            }
                        );
                    }catch(e){
                        /** Send error response **/
                        res.send({
                            status  : STATUS_ERROR,
                            message : [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
                        });
                    }
                }else{
                    /** Send error response **/
                    res.send({
                        status  : STATUS_ERROR,
                        message : errors,
                    });
                }
            }else{
                /** Send error response **/
                res.send({
                    status  : STATUS_ERROR,
                    message : [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}],
                });
            }
        }else{
            const users     = db.collection("users");
            let userId  = (req.session.user) ? req.session.user._id : "";
            users.findOne({ "_id" : ObjectId(userId), "user_role_id" : {$nin:[FRONT_USER_ROLE_ID]}},{projection: {_id:1,full_name:1,email:1,mobile_number:1}},(err, result)=>{
                if(!err){
                    req.breadcrumbs(BREADCRUMBS["admin/user_profile/edit"]);
                    /**Render edit profile page*/
                    res.render("edit_profile",{
                        result  :   result
                    });
                }else{
                    /** Send error response **/
                    req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
                    res.redirect(WEBSITE_ADMIN_URL+"dashboard");
                }
            });
        }
    };//End editProfile()

    /**
     * Function for update admin 's profile details
     *
     * @param insertData As Data to be insert in database
     * @param req As Request Data
     * @param res As Response Data
     *
     * @return json
     */
    let updateAdminProfile = (insertData,req,res)=>{
        try{
            let id          =   (req.session.user)      ?   req.session.user._id    :"";
            let fullName    =   (req.body.full_name)    ?   req.body.full_name      :"";
            let mobileNumber=   (req.body.mobile_number)?   req.body.mobile_number  :"";

            /** Update admin detail*/
            const users         =   db.collection("users");
            users.updateOne({
                    _id : ObjectId(id)
                },
                {$set: insertData},
                (err,result)=>{
                    if(!err){
                        req.session.user.full_name      =   fullName;
                        req.session.user.mobile_number  =   mobileNumber;
                        /** Send success response **/
                        req.flash(STATUS_SUCCESS,res.__("admin.user.your_profile_has_been_updated_successfully"))
                        res.send({
                            status      : STATUS_SUCCESS,
                            redirect_url: WEBSITE_ADMIN_URL+"dashboard",
                            message     :res.__("admin.user.your_profile_has_been_updated_successfully"),
                        });
                    }else{
                        /** Send error response **/
                        res.send({
                            status  : STATUS_ERROR,
                            message : res.__("admin.system.something_going_wrong_please_try_again")
                        });
                    }
                }
            );
        }catch(e){
            /** Send error response **/
            res.send({
                status  : STATUS_ERROR,
                message : res.__("admin.system.something_going_wrong_please_try_again")
            });
        }
    }//End updateAdminProfile()

    /**
     * Function for recover forgot password
     *
     * @param req As Request Data
     * @param res As Response Data
     *
     * @return render/json
     */
    this.forgotPasswordAdmin = (req, res)=>{
        if(isPost(req)){
            try{
                /** Sanitize Data **/
                req.body        = sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
                let email       = (req.body.email) ? req.body.email :"";
                req.checkBody({
                    "email": {
                        notEmpty: true,
                        errorMessage: res.__("admin.user.please_enter_email_address"),
                        isEmail: {
                            errorMessage: res.__("admin.user.please_enter_valid_email_address")
                        },
                    },
                });
                let errors = parseValidation(req.validationErrors(),req);
                if (!errors) {
                    const users = db.collection("users");
                    users.findOne({
                        "email"         :   email,
                        "user_role_id"  :   SUPER_ADMIN_ROLE_ID
                    },{projection: {_id:1,full_name:1}},(err, result)=>{
                        if (result) {
                                
                            let currentTime         =   currentTimeStamp();
                            let validateString      =   crypto.createHash("md5").update(currentTime+req.body.email).digest("hex");

                            users.updateOne({
                                _id : ObjectId(result._id)
                            },
                            {$set: {
                                forgot_password_validate_string :   validateString,
                                modified                        :   getUtcDate()
                            }},(err,updateResult)=>{
                                if (updateResult) {
                                    /******** Send Mail for reset password link *******/
                                        let link    =   WEBSITE_ADMIN_URL+'reset-password?validate_string='+validateString;
                                        sendMail(req,res,{
                                            to          :   email,
                                            action      :   "admin_forgot_password",
                                            user_id     :   result._id,
                                            rep_array   :   [result.full_name,link,link]
                                        });
                                    /******** Send Mail for reset password link *******/

                                    /** Send success response **/
                                    req.flash(STATUS_SUCCESS,res.__("admin.user.receive_email_with_link").replace(RegExp("{EMAIL}","g"),email));
                                    res.send({
                                        status          :   STATUS_SUCCESS,
                                        redirect_url    :   WEBSITE_ADMIN_URL+"forgot-password",
                                        message         :   res.__("admin.user.receive_email_with_link").replace(RegExp("{EMAIL}","g"),email)
                                    });
                                }else{
                                    /** Send error response **/
                                    res.send({
                                        status : STATUS_ERROR,
                                        message:[{"param":"email","msg":res.__("admin.system.something_going_wrong_please_try_again")}],
                                    });
                                }
                            });
                        }else{
                            /** Send success response **/
                            req.flash(STATUS_ERROR,res.__("admin.user.user_does_not_exist").replace(RegExp("{EMAIL}","g"),email));
                            res.send({
                                status          :   STATUS_SUCCESS,
                                redirect_url    :   WEBSITE_ADMIN_URL+"forgot-password",
                                message         :   res.__("admin.user.user_does_not_exist").replace(RegExp("{EMAIL}","g"),email)
                            });
                        }
                    });
                }else{
                    /** Send error response **/
                    res.send({
                        status: STATUS_ERROR,
                        message: errors,
                    });
                }
            }catch(e){
                /** Send error response **/
                res.send({
                    status  :   STATUS_ERROR,
                    message :   [{"param":"email","msg":res.__("admin.system.something_going_wrong_please_try_again")}],
                });
            }
        }else{
            /** Render forgot password page*/
            res.render("forgot_password");
        }
    };// end forgotPasswordAdmin()

    /**
     * Function for reset password
     *
     * @param req As Request Data
     * @param res As Response Data
     *
     * @return render/json
     */
    this.resetPasswordAdmin = (req, res)=>{
        if(req.query &&  typeof req.query.validate_string !== typeof undefined  && req.query.validate_string !=""){
            if(isPost(req)){
                let validateString  = (req.body.validate_string) ? req.body.validate_string : "";
                if (validateString != "") {
                    /** Check validation **/
                    req.checkBody({
                        "password": {
                            notEmpty: true,
                            isLength:{
                                options: PASSWORD_LENGTH,
                                errorMessage: res.__("admin.user.password_length_should_be_minimum_6_character")
                            },
                            errorMessage: res.__("admin.user.please_enter_your_password")
                        },
                        "confirm_password": {
                            notEmpty: true,
                            isLength:{
                                options: PASSWORD_LENGTH,
                                errorMessage: res.__("admin.user.password_length_should_be_minimum_6_character")
                            },
                            errorMessage: res.__("admin.user.please_enter_confirm_password")
                        },
                    });

                    req.checkBody("confirm_password", res.__("admin.user.confirm_password_should_be_same_as_password")).equals(req.body.password);
                    /** parse Validation array  **/
                    let errors = parseValidation(req.validationErrors(),req);
                    if (!errors) {
                        let password    =   (req.body.password) ? req.body.password :"";
                        /*** Store hash password **/
                        bcrypt.hash(password, BCRYPT_PASSWORD_SALT_ROUNDS).then(newPassword=>{
                            try{
                                const users = db.collection("users");
                                users.findOne({
                                    forgot_password_validate_string : validateString,
                                    "user_role_id"                  : {$nin:[FRONT_USER_ROLE_ID]}
                                },{projection: {_id:1,full_name:1}},(err, result)=>{
                                    if (result) {
                                        try{
                                            /** update password*/
                                            users.updateOne({
                                                _id : ObjectId(result._id)
                                            },
                                            {
                                                $set: {
                                                    password    :   newPassword,
                                                    modified    :   getUtcDate()
                                                },
                                                $unset : {
                                                    forgot_password_validate_string : 1,
                                                }
                                            },(err,updateResult)=>{
                                                /** send Success response **/
                                                req.flash(STATUS_SUCCESS,res.__("admin.user.your_password_has_been_reset_successfully"));
                                                res.send({
                                                    status          :   STATUS_SUCCESS,
                                                    redirect_url    :   WEBSITE_ADMIN_URL+"login",
                                                    message         :   res.__("admin.user.your_password_has_been_reset_successfully"),
                                                });
                                            });
                                        }catch(e){
                                            /** Send error response **/
                                            res.send({
                                                status:STATUS_ERROR,
                                                message:[{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}],
                                            });
                                        }
                                    }else{
                                        /** Send error response **/
                                        res.send({
                                            status:STATUS_ERROR,
                                            message:[{"param":"confirm_password","msg":res.__("admin.user.link_expired_or_wrong_link")}],
                                        });
                                    }
                                });
                            }catch(e){
                                /** Send error response **/
                                res.send({
                                    status:STATUS_ERROR,
                                    message : [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
                                });
                            }
                        });
                    }else{
                        /** Send error response **/
                        res.send({
                            status  : STATUS_ERROR,
                            message : errors,
                        });
                    }
                }else{
                    /** Send error response **/
                    res.send({
                        status:STATUS_ERROR,
                        message:[{"param":"confirm_password","msg":res.__("admin.user.link_expired_or_wrong_link")}],
                    });
                }
            }else{
                try{
                    /** Get user details **/
                    let validateString  = (req.query.validate_string) ? req.query.validate_string : "";
                    const users             = db.collection("users");
                    users.findOne({
                        forgot_password_validate_string : validateString,
                    },{projection: {_id:1,full_name:1}},(err, result)=>{
                        if(result) {
                            /** Render reset password page **/
                            res.render("reset_password",{
                                validate_string : validateString
                            });
                        }else{
                            /** Send error response **/
                            req.flash(STATUS_ERROR,res.__("admin.user.link_expired_or_wrong_link"));
                            res.redirect(WEBSITE_ADMIN_URL+"login");
                        }
                    });
                }catch(e){
                    /** Send error response **/
                    req.flash(STATUS_ERROR,res.__("admin.user.link_expired_or_wrong_link"));
                    res.redirect(WEBSITE_ADMIN_URL+"login");
                }
            }
        }else{
            /** Send error response **/
            req.flash(STATUS_ERROR,res.__("admin.user.link_expired_or_wrong_link"));
            res.redirect(WEBSITE_ADMIN_URL+"login");
        }
    };//End resetPassword()


    /********************************* ADMIN Section End *********************/

    /**
     * Function for get list of users
     *
     * @param req As Request Data
     * @param res As Response Data
     *
     * @return render/json
     */
    this.getUserList = (req, res)=>{
        if(isPost(req)){
            let limit           = (req.body.length)         ? parseInt(req.body.length)         : ADMIN_LISTING_LIMIT;
            let skip            = (req.body.start)          ? parseInt(req.body.start)          : DEFAULT_SKIP;
            let fromDate        = (req.body.fromDate)       ? req.body.fromDate                 : "";
            let toDate          = (req.body.toDate)         ? req.body.toDate                   : "";
            let statusSearch    = (req.body.status_search)  ? parseInt(req.body.status_search)  : "";

            /** Configure DataTable conditions*/
            configDatatable(req,res,null).then(dataTableConfig=>{
                /** Set conditions **/
                let commonConditions = {
                    is_deleted      : NOT_DELETED,
                    user_role_id    : FRONT_USER_ROLE_ID,
                };

                

                /** Conditions for date */
                if (fromDate != "" && toDate != "") {
                    dataTableConfig.conditions["created"] = {
                        $gte    : newDate(fromDate),
                        $lte    : newDate(toDate),
                    };
                }
                /** Conditions for search using status*/
                if (statusSearch != "") {
                    switch(statusSearch){
                        case SEARCHING_ACTIVE:
                            dataTableConfig.conditions.is_active       = ACTIVE;
                        break;

                        case SEARCHING_DEACTIVE:
                            dataTableConfig.conditions.is_active       = DEACTIVE;
                        break;
                    }
                }

                dataTableConfig.conditions = Object.assign(dataTableConfig.conditions,commonConditions);

                const collection    = db.collection("users");
                asyncParallel([
                    (callback)=>{
                        /** Get list of user's **/
                        collection.find(dataTableConfig.conditions,{projection: {_id:1,full_name:1,email:1,phone:1,is_active:1,phone_verified:1,created:1,}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).skip(skip).limit(limit).toArray((err, result)=>{
                            callback(err, result);
                        });
                    },
                    (callback)=>{
                        /** Get total number of records in users collection **/
                        collection.countDocuments(commonConditions,(err,countResult)=>{
                            callback(err, countResult);
                        });
                    },
                    (callback)=>{
                        /** Get filtered records couting in users **/
                        collection.countDocuments(dataTableConfig.conditions,(err,filterContResult)=>{
                            callback(err, filterContResult);
                        });
                    }
                ],
                (err,response)=>{
                    /** Send response **/
                    res.send({
                        status          : (!err) ? STATUS_SUCCESS : STATUS_ERROR,
                        draw            : dataTableConfig.result_draw,
                        data            : (response[0]) ? response[0] : [],
                        recordsFiltered : (response[2]) ? response[2] : 0,
                        recordsTotal    : (response[1]) ? response[1] : 0
                    });
                });
            });
        }else{
        
            /** render listing page **/
            req.breadcrumbs(BREADCRUMBS["admin/users/list"]);
            res.render("list");
        }
    };//End getUserList()

    /**
     * Function for update user's Detail
     *
     * @param req   As  Request Data
     * @param res   As  Response Data
     * @param next  As  Callback argument to the middleware function
     *
     * @return render/json
     */
    this.addUser = (req,res,next)=>{
        if(isPost(req)){
            /** Sanitize Data **/
            req.body        =   sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
            let password    =   (req.body.password) ?   req.body.password   :"";

            /** Check validation **/
            req.checkBody({
                "full_name": {
                    notEmpty: true,
                    isLength:{
                        options: {
                            min    : NAME_MIN_LENGTH,
                            max    : NAME_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.user.please_enter_name_min_max",NAME_MIN_LENGTH,NAME_MAX_LENGTH)
                    },
                    matches	 : {
                        options    	: NAME_ALPHANUMERIC_REGEX,
                        errorMessage:res.__("front.user.invalid_name")
                    },
                    errorMessage: res.__("admin.user.please_enter_name")
                },
                "email": {
                    notEmpty: true,
                    errorMessage: res.__("admin.user.please_enter_email"),
                    isEmail: {
                        errorMessage: res.__("admin.user.please_enter_valid_email_address")
                    },
                },
                "phone": {
                    notEmpty: true,
                    isNumeric:{
                        errorMessage: res.__("admin.user.invalid_phone_number")
                    },
                    isLength:{
                        options: MOBILE_NUMBER_LENGTH,
                        errorMessage: res.__("admin.user.invalid_phone_number")
                    },
                    errorMessage: res.__("admin.user.please_enter_phone_number"),
                },
                "country_code": {
                    notEmpty: true,
                    errorMessage: res.__("admin.user.please_select_country_code")
                },
                "grade": {
                    notEmpty: true,
                    errorMessage: res.__("admin.user.please_select_grade_course")
                },
                "password": {
                    notEmpty: true,
                    isLength:{
                        options: PASSWORD_LENGTH,
                        errorMessage: res.__("admin.user.password_length_should_be_minimum_6_character")
                    },
                    errorMessage: res.__("admin.user.please_enter_password")
                },
                "confirm_password": {
                    notEmpty: true,
                    isLength:{
                        options: PASSWORD_LENGTH,
                        errorMessage: res.__("admin.user.password_length_should_be_minimum_6_character")
                    },
                    errorMessage: res.__("admin.user.please_enter_confirm_password")
                },
            });

            /** Validate confirm password*/
            req.checkBody("confirm_password", res.__("admin.user.confirm_password_should_be_same_as_password")).equals(password);

            /** parse Validation array  **/
            let errors = parseValidation(req.validationErrors(),req);

            if(!req.files || !req.files.profile_image){
                if(!errors) errors =[];
                errors.push({'param':'profile_image','msg':res.__("admin.user.please_select_image")});
            }
            
            if(errors){
                /** Send error response **/
                return res.send({
                    status  : STATUS_ERROR,
                    message : errors,
                });
            }

            let email           = (req.body.email)          ?   req.body.email          :"";
            let grade           = (req.body.grade)          ?   req.body.grade          :{};
            let phone           = (req.body.phone)          ?   req.body.phone          :"";
            let fullName        = (req.body.full_name)      ?   req.body.full_name      :"";
            let dialCode        = (req.body.dial_code)      ?   req.body.dial_code      :"";
            let countryCode     = (req.body.country_code)   ?   req.body.country_code   :"";

            
            let gradeObject = {'_id' : ObjectId(grade.split(",")[0]), 'name' : grade.split(",")[1]}
            /** Configure user unique conditions **/
            const users = db.collection("users");
            users.findOne({
                is_deleted  : NOT_DELETED,
                $or         : [
                    //{email  : {$regex : "^"+email+"$",$options:"i"}},
                    {phone  : phone},
                ]
            },{projection: {_id:1,email:1,phone:1}},(err,result)=>{
                if(err) return next(err);
                let errMessageArray = [];
                if(result){
                    let resultMail      = (result.email)        ? result.email.toLowerCase()    : "";
                    let resultMobile    = (result.phone)        ? result.phone          : "";
                    let enteredMail     = email.toLowerCase();


                    /** Push error message in array if mobile already exists*/
                    console.log(resultMobile, phone)
                    if(resultMobile == phone){
                        errMessageArray.push({'param':'phone','msg':res.__("admin.user.your_mobile_number_is_already_exist")});
                    }

                    /** Send error response **/
                    return res.send({status : STATUS_ERROR, message : errMessageArray});
                }


                let image           =   (req.files && req.files.profile_image)  ?   req.files.profile_image :"";
                let imgaeOptions    =   {
                    'image'     :   image,
                    'filePath'  :   USERS_FILE_PATH
                };

                /** Upload user image **/
                moveUploadedFile(req, res,imgaeOptions).then(imgaeResponse=>{
                    if(imgaeResponse.status == STATUS_ERROR){
                        /** Send error response **/
                        return res.send({
                            status  : STATUS_ERROR,
                            message : [{'param':'profile_image','msg':imgaeResponse.message}],
                        });
                    }

                    /** Set options for get user slug **/
                    let slugOptions = {
                        title       : fullName,
                        table_name  : "users",
                        slug_field  : "slug"
                    };

                    /** Get slug **/
                    getDatabaseSlug(slugOptions).then(slugResponse=>{

                        /**Genrate password hash */
                        bcrypt.hash(password, saltRounds).then(newPassword=>{

                            /** Save user data **/
                            users.insertOne({
                                full_name           :   fullName,
                                email               :   email,
                                username            :   email,
                                phone               :   phone,
                                grade               :   gradeObject,
                                profile_image       :   (imgaeResponse.fileName)    ?   imgaeResponse.fileName  :"",
                                is_active           :   ACTIVE,
                                user_role_id        :   FRONT_USER_ROLE_ID,
                                password            :   newPassword,
                                dial_code           :   dialCode,
                                country_code        :   countryCode,
                                phone_verified      :   VERIFIED,
                                is_deleted          :   NOT_DELETED,
                                slug                :   (slugResponse && slugResponse.title) ? slugResponse.title :"",
                                modified            :   getUtcDate(),
                                created             :   getUtcDate()
                            },(err,result)=>{
                                if(err) return next(err);

                                /** Send success response **/
                                req.flash(STATUS_SUCCESS,res.__("admin.user.user_has_been_added_successfully"));
                                res.send({
                                    status      : STATUS_SUCCESS,
                                    redirect_url: WEBSITE_ADMIN_URL+"users",
                                    message     : res.__("admin.user.user_has_been_added_successfully"),
                                });
                            });
                        });
                    }).catch(next);
                }).catch(next);
            });
        }else{
            let options = {
                collections:[{
                    collection : 'masters',
                    selected   : [],
                    conditions : {
                        dropdown_type : 'course'
                    },
                    columns : ['_id','name']
                }]
            };
            getDropdownList(req,res,next,options).then(dropdownList=>{

                /** Render add page **/
                req.breadcrumbs(BREADCRUMBS["admin/users/add"]);
                res.render("add",{
                    courses_list : (dropdownList.final_html_data) ? dropdownList.final_html_data['0'] : ""
                });
            }).catch(next);
        }
    };//End addUser()

    /**
     * Function for get user's Detail
     *
     * @param req   As Request Data
     * @param res   As Response Data
     *
     * @return json
     */
    let getUserDetails = (req,res,next)=>{
        return new Promise(resolve=>{
            let userId      = (req.params.id)   ?   req.params.id   :"";
            let condition   = {
                _id             : ObjectId(userId),
                user_role_id    : FRONT_USER_ROLE_ID,
                is_deleted      : NOT_DELETED,
            };

            const users = db.collection("users");
            users.findOne(condition,(err, result)=>{
                if(err) return next(err);

                if(!result){
                    /** Send error response **/
                    let response = {
                        status  : STATUS_ERROR,
                        message : res.__("admin.system.invalid_access")
                    };
                    return resolve(response);
                }

                /** Set options for append image full path **/
                let options = {
                    "file_url"          :   USERS_URL,
                    "file_path"         :   USERS_FILE_PATH,
                    "result"            :   [result],
                    "database_field"    :   "profile_image"
                };

                /** Append image with full path **/
                appendFileExistData(options).then(fileResponse=>{
                    let response = {
                        status  : STATUS_SUCCESS,
                        result  : (fileResponse && fileResponse.result && fileResponse.result[0])   ?   fileResponse.result[0]  :{}
                    };
                    resolve(response);
                });
            });
        });
    };//End getUserDetails()

    /**
     * Function for update user's Detail
     *
     * @param req   As  Request Data
     * @param res   As  Response Data
     * @param next  As  Callback argument to the middleware function
     *
     * @return render/json
     */
    this.editUser = (req,res,next)=>{
        if(isPost(req)){
            
            /** Sanitize Data **/
            req.body            = sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
            let password        = (req.body.password)           ? req.body.password         :"";
            let confirmPassword = (req.body.confirm_password)   ? req.body.confirm_password :"";
            /** Check validation **/
            req.checkBody({
                "email": {
                    notEmpty: true,
                    errorMessage: res.__("admin.user.please_enter_email"),
                    isEmail: {
                        errorMessage: res.__("admin.user.please_enter_valid_email_address")
                    },
                },
                "phone": {
                    notEmpty: true,
                    isNumeric:{
                        errorMessage: res.__("admin.user.invalid_phone_number")
                    },
                    isLength:{
                        options: MOBILE_NUMBER_LENGTH,
                        errorMessage: res.__("admin.user.invalid_phone_number")
                    },
                    errorMessage: res.__("admin.user.please_enter_phone_number"),
                },
                "full_name": {
                    notEmpty    : true,
                    isLength:{
                        options: {
                            min    : NAME_MIN_LENGTH,
                            max    : NAME_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.user.please_enter_name_min_max",NAME_MIN_LENGTH,NAME_MAX_LENGTH)
                    },
                    matches	 : {
                        options    	: NAME_ALPHANUMERIC_REGEX,
                        errorMessage:res.__("front.user.invalid_name")
                    },
                    errorMessage: res.__("user.please_enter_full_name")
                },
                "grade": {
                    notEmpty    : true,
                    errorMessage: res.__("user.please_select_grade_course")
                },
            });

            if(password != '' || confirmPassword != ''){
                /** Check validation for password */
                req.checkBody({
                    "password": {
                        notEmpty: true,
                        isLength:{
                            options: PASSWORD_LENGTH,
                            errorMessage: res.__("admin.user.password_length_should_be_minimum_6_character")
                        },
                        errorMessage: res.__("admin.user.please_enter_password")
                    },
                    "confirm_password": {
                        notEmpty: true,
                        isLength:{
                            options: PASSWORD_LENGTH,
                            errorMessage: res.__("admin.user.password_length_should_be_minimum_6_character")
                        },
                        errorMessage: res.__("admin.user.please_enter_confirm_password")
                    },
                });

                /** Validate confirm password*/
                req.checkBody("confirm_password", res.__("admin.user.confirm_password_should_be_same_as_password")).equals(password);
            }

            /** parse Validation array  **/
            let errors = parseValidation(req.validationErrors(),req);

            if(errors){
                /** Send error response **/
                return res.send({
                    status  : STATUS_ERROR,
                    message : errors,
                });
            }


     
            let userId          = (req.params.id)           ? req.params.id : "";
            let grade           = (req.body.grade)          ? req.body.grade : {};
            let email           = (req.body.email)          ? req.body.email : "";
            let phone           = (req.body.phone)          ? req.body.phone : "";
            let dialCode        = (req.body.dial_code)      ? req.body.dial_code : "";
            let countryCode     = (req.body.country_code)   ? req.body.country_code : "";
            let gradeObject     = {'_id' : ObjectId(grade.split(",")[0]), 'name' : grade.split(",")[1]}
            
            /** Configure user unique conditions **/
            const users = db.collection("users");
            users.findOne({
                _id         : {$ne :ObjectId(userId)},
                is_deleted  : NOT_DELETED,
                $or         : [
                    //{email          : {$regex : "^"+email+"$",$options:"i"}},
                    {phone  : phone},
                ]
            },{projection: {_id:1,email:1,phone:1}},
            (err,result)=>{
                if(err) return next(err);
                let errMessageArray =[];
                
                if(result){
                    let resultPhone  = (result.phone)   ? result.phone       : "";

                    /** Push error message in array if mobile already exists*/
                    if(phone == resultPhone){
                        errMessageArray.push({'param':'phone','msg':res.__("admin.user.your_mobile_number_is_already_exist")});
                    }
                }   

                /** Set options for upload image **/
                let oldimage=   (req.body.old_image) ? req.body.old_image :"";
                let image   =   (req.files && req.files.profile_image)  ?   req.files.profile_image :"";
                let options =   {
                    'image'     :   image,
                    'filePath'  :   USERS_FILE_PATH,
                    'oldPath'   :   oldimage
                };

                /** Upload user  image **/
                moveUploadedFile(req, res,options).then(response=>{
                    if(response.status == STATUS_ERROR){                                            
                        /** Send error response **/
                        return res.send({
                            status  : STATUS_ERROR,
                            message : [{'param':'profile_image','msg':response.message}],
                        });
                    }
                    /** Set update data **/
                    let updateData  =   {
                        email           : email.toLowerCase(),
                        phone           : phone,
                        dial_code       : dialCode,
                        country_code    : countryCode,
                        grade           : gradeObject,
                        modified        : getUtcDate()
                    };

                    updateData.full_name    =   (req.body.full_name) ? req.body.full_name   :"";
                    updateData.profile_image=   (response.fileName)  ?   response.fileName  :"";

                    /**Genrate password hash */
                    bcrypt.hash(password, saltRounds).then(newPassword=>{
                        if(password != ""){
                            updateData.password = newPassword;
                        }
                        /** Update user data **/
                        users.updateOne({_id : ObjectId(userId)},{$set : updateData},(updateErr,result)=>{
                            if(updateErr) return next(updateErr);
                            /** Send success response **/
                            req.flash(STATUS_SUCCESS,res.__("admin.user.user_details_has_been_updated_successfully"));
                            res.send({
                                status      : STATUS_SUCCESS,
                                redirect_url: WEBSITE_ADMIN_URL+"users/",
                                message     : res.__("admin.user.user_details_has_been_updated_successfully"),
                            });
                        });
                    });
                }).catch(next); 
            });
        }else{
            let userId      = (req.params.id)   ?   req.params.id   :"";
            /** Get user details **/
            getUserDetails(req, res, next).then(response=>{
                if(response.status != STATUS_SUCCESS){
                    /** Send error response **/
                    req.flash(STATUS_ERROR,response.message);
                    return res.redirect(WEBSITE_ADMIN_URL+"users/");
                }

                let courseId = (response.result && response.result.grade) ? [response.result.grade['_id']] : [];
                let options = {
                    collections:[{
                        collection : 'masters',
                        selected   : [courseId],
                        conditions : {
                            dropdown_type : 'course'
                        },
                        columns : ['_id','name']
                    }]
                };

                getDropdownList(req,res,next,options).then(dropdownList=>{
                    req.breadcrumbs(BREADCRUMBS["admin/users/edit"]);

                    /** Render edit page **/
                    res.render("edit",{
                        result : (response.result) ? response.result :{},
                        courses_list : (dropdownList.final_html_data) ? dropdownList.final_html_data['0'] : ""
                    });
                }).catch(next);
            }).catch(next);
        }
    };//End editUser()

    /**
     * Function for view user's Detail
     *
     * @param req   As  Request Data
     * @param res   As  Response Data
     * @param next  As  Callback argument to the middleware function
     *
     * @return render
     */
    this.viewUserDetails = (req,res,next)=>{
        let userId      = (req.params.id)           ? req.params.id         : "";

        /*** Set conditions */
        let conditions =  {
            _id             : ObjectId(userId),
            user_role_id    : FRONT_USER_ROLE_ID,
        };

        /** Get User details **/
        const users = db.collection("users");
        users.aggregate([
            {$match : conditions},
            { $lookup : {
                from            : "users",
                localField      : "parent_id",
                foreignField    : "_id",
                as              : "parent_details",
            }},
        ]).toArray((err, results)=>{
            if(err) return next(err);
            let result = (results && results.length > 0 && results[0]) ? results[0] : null;
            if(!result){
                /** Send error response **/
                req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
                res.redirect(WEBSITE_ADMIN_URL+"users/");
                return;
            }

            if(result && result.is_deleted == DELETED){
                /** Send error response **/
                req.flash(STATUS_ERROR,res.__("admin.user.this_user_is_deleted_from_the_system"));
                res.redirect(WEBSITE_ADMIN_URL+"users/");
                return;
            }

            /** Set options for append image full path **/
            let options = {
                "file_url"          : USERS_URL,
                "file_path"         : USERS_FILE_PATH,
                "result"            : [result],
                "database_field"    : "profile_image"
            };

            /** Append image with full path **/
            appendFileExistData(options).then(fileResponse=>{
                let finalResult = (fileResponse && fileResponse.result && fileResponse.result[0])   ?   fileResponse.result[0]  :{}
                /** Render view page*/
                req.breadcrumbs(BREADCRUMBS["admin/users/view"]);
                res.render("view",{
                    result  : finalResult,
                });
            }).catch(next);
        });
    };//End viewUserDetails()

    /**
     * Function for update user's status
     *
     * @param req   As Request Data
     * @param res   As Response Data
     * @param next  As  Callback argument to the middleware function
     *
     * @return null
     */
    this.updateUserStatus = (req,res,next)=>{
        let userId      = (req.params.id)           ? req.params.id         : "";
        let userStatus  = (req.params.status)       ? req.params.status     : "";
        let statusType  = (req.params.status_type)  ? req.params.status_type: "";

        /** Set update data **/
        let updateData = {modified  : getUtcDate()};
        if(statusType == ACTIVE_INACTIVE_STATUS) updateData.is_active = (userStatus==ACTIVE) ? DEACTIVE :ACTIVE;

        /** Update user status*/
        const users = db.collection("users");
        users.updateOne({_id : ObjectId(userId)},{$set :updateData},(err,result)=>{
            if(err) return next(err);

            /** Send success response **/
            req.flash(STATUS_SUCCESS,res.__("admin.user.user_status_has_been_updated_successfully"));
            res.redirect(WEBSITE_ADMIN_URL+"users/");
        });
    };//End updateUserStatus()

    /**
     * Function for verify user
     *
     * @param req   As Request Data
     * @param res   As Response Data
     * @param next  As  Callback argument to the middleware function
     *
     * @return null
     */
    this.updateVerifiedUserStatus = (req,res,next)=>{
        let userId      = (req.params.id)   ? req.params.id : "";

        /** Verify user*/
        const users = db.collection("users");
        users.updateOne({
                _id : ObjectId(userId)
            },
            {$set : {
                validate_string : "",
                is_verified     : VERIFIED,
                modified        : getUtcDate()
            }},(err,result)=>{
                if(err) return next(err);

                /** Send success response **/
                req.flash(STATUS_SUCCESS,res.__("admin.user.user_has_been_verified_successfully"));
                res.redirect(WEBSITE_ADMIN_URL+"users/");
            }
        );
    };//End updateVerifiedUserStatus()

    /**
     * Function for delete user
     *
     * @param req   As Request Data
     * @param res   As Response Data
     * @param next  As  Callback argument to the middleware function
     *
     * @return null
     */
    this.deleteUser = (req,res,next)=>{
        /** Delete user*/
        let userId      =   (req.params.id) ? req.params.id : "";
        const users     =   db.collection("users");
        users.updateOne(
            {_id : ObjectId(userId)},
            {$set : {
                is_deleted  : DELETED,
                deleted_at  : getUtcDate(),
                modified    : getUtcDate()
            }},(err,result)=>{
                if(err) return next(err);

                /** Send success response **/
                req.flash(STATUS_SUCCESS,res.__("admin.user.user_deleted_successfully"));
                res.redirect(WEBSITE_ADMIN_URL+"users");
            }
        );
    };//End deleteUser()
}
module.exports = new User();

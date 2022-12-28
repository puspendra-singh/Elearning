/** Model file path for current plugin **/
const modelPath     =	__dirname+"/model/user";
const modulePath	= 	"/"+ADMIN_NAME+"/users/";
const adminUser	    =   require(modelPath);

/** Before login routings **/

/** Routing is used to render html and submit login form **/
app.all(["/"+ADMIN_NAME+"/login","/"+ADMIN_NAME],isLoggedIn,(req,res,next)=>{

    /** Set current view folder **/
    req.rendering.views     = __dirname + "/views";

    /** Set layout  **/
    req.rendering.layout    = WEBSITE_ADMIN_LAYOUT_PATH+"before_login";

    adminUser.login(req, res,next);
});

/** Routing is used to render html and submit forgot password form **/
app.all("/"+ADMIN_NAME+"/forgot-password",(req, res)=>{
    /** Set current view folder **/
    req.rendering.views	=	__dirname + "/views";

    /** Set layout  **/
	req.rendering.layout    = WEBSITE_ADMIN_LAYOUT_PATH+"before_login";

    adminUser.forgotPasswordAdmin(req, res);
});

/** Routing is used to render html and submit reset password form **/
app.all("/"+ADMIN_NAME+"/reset-password",(req, res)=>{
    /** Set current view folder **/
   req.rendering.views	=	__dirname + "/views";

	/** Set layout  **/
	req.rendering.layout    = WEBSITE_ADMIN_LAYOUT_PATH+"before_login";

    adminUser.resetPasswordAdmin(req, res);
});

/** Before login routings end **/

/** Routing is used to update auth user details **/
app.all("/"+ADMIN_NAME+"/edit_profile",checkLoggedInAdmin,(req, res)=>{

    /** Set current view folder **/
    req.rendering.views = __dirname + "/views";

    adminUser.editProfile(req, res);
});

/** Routing is used to render dashboard html */
app.get("/"+ADMIN_NAME+"/dashboard",checkLoggedInAdmin,(req, res, next)=>{
    /** Set current view folder **/
    req.rendering.views	=	__dirname + "/views";

    adminUser.dashboard(req, res, next);
});

/** Routing is used to get cities list */
app.post("/"+ADMIN_NAME+"/cities/:country_id",checkLoggedInAdmin,(req, res, next)=>{
    adminUser.getCityList(req, res, next);
});

/** Set current view folder **/
app.use(modulePath,(req,res,next)=>{
   req.rendering.views	=	__dirname + "/views";
   next();
});

/** Routing is used to add user **/
app.all(modulePath+"add",checkLoggedInAdmin,(req,res,next)=>{
    adminUser.addUser(req,res,next);
});

/** Routing is used to edit user **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,(req,res,next)=>{
    adminUser.editUser(req,res,next);
});

/** Routing is used to view user details **/
app.get(modulePath+"view/:id",checkLoggedInAdmin,(req, res,next)=>{
    adminUser.viewUserDetails(req, res,next);
});

/** Routing is used to update user status **/
app.all(modulePath+"update_user_status/:id/:status/:status_type",checkLoggedInAdmin,(req, res,next)=>{
    adminUser.updateUserStatus(req,res,next);
});

/** Routing is used to update user verified status **/
app.get(modulePath+"update_verified_user_status/:id",checkLoggedInAdmin,(req, res,next)=>{
    adminUser.updateVerifiedUserStatus(req, res,next);
});

/** Routing is used to delete user details **/
app.get(modulePath+"delete/:id",checkLoggedInAdmin,(req,res,next)=>{
    adminUser.deleteUser(req,res,next);
});


/** Routing is used to get user list **/
app.all(modulePath+":status_type?",checkLoggedInAdmin,(req, res)=>{
    adminUser.getUserList(req, res);
});


/** Routing is used to update verified and rejected status  **/
app.all(modulePath+"update_user_detail/:action/:id",checkLoggedInAdmin,(req, res)=>{
    adminUser.approveUserDetails(req, res);
});

/** Routing is used for admin logout */
app.get("/"+ADMIN_NAME+"/logout",(req, res)=>{
    res.header("Cache-Control", "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");

    /** Delete user Modules list Flag **/
    let userId  = (req.session && req.session.user && req.session.user._id) ? req.session.user._id : "";
    userModuleFlagAction(userId,"","delete");

    req.session.destroy();
    res.clearCookie("adminLoggedIn");
    res.redirect(WEBSITE_ADMIN_URL+"login");
});
